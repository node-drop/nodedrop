const {
  NodeTemplateGenerator,
} = require("../backend/dist/services/NodeTemplateGenerator");
const fs = require("fs");
const path = require("path");

async function testZipGeneration() {
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
      // Save the zip file to test it
      const testOutputPath = path.join(
        __dirname,
        "test-output",
        result.filename
      );
      fs.mkdirSync(path.dirname(testOutputPath), { recursive: true });
      fs.writeFileSync(testOutputPath, result.zipBuffer);
    } else {
      throw new Error(`Zip generation failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    throw new Error(`Test failed: ${error.message}`);
  }
}

testZipGeneration();
