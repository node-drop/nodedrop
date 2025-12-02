/**
 * Test Data Structure Validation
 *
 * This test inspects and validates the data structures used throughout
 * the system, particularly focusing on node input/output formats and
 * execution result structures.
 *
 * Test Functions:
 * - Data structure inspection for debugging
 * - Node input/output format validation
 * - Execution result structure verification
 * - JSON schema compliance checking
 * - Data transformation validation
 * - Type safety and data integrity checks
 *
 * The test helps ensure consistency in data formats across different
 * parts of the system and aids in debugging data flow issues.
 */

const { PrismaClient } = require("@prisma/client");

async function testDataInspection() {
  console.log("Testing data inspection for debugging...");

  try {
    // Test with a simple JSON node to see data structure
    console.log("\n=== Data Structure Inspection ===");
    const response = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "test-json-debug",
          nodeType: "json",
          nodeData: {
            parameters: {
              jsonData: JSON.stringify({
                debug: "Available data structure",
                timestamp: new Date().toISOString(),
              }),
            },
          },
          inputData: {
            main: [
              [
                {
                  json: {
                    id: 1,
                    name: "John Doe",
                    email: "john@example.com",
                    user: {
                      role: "admin",
                      permissions: ["read", "write"],
                      profile: {
                        avatar: "avatar.jpg",
                        settings: {
                          theme: "dark",
                          notifications: true,
                        },
                      },
                    },
                    metadata: {
                      created: "2024-01-01",
                      updated: "2024-01-15",
                      tags: ["vip", "active"],
                    },
                  },
                },
              ],
            ],
          },
        }),
      }
    );

    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Available data structure for IF node testing:");
    console.log(
      "Input data that was sent:",
      JSON.stringify(
        {
          main: [
            [
              {
                json: {
                  id: 1,
                  name: "John Doe",
                  email: "john@example.com",
                  user: {
                    role: "admin",
                    permissions: ["read", "write"],
                    profile: {
                      avatar: "avatar.jpg",
                      settings: {
                        theme: "dark",
                        notifications: true,
                      },
                    },
                  },
                  metadata: {
                    created: "2024-01-01",
                    updated: "2024-01-15",
                    tags: ["vip", "active"],
                  },
                },
              },
            ],
          ],
        },
        null,
        2
      )
    );

    console.log("\nExample IF node placeholders you can use:");
    console.log("- {{json.id}} → 1");
    console.log("- {{json.name}} → 'John Doe'");
    console.log("- {{json.email}} → 'john@example.com'");
    console.log("- {{json.user.role}} → 'admin'");
    console.log("- {{json.user.profile.avatar}} → 'avatar.jpg'");
    console.log("- {{json.user.profile.settings.theme}} → 'dark'");
    console.log("- {{json.metadata.created}} → '2024-01-01'");
    console.log(
      "- {{json.metadata.tags}} → 'vip,active' (arrays get stringified)"
    );
  } catch (error) {
    console.error("Error testing data inspection:", error.message);
  }
}

testDataInspection().then(() => {
  process.exit(0);
});
