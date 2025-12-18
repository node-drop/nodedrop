import { applyMigrations } from '../db/migrate';

async function main() {
  const result = await applyMigrations();
  
  if (!result.success) {
    console.error('Migration failed:', result.error);
    process.exit(1);
  }
  
  console.log('Migration completed:', result.message);
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error during migration:', error);
  process.exit(1);
});
