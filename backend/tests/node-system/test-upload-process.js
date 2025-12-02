#!/usr/bin/env node
/**
 * Test script to verify the upload and extraction process
 */

const { CustomNodeUploadHandler } = require('./dist/services/CustomNodeUploadHandler');
const path = require('path');
const fs = require('fs');

async function testUploadProcess() {
  try {
    console.log('🧪 Testing upload and extraction process...\n');

    // Check if the production ZIP exists
    const zipPath = path.join(__dirname, 'custom-nodes/MySQL/MySQL-Production.zip');
    if (!fs.existsSync(zipPath)) {
      console.log('❌ MySQL-Production.zip not found. Creating it first...');
      // Run the create script
      const { execSync } = require('child_process');
      execSync('node create-production-mysql-zip.js', { stdio: 'inherit' });
    }

    console.log('1. Testing CustomNodeUploadHandler...');
    const uploadHandler = new CustomNodeUploadHandler();
    
    console.log(`   📁 ZIP file: ${zipPath}`);
    console.log(`   📋 File exists: ${fs.existsSync(zipPath)}`);
    
    // Test the upload process
    console.log('\n2. Processing upload...');
    const result = await uploadHandler.processUpload(zipPath, 'MySQL-Production.zip');
    
    console.log(`   📋 Upload success: ${result.success}`);
    console.log(`   📋 Message: ${result.message}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('   ❌ Errors:');
      result.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }
    
    if (result.nodes && result.nodes.length > 0) {
      console.log(`   ✅ Processed nodes: ${result.nodes.length}`);
      result.nodes.forEach(node => {
        console.log(`     - ${node.displayName} (${node.type})`);
      });
    }
    
    if (result.extractedPath) {
      console.log(`   📁 Extracted to: ${result.extractedPath}`);
    }

    // Check if files were extracted to the right location
    console.log('\n3. Verifying extraction location...');
    const customNodesDir = path.join(process.cwd(), 'custom-nodes');
    console.log(`   📁 Custom nodes directory: ${customNodesDir}`);
    
    if (fs.existsSync(customNodesDir)) {
      const entries = fs.readdirSync(customNodesDir, { withFileTypes: true });
      const packageDirs = entries.filter(entry => entry.isDirectory());
      
      console.log(`   📋 Package directories: ${packageDirs.length}`);
      packageDirs.forEach(dir => {
        console.log(`     - ${dir.name}`);
        
        // Check if this looks like our uploaded MySQL package
        const packagePath = path.join(customNodesDir, dir.name);
        const packageJsonPath = path.join(packagePath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageInfo = JSON.parse(packageContent);
            
            if (packageInfo.name === 'mysql' || dir.name.toLowerCase().includes('mysql')) {
              console.log(`       ✅ Found MySQL package: ${packageInfo.name}`);
              console.log(`       📋 Nodes: ${packageInfo.nodes?.join(', ')}`);
              console.log(`       📋 Credentials: ${packageInfo.credentials?.join(', ')}`);
              
              // Check if node files exist
              if (packageInfo.nodes) {
                packageInfo.nodes.forEach(nodePath => {
                  const fullPath = path.join(packagePath, nodePath);
                  const exists = fs.existsSync(fullPath);
                  console.log(`       📄 ${nodePath}: ${exists ? '✅' : '❌'}`);
                });
              }
              
              // Check if credential files exist
              if (packageInfo.credentials) {
                packageInfo.credentials.forEach(credPath => {
                  const fullPath = path.join(packagePath, credPath);
                  const exists = fs.existsSync(fullPath);
                  console.log(`       🔐 ${credPath}: ${exists ? '✅' : '❌'}`);
                });
              }
            }
          } catch (error) {
            console.log(`       ❌ Error reading package.json: ${error.message}`);
          }
        }
      });
    } else {
      console.log('   ❌ Custom nodes directory does not exist');
    }

    // Test if NodeLoader can now find the uploaded package
    console.log('\n4. Testing NodeLoader discovery...');
    const { NodeService } = require('./dist/services/NodeService');
    const { CredentialService } = require('./dist/services/CredentialService');
    const { NodeLoader } = require('./dist/services/NodeLoader');
    const { PrismaClient } = require('@prisma/client');
    
    const prisma = new PrismaClient();
    const nodeService = new NodeService(prisma);
    const credentialService = new CredentialService();
    const nodeLoader = new NodeLoader(nodeService, credentialService, prisma);
    
    try {
      await nodeLoader.initialize();
      console.log('   ✅ NodeLoader initialized successfully');
      
      // Check if MySQL node is now available
      const nodeTypes = await nodeService.getNodeTypes();
      const mysqlNode = nodeTypes.find(node => node.type === 'mysql');
      
      if (mysqlNode) {
        console.log('   ✅ MySQL node found after upload and NodeLoader init');
        console.log(`   📋 Display Name: ${mysqlNode.displayName}`);
        console.log(`   📋 Properties: ${mysqlNode.properties?.length || 0}`);
        console.log(`   📋 Group: ${JSON.stringify(mysqlNode.group)}`);
      } else {
        console.log('   ❌ MySQL node still not found after upload');
      }
    } catch (error) {
      console.log(`   ❌ NodeLoader error: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }

    console.log('\n✅ Upload process test completed!');
    
  } catch (error) {
    console.error('\n❌ Upload test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUploadProcess()
  .then(() => {
    console.log('\n🎉 Upload test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Upload test failed:', error);
    process.exit(1);
  });