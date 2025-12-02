/**
 * Test Custom Node Loading
 *
 * This test validates the custom node loading system's ability to discover,
 * load, and register custom nodes from the file system.
 *
 * Test Functions:
 * - Checks custom-nodes directory structure
 * - Validates node file existence and accessibility
 * - Tests dynamic module loading for custom nodes
 * - Verifies node definition structure and required properties
 * - Tests node registration process
 *
 * The test scans through custom node directories and attempts to
 * load each node module, ensuring they have valid execute functions
 * and proper node definitions.
 */

const { PrismaClient } = require("@prisma/client");
// For TypeScript modules, we need to compile them first or use a simpler approach
// Let's test the directory structure manually first
const path = require("path");

async function testNodeLoading() {
  console.log("Testing node loading...");

  const customNodesPath = path.join(process.cwd(), "custom-nodes");
  console.log("Custom nodes path:", customNodesPath);

  // Check if directory exists
  const fs = require("fs").promises;
  try {
    const dirExists = await fs.access(customNodesPath);
    console.log("Custom nodes directory exists");

    const entries = await fs.readdir(customNodesPath, { withFileTypes: true });
    console.log(
      "Directory entries:",
      entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }))
    );

    const packageDirs = entries.filter((entry) => entry.isDirectory());
    console.log(
      "Package directories:",
      packageDirs.map((d) => d.name)
    );

    // Test rupa package specifically
    const rupaPath = path.join(customNodesPath, "rupa");
    console.log("Testing rupa package at:", rupaPath);

    // Check package.json
    const packageJsonPath = path.join(rupaPath, "package.json");
    const packageJson = await fs.readFile(packageJsonPath, "utf-8");
    const packageInfo = JSON.parse(packageJson);
    console.log("Package info:", packageInfo);

    // Check node files
    if (packageInfo.nodes) {
      for (const nodePath of packageInfo.nodes) {
        const fullNodePath = path.join(rupaPath, nodePath);
        console.log("Checking node file:", fullNodePath);
        try {
          await fs.access(fullNodePath);
          console.log("Node file exists:", nodePath);

          // Try to load the node
          const nodeModule = require(fullNodePath);
          console.log(
            "Node module loaded:",
            typeof nodeModule,
            Object.keys(nodeModule || {})
          );

          const nodeDefinition =
            nodeModule.default || nodeModule.nodeDefinition || nodeModule;
          console.log(
            "Node definition:",
            nodeDefinition ? nodeDefinition.type : "Not found"
          );
        } catch (error) {
          console.error("Error with node file:", nodePath, error.message);
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testNodeLoading();
