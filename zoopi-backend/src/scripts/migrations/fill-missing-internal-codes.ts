import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Buscar todas as empresas que têm produtos sem código interno
    const companiesRes = await client.query('SELECT DISTINCT company_id FROM products WHERE internal_code IS NULL OR internal_code = \'\'');
    
    for (const company of companiesRes.rows) {
      const companyId = company.company_id;
      
      // Pegar o maior código atual para esta empresa
      const maxCodeRes = await client.query('SELECT MAX(CAST(NULLIF(internal_code, \'\') AS INTEGER)) as max_code FROM products WHERE company_id = $1', [companyId]);
      let currentMax = maxCodeRes.rows[0].max_code || 0;
      
      // Buscar produtos sem código desta empresa
      const productsToUpdate = await client.query('SELECT id FROM products WHERE company_id = $1 AND (internal_code IS NULL OR internal_code = \'\') ORDER BY created_at ASC', [companyId]);
      
      for (const prod of productsToUpdate.rows) {
        currentMax++;
        await client.query('UPDATE products SET internal_code = $1 WHERE id = $2', [currentMax.toString(), prod.id]);
      }
      
      console.log(`Updated ${productsToUpdate.rowCount} products for company ${companyId}`);
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully');
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
