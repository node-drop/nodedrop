#!/usr/bin/env node
/**
 * CLI tool for managing nodes
 * Provides commands to create, list, and manage nodes in the new structure
 */

import * as fs from "fs";
import * as path from "path";
import { db } from "../config/database";
import { NodeService } from "../services";
import { NodeDiscovery } from "../utils/NodeDiscovery";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

const NODES_DIR = path.join(__dirname, "..", "nodes");

class NodeCLI {
  private nodeService?: NodeService;
  private nodeDiscovery: NodeDiscovery;

  constructor() {
    this.nodeDiscovery = new NodeDiscovery(NODES_DIR);
    // Don't initialize NodeService automatically to avoid unwanted registration
  }

  private async getNodeService(): Promise<NodeService> {
    if (!this.nodeService) {
      this.nodeService = new NodeService();
    }
    return this.nodeService;
  }

  async cleanup(): Promise<void> {
    // Drizzle ORM doesn't require explicit disconnect
  }

  async listNodes(): Promise<void> {
    console.log("📋 Available nodes:\n");

    try {
      // Get both built-in and custom nodes
      const nodesByDir = await this.nodeDiscovery.getNodesByDirectory();
      const customNodeInfos = await this.nodeDiscovery.loadCustomNodes();

      if (Object.keys(nodesByDir).length === 0 && customNodeInfos.length === 0) {
        console.log("   No nodes found");
        return;
      }

      // Display built-in nodes
      if (Object.keys(nodesByDir).length > 0) {
        console.log("🔧 Built-in Nodes:\n");
        for (const [dirName, nodes] of Object.entries(nodesByDir)) {
          console.log(`📁 ${dirName}/`);
          nodes.forEach((node) => {
            console.log(`   └─ ${node.displayName} (${node.name})`);
            if (node.description) {
              console.log(`      ${node.description}`);
            }
          });
          console.log("");
        }
      }

      // Display custom nodes
      if (customNodeInfos.length > 0) {
        console.log("📦 Custom Nodes:\n");
        
        // Group custom nodes by package
        const customNodesByPackage: Record<string, typeof customNodeInfos> = {};
        customNodeInfos.forEach((nodeInfo) => {
          const packageName = nodeInfo.name.split('/')[0];
          if (!customNodesByPackage[packageName]) {
            customNodesByPackage[packageName] = [];
          }
          customNodesByPackage[packageName].push(nodeInfo);
        });

        for (const [packageName, nodes] of Object.entries(customNodesByPackage)) {
          console.log(`📦 ${packageName}/`);
          nodes.forEach((nodeInfo) => {
            console.log(`   └─ ${nodeInfo.definition.displayName} (${nodeInfo.definition.name})`);
            if (nodeInfo.definition.description) {
              console.log(`      ${nodeInfo.definition.description}`);
            }
          });
          console.log("");
        }
      }

      const builtInCount = Object.values(nodesByDir).flat().length;
      const customCount = customNodeInfos.length;
      const totalCount = builtInCount + customCount;

      console.log(`📊 Summary:`);
      console.log(`   Built-in: ${builtInCount} nodes`);
      console.log(`   Custom: ${customCount} nodes`);
      console.log(`   Total: ${totalCount} nodes`);
    } catch (error) {
      console.error("❌ Error listing nodes:", error);
    }
  }

  async createNode(): Promise<void> {
    const nodeName = process.argv[3];
    if (!nodeName) {
      console.error("❌ Error: Node name is required");
      console.log("Usage: npm run nodes:create <NodeName>");
      process.exit(1);
    }

    const nodeDir = path.join(NODES_DIR, nodeName);

    if (fs.existsSync(nodeDir)) {
      console.error(`❌ Node directory ${nodeName} already exists`);
      return;
    }

    try {
      // Create directory
      await fs.promises.mkdir(nodeDir, { recursive: true });

      // Create node file
      const nodeFileContent = `import {
  BuiltInNodeTypes,
  NodeDefinition,
  NodeInputData,
  NodeOutputData,
} from "../types/node.types";

export const ${nodeName}Node: NodeDefinition = {
  type: "${nodeName.toUpperCase()}_NODE" as BuiltInNodeTypes,
  displayName: "${nodeName}",
  name: "${nodeName.toLowerCase()}",
  icon: "fa:cube",
  group: ["utility"],
  version: 1,
  description: "A custom ${nodeName} node",
  defaults: {},
  inputs: [],
  outputs: [],
  properties: [],
  execute: async (inputData: NodeInputData): Promise<NodeOutputData> => {
    console.log("Executing ${nodeName} node with data:", inputData);
    
    // Add your node logic here
    return {
      success: true,
      data: inputData,
    };
  },
};
`;

      const nodeFilePath = path.join(nodeDir, `${nodeName}.node.ts`);
      await fs.promises.writeFile(nodeFilePath, nodeFileContent);

      // Create index file
      const indexContent = `export { ${nodeName}Node } from "./${nodeName}.node";
`;

      const indexPath = path.join(nodeDir, "index.ts");
      await fs.promises.writeFile(indexPath, indexContent);

      console.log(`✅ Node ${nodeName} created successfully!`);
      console.log(`📁 Directory: ${nodeDir}`);
      console.log(`📄 Files created:`);
      console.log(`   - ${nodeName}.node.ts`);
      console.log(`   - index.ts`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Edit ${nodeName}.node.ts to implement your logic`);
      console.log(`   2. Run: npm run nodes:discover`);
      console.log(`   3. Run: npm run nodes:register`);
    } catch (error) {
      console.error("❌ Error creating node:", error);
    }
  }

  async discoverNodes(): Promise<void> {
    console.log("🔍 Discovering nodes...\n");

    try {
      const nodesByDir = await this.nodeDiscovery.getNodesByDirectory();
      const totalNodes = Object.values(nodesByDir).flat().length;

      console.log(`📊 Discovery Summary:`);
      console.log(
        `   📁 Directories scanned: ${Object.keys(nodesByDir).length}`
      );
      console.log(`   📦 Nodes discovered: ${totalNodes}`);
      console.log("");

      if (totalNodes > 0) {
        console.log("📋 Discovered nodes:");
        for (const [dirName, nodes] of Object.entries(nodesByDir)) {
          console.log(`\n📁 ${dirName}/`);
          nodes.forEach((node) => {
            console.log(`   ✅ ${node.displayName}`);
            console.log(`      Type: ${node.name}`);
            console.log(`      Group: ${node.group.join(", ")}`);
            if (node.description) {
              console.log(`      Description: ${node.description}`);
            }
            console.log("");
          });
        }
      }
    } catch (error) {
      console.error("❌ Error during discovery:", error);
    }
  }

  async validateNodes(): Promise<void> {
    console.log("🔍 Validating node structure...\n");

    try {
      const directories = await fs.promises.readdir(NODES_DIR, {
        withFileTypes: true,
      });

      let valid = 0;
      let invalid = 0;

      for (const dir of directories) {
        if (dir.isDirectory()) {
          const dirPath = path.join(NODES_DIR, dir.name);
          const isValid = await this.validateSingleNode(dir.name, dirPath);

          if (isValid) {
            valid++;
          } else {
            invalid++;
          }
        }
      }

      console.log(`\n📊 Validation Summary:`);
      console.log(`   ✅ Valid: ${valid}`);
      console.log(`   ❌ Invalid: ${invalid}`);
      console.log(
        `   📁 Total: ${directories.filter((d) => d.isDirectory()).length}`
      );
    } catch (error) {
      console.error("❌ Error validating structure:", error);
    }
  }

  async registerNodes(): Promise<void> {
    console.log("📦 Registering nodes...\n");

    try {
      const nodeService = await this.getNodeService();
      await nodeService.registerDiscoveredNodes();
      console.log("✅ All nodes registered successfully!");
    } catch (error) {
      console.error("❌ Error registering nodes:", error);
    }
  }

  async activateNode(): Promise<void> {
    const nodeName = process.argv[3];
    if (!nodeName) {
      console.error("❌ Error: Node name is required");
      console.log("Usage: npm run nodes:activate <node-name>");
      process.exit(1);
    }

    try {
      const nodeService = await this.getNodeService();
      const result = await nodeService.activateNode(nodeName);
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error activating node:", error);
      process.exit(1);
    }
  }

  async deactivateNode(): Promise<void> {
    const nodeName = process.argv[3];
    if (!nodeName) {
      console.error("❌ Error: Node name is required");
      console.log("Usage: npm run nodes:deactivate <node-name>");
      process.exit(1);
    }

    try {
      const nodeService = await this.getNodeService();
      const result = await nodeService.deactivateNode(nodeName);
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error deactivating node:", error);
      process.exit(1);
    }
  }

  async showNodesStatus(): Promise<void> {
    try {
      // Direct database query without triggering node registration
      const { desc, asc } = await import("drizzle-orm");
      const nodes = await db.query.nodeTypes.findMany({
        columns: {
          name: true,
          displayName: true,
          active: true,
          group: true,
          description: true,
        },
        orderBy: (fields: any) => [
          desc(fields.active),
          asc(fields.displayName),
        ],
      });

      if (nodes.length === 0) {
        console.log("📭 No nodes found");
        return;
      }

      console.log("📊 Node Status Report");
      console.log("=".repeat(80));

      const activeNodes = nodes.filter((node: any) => node.active);
      const inactiveNodes = nodes.filter((node: any) => !node.active);

      console.log(`\n🟢 Active Nodes (${activeNodes.length}):`);
      if (activeNodes.length > 0) {
        activeNodes.forEach((node: any) => {
          console.log(`  ✅ ${node.displayName} (${node.name})`);
          console.log(`     ${node.description || "No description"}`);
          console.log("");
        });
      } else {
        console.log("  No active nodes");
      }

      console.log(`\n🔴 Inactive Nodes (${inactiveNodes.length}):`);
      if (inactiveNodes.length > 0) {
        inactiveNodes.forEach((node: any) => {
          console.log(`  ❌ ${node.displayName} (${node.name})`);
          console.log(`     ${node.description || "No description"}`);
          console.log("");
        });
      } else {
        console.log("  No inactive nodes");
      }

      console.log(
        `\n📈 Summary: ${activeNodes.length} active, ${inactiveNodes.length} inactive, ${nodes.length} total`
      );
    } catch (error) {
      console.error("❌ Error getting node status:", error);
      process.exit(1);
    }
  }

  async activateAllNodes(): Promise<void> {
    try {
      const nodeService = await this.getNodeService();
      const allNodes = await nodeService.getNodesWithStatus();
      const nodeTypes = allNodes.map((node) => node.name);

      if (nodeTypes.length === 0) {
        console.log("📭 No nodes found to activate");
        return;
      }

      const result = await nodeService.bulkUpdateNodeStatus(nodeTypes, true);
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error activating all nodes:", error);
      process.exit(1);
    }
  }

  async deactivateAllNodes(): Promise<void> {
    try {
      const nodeService = await this.getNodeService();
      const allNodes = await nodeService.getNodesWithStatus();
      const nodeTypes = allNodes.map((node) => node.name);

      if (nodeTypes.length === 0) {
        console.log("📭 No nodes found to deactivate");
        return;
      }

      const result = await nodeService.bulkUpdateNodeStatus(nodeTypes, false);
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error deactivating all nodes:", error);
      process.exit(1);
    }
  }

  private async validateSingleNode(
    dirName: string,
    dirPath: string
  ): Promise<boolean> {
    try {
      const files = await fs.promises.readdir(dirPath);

      // Check for required files
      const hasIndex = files.includes("index.ts");
      const hasNodeFile = files.some((file) => file.endsWith(".node.ts"));

      if (hasIndex && hasNodeFile) {
        console.log(`✅ ${dirName} - Valid structure`);
        return true;
      } else {
        console.log(`❌ ${dirName} - Invalid structure`);
        if (!hasIndex) console.log(`   - Missing index.ts file`);
        if (!hasNodeFile) console.log(`   - Missing .node.ts file`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${dirName} - Error accessing directory: ${error}`);
      return false;
    }
  }

  showHelp(): void {
    console.log("📦 Node Management CLI\n");
    console.log("📝 Available commands:");
    console.log(
      "  npm run nodes:list              - List all registered nodes"
    );
    console.log(
      "  npm run nodes:create <name>     - Create a new node package (scaffolding)"
    );
    console.log(
      "  npm run nodes:discover          - Discover and register all nodes"
    );
    console.log("  npm run nodes:validate <name>   - Validate a specific node");
    console.log(
      "  npm run nodes:register          - Register all discovered nodes"
    );
    console.log("  npm run nodes:activate <name>   - Activate a node");
    console.log("  npm run nodes:deactivate <name> - Deactivate a node");
    console.log(
      "  npm run nodes:status            - Show nodes with activation status"
    );
    console.log("  npm run nodes:activate-all      - Activate all nodes");
    console.log("  npm run nodes:deactivate-all    - Deactivate all nodes");
    console.log("");
  }
}

async function main() {
  const cli = new NodeCLI();
  const command = process.argv[2];

  try {
    switch (command) {
      case "list":
        await cli.listNodes();
        break;
      case "create":
        await cli.createNode();
        break;
      case "discover":
        await cli.discoverNodes();
        break;
      case "validate":
        await cli.validateNodes();
        break;
      case "register":
        await cli.registerNodes();
        break;
      case "activate":
        await cli.activateNode();
        break;
      case "deactivate":
        await cli.deactivateNode();
        break;
      case "status":
        await cli.showNodesStatus();
        break;
      case "activate-all":
        await cli.activateAllNodes();
        break;
      case "deactivate-all":
        await cli.deactivateAllNodes();
        break;
      case "help":
      case "--help":
      case "-h":
        cli.showHelp();
        break;
      default:
        console.error(`❌ Unknown command: ${command || "(none)"}`);
        cli.showHelp();
        process.exit(1);
    }
  } finally {
    await cli.cleanup();
  }
}

// Run the CLI
main().catch((error) => {
  console.error("❌ CLI Error:", error);
  process.exit(1);
});
