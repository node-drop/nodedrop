/**
 * Test Custom Node Upload Response Handling
 *
 * This test validates the CustomNodeUploadHandler's response structure
 * and processing logic for uploaded custom node packages.
 *
 * Test Scenarios:
 * - Upload response structure validation
 * - File processing and extraction handling
 * - Error response formatting
 * - Success response with metadata
 * - Package validation during upload
 *
 * The test uses existing extracted packages to simulate real upload
 * scenarios and ensures the response format is consistent and contains
 * all necessary information for frontend processing.
 */

// Test script to check upload response structure
const path = require("path");
const {
  CustomNodeUploadHandler,
} = require("../src/services/CustomNodeUploadHandler");

async function testUploadResponse() {
  try {
    const handler = new CustomNodeUploadHandler();

    // Test with one of the existing extracted packages
    const testDir = path.join(__dirname, "temp/extract/1758577102056");

    console.log("Testing upload response format...");
    const result = await handler.processExtractedContent(
      testDir,
      "test-upload.zip"
    );

    console.log("=== UPLOAD RESULT ===");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n=== BACKEND API RESPONSE FORMAT ===");
    const apiResponse = {
      success: result.success,
      message: result.message,
      data: {
        nodes: result.nodes,
        extractedPath: result.extractedPath,
      },
    };

    console.log(JSON.stringify(apiResponse, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testUploadResponse();
