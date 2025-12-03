// Quick script to reset setup for testing
const { PrismaClient } = require('@prisma/client');
const { resetSetup } = require('./dist/utils/setup');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Resetting setup...\n');
    
    await resetSetup(prisma);
    
    console.log('✅ Setup has been fully reset!');
    console.log('\nYou can now run the setup wizard again at:');
    console.log('   http://localhost:3000/setup\n');
  } catch (error) {
    console.error('❌ Error resetting setup:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
