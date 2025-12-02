const path = require("path");

// Mock the logger to avoid import issues
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

// Create a simple test module
const testNodeTemplateGenerator = async () => {

  try {
    // Import the class (we'll use TypeScript compilation or tsx to run this)
    const {
      NodeTemplateGenerator,
    } = require("../backend/src/services/NodeTemplateGenerator.ts");

    const generator = new NodeTemplateGenerator();

    const testOptions = {
      name: "test-node",
      displayName: "Test Node",
      description: "A test node for demonstrating zip generation",
      type: "action",
      author: "Test Author",
      version: "1.0.0",
      group: ["test", "demo"],
      includeCredentials: true,
      includeTests: true,
      typescript: true,
    };

    const result = await generator.generateNodePackageZip(testOptions);

    if (result.success) {
      // Try to save the zip file to verify it's valid
      const fs = require("fs");
      const outputDir = path.join(__dirname, "test-output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, result.filename);
      fs.writeFileSync(outputPath, result.zipBuffer);

      // Try to read the zip and verify it contains expected files
      const AdmZip = require("adm-zip");
      const zip = new AdmZip(result.zipBuffer);
      const entries = zip.getEntries();

      const expectedFiles = [
        "package.json",
        "src/index.ts",
        "src/nodes/test-node.node.ts",
        "src/credentials/test-node.credentials.ts",
        "__tests__/test-node.test.ts",
        "jest.config.js",
        "tsconfig.json",
        "README.md",
        ".gitignore",
      ];

      const missingFiles = expectedFiles.filter(
        (expectedFile) =>
          !entries.find((entry) => entry.entryName === expectedFile)
      );

      if (missingFiles.length === 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Run the test
if (require.main === module) {
  testNodeTemplateGenerator()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = { testNodeTemplateGenerator };
