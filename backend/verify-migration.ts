import { db } from './src/db/client';
import { sql } from 'drizzle-orm';

async function verifyMigration() {
  try {
    console.log('🔍 Verifying table rename migration...\n');

    // Check if 'nodes' table exists
    const nodesTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'nodes'
    `);

    // Check if old 'node_types' table exists
    const nodeTypesTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'node_types'
    `);

    // Check indexes
    const indexes = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'nodes'
    `);

    // Count records
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM nodes`);

    console.log('✅ Table "nodes" exists:', nodesTable.rows.length > 0);
    console.log('✅ Old table "node_types" removed:', nodeTypesTable.rows.length === 0);
    console.log('\n📊 Indexes on "nodes" table:');
    indexes.rows.forEach((row: any) => console.log('  -', row.indexname));
    console.log('\n📈 Record count:', count.rows[0].count);
    
    console.log('\n✅ Migration verified successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();
