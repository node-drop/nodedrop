import { FSWatcher, watch } from "chokidar";
import { promises as fs } from "fs";
import * as path from "path";
import { NodeDefinition } from "../types/node.types";
import { logger } from "../utils/logger";
import { CredentialService } from "./CredentialService";
import { NodeService } from "./NodeService";

export interface NodePackageInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  keywords?: string[];
  main: string;
  nodes: string[];
  credentials?: string[];
  oauthProviders?: string[];
}

export interface NodeLoadResult {
  success: boolean;
  nodeType?: string;
  errors?: string[];
  warnings?: string[];
}

export interface NodeCompilationResult {
  success: boolean;
  compiledPath?: string;
  errors?: string[];
  warnings?: string[];
}

export interface NodePackageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  packageInfo?: NodePackageInfo;
}

export class NodeLoader {
  private nodeService: NodeService;
  private credentialService: CredentialService;
  private prisma: PrismaClient;
  private watchers = new Map<string, FSWatcher>();
  private loadedPackages = new Map<string, NodePackageInfo>();
  private customNodesPath: string;
  private hotReloadEnabled: boolean;

  constructor(
    nodeService: NodeService,
    credentialService: CredentialService,
    prisma: PrismaClient,
    customNodesPath?: string
  ) {
    this.nodeService = nodeService;
    this.credentialService = credentialService;
    this.prisma = prisma;
    this.customNodesPath =
      customNodesPath || path.join(process.cwd(), "custom-nodes");
    this.hotReloadEnabled = process.env.NODE_ENV === "development";
  }

  /**
   * Initialize the node loader
   */
  async initialize(): Promise<void> {
    try {
      // Ensure custom nodes directory exists
      await this.ensureCustomNodesDirectory();

      // Load existing custom nodes
      await this.loadAllCustomNodes();

      // NodeLoader initialized silently
    } catch (error) {
      logger.error("Failed to initialize NodeLoader", { error });
      throw error;
    }
  }

  /**
   * Load a single node package
   */
  async loadNodePackage(packagePath: string): Promise<NodeLoadResult> {
    try {
      // Validate package structure
      const validation = await this.validateNodePackage(packagePath);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      const packageInfo = validation.packageInfo!;

      // Compile the package if needed
      const compilation = await this.compileNodePackage(packagePath);
      if (!compilation.success) {
        return {
          success: false,
          errors: compilation.errors,
          warnings: compilation.warnings,
        };
      }

      // Load OAuth providers if any
      if (packageInfo.oauthProviders && packageInfo.oauthProviders.length > 0) {
        await this.loadOAuthProviders(packagePath, packageInfo.oauthProviders);
      }

      // Load node definitions
      const nodeDefinitions = await this.loadNodeDefinitions(
        packagePath,
        packageInfo
      );

      // Register nodes with NodeService
      const registrationResults: NodeLoadResult[] = [];
      const failedNodes: Array<{ nodeType: string; errors: string[] }> = [];
      
      for (const nodeDefinition of nodeDefinitions) {
        try {
          const result = await this.nodeService.registerNode(nodeDefinition);
          registrationResults.push({
            success: result.success,
            nodeType: result.identifier,
            errors: result.errors,
          });
          
          if (!result.success) {
            failedNodes.push({
              nodeType: result.identifier || 'unknown',
              errors: result.errors || ['Unknown error'],
            });
            logger.error(`Failed to register node from package ${packageInfo.name}`, {
              nodeType: result.identifier,
              errors: result.errors,
              packageName: packageInfo.name,
              packagePath,
            });
          }
        } catch (registrationError) {
          const errorMsg = registrationError instanceof Error ? registrationError.message : String(registrationError);
          registrationResults.push({
            success: false,
            nodeType: nodeDefinition.identifier,
            errors: [errorMsg],
          });
          failedNodes.push({
            nodeType: nodeDefinition.identifier,
            errors: [errorMsg],
          });
          logger.error(`Exception during node registration from package ${packageInfo.name}`, {
            nodeType: nodeDefinition.identifier,
            error: {
              message: errorMsg,
              name: registrationError instanceof Error ? registrationError.name : typeof registrationError,
              stack: registrationError instanceof Error ? registrationError.stack : undefined,
            },
            packageName: packageInfo.name,
            packagePath,
          });
        }
      }

      // Check if all registrations were successful
      const failedRegistrations = registrationResults.filter((r) => !r.success);
      if (failedRegistrations.length > 0) {
        const errorMessages = failedRegistrations.flatMap((r) => r.errors || []);
        logger.warn(`Package ${packageInfo.name} had registration failures`, {
          packageName: packageInfo.name,
          totalNodes: nodeDefinitions.length,
          failedCount: failedRegistrations.length,
          failedNodes: failedNodes,
          errors: errorMessages,
        });
        
        return {
          success: false,
          errors: errorMessages,
        };
      }

      // Store package info
      this.loadedPackages.set(packageInfo.name, packageInfo);

      // Set up hot reload if enabled
      if (this.hotReloadEnabled) {
        await this.setupHotReload(packagePath, packageInfo.name);
      }

      // Silently loaded - only log errors

      return {
        success: true,
        nodeType: packageInfo.name,
        warnings: validation.warnings,
      };
    } catch (error) {
      logger.error("Failed to load node package", { error, packagePath });
      return {
        success: false,
        errors: [
          `Failed to load package: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Unload a node package
   */
  async unloadNodePackage(packageName: string): Promise<void> {
    try {
      const packageInfo = this.loadedPackages.get(packageName);
      if (!packageInfo) {
        throw new Error(`Package not found: ${packageName}`);
      }

      // Unregister all nodes from this package
      for (const nodePath of packageInfo.nodes) {
        const nodeDefinition = await this.loadSingleNodeDefinition(nodePath);
        if (nodeDefinition) {
          await this.nodeService.unregisterNode(nodeDefinition.identifier);
        }
      }

      // Stop watching for changes
      const watcher = this.watchers.get(packageName);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(packageName);
      }

      // Remove from loaded packages
      this.loadedPackages.delete(packageName);

      logger.info("Node package unloaded", { packageName });
    } catch (error) {
      logger.error("Failed to unload node package", { error, packageName });
      throw error;
    }
  }

  /**
   * Reload a node package (for hot reload)
   */
  async reloadNodePackage(packageName: string): Promise<NodeLoadResult> {
    try {
      const packageInfo = this.loadedPackages.get(packageName);
      if (!packageInfo) {
        throw new Error(`Package not found: ${packageName}`);
      }

      // Find package path
      const packagePath = await this.findPackagePath(packageName);
      if (!packagePath) {
        throw new Error(`Package path not found: ${packageName}`);
      }

      // Unload existing package
      await this.unloadNodePackage(packageName);

      // Reload package
      const result = await this.loadNodePackage(packagePath);

      if (result.success) {
        logger.info("Node package reloaded successfully", { packageName });
      }

      return result;
    } catch (error) {
      logger.error("Failed to reload node package", { error, packageName });
      return {
        success: false,
        errors: [
          `Failed to reload package: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Get all loaded packages
   */
  getLoadedPackages(): NodePackageInfo[] {
    return Array.from(this.loadedPackages.values());
  }

  /**
   * Validate a node package structure
   */
  async validateNodePackage(
    packagePath: string
  ): Promise<NodePackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if package.json exists
      const packageJsonPath = path.join(packagePath, "package.json");
      const packageJsonExists = await this.fileExists(packageJsonPath);

      if (!packageJsonExists) {
        errors.push("package.json not found");
        return { valid: false, errors, warnings };
      }

      // Parse package.json
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      let packageInfo: NodePackageInfo;

      try {
        const rawPackage = JSON.parse(packageJsonContent);
        
        // Extract nodeDrop configuration if it exists
        const nodeDrop = rawPackage.nodeDrop || {};
        
        // Merge nodeDrop fields with root package info
        packageInfo = {
          name: rawPackage.name,
          version: rawPackage.version,
          description: rawPackage.description,
          author: rawPackage.author,
          keywords: rawPackage.keywords,
          main: rawPackage.main,
          nodes: nodeDrop.nodes || rawPackage.nodes || [],
          credentials: nodeDrop.credentials || rawPackage.credentials,
          oauthProviders: nodeDrop.oauthProviders || rawPackage.oauthProviders,
        };
      } catch (parseError) {
        errors.push("Invalid package.json format");
        return { valid: false, errors, warnings };
      }

      // Validate required fields
      if (!packageInfo.name) {
        errors.push("Package name is required");
      }

      if (!packageInfo.version) {
        errors.push("Package version is required");
      }

      if (!packageInfo.main) {
        errors.push("Package main entry point is required");
      }

      if (
        !packageInfo.nodes ||
        !Array.isArray(packageInfo.nodes) ||
        packageInfo.nodes.length === 0
      ) {
        errors.push("Package must define at least one node");
      }

      // Check if main file exists
      if (packageInfo.main) {
        const mainPath = path.join(packagePath, packageInfo.main);
        const mainExists = await this.fileExists(mainPath);
        if (!mainExists) {
          errors.push(`Main file not found: ${packageInfo.main}`);
        }
      }

      // Check if node files exist
      if (packageInfo.nodes) {
        for (const nodePath of packageInfo.nodes) {
          const fullNodePath = path.join(packagePath, nodePath);
          const nodeExists = await this.fileExists(fullNodePath);
          if (!nodeExists) {
            errors.push(`Node file not found: ${nodePath}`);
          }
        }
      }

      // Check for TypeScript files and warn about compilation
      if (packageInfo.nodes) {
        for (const nodePath of packageInfo.nodes) {
          if (nodePath.endsWith(".ts")) {
            warnings.push(
              `TypeScript file detected: ${nodePath}. Make sure to compile before loading.`
            );
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        packageInfo: errors.length === 0 ? packageInfo : undefined,
      };
    } catch (error) {
      errors.push(
        `Validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Compile a node package (TypeScript to JavaScript)
   */
  async compileNodePackage(
    packagePath: string
  ): Promise<NodeCompilationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if TypeScript files exist
      const hasTypeScript = await this.hasTypeScriptFiles(packagePath);

      if (!hasTypeScript) {
        // No compilation needed
        return {
          success: true,
          warnings: ["No TypeScript files found, skipping compilation"],
        };
      }

      // Check if TypeScript is available
      try {
        require.resolve("typescript");
      } catch {
        errors.push("TypeScript is required for compilation but not found");
        return { success: false, errors };
      }

      // Check for tsconfig.json
      const tsconfigPath = path.join(packagePath, "tsconfig.json");
      const tsconfigExists = await this.fileExists(tsconfigPath);

      if (!tsconfigExists) {
        warnings.push(
          "tsconfig.json not found, using default TypeScript configuration"
        );
      }

      // Compile TypeScript files
      const typescript = require("typescript");
      const configPath = tsconfigExists ? tsconfigPath : undefined;

      // Read TypeScript config
      const configFile = typescript.readConfigFile(
        configPath || "tsconfig.json",
        typescript.sys.readFile
      );
      const compilerOptions = typescript.parseJsonConfigFileContent(
        configFile.config || {},
        typescript.sys,
        packagePath
      );

      // Set default options if no config
      if (!tsconfigExists) {
        compilerOptions.options = {
          ...compilerOptions.options,
          target: typescript.ScriptTarget.ES2020,
          module: typescript.ModuleKind.CommonJS,
          outDir: path.join(packagePath, "dist"),
          rootDir: packagePath,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        };
      }

      // Get TypeScript files
      const tsFiles = await this.getTypeScriptFiles(packagePath);

      // Create TypeScript program
      const program = typescript.createProgram(
        tsFiles,
        compilerOptions.options
      );

      // Emit compiled files
      const emitResult = program.emit();

      // Check for compilation errors
      const allDiagnostics = typescript
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

      for (const diagnostic of allDiagnostics) {
        const message = typescript.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );

        if (diagnostic.category === typescript.DiagnosticCategory.Error) {
          errors.push(`TypeScript Error: ${message}`);
        } else if (
          diagnostic.category === typescript.DiagnosticCategory.Warning
        ) {
          warnings.push(`TypeScript Warning: ${message}`);
        }
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      const compiledPath =
        compilerOptions.options.outDir || path.join(packagePath, "dist");

      return {
        success: true,
        compiledPath,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Compilation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return { success: false, errors, warnings };
    }
  }

  /**
   * Load node definitions from a package
   */
  private async loadNodeDefinitions(
    packagePath: string,
    packageInfo: NodePackageInfo
  ): Promise<NodeDefinition[]> {
    const nodeDefinitions: NodeDefinition[] = [];
    const failedCredentials: Array<{ path: string; error: string }> = [];
    const failedNodes: Array<{ path: string; error: string }> = [];

    // First, load credentials if any
    if (packageInfo.credentials && Array.isArray(packageInfo.credentials)) {
      for (const credentialPath of packageInfo.credentials) {
        try {
          await this.loadAndRegisterCredential(
            path.join(packagePath, credentialPath)
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          failedCredentials.push({
            path: credentialPath,
            error: errorMsg,
          });
          logger.error("Failed to load credential type", {
            error: {
              message: errorMsg,
              name: error instanceof Error ? error.name : typeof error,
              stack: error instanceof Error ? error.stack : undefined,
            },
            credentialPath,
            packageName: packageInfo.name,
          });
          // Don't throw - continue loading other credentials
        }
      }
    }

    // Then load nodes
    for (const nodePath of packageInfo.nodes) {
      try {
        const nodeDefinition = await this.loadSingleNodeDefinition(
          path.join(packagePath, nodePath)
        );
        if (nodeDefinition) {
          nodeDefinitions.push(nodeDefinition);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failedNodes.push({
          path: nodePath,
          error: errorMsg,
        });
        logger.error("Failed to load node definition", {
          error: {
            message: errorMsg,
            name: error instanceof Error ? error.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
          },
          nodePath,
          packageName: packageInfo.name,
          packagePath,
        });
        throw new Error(
          `Failed to load node from ${nodePath}: ${errorMsg}`
        );
      }
    }

    // Log summary if there were credential failures
    if (failedCredentials.length > 0) {
      logger.warn("Some credentials failed to load", {
        packageName: packageInfo.name,
        failedCount: failedCredentials.length,
        failedCredentials,
      });
    }

    return nodeDefinitions;
  }

  /**
   * Load OAuth providers from a package
   */
  private async loadOAuthProviders(
    packagePath: string,
    oauthProviderPaths: string[]
  ): Promise<void> {
    for (const providerPath of oauthProviderPaths) {
      try {
        const fullPath = path.join(packagePath, providerPath);
        await this.loadAndRegisterOAuthProvider(fullPath);
      } catch (error) {
        logger.error("Failed to load OAuth provider", { error, providerPath });
      }
    }
  }

  /**
   * Load and register an OAuth provider
   */
  private async loadAndRegisterOAuthProvider(
    providerPath: string
  ): Promise<void> {
    try {
      // Clear require cache
      delete require.cache[require.resolve(providerPath)];

      // Load the provider module
      const providerModule = require(providerPath);
      const provider = providerModule.default || providerModule;

      if (!provider || typeof provider !== "object") {
        throw new Error("Invalid OAuth provider format");
      }

      // Validate provider has required fields
      if (!provider.name || !provider.getAuthorizationUrl || !provider.exchangeCodeForTokens) {
        throw new Error("OAuth provider must have name, getAuthorizationUrl, and exchangeCodeForTokens");
      }

      // Register with OAuth provider registry
      const { oauthProviderRegistry } = require("../oauth");
      oauthProviderRegistry.register(provider);

      logger.info(`✅ Registered OAuth provider: ${provider.name}`);
    } catch (error) {
      logger.error("Failed to load OAuth provider", { error, providerPath });
      throw error;
    }
  }

  /**
   * Load and register a credential type
   */
  private async loadAndRegisterCredential(
    credentialPath: string
  ): Promise<void> {
    try {
      // Clear require cache to ensure fresh load
      try {
        delete require.cache[require.resolve(credentialPath)];
      } catch (cacheError) {
        logger.debug("Could not clear require cache for credential", {
          credentialPath,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      // Load the credential module
      let credentialModule;
      try {
        credentialModule = require(credentialPath);
      } catch (requireError) {
        const errorMsg = requireError instanceof Error ? requireError.message : String(requireError);
        throw new Error(`Failed to require credential module: ${errorMsg}`);
      }

      // Extract credential definition
      const credentialType = credentialModule.default || credentialModule;

      if (!credentialType || typeof credentialType !== "object") {
        throw new Error(
          `Invalid credential type format. Expected object, got ${typeof credentialType}`
        );
      }

      // Validate credential type has required fields
      const missingFields: string[] = [];
      if (!credentialType.name) missingFields.push("name");
      if (!credentialType.displayName) missingFields.push("displayName");
      if (!credentialType.properties) missingFields.push("properties");

      if (missingFields.length > 0) {
        throw new Error(
          `Credential type missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Register with credential service
      try {
        this.credentialService.registerCredentialType(credentialType);
      } catch (registrationError) {
        const errorMsg = registrationError instanceof Error ? registrationError.message : String(registrationError);
        throw new Error(`Failed to register credential type: ${errorMsg}`);
      }

      // Silently loaded - only log errors
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Failed to load credential type", {
        error: {
          message: errorMsg,
          name: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        },
        credentialPath,
      });
      throw error;
    }
  }

  /**
   * Load a single node definition
   */
  private async loadSingleNodeDefinition(
    nodePath: string
  ): Promise<NodeDefinition | null> {
    try {
      // Clear require cache to ensure fresh load
      try {
        delete require.cache[require.resolve(nodePath)];
      } catch (cacheError) {
        logger.debug("Could not clear require cache for node", {
          nodePath,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      // Load the node module
      let nodeModule;
      try {
        nodeModule = require(nodePath);
      } catch (requireError) {
        const errorMsg = requireError instanceof Error ? requireError.message : String(requireError);
        throw new Error(`Failed to require node module: ${errorMsg}`);
      }

      // Extract node definition (could be default export or named export)
      const nodeDefinition =
        nodeModule.default || nodeModule.nodeDefinition || nodeModule;

      if (!nodeDefinition || typeof nodeDefinition !== "object") {
        throw new Error(
          `Invalid node definition format. Expected object, got ${typeof nodeDefinition}`
        );
      }

      // Validate the node definition
      const validation =
        this.nodeService.validateNodeDefinition(nodeDefinition);
      if (!validation.valid) {
        const validationErrors = validation.errors
          .map((e) => `${e.property}: ${e.message}`)
          .join("; ");
        throw new Error(`Node validation failed: ${validationErrors}`);
      }

      return nodeDefinition;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Failed to load single node definition", {
        error: {
          message: errorMsg,
          name: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        },
        nodePath,
      });
      return null;
    }
  }

  /**
   * Set up hot reload for a package
   */
  private async setupHotReload(
    packagePath: string,
    packageName: string
  ): Promise<void> {
    if (!this.hotReloadEnabled) {
      return;
    }

    try {
      // Close existing watcher if any
      const existingWatcher = this.watchers.get(packageName);
      if (existingWatcher) {
        await existingWatcher.close();
      }

      // Create new watcher
      const watcher = watch(packagePath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      // Set up event handlers
      watcher.on("change", async (filePath) => {
        logger.info("Node file changed, reloading package", {
          packageName,
          filePath,
        });

        try {
          await this.reloadNodePackage(packageName);
          logger.info("Package reloaded successfully", { packageName });
        } catch (error) {
          logger.error("Failed to reload package after file change", {
            error,
            packageName,
            filePath,
          });
        }
      });

      watcher.on("error", (error) => {
        logger.error("File watcher error", { error, packageName });
      });

      // Store watcher
      this.watchers.set(packageName, watcher);

      // Hot reload enabled silently
    } catch (error) {
      logger.error("Failed to set up hot reload", {
        error,
        packageName,
        packagePath,
      });
    }
  }

  /**
   * Load all custom nodes from the custom nodes directory
   */
  private async loadAllCustomNodes(): Promise<void> {
    try {
      const customNodesDir = this.customNodesPath;
      const dirExists = await this.directoryExists(customNodesDir);

      if (!dirExists) {
        logger.info(
          "Custom nodes directory does not exist, skipping auto-load",
          { customNodesDir }
        );
        return;
      }

      const entries = await fs.readdir(customNodesDir, { withFileTypes: true });
      const packageDirs = entries.filter((entry) => entry.isDirectory());

      for (const packageDir of packageDirs) {
        const packagePath = path.join(customNodesDir, packageDir.name);

        try {
          await this.loadNodePackage(packagePath);
        } catch (error) {
          logger.error("Failed to auto-load custom node package", {
            error,
            packageName: packageDir.name,
            packagePath,
          });
        }
      }

      // Custom nodes loaded silently
    } catch (error) {
      logger.error("Failed to load custom nodes", { error });
    }
  }

  /**
   * Ensure custom nodes directory exists
   */
  private async ensureCustomNodesDirectory(): Promise<void> {
    try {
      const dirExists = await this.directoryExists(this.customNodesPath);
      if (!dirExists) {
        await fs.mkdir(this.customNodesPath, { recursive: true });
        logger.info("Created custom nodes directory", {
          path: this.customNodesPath,
        });
      }
    } catch (error) {
      logger.error("Failed to create custom nodes directory", {
        error,
        path: this.customNodesPath,
      });
      throw error;
    }
  }

  /**
   * Find package path by name
   */
  private async findPackagePath(packageName: string): Promise<string | null> {
    try {
      const customNodesDir = this.customNodesPath;
      const packagePath = path.join(customNodesDir, packageName);
      const exists = await this.directoryExists(packagePath);
      return exists ? packagePath : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if package has TypeScript files
   */
  private async hasTypeScriptFiles(packagePath: string): Promise<boolean> {
    try {
      const files = await this.getTypeScriptFiles(packagePath);
      return files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all TypeScript files in a package
   */
  private async getTypeScriptFiles(packagePath: string): Promise<string[]> {
    const tsFiles: string[] = [];

    const scanDirectory = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (
          entry.isDirectory() &&
          entry.name !== "node_modules" &&
          entry.name !== "dist"
        ) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
          tsFiles.push(fullPath);
        }
      }
    };

    await scanDirectory(packagePath);
    return tsFiles;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Close all watchers
      for (const [packageName, watcher] of this.watchers) {
        try {
          await watcher.close();
          logger.info("Closed file watcher", { packageName });
        } catch (error) {
          logger.error("Failed to close file watcher", { error, packageName });
        }
      }

      this.watchers.clear();
      this.loadedPackages.clear();

      logger.info("NodeLoader cleanup completed");
    } catch (error) {
      logger.error("Failed to cleanup NodeLoader", { error });
    }
  }
}
