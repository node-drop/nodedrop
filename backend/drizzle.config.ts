import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export default defineConfig({
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'postgresql',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/node_drop',
  },
  verbose: true,
  strict: true,
});
