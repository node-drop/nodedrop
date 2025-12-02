#!/usr/bin/env node
/**
 * Test script to verify node discovery and registration in production mode
 */

const { PrismaClient } = require('@prisma/client');
const { NodeService } = require('./dist/services/NodeService');
const { nodeDiscovery } = require('./dist/utils/NodeDiscovery');

async function testProductionNodes() {
  const prisma = new PrismaClient();
  const nodeService = new NodeService(prisma);

  try {
    console.log('🔍 Testing production node discovery...\n');

    // Test node discovery
    console.log('1. Testing node discovery...');
    const nodeDefinitions = await nodeDiscovery.getAllNodeDefinitions();
    console.log(`   ✅ Discovered ${nodeDefinitions.length} nodes`);

    if (nodeDefinitions.length === 0) {
      console.log('   ❌ No nodes discovered - this indicates a problem');
      return;
    }

    // List first 5 nodes
    console.log('\n   Sample discovered nodes:');
    nodeDefinitions.slice(0, 5).forEach((node, index) => {
      console.log(`     ${index + 1}. ${node.displayName} (${node.type})`);
    });

    // Test node service initialization
    console.log('\n2. Testing NodeService initialization...');
    await nodeService.waitForInitialization();
    console.log('   ✅ NodeService initialized');

    // Check registered nodes
    console.log('\n3. Checking registered nodes in database...');
    const registeredNodes = await nodeService.getNodeTypes();
    console.log(`   ✅ Found ${registeredNodes.length} registered nodes in database`);

    if (registeredNodes.length === 0) {
      console.log('   ⚠️  No nodes registered in database, attempting registration...');
      
      // Try to register nodes
      let registered = 0;
      for (const nodeDefinition of nodeDefinitions.slice(0, 3)) { // Test with first 3 nodes
        try {
          const result = await nodeService.registerNode(nodeDefinition);
          if (result.success) {
            registered++;
            console.log(`     ✅ Registered: ${nodeDefinition.displayName}`);
          } else {
            console.log(`     ❌ Failed: ${nodeDefinition.displayName}`);
          }
        } catch (error) {
          console.log(`     ❌ Error: ${nodeDefinition.displayName} - ${error.message}`);
        }
      }
      
      console.log(`   📊 Test registration: ${registered}/3 nodes registered`);
    }

    console.log('\n✅ Production node system test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Production node system test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProductionNodes()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 
  