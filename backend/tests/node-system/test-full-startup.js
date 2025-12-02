#!/usr/bin/env node
/**
 * Test script to simulate full production startup with NodeLoader
 */

const { PrismaClient } = require('@prisma/client');
const { NodeService } = require('./dist/services/NodeService');
const { CredentialService } = require('./dist/services/CredentialService');
const { NodeLoader } = require('./dist/services/NodeLoader');

async function testFullStartup() {
  const prisma = new PrismaClient();
  const nodeService = new NodeService(prisma);
  const credentialService = new CredentialService();
  const nodeLoader = new NodeLoader(nodeService, credentialService, prisma);

  try {
    console.log('🚀 Testing full production startup simulation...\n');

    // Step 1: Initialize built-in nodes (like in production)
    console.log('1. Initializing built-in nodes...');
    await nodeService.waitForInitialization();
    
    const builtInNodes = await nodeService.getNodeTypes();
    console.log(`   ✅ Built-in nodes initialized: ${builtInNodes.length} nodes`);

    // Step 2: Initialize NodeLoader (loads custom nodes)
    console.log('\n2. Initializing NodeLoader (custom nodes)...');
    await nodeLoader.initialize();
    console.log('   ✅ NodeLoader initialized');

    // Step 3: Check total nodes after full initialization
    console.log('\n3. Checking total registered nodes...');
    const allNodes = await nodeService.getNodeTypes();
    console.log(`   📦 Total nodes registered: ${allNodes.length}`);
    
    // Find MySQL node
    const mysqlNode = allNodes.find(node => node.type === 'mysql');
    if (mysqlNode) {
      console.log('   ✅ MySQL node found in registry');
      console.log(`   📋 Display Name: ${mysqlNode.displayName}`);
      console.log(`   📋 Properties: ${mysqlNode.properties?.length || 0}`);
    } else {
      console.log('   ❌ MySQL node NOT found in registry');
    }

    // Step 4: Check credential types
    console.log('\n4. Checking credential types...');
    const credentialTypes = credentialService.getCredentialTypes();
    console.log(`   🔐 Total credential types: ${credentialTypes.length}`);
    
    const mysqlCredType = credentialTypes.find(cred => cred.name === 'mysqlDb');
    if (mysqlCredType) {
      console.log('   ✅ MySQL credential type found');
      console.log(`   📋 Display name: ${mysqlCredType.displayName}`);
    } else {
      console.log('   ❌ MySQL credential type NOT found');
    }

    // Step 5: Test node schema retrieval
    console.log('\n5. Testing MySQL node schema...');
    try {
      const schema = await nodeService.getNodeSchema('mysql');
      if (schema) {
        console.log('   ✅ MySQL schema retrieved successfully');
        console.log(`   📋 Properties: ${schema.properties?.length || 0}`);
        console.log(`   📋 Inputs: ${schema.inputs?.length || 0}`);
        console.log(`   📋 Outputs: ${schema.outputs?.length || 0}`);
        
        // Check if credentials are properly defined
        if (schema.properties) {
          const authProperty = schema.properties.find(p => p.name === 'authentication');
          if (authProperty) {
            console.log('   ✅ Authentication property found');
            console.log(`   📋 Allowed types: ${authProperty.allowedTypes?.join(', ') || 'none'}`);
          }
        }
      } else {
        console.log('   ❌ MySQL schema not found');
      }
    } catch (error) {
      console.log('   ❌ Error retrieving schema:', error.message);
    }

    // Step 6: Test node execution with proper error handling
    console.log('\n6. Testing MySQL node execution...');
    try {
      const testInputData = {
        main: [{ json: { test: 'data' } }]
      };
      
      const testParameters = {
        operation: 'executeQuery',
        query: 'SELECT 1 as test',
        queryParams: '',
        authentication: 'test-cred-id' // This will fail, but we want to see the right error
      };
      
      const result = await nodeService.executeNode(
        'mysql',
        testParameters,
        testInputData,
        { mysqlDb: 'test-cred-id' }, // Mock credential mapping
        'test-exec-id',
        'test-user'
      );
      
      if (result.success) {
        console.log('   ✅ Node execution succeeded (unexpected)');
      } else {
        console.log('   ⚠️  Node execution failed (expected due to missing credentials)');
        console.log(`   📋 Error: ${result.error?.message}`);
        
        // Check if it's the right kind of error
        if (result.error?.message.includes('credential')) {
          console.log('   ✅ Correct credential-related error - node is working');
        } else if (result.error?.message.includes('Node type not found')) {
          console.log('   ❌ PROBLEM: Node not found error - registration issue');
        } else {
          console.log('   ❓ Other error type');
        }
      }
      
    } catch (execError) {
      console.log('   ❌ Execution threw error:', execError.message);
    }

    console.log('\n✅ Full startup test completed!');
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   • Built-in nodes: ${builtInNodes.length}`);
    console.log(`   • Total nodes: ${allNodes.length}`);
    console.log(`   • Custom nodes: ${allNodes.length - builtInNodes.length}`);
    console.log(`   • Credential types: ${credentialTypes.length}`);
    console.log(`   • MySQL node: ${mysqlNode ? '✅ Working' : '❌ Missing'}`);
    console.log(`   • MySQL credentials: ${mysqlCredType ? '✅ Working' : '❌ Missing'}`);
    
  } catch (error) {
    console.error('\n❌ Full startup test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFullStartup()
  .then(() => {
    console.log('\n🎉 Full startup test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });