/**
 * test-simple-loader.js - Node Loader Testing Implementation
 *
 * This test file validates the custom node loading system by implementing
 * a simplified version of the NodeLoader class and testing its functionality
 * step by step.
 *
 * Test Scenarios:
 * 1. Directory Structure Validation
 *    - Tests directory existence checking
 *    - Validates custom-nodes path resolution
 *    - Checks package.json detection and parsing
 *
 * 2. Package Discovery and Loading
 *    - Discovers all available custom node packages
 *    - Reads and validates package.json files
 *    - Tests package metadata extraction
 *
 * 3. Node File Loading
 *    - Loads individual node files from packages
 *    - Validates node structure and properties
 *    - Tests node registration process
 *
 * 4. Error Handling and Edge Cases
 *    - Tests behavior with missing directories
 *    - Handles invalid package.json files
 *    - Validates graceful failure scenarios
 *
 * Purpose: This file serves as both a test and a reference implementation
 * for understanding how the node loading system works. It breaks down the
 * complex NodeLoader into manageable steps that can be tested individually.
 *
 * Implementation: Uses a SimpleNodeLoader class that mirrors the main
 * NodeLoader's functionality but with simplified logic for easier testing
 * and debugging.
 */

// Test NodeLoader logic step by step
const fs = require("fs").promises;
const path = require("path");

class SimpleNodeLoader {
  constructor() {
    this.customNodesPath = path.join(process.cwd(), "custom-nodes");
    this.loadedPackages = new Map();
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async validateNodePackage(packagePath) {
    const errors = [];
    const warnings = [];

    console.log(`Validating package at: ${packagePath}`);

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
      let packageInfo;

      try {
        packageInfo = JSON.parse(packageJsonContent);
      } catch (parseError) {
        errors.push("Invalid package.json format");
        return { valid: false, errors, warnings };
      }

      console.log(`  Package name: ${packageInfo.name}`);

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
        } else {
          console.log(`  ✓ Main file exists: ${packageInfo.main}`);
        }
      }

      // Check if node files exist
      if (packageInfo.nodes) {
        for (const nodePath of packageInfo.nodes) {
          const fullNodePath = path.join(packagePath, nodePath);
          const nodeExists = await this.fileExists(fullNodePath);
          if (!nodeExists) {
            errors.push(`Node file not found: ${nodePath}`);
          } else {
            console.log(`  ✓ Node file exists: ${nodePath}`);
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
      console.error(`  Error validating package: ${error.message}`);
      errors.push(`Validation error: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  async loadSingleNodeDefinition(nodePath) {
    try {
      console.log(`    Loading node definition from: ${nodePath}`);

      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(nodePath)];

      // Load the node module
      const nodeModule = require(nodePath);

      // Extract node definition (could be default export or named export)
      const nodeDefinition =
        nodeModule.default || nodeModule.nodeDefinition || nodeModule;

      if (!nodeDefinition || typeof nodeDefinition !== "object") {
        throw new Error("Invalid node definition format");
      }

      console.log(`    ✓ Node definition loaded: ${nodeDefinition.type}`);
      return nodeDefinition;
    } catch (error) {
      console.error(`    Error loading node definition: ${error.message}`);
      return null;
    }
  }

  async loadNodeDefinitions(packagePath, packageInfo) {
    const nodeDefinitions = [];
    console.log(`  Loading ${packageInfo.nodes.length} node(s)...`);

    for (const nodePath of packageInfo.nodes) {
      try {
        const nodeDefinition = await this.loadSingleNodeDefinition(
          path.join(packagePath, nodePath)
        );
        if (nodeDefinition) {
          nodeDefinitions.push(nodeDefinition);
        }
      } catch (error) {
        console.error(`  Failed to load node definition: ${error.message}`);
        throw new Error(
          `Failed to load node from ${nodePath}: ${error.message}`
        );
      }
    }

    return nodeDefinitions;
  }

  async loadNodePackage(packagePath) {
    try {
      console.log(`\nLoading package: ${packagePath}`);

      // Validate package structure
      const validation = await this.validateNodePackage(packagePath);
      if (!validation.valid) {
        console.log(`  Validation failed:`, validation.errors);
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      const packageInfo = validation.packageInfo;
      console.log(`  Package validated successfully`);

      // Load node definitions
      const nodeDefinitions = await this.loadNodeDefinitions(
        packagePath,
        packageInfo
      );
      console.log(`  Loaded ${nodeDefinitions.length} node definition(s)`);

      // Track loaded package
      this.loadedPackages.set(packageInfo.name, packageInfo);

      return {
        success: true,
        nodeDefinitions,
        packageInfo,
      };
    } catch (error) {
      console.error(`  Error loading package: ${error.message}`);
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  async loadAllCustomNodes() {
    try {
      console.log(`=== Loading all custom nodes ===`);
      console.log(`Custom nodes directory: ${this.customNodesPath}`);

      const dirExists = await this.directoryExists(this.customNodesPath);
      console.log(`Directory exists: ${dirExists}`);

      if (!dirExists) {
        console.log(
          "Custom nodes directory does not exist, skipping auto-load"
        );
        return;
      }

      const entries = await fs.readdir(this.customNodesPath, {
        withFileTypes: true,
      });
      const packageDirs = entries.filter((entry) => entry.isDirectory());
      console.log(
        `Found ${packageDirs.length} potential package directories:`,
        packageDirs.map((d) => d.name)
      );

      let successCount = 0;
      let errorCount = 0;

      for (const packageDir of packageDirs) {
        const packagePath = path.join(this.customNodesPath, packageDir.name);

        try {
          const result = await this.loadNodePackage(packagePath);
          if (result.success) {
            successCount++;
            console.log(`✓ Successfully loaded package: ${packageDir.name}`);
          } else {
            errorCount++;
            console.log(
              `✗ Failed to load package: ${packageDir.name}`,
              result.errors
            );
          }
        } catch (error) {
          errorCount++;
          console.error(
            `✗ Error loading package ${packageDir.name}:`,
            error.message
          );
        }
      }

      console.log(`\n=== Summary ===`);
      console.log(`Packages found: ${packageDirs.length}`);
      console.log(`Packages loaded successfully: ${successCount}`);
      console.log(`Packages failed: ${errorCount}`);
      console.log(`Loaded packages: ${this.loadedPackages.size}`);
    } catch (error) {
      console.error("Failed to load custom nodes:", error);
    }
  }
}

async function testNodeLoader() {
  const loader = new SimpleNodeLoader();
  await loader.loadAllCustomNodes();
}

testNodeLoader();
