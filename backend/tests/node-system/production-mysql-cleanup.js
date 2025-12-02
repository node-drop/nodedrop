#!/usr/bin/env node
/**
 * Production MySQL node cleanup and verification script
 * Run this on your production server to clean up old MySQL nodes
 */

const { PrismaClient } = require('@prisma/client');

async function productionMySQLCleanup() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Production MySQL Node Cleanup & Verification...\n');

    // Find ALL nodes that might be MySQL-related
    console.log('1. Finding all MySQL-related nodes in production database...');
    const allMySQLNodes = await prisma.nodeType.findMany({
      where: { 
        OR: [
          { type: 'mysql' },
          { type: { contains: 'mysql', mode: 'insensitive' } },
          { displayName: { contains: 'mysql', mode: 'insensitive' } },
          { name: { contains: 'mysql', mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' } // Newest first
    });
    
    console.log(`   📋 Found ${allMySQLNodes.length} MySQL-related nodes in production:`);
    
    if (allMySQLNodes.length === 0) {
      console.log('   ℹ️  No MySQL nodes found in production database');
      return;
    }

    allMySQLNodes.forEach((node, index) => {
      console.log(`\n     ${index + 1}. NODE DETAILS:`);
      console.log(`        ID: ${node.id}`);
      console.log(`        Type: "${node.type}"`);
      console.log(`        Display Name: "${node.displayName}"`);
      console.log(`        Name: "${node.name}"`);
      console.log(`        Group: ${JSON.stringify(node.group)}`);
      console.log(`        Description: "${node.description?.substring(0, 60)}${node.description?.length > 60 ? '...' : ''}"`);
      console.log(`        Properties: ${Array.isArray(node.properties) ? node.properties.length : 'not array'} properties`);
      console.log(`        Color: ${node.color}`);
      console.log(`        Icon: ${node.icon}`);
      console.log(`        Active: ${node.active}`);
      console.log(`        Created: ${node.createdAt}`);
      console.log(`        Updated: ${node.updatedAt}`);
      
      // Identify issues
      const issues = [];
      if (node.displayName !== 'MySQL') issues.push('Wrong displayName');
      if (!Array.isArray(node.group) || !node.group.includes('database')) issues.push('Wrong group');
      if (!Array.isArray(node.properties) || node.properties.length === 0) issues.push('No properties');
      if (node.color !== '#00758F') issues.push('Wrong color');
      if (!node.description?.includes('Execute MySQL queries')) issues.push('Wrong description');
      
      if (issues.length > 0) {
        console.log(`        🚨 ISSUES: ${issues.join(', ')}`);
      } else {
        console.log(`        ✅ This node looks correct`);
      }
    });

    // Identify the correct node and problematic ones
    const correctNodes = allMySQLNodes.filter(node => 
      node.displayName === 'MySQL' &&
      Array.isArray(node.group) && node.group.includes('database') &&
      Array.isArray(node.properties) && node.properties.length > 0 &&
      node.description?.includes('Execute MySQL queries')
    );

    const problematicNodes = allMySQLNodes.filter(node => 
      node.displayName !== 'MySQL' ||
      !Array.isArray(node.group) || !node.group.includes('database') ||
      !Array.isArray(node.properties) || node.properties.length === 0 ||
      !node.description?.includes('Execute MySQL queries')
    );

    console.log('\n2. Analysis Results:');
    console.log(`   ✅ Correct nodes: ${correctNodes.length}`);
    console.log(`   🚨 Problematic nodes: ${problematicNodes.length}`);

    if (correctNodes.length > 0) {
      console.log('\n   📋 Correct MySQL node(s):');
      correctNodes.forEach(node => {
        console.log(`     - ID: ${node.id} (${node.properties.length} properties, created: ${node.createdAt})`);
      });
    }

    if (problematicNodes.length > 0) {
      console.log('\n   🚨 Problematic MySQL node(s):');
      problematicNodes.forEach(node => {
        console.log(`     - ID: ${node.id} ("${node.displayName}", ${Array.isArray(node.properties) ? node.properties.length : 0} properties)`);
      });

      console.log('\n3. Cleanup Options:');
      console.log('   Option A: Delete ALL MySQL nodes and re-upload the correct ZIP');
      console.log('   Option B: Delete only problematic nodes (keep correct ones)');
      console.log('   Option C: Manual review (no automatic deletion)');
      
      // For safety, we'll just report and not auto-delete in production
      console.log('\n   🛡️  SAFETY MODE: No automatic deletion in production');
      console.log('   📋 To clean up, run one of these commands:');
      
      if (correctNodes.length === 0) {
        console.log('\n   🗑️  Delete ALL MySQL nodes (no correct ones found):');
        allMySQLNodes.forEach(node => {
          console.log(`     DELETE FROM "NodeType" WHERE id = '${node.id}'; -- ${node.displayName}`);
        });
      } else {
        console.log('\n   🗑️  Delete ONLY problematic nodes (keep correct ones):');
        problematicNodes.forEach(node => {
          console.log(`     DELETE FROM "NodeType" WHERE id = '${node.id}'; -- ${node.displayName} (problematic)`);
        });
      }
    }

    // Check if there are multiple correct nodes (duplicates)
    if (correctNodes.length > 1) {
      console.log('\n   ⚠️  Multiple correct nodes found - you may want to keep only the newest one');
      console.log('   🗑️  Delete older correct nodes:');
      correctNodes.slice(1).forEach(node => { // Keep first (newest), delete rest
        console.log(`     DELETE FROM "NodeType" WHERE id = '${node.id}'; -- Duplicate correct node`);
      });
    }

    console.log('\n4. Recommended Production Steps:');
    if (problematicNodes.length > 0) {
      console.log('   1. 🗑️  Delete problematic MySQL nodes using the SQL commands above');
      console.log('   2. 📤 Upload the new MySQL-Production.zip file');
      console.log('   3. ✅ Verify the node has 13 properties and correct group ["database"]');
    } else if (correctNodes.length === 0) {
      console.log('   1. 📤 Upload the MySQL-Production.zip file (no cleanup needed)');
      console.log('   2. ✅ Verify the node appears with 13 properties');
    } else {
      console.log('   ✅ MySQL node looks correct in production!');
      console.log('   📋 If you\'re still seeing issues, check your frontend cache or API response');
    }

    console.log('\n✅ Production analysis completed!');
    
  } catch (error) {
    console.error('\n❌ Production analysis failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
productionMySQLCleanup()
  .then(() => {
    console.log('\n🎉 Production analysis completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Production analysis failed:', error);
    process.exit(1);
  });