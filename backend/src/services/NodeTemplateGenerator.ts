import AdmZip from "adm-zip";
import { promises as fs } from "fs";
import * as path from "path";
import { logger } from "../utils/logger";

export interface NodeTemplateOptions {
  name: string;
  displayName: string;
  description: string;
  type: "action" | "trigger" | "transform";
  author?: string;
  version?: string;
  group?: string[];
  includeCredentials?: boolean;
  includeTests?: boolean;
  typescript?: boolean;
  useDynamicProperties?: boolean; // New option for dynamic properties
}

export interface TemplateGenerationResult {
  success: boolean;
  packagePath?: string;
  errors?: string[];
  warnings?: string[];
}

export interface TemplateZipResult {
  success: boolean;
  zipBuffer?: Buffer;
  filename?: string;
  errors?: string[];
  warnings?: string[];
}

export class NodeTemplateGenerator {
  private templatesPath: string;

  constructor(templatesPath?: string) {
    this.templatesPath =
      templatesPath || path.join(__dirname, "../templates/nodes");
  }

  /**
   * Generate a new node package from template
   */
  async generateNodePackage(
    outputPath: string,
    options: NodeTemplateOptions
  ): Promise<TemplateGenerationResult> {
    try {
      const packagePath = path.join(
        outputPath,
        this.sanitizePackageName(options.name)
      );

      // Check if package already exists
      const packageExists = await this.directoryExists(packagePath);
      if (packageExists) {
        return {
          success: false,
          errors: [`Package directory already exists: ${packagePath}`],
        };
      }

      // Create package directory
      await fs.mkdir(packagePath, { recursive: true });

      // Generate package.json
      await this.generatePackageJson(packagePath, options);

      // Generate main index file
      await this.generateIndexFile(packagePath, options);

      // Generate main node file
      await this.generateNodeFile(packagePath, options);

      // Generate credentials file if requested
      if (options.includeCredentials) {
        await this.generateCredentialsFile(packagePath, options);
      }

      // Generate test files if requested
      if (options.includeTests) {
        await this.generateTestFiles(packagePath, options);
      }

      // Generate TypeScript config if TypeScript is enabled
      if (options.typescript) {
        await this.generateTypeScriptConfig(packagePath, options);
      }

      // Generate README
      await this.generateReadme(packagePath, options);

      // Generate .gitignore
      await this.generateGitignore(packagePath);



      return {
        success: true,
        packagePath,
        warnings: [],
      };
    } catch (error) {
      logger.error("Failed to generate node package", { error, options });
      return {
        success: false,
        errors: [
          `Failed to generate package: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Generate a new node package as a downloadable zip file
   */
  async generateNodePackageZip(
    options: NodeTemplateOptions
  ): Promise<TemplateZipResult> {
    try {
      const zip = new AdmZip();
      const packageName = this.sanitizePackageName(options.name);

      // Generate all files in memory and add them to zip
      const warnings: string[] = [];

      // Generate package.json
      const packageJson = this.generatePackageJsonContent(options);
      zip.addFile("package.json", Buffer.from(packageJson, "utf8"));

      // Generate main index file
      const indexFileName = options.typescript ? "src/index.ts" : "index.js";
      const indexContent = this.getIndexTemplate(options);
      zip.addFile(indexFileName, Buffer.from(indexContent, "utf8"));

      // Generate main node file
      const nodeFileName = `${options.typescript ? "src/" : ""}nodes/${
        options.name
      }.node.${options.typescript ? "ts" : "js"}`;
      const nodeContent = this.getNodeTemplate(options);
      zip.addFile(nodeFileName, Buffer.from(nodeContent, "utf8"));

      // Generate credentials file if requested
      if (options.includeCredentials) {
        const credentialsFileName = `${
          options.typescript ? "src/" : ""
        }credentials/${options.name}.credentials.${
          options.typescript ? "ts" : "js"
        }`;
        const credentialsContent = this.getCredentialsTemplate(options);
        zip.addFile(
          credentialsFileName,
          Buffer.from(credentialsContent, "utf8")
        );
      }

      // Generate test files if requested
      if (options.includeTests) {
        const testFileName = `__tests__/${options.name}.test.${
          options.typescript ? "ts" : "js"
        }`;
        const testContent = this.getTestTemplate(options);
        zip.addFile(testFileName, Buffer.from(testContent, "utf8"));

        // Generate Jest config if TypeScript
        if (options.typescript) {
          const jestConfig = this.getJestConfig();
          zip.addFile("jest.config.js", Buffer.from(jestConfig, "utf8"));
        }
      }

      // Generate TypeScript config if TypeScript is enabled
      if (options.typescript) {
        const tsconfig = this.generateTypeScriptConfigContent(options);
        zip.addFile("tsconfig.json", Buffer.from(tsconfig, "utf8"));
      }

      // Generate README
      const readmeContent = this.getReadmeTemplate(options);
      zip.addFile("README.md", Buffer.from(readmeContent, "utf8"));

      // Generate .gitignore
      const gitignoreContent = this.getGitignoreContent();
      zip.addFile(".gitignore", Buffer.from(gitignoreContent, "utf8"));

      // Get zip buffer
      const zipBuffer = zip.toBuffer();
      const filename = `${packageName}.zip`;



      return {
        success: true,
        zipBuffer,
        filename,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error("Failed to generate node package zip", { error, options });
      return {
        success: false,
        errors: [
          `Failed to generate package zip: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Generate package.json
   */
  private async generatePackageJson(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const packageJsonContent = this.generatePackageJsonContent(options);
    const packageJsonPath = path.join(packagePath, "package.json");
    await fs.writeFile(packageJsonPath, packageJsonContent);
  }

  /**
   * Generate package.json content as string
   */
  private generatePackageJsonContent(options: NodeTemplateOptions): string {
    const packageJson = {
      name: this.sanitizePackageName(options.name),
      version: options.version || "1.0.0",
      description: options.description,
      main: options.typescript ? "dist/index.js" : "index.js",
      author: options.author || "",
      keywords: [
        "nodeDrop",
        "nd-node",
        "workflow",
        "automation",
        ...(options.group || []),
      ],
      scripts: {
        ...(options.typescript
          ? {
              build: "tsc",
              dev: "tsc --watch",
              prepare: "npm run build",
            }
          : {}),
        ...(options.includeTests
          ? {
              test: "jest",
              "test:watch": "jest --watch",
            }
          : {}),
      },
      nodes: [
        options.typescript
          ? `dist/nodes/${options.name}.node.js`
          : `nodes/${options.name}.node.js`,
      ],
      ...(options.includeCredentials
        ? {
            credentials: [
              options.typescript
                ? `dist/credentials/${options.name}.credentials.js`
                : `credentials/${options.name}.credentials.js`,
            ],
          }
        : {}),
      dependencies: {
        "@types/node": "^20.0.0",
      },
      ...(options.typescript
        ? {
            devDependencies: {
              typescript: "^5.0.0",
              "@types/jest": "^29.0.0",
              ...(options.includeTests
                ? {
                    jest: "^29.0.0",
                    "ts-jest": "^29.0.0",
                  }
                : {}),
            },
          }
        : {
            ...(options.includeTests
              ? {
                  devDependencies: {
                    jest: "^29.0.0",
                  },
                }
              : {}),
          }),
      engines: {
        node: ">=18.0.0",
      },
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate index.js (main entry point)
   */
  private async generateIndexFile(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const indexFileName = options.typescript ? "src/index.ts" : "index.js";
    const indexFilePath = path.join(packagePath, indexFileName);

    // Create src directory if TypeScript
    if (options.typescript) {
      const srcDir = path.join(packagePath, "src");
      await fs.mkdir(srcDir, { recursive: true });
    }

    const indexTemplate = this.getIndexTemplate(options);
    await fs.writeFile(indexFilePath, indexTemplate);
  }

  /**
   * Generate main node file
   */
  private async generateNodeFile(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const nodesDir = path.join(
      packagePath,
      options.typescript ? "src/nodes" : "nodes"
    );
    await fs.mkdir(nodesDir, { recursive: true });

    const nodeFileName = `${options.name}.node.${
      options.typescript ? "ts" : "js"
    }`;
    const nodeFilePath = path.join(nodesDir, nodeFileName);

    const nodeTemplate = this.getNodeTemplate(options);
    await fs.writeFile(nodeFilePath, nodeTemplate);
  }

  /**
   * Generate credentials file
   */
  private async generateCredentialsFile(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const credentialsDir = path.join(
      packagePath,
      options.typescript ? "src/credentials" : "credentials"
    );
    await fs.mkdir(credentialsDir, { recursive: true });

    const credentialsFileName = `${options.name}.credentials.${
      options.typescript ? "ts" : "js"
    }`;
    const credentialsFilePath = path.join(credentialsDir, credentialsFileName);

    const credentialsTemplate = this.getCredentialsTemplate(options);
    await fs.writeFile(credentialsFilePath, credentialsTemplate);
  }

  /**
   * Generate test files
   */
  private async generateTestFiles(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const testsDir = path.join(packagePath, "__tests__");
    await fs.mkdir(testsDir, { recursive: true });

    const testFileName = `${options.name}.test.${
      options.typescript ? "ts" : "js"
    }`;
    const testFilePath = path.join(testsDir, testFileName);

    const testTemplate = this.getTestTemplate(options);
    await fs.writeFile(testFilePath, testTemplate);

    // Generate Jest config if TypeScript
    if (options.typescript) {
      const jestConfigPath = path.join(packagePath, "jest.config.js");
      const jestConfig = this.getJestConfig();
      await fs.writeFile(jestConfigPath, jestConfig);
    }
  }

  /**
   * Generate TypeScript configuration
   */
  private async generateTypeScriptConfig(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const tsconfigPath = path.join(packagePath, "tsconfig.json");
    const tsconfigContent = this.generateTypeScriptConfigContent(options);
    await fs.writeFile(tsconfigPath, tsconfigContent);
  }

  /**
   * Generate TypeScript configuration content as string
   */
  private generateTypeScriptConfigContent(
    options: NodeTemplateOptions
  ): string {
    const tsconfig = {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ["src/**/*", "__tests__/**/*"],
      exclude: ["node_modules", "dist"],
    };

    return JSON.stringify(tsconfig, null, 2);
  }

  /**
   * Generate README file
   */
  private async generateReadme(
    packagePath: string,
    options: NodeTemplateOptions
  ): Promise<void> {
    const readmePath = path.join(packagePath, "README.md");
    const readme = this.getReadmeTemplate(options);
    await fs.writeFile(readmePath, readme);
  }

  /**
   * Generate .gitignore file
   */
  private async generateGitignore(packagePath: string): Promise<void> {
    const gitignorePath = path.join(packagePath, ".gitignore");
    const gitignoreContent = this.getGitignoreContent();
    await fs.writeFile(gitignorePath, gitignoreContent);
  }

  /**
   * Get .gitignore content as string
   */
  private getGitignoreContent(): string {
    return `# Dependencies
node_modules/

# Build output
dist/

# Logs
*.log
logs/

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;
  }

  /**
   * Get node template based on type
   */
  private getNodeTemplate(options: NodeTemplateOptions): string {
    const { name, displayName, description, type, typescript } = options;
    const className = this.toPascalCase(name);

    const imports = typescript
      ? `
import {
  NodeDefinition,
  NodeExecuteFunction,
  NodeInputData,
  NodeOutputData,
  NodeExecutionContext,
  NodeProperty
} from '../types/node.types';
`
      : "";

    const typeAnnotations = typescript ? ": NodeDefinition" : "";
    const executeTypeAnnotation = typescript
      ? ": Promise<NodeOutputData[]>"
      : "";

    switch (type) {
      case "action":
        return `${imports}
const ${className}Node${typeAnnotations} = {
  type: '${name}',
  displayName: '${displayName}',
  name: '${name}',
  group: ['${options.group?.[0] || "transform"}'],
  version: 1,
  description: '${description}',
  icon: 'fa:cog',
  color: '#2196F3',
  defaults: {
    name: '${displayName}'
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      required: true,
      default: 'process',
      options: [
        {
          name: 'Process',
          value: 'process',
          description: 'Process the input data'
        }
      ]
    }
  ]${typescript ? " as NodeProperty[]" : ""},
  execute: async function(inputData${
    typescript ? ": NodeInputData" : ""
  })${executeTypeAnnotation} {
    const operation = this.getNodeParameter('operation');
    const items = inputData.main?.[0] || [];

    switch (operation) {
      case 'process':
        // Process the input data
        const processedItems = items.map(item => ({
          json: {
            ...item.json,
            processed: true,
            processedAt: new Date().toISOString()
          }
        }));

        return [{ main: processedItems }];

      default:
        throw new Error(\`Unknown operation: \${operation}\`);
    }
  }
};

${typescript ? "export default" : "module.exports ="} ${className}Node;
`;

      case "trigger":
        return `${imports}
const ${className}TriggerNode${typeAnnotations} = {
  type: '${name}-trigger',
  displayName: '${displayName} Trigger',
  name: '${name}Trigger',
  group: ['trigger'],
  version: 1,
  description: '${description}',
  icon: 'fa:play',
  color: '#4CAF50',
  defaults: {
    name: '${displayName} Trigger'
  },
  inputs: [],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Trigger Type',
      name: 'triggerType',
      type: 'options',
      required: true,
      default: 'manual',
      options: [
        {
          name: 'Manual',
          value: 'manual',
          description: 'Trigger manually'
        },
        {
          name: 'Interval',
          value: 'interval',
          description: 'Trigger at regular intervals'
        }
      ]
    },
    {
      displayName: 'Interval (minutes)',
      name: 'interval',
      type: 'number',
      required: true,
      default: 5,
      displayOptions: {
        show: {
          triggerType: ['interval']
        }
      }
    }
  ]${typescript ? " as NodeProperty[]" : ""},
  execute: async function(inputData${
    typescript ? ": NodeInputData" : ""
  })${executeTypeAnnotation} {
    const triggerType = this.getNodeParameter('triggerType');
    
    // For trigger nodes, this method is called when the trigger fires
    const triggerData = {
      triggeredAt: new Date().toISOString(),
      triggerType,
      data: inputData
    };

    return [{ main: [{ json: triggerData }] }];
  }
};

${typescript ? "export default" : "module.exports ="} ${className}TriggerNode;
`;

      case "transform":
      default:
        return `${imports}
const ${className}Node${typeAnnotations} = {
  type: '${name}',
  displayName: '${displayName}',
  name: '${name}',
  group: ['transform'],
  version: 1,
  description: '${description}',
  icon: 'fa:exchange-alt',
  color: '#FF9800',
  defaults: {
    name: '${displayName}'
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Transform Type',
      name: 'transformType',
      type: 'options',
      required: true,
      default: 'modify',
      options: [
        {
          name: 'Modify',
          value: 'modify',
          description: 'Modify the input data'
        },
        {
          name: 'Filter',
          value: 'filter',
          description: 'Filter the input data'
        }
      ]
    },
    {
      displayName: 'Field Name',
      name: 'fieldName',
      type: 'string',
      required: true,
      default: '',
      description: 'Name of the field to transform'
    }
  ]${typescript ? " as NodeProperty[]" : ""},
  execute: async function(inputData${
    typescript ? ": NodeInputData" : ""
  })${executeTypeAnnotation} {
    const transformType = this.getNodeParameter('transformType');
    const fieldName = this.getNodeParameter('fieldName');
    const items = inputData.main?.[0] || [];

    switch (transformType) {
      case 'modify':
        const modifiedItems = items.map(item => ({
          json: {
            ...item.json,
            [fieldName]: \`transformed_\${item.json[fieldName] || ''}\`
          }
        }));
        return [{ main: modifiedItems }];

      case 'filter':
        const filteredItems = items.filter(item => 
          item.json[fieldName] !== undefined && item.json[fieldName] !== null
        );
        return [{ main: filteredItems }];

      default:
        throw new Error(\`Unknown transform type: \${transformType}\`);
    }
  }
};

${typescript ? "export default" : "module.exports ="} ${className}Node;
`;
    }
  }

  /**
   * Get index template (main entry point)
   */
  private getIndexTemplate(options: NodeTemplateOptions): string {
    const { name, typescript } = options;
    const className = this.toPascalCase(name);

    if (typescript) {
      return `// Export the node definitions
export { default as ${className}Node } from './nodes/${name}.node';
${
  options.includeCredentials
    ? `export { default as ${className}Credentials } from './credentials/${name}.credentials';`
    : ""
}
`;
    } else {
      return `// Export the node definitions
module.exports = {
  nodes: {
    '${name}': require('./nodes/${name}.node.js')
  }${
    options.includeCredentials
      ? `,
  credentials: {
    '${name}Api': require('./credentials/${name}.credentials.js')
  }`
      : ""
  }
};
`;
    }
  }

  /**
   * Get credentials template
   */
  private getCredentialsTemplate(options: NodeTemplateOptions): string {
    const { name, displayName, typescript } = options;
    const className = this.toPascalCase(name);

    const imports = typescript
      ? `
import { CredentialDefinition, NodeProperty } from '../types/node.types';
`
      : "";

    const typeAnnotation = typescript ? ": CredentialDefinition" : "";

    return `${imports}
const ${className}Credentials${typeAnnotation} = {
  name: '${name}Api',
  displayName: '${displayName} API',
  documentationUrl: 'https://example.com/docs',
  properties: [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      required: true,
      default: '',
      description: 'API key for authentication'
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      required: false,
      default: 'https://api.example.com',
      description: 'Base URL for the API'
    }
  ]${typescript ? " as NodeProperty[]" : ""},
  authenticate: {
    type: 'generic',
    properties: {
      headers: {
        'Authorization': '=Bearer {{$credentials.apiKey}}'
      }
    }
  }
};

${typescript ? "export default" : "module.exports ="} ${className}Credentials;
`;
  }

  /**
   * Get test template
   */
  private getTestTemplate(options: NodeTemplateOptions): string {
    const { name, typescript } = options;
    const className = this.toPascalCase(name);

    const imports = typescript
      ? `
import ${className}Node from '../nodes/${name}.node';
import { NodeInputData, NodeExecutionContext } from '../types/node.types';
`
      : `
const ${className}Node = require('../nodes/${name}.node');
`;

    return `${imports}

describe('${className}Node', () => {
  let mockContext${typescript ? ": Partial<NodeExecutionContext>" : ""};

  beforeEach(() => {
    mockContext = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn(),
      getInputData: jest.fn(),
      helpers: {
        request: jest.fn(),
        requestWithAuthentication: jest.fn(),
        returnJsonArray: jest.fn(),
        normalizeItems: jest.fn()
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };
  });

  test('should have correct node definition', () => {
    expect(${className}Node.type).toBe('${name}');
    expect(${className}Node.displayName).toBe('${options.displayName}');
    expect(${className}Node.name).toBe('${name}');
    expect(${className}Node.version).toBe(1);
  });

  test('should execute successfully with valid input', async () => {
    const inputData${typescript ? ": NodeInputData" : ""} = {
      main: [[
        { json: { test: 'data' } }
      ]]
    };

    // Mock parameter values
    (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName) => {
      switch (paramName) {
        case 'operation':
        case 'transformType':
          return 'process';
        case 'fieldName':
          return 'testField';
        default:
          return undefined;
      }
    });

    const result = await ${className}Node.execute.call(mockContext, inputData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should handle empty input data', async () => {
    const inputData${typescript ? ": NodeInputData" : ""} = {
      main: [[]]
    };

    (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName) => {
      switch (paramName) {
        case 'operation':
        case 'transformType':
          return 'process';
        default:
          return undefined;
      }
    });

    const result = await ${className}Node.execute.call(mockContext, inputData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test('should throw error for invalid operation', async () => {
    const inputData${typescript ? ": NodeInputData" : ""} = {
      main: [[
        { json: { test: 'data' } }
      ]]
    };

    (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName) => {
      if (paramName === 'operation' || paramName === 'transformType') {
        return 'invalid';
      }
      return undefined;
    });

    await expect(
      ${className}Node.execute.call(mockContext, inputData)
    ).rejects.toThrow();
  });
});
`;
  }

  /**
   * Get Jest configuration
   */
  private getJestConfig(): string {
    return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'credentials/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
`;
  }

  /**
   * Get README template
   */
  private getReadmeTemplate(options: NodeTemplateOptions): string {
    const { name, displayName, description, type, author } = options;

    return `# ${displayName} Node

${description}

## Installation

\`\`\`bash
npm install ${this.sanitizePackageName(name)}
\`\`\`

## Usage

This is a ${type} node that can be used in nodeDrop workflows.

### Node Properties

- **Type**: ${type}
- **Version**: ${options.version || "1.0.0"}
- **Group**: ${options.group?.join(", ") || "transform"}

### Configuration

[Add configuration details here]

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

\`\`\`bash
# Install dependencies
npm install

# Build the project${
      options.typescript
        ? `
npm run build`
        : ""
    }

# Run tests${
      options.includeTests
        ? `
npm test`
        : ""
    }
\`\`\`

${
  options.typescript
    ? `### TypeScript

This project is written in TypeScript. Run \`npm run build\` to compile to JavaScript.

\`\`\`bash
# Watch mode for development
npm run dev
\`\`\`
`
    : ""
}

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Run the test suite
6. Submit a pull request

## License

MIT${
      author
        ? `

## Author

${author}`
        : ""
    }
`;
  }

  /**
   * Sanitize package name for npm
   */
  private sanitizePackageName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
