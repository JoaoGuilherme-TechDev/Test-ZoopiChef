import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, sql } from 'drizzle-orm';

async function test() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  try {
    console.log('Testing DB connection...');
    const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'products'`);
    const columns = result.rows.map((r: any) => r.column_name);
    console.log('Existing columns in products table:', columns);
    
    const needed = ['wholesale_price', 'wholesale_min_qty'];
    const missing = needed.filter(c => !columns.includes(c));
    
    if (missing.length > 0) {
      console.log('Missing columns:', missing);
      console.log('Running manual migration...');
      await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2)`);
      await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_min_qty INTEGER`);
      console.log('Migration completed successfully!');
    } else {
      console.log('All columns already exist.');
    }
  } catch (err) {
    console.error('Error during DB test:', err);
  } finally {
    await pool.end();
  }
}

test();
