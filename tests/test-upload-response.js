// Test script to check upload response structure
const path = require("path");
const {
  CustomNodeUploadHandler,
} = require("../backend/src/services/CustomNodeUploadHandler");

async function testUploadResponse() {
  try {
    const handler = new CustomNodeUploadHandler();

    // Test with one of the existing extracted packages
    const testDir = path.join(__dirname, "temp/extract/1758577102056");

    const result = await handler.processExtractedContent(
      testDir,
      "test-upload.zip"
    );

    const apiResponse = {
      success: result.success,
      message: result.message,
      data: {
        nodes: result.nodes,
        extractedPath: result.extractedPath,
      },
    };
  } catch (error) {
    // Test failed
  }
}

testUploadResponse();
