import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid');
    await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey');
    await client.query('ALTER TABLE products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL');
    await client.query('UPDATE products p SET category_id = s.category_id FROM subcategories s WHERE p.subcategory_id = s.id AND p.category_id IS NULL');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
    await client.query('COMMIT');
    console.log('done');
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
