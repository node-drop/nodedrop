#!/usr/bin/env node
/**
 * Create production-ready MySQL node ZIP file
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function createProductionZip() {
  try {
    console.log('📦 Creating production-ready MySQL node ZIP...\n');

    const mysqlDir = path.join(__dirname, 'custom-nodes/MySQL');
    const outputZip = path.join(mysqlDir, 'MySQL-Production.zip');

    // Create new ZIP
    const zip = new AdmZip();

    console.log('1. Adding files to ZIP...');

    // Add package.json
    const packageJsonPath = path.join(mysqlDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      zip.addLocalFile(packageJsonPath);
      console.log('   ✅ Added package.json');
    }

    // Add index.js
    const indexPath = path.join(mysqlDir, 'index.js');
    if (fs.existsSync(indexPath)) {
      zip.addLocalFile(indexPath);
      console.log('   ✅ Added index.js');
    }

    // Add node file
    const nodeFilePath = path.join(mysqlDir, 'nodes/mysql.node.js');
    if (fs.existsSync(nodeFilePath)) {
      zip.addLocalFile(nodeFilePath, 'nodes/');
      console.log('   ✅ Added nodes/mysql.node.js');
    }

    // Add credential file
    const credFilePath = path.join(mysqlDir, 'credentials/mysqlDb.credentials.js');
    if (fs.existsSync(credFilePath)) {
      zip.addLocalFile(credFilePath, 'credentials/');
      console.log('   ✅ Added credentials/mysqlDb.credentials.js');
    }

    // Add icon if exists
    const iconPath = path.join(mysqlDir, 'nodes/icon.svg');
    if (fs.existsSync(iconPath)) {
      zip.addLocalFile(iconPath, 'nodes/');
      console.log('   ✅ Added nodes/icon.svg');
    }

    // Add README
    const readmePath = path.join(mysqlDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      zip.addLocalFile(readmePath);
      console.log('   ✅ Added README.md');
    }

    // Add node_modules directory (with dependencies)
    const nodeModulesPath = path.join(mysqlDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      zip.addLocalFolder(nodeModulesPath, 'node_modules');
      console.log('   ✅ Added node_modules directory');
    }

    console.log('\n2. Verifying file contents...');

    // Verify the node file has correct properties
    const nodeContent = fs.readFileSync(nodeFilePath, 'utf8');
    if (nodeContent.includes('properties: [') && nodeContent.includes('authentication')) {
      console.log('   ✅ Node file contains properties');
    } else {
      console.log('   ❌ Node file missing properties');
      return;
    }

    if (nodeContent.includes('credentials: [') && nodeContent.includes('mysqlDb')) {
      console.log('   ✅ Node file contains credentials definition');
    } else {
      console.log('   ❌ Node file missing credentials definition');
      return;
    }

    if (nodeContent.includes('group: ["database"]')) {
      console.log('   ✅ Node file has correct group');
    } else {
      console.log('   ❌ Node file has wrong group');
      return;
    }

    // Write ZIP file
    console.log('\n3. Writing ZIP file...');
    zip.writeZip(outputZip);
    console.log(`   ✅ ZIP created: ${outputZip}`);

    // Verify ZIP contents
    console.log('\n4. Verifying ZIP contents...');
    const verifyZip = new AdmZip(outputZip);
    const entries = verifyZip.getEntries();
    
    console.log(`   📋 ZIP contains ${entries.length} files:`);
    entries.forEach(entry => {
      console.log(`     - ${entry.entryName} (${entry.header.size} bytes)`);
    });

    // Check if package.json in ZIP is correct
    const packageEntry = entries.find(e => e.entryName === 'package.json');
    if (packageEntry) {
      const packageContent = packageEntry.getData().toString();
      const packageJson = JSON.parse(packageContent);
      
      console.log('\n   📋 Package.json verification:');
      console.log(`     Name: ${packageJson.name}`);
      console.log(`     Nodes: ${packageJson.nodes?.join(', ')}`);
      console.log(`     Credentials: ${packageJson.credentials?.join(', ')}`);
      
      if (packageJson.nodes?.includes('nodes/mysql.node.js') && 
          packageJson.credentials?.includes('credentials/mysqlDb.credentials.js')) {
        console.log('   ✅ Package.json is correct');
      } else {
        console.log('   ❌ Package.json has wrong paths');
      }
    }

    console.log('\n✅ Production ZIP created successfully!');
    console.log('\n📋 Next steps for production deployment:');
    console.log('   1. Download the MySQL-Production.zip file');
    console.log('   2. In production, go to Custom Nodes management');
    console.log('   3. Delete the old MySQL node if it exists');
    console.log('   4. Upload the new MySQL-Production.zip file');
    console.log('   5. The node should now have all 13 properties');
    
  } catch (error) {
    console.error('\n❌ Failed to create ZIP:', error);
    process.exit(1);
  }
}

// Run the script
createProductionZip()
  .then(() => {
    console.log('\n🎉 ZIP creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 ZIP creation failed:', error);
    process.exit(1);
  });