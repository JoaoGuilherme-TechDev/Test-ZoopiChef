import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS color varchar(20)');
    await client.query('COMMIT');
    console.log('Category color column added successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
