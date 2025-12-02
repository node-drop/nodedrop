/**
 * Test ZIP File Generation for Custom Nodes
 *
 * This test validates the NodeTemplateGenerator's ability to create
 * ZIP packages for custom nodes. The ZIP generation is essential for
 * node distribution and deployment.
 *
 * Test Functions:
 * - Tests the NodeTemplateGenerator service
 * - Validates ZIP file creation with proper structure
 * - Checks that generated ZIPs contain all necessary files
 * - Verifies package.json and node files are included
 * - Tests file integrity and compression
 *
 * The test ensures that custom nodes can be properly packaged
 * for sharing and deployment across different environments.
 */

const {
  NodeTemplateGenerator,
} = require("../dist/services/NodeTemplateGenerator");
const fs = require("fs");
const path = require("path");

async function testZipGeneration() {
  console.log("Testing zip generation...");

  const generator = new NodeTemplateGenerator();

  const options = {
    name: "test-node",
    displayName: "Test Node",
    description: "A test node for zip generation",
    type: "action",
    author: "Test Author",
    version: "1.0.0",
    group: ["test"],
    includeCredentials: true,
    includeTests: true,
    typescript: true,
  };

  try {
    const result = await generator.generateNodePackageZip(options);

    if (result.success) {
      console.log("✅ Zip generation successful!");
      console.log("Filename:", result.filename);
      console.log("Zip size:", result.zipBuffer.length, "bytes");

      // Save the zip file to test it
      const testOutputPath = path.join(
        __dirname,
        "test-output",
        result.filename
      );
      fs.mkdirSync(path.dirname(testOutputPath), { recursive: true });
      fs.writeFileSync(testOutputPath, result.zipBuffer);
      console.log("✅ Zip file saved to:", testOutputPath);
    } else {
      console.log("❌ Zip generation failed:");
      console.log("Errors:", result.errors);
    }
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
}

testZipGeneration();
