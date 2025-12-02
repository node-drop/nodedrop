#!/usr/bin/env node
/**
 * Final verification script for MySQL node in production
 */

const { PrismaClient } = require('@prisma/client');

async function verifyMySQLNode() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Final MySQL Node Verification...\n');

    // Check database state
    console.log('1. Checking MySQL node in database...');
    const dbNode = await prisma.nodeType.findUnique({
      where: { type: 'mysql' }
    });
    
    if (dbNode) {
      console.log('   ✅ MySQL node found in database');
      console.log(`   📋 ID: ${dbNode.id}`);
      console.log(`   📋 Type: ${dbNode.type}`);
      console.log(`   📋 Display Name: ${dbNode.displayName}`);
      console.log(`   📋 Name: ${dbNode.name}`);
      console.log(`   📋 Group: ${JSON.stringify(dbNode.group)}`);
      console.log(`   📋 Version: ${dbNode.version}`);
      console.log(`   📋 Description: ${dbNode.description}`);
      console.log(`   📋 Defaults: ${JSON.stringify(dbNode.defaults)}`);
      console.log(`   📋 Inputs: ${JSON.stringify(dbNode.inputs)}`);
      console.log(`   📋 Outputs: ${JSON.stringify(dbNode.outputs)}`);
      console.log(`   📋 Properties: ${Array.isArray(dbNode.properties) ? dbNode.properties.length : 'not an array'} properties`);
      console.log(`   📋 Icon: ${dbNode.icon || 'null'}`);
      console.log(`   📋 Color: ${dbNode.color || 'null'}`);
      console.log(`   📋 Active: ${dbNode.active}`);
      console.log(`   📋 Created: ${dbNode.createdAt}`);
      console.log(`   📋 Updated: ${dbNode.updatedAt}`);
      
      // Check properties in detail
      if (Array.isArray(dbNode.properties) && dbNode.properties.length > 0) {
        console.log('\n   📋 Properties details:');
        dbNode.properties.forEach((prop, index) => {
          if (prop.name === 'authentication') {
            console.log(`     ${index + 1}. ${prop.name} (${prop.type}) - Required: ${prop.required}, AllowedTypes: ${prop.allowedTypes?.join(', ') || 'none'}`);
          } else if (prop.name === 'operation') {
            console.log(`     ${index + 1}. ${prop.name} (${prop.type}) - Options: ${prop.options?.length || 0}`);
          } else {
            console.log(`     ${index + 1}. ${prop.name} (${prop.type})`);
          }
        });
      }
      
      // This is what should be returned by your API
      console.log('\n   📋 Expected API Response Format:');
      const apiFormat = {
        id: dbNode.id,
        type: dbNode.type,
        displayName: dbNode.displayName,
        name: dbNode.name,
        group: dbNode.group,
        version: dbNode.version,
        description: dbNode.description,
        defaults: dbNode.defaults,
        inputs: dbNode.inputs,
        outputs: dbNode.outputs,
        properties: dbNode.properties,
        credentials: null, // This should be populated from the node definition
        credentialSelector: null,
        icon: dbNode.icon,
        color: dbNode.color,
        outputComponent: dbNode.outputComponent,
        active: dbNode.active,
        createdAt: dbNode.createdAt,
        updatedAt: dbNode.updatedAt
      };
      
      console.log('   📄 JSON Format:');
      console.log(JSON.stringify(apiFormat, null, 2));
      
    } else {
      console.log('   ❌ MySQL node NOT found in database');
    }

    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyMySQLNode()
  .then(() => {
    console.log('\n🎉 Verification completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });