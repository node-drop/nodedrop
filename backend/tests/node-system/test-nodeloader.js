#!/usr/bin/env node
/**
 * Test script to debug NodeLoader and custom node auto-loading
 */

const { PrismaClient } = require('@prisma/client');
const { NodeService } = require('./dist/services/NodeService');
const { CredentialService } = require('./dist/services/CredentialService');
const { NodeLoader } = require('./dist/services/NodeLoader');
const path = require('path');
const fs = require('fs');

async function testNodeLoader() {
  const prisma = new PrismaClient();
  const nodeService = new NodeService(prisma);
  const credentialService = new CredentialService();

  try {
    console.log('🔍 Testing NodeLoader and custom node auto-loading...\n');

    // Check custom nodes directory
    const customNodesPath = path.join(process.cwd(), 'custom-nodes');
    console.log('1. Checking custom nodes directory...');
    console.log(`   📁 Custom nodes path: ${customNodesPath}`);
    
    const dirExists = fs.existsSync(customNodesPath);
    console.log(`   📁 Directory exists: ${dirExists}`);
    
    if (dirExists) {
      const entries = fs.readdirSync(customNodesPath, { withFileTypes: true });
      const packageDirs = entries.filter(entry => entry.isDirectory());
      console.log(`   📁 Package directories found: ${packageDirs.length}`);
      
      packageDirs.forEach(dir => {
        console.log(`     - ${dir.name}`);
        
        // Check if it has package.json
        const packageJsonPath = path.join(customNodesPath, dir.name, 'package.json');
        const hasPackageJson = fs.existsSync(packageJsonPath);
        console.log(`       📄 Has package.json: ${hasPackageJson}`);
        
        if (hasPackageJson) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            console.log(`       📦 Package name: ${packageJson.name}`);
            console.log(`       📦 Nodes: ${packageJson.nodes?.length || 0}`);
            console.log(`       📦 Credentials: ${packageJson.credentials?.length || 0}`);
            
            // Check if node files exist
            if (packageJson.nodes) {
              packageJson.nodes.forEach(nodePath => {
                const fullNodePath = path.join(customNodesPath, dir.name, nodePath);
                const nodeExists = fs.existsSync(fullNodePath);
                console.log(`       📄 Node file ${nodePath}: ${nodeExists ? '✅' : '❌'}`);
              });
            }
            
            // Check if credential files exist
            if (packageJson.credentials) {
              packageJson.credentials.forEach(credPath => {
                const fullCredPath = path.join(customNodesPath, dir.name, credPath);
                const credExists = fs.existsSync(fullCredPath);
                console.log(`       🔐 Credential file ${credPath}: ${credExists ? '✅' : '❌'}`);
              });
            }
          } catch (error) {
            console.log(`       ❌ Error reading package.json: ${error.message}`);
          }
        }
      });
    }

    // Initialize NodeLoader
    console.log('\n2. Initializing NodeLoader...');
    const nodeLoader = new NodeLoader(nodeService, credentialService, prisma);
    
    try {
      await nodeLoader.initialize();
      console.log('   ✅ NodeLoader initialized successfully');
    } catch (error) {
      console.log('   ❌ NodeLoader initialization failed:', error.message);
      console.log('   📋 Error details:', error);
    }

    // Check if MySQL node is now registered
    console.log('\n3. Checking if MySQL node is registered after NodeLoader init...');
    const nodeTypes = await nodeService.getNodeTypes();
    const mysqlNode = nodeTypes.find(node => node.type === 'mysql');
    
    if (mysqlNode) {
      console.log('   ✅ MySQL node found in registry after NodeLoader init');
    } else {
      console.log('   ❌ MySQL node still NOT found in registry');
    }

    // Check credential types
    console.log('\n4. Checking registered credential types...');
    const credentialTypes = credentialService.getCredentialTypes();
    console.log(`   📋 Total credential types: ${credentialTypes.length}`);
    
    const mysqlCredType = credentialTypes.find(cred => cred.name === 'mysqlDb');
    if (mysqlCredType) {
      console.log('   ✅ MySQL credential type found');
      console.log(`   📋 Display name: ${mysqlCredType.displayName}`);
    } else {
      console.log('   ❌ MySQL credential type NOT found');
      console.log('   📋 Available credential types:');
      credentialTypes.forEach(cred => {
        console.log(`     - ${cred.name} (${cred.displayName})`);
      });
    }

    console.log('\n✅ NodeLoader test completed!');
    
  } catch (error) {
    console.error('\n❌ NodeLoader test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNodeLoader()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });