// Quick script to check what token is stored in the database
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function checkToken() {
  try {
    // Query the credentials table
    const result = await pool.query(
      'SELECT user_id, workflow_id, encrypted_token, token_type, provider FROM workflow_git_credentials ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No credentials found in database');
      return;
    }

    const cred = result.rows[0];
    console.log('\n=== Git Credentials Info ===');
    console.log('User ID:', cred.user_id);
    console.log('Workflow ID:', cred.workflow_id);
    console.log('Token Type:', cred.token_type);
    console.log('Provider:', cred.provider);
    console.log('Encrypted Token (first 50 chars):', cred.encrypted_token.substring(0, 50) + '...');

    // Try to decrypt the token
    const encryptionKey = process.env.GIT_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.log('\n⚠️  GIT_ENCRYPTION_KEY not found in environment');
      return;
    }

    try {
      const [ivHex, encryptedHex] = cred.encrypted_token.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      // Support both hex-encoded keys (64 chars) and raw keys (32+ chars)
      let key;
      if (encryptionKey.length === 64) {
        // Hex-encoded key
        key = Buffer.from(encryptionKey, 'hex');
      } else if (encryptionKey.length >= 32) {
        // Raw key - take first 32 bytes
        key = Buffer.from(encryptionKey.slice(0, 32), 'utf8');
      } else {
        throw new Error('Key must be at least 32 characters');
      }

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      console.log('\n=== Decrypted Token ===');
      console.log('Token prefix:', decrypted.substring(0, 10) + '...');
      console.log('Token type:', decrypted.startsWith('ghp_') ? 'Classic (ghp_)' : 
                                  decrypted.startsWith('github_pat_') ? 'Fine-grained (github_pat_)' : 
                                  'Unknown');
      console.log('Full token:', decrypted);
    } catch (err) {
      console.log('\n❌ Failed to decrypt token:', err.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkToken();
