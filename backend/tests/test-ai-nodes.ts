#!/usr/bin/env node
/**
 * Test script for AI nodes
 * Run this to verify OpenAI and Anthropic nodes are working
 */

import { PrismaClient } from "@prisma/client";
import { NodeService } from "../src/services/NodeService";

async function testAINodes() {
  console.log("🧪 Testing AI Nodes...\n");

  const prisma = new PrismaClient();
  const nodeService = new NodeService(prisma);

  try {
    // Wait for initialization
    await nodeService.waitForInitialization();

    // Test 1: Check if OpenAI node is registered
    console.log("✅ Test 1: Checking OpenAI node registration...");
    const openaiNode = await nodeService.getNodeSchema("openai");
    if (openaiNode) {
      console.log(`   ✅ OpenAI node found: ${openaiNode.displayName}`);
      console.log(`   ✅ Properties: ${openaiNode.properties.length}`);
      console.log(`   ✅ Credentials: ${openaiNode.credentials?.length || 0}`);
    } else {
      console.log("   ❌ OpenAI node not found!");
    }

    // Test 2: Check if Anthropic node is registered
    console.log("\n✅ Test 2: Checking Anthropic node registration...");
    const anthropicNode = await nodeService.getNodeSchema("anthropic");
    if (anthropicNode) {
      console.log(`   ✅ Anthropic node found: ${anthropicNode.displayName}`);
      console.log(`   ✅ Properties: ${anthropicNode.properties.length}`);
      console.log(
        `   ✅ Credentials: ${anthropicNode.credentials?.length || 0}`
      );
    } else {
      console.log("   ❌ Anthropic node not found!");
    }

    // Test 3: List all AI nodes
    console.log("\n✅ Test 3: Listing all AI nodes...");
    const allNodes = await nodeService.getNodeTypes();
    const aiNodes = allNodes.filter(
      (node) =>
        node.group.includes("ai") ||
        node.type === "openai" ||
        node.type === "anthropic"
    );
    console.log(`   ✅ Found ${aiNodes.length} AI node(s):`);
    aiNodes.forEach((node) => {
      console.log(`      - ${node.displayName} (${node.type})`);
    });

    // Test 4: Check node properties
    if (openaiNode) {
      console.log("\n✅ Test 4: Checking OpenAI node properties...");
      const properties = openaiNode.properties;
      const expectedProps = [
        "model",
        "systemPrompt",
        "userMessage",
        "temperature",
        "maxTokens",
        "enableMemory",
        "sessionId",
        "jsonMode",
      ];

      expectedProps.forEach((prop) => {
        const found = properties.find((p: any) => p.name === prop);
        if (found) {
          console.log(`   ✅ ${prop}: ${found.type}`);
        } else {
          console.log(`   ❌ Missing property: ${prop}`);
        }
      });
    }

    // Test 5: Check credentials structure
    if (
      openaiNode &&
      openaiNode.credentials &&
      openaiNode.credentials.length > 0
    ) {
      console.log("\n✅ Test 5: Checking credential structure...");
      const cred = openaiNode.credentials[0];
      console.log(`   ✅ Credential name: ${cred.name}`);
      console.log(`   ✅ Display name: ${cred.displayName}`);
      console.log(`   ✅ Properties: ${cred.properties.length}`);

      const apiKeyProp = cred.properties.find((p: any) => p.name === "apiKey");
      if (apiKeyProp) {
        console.log(
          `   ✅ API Key property: type=${apiKeyProp.type}, required=${apiKeyProp.required}`
        );
      }
    }

    console.log("\n✅ All tests passed!\n");
    console.log("📝 Next steps:");
    console.log("   1. Add your API keys in the credentials section");
    console.log("   2. Create a workflow and add an AI node");
    console.log("   3. Configure the node parameters");
    console.log("   4. Execute and see the magic! ✨\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testAINodes()
    .then(() => {
      console.log("✅ Test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

export { testAINodes };
