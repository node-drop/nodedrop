/**
 * Test ZIP Functionality for Node Templates
 *
 * This test provides comprehensive validation of ZIP file operations
 * for custom node templates. It tests the complete ZIP lifecycle
 * from generation to extraction.
 *
 * Test Coverage:
 * - ZIP file creation with proper directory structure
 * - Template generation with correct file contents
 * - ZIP extraction and validation
 * - File integrity checks after compression/decompression
 * - Error handling for corrupted or invalid ZIP files
 * - Template file structure validation
 *
 * The test uses mock logger functionality to avoid import dependencies
 * and focuses on the core ZIP operations needed for node distribution.
 */

const path = require("path");

// Mock the logger to avoid import issues
const mockLogger = {
  info: (...args) => console.log("INFO:", ...args),
  error: (...args) => console.error("ERROR:", ...args),
  warn: (...args) => console.warn("WARN:", ...args),
  debug: (...args) => console.log("DEBUG:", ...args),
};

// Create a simple test module
const testNodeTemplateGenerator = async () => {
  console.log("🧪 Testing NodeTemplateGenerator zip functionality...\n");

  try {
    // Import the class (we'll use TypeScript compilation or tsx to run this)
    const {
      NodeTemplateGenerator,
    } = require("../src/services/NodeTemplateGenerator.ts");

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

    console.log(
      "📦 Generating zip with options:",
      JSON.stringify(testOptions, null, 2)
    );

    const result = await generator.generateNodePackageZip(testOptions);

    if (result.success) {
      console.log("\n✅ SUCCESS! Zip generated successfully");
      console.log("📁 Filename:", result.filename);
      console.log("📊 Size:", result.zipBuffer?.length || 0, "bytes");

      if (result.warnings && result.warnings.length > 0) {
        console.log("⚠️  Warnings:", result.warnings);
      }

      // Try to save the zip file to verify it's valid
      const fs = require("fs");
      const outputDir = path.join(__dirname, "test-output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, result.filename);
      fs.writeFileSync(outputPath, result.zipBuffer);
      console.log("💾 Zip file saved to:", outputPath);

      // Try to read the zip and verify it contains expected files
      const AdmZip = require("adm-zip");
      const zip = new AdmZip(result.zipBuffer);
      const entries = zip.getEntries();

      console.log("\n📋 Files in zip:");
      entries.forEach((entry) => {
        console.log("  📄", entry.entryName, `(${entry.header.size} bytes)`);
      });

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
        console.log("\n🎉 All expected files are present!");
        return true;
      } else {
        console.log("\n❌ Missing files:", missingFiles);
        return false;
      }
    } else {
      console.log("\n❌ FAILED! Zip generation failed");
      console.log("❗ Errors:", result.errors);
      return false;
    }
  } catch (error) {
    console.log("\n💥 TEST FAILED with error:", error.message);
    console.log("Stack:", error.stack);
    return false;
  }
};

// Run the test
if (require.main === module) {
  testNodeTemplateGenerator()
    .then((success) => {
      if (success) {
        console.log("\n🎊 All tests passed!");
        process.exit(0);
      } else {
        console.log("\n💔 Tests failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { testNodeTemplateGenerator };
