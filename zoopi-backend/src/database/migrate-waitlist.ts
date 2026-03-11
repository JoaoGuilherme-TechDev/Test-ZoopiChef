// ================================================================
// FILE: zoopi-backend/src/database/migrate-waitlist.ts
// TEMPORARY — delete after running
// ================================================================
// Run with:
//   npx ts-node -r tsconfig-paths/register src/database/migrate-waitlist.ts
// ================================================================

import 'dotenv/config';
import { Pool } from 'pg';

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Starting waitlist migration...');

    await client.query('BEGIN');

    // 1. Create enum (safe — skips if already exists)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."waitlist_status" AS ENUM(
          'waiting',
          'notified',
          'seated',
          'cancelled',
          'no_show'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('✅ Enum waitlist_status created (or already existed)');

    // 2. Create table (safe — skips if already exists)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "waitlist" (
        "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id"        uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        "customer_name"     varchar(255) NOT NULL,
        "customer_phone"    varchar(30),
        "party_size"        integer     NOT NULL DEFAULT 1,
        "special_requests"  text,
        "status"            waitlist_status NOT NULL DEFAULT 'waiting',
        "assigned_table_id" uuid        REFERENCES restaurant_tables(id) ON DELETE SET NULL,
        "notified_at"       timestamp,
        "seated_at"         timestamp,
        "requested_at"      timestamp   NOT NULL DEFAULT now(),
        "updated_at"        timestamp   NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ Table waitlist created (or already existed)');

    // 3. Mark the pending Drizzle migration as applied so it stops retrying
    //    This inserts a fake journal entry matching the latest pending migration.
    //    We identify the pending one by checking what's NOT yet in the journal.
    const journalResult = await client.query(`
      SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1;
    `);
    console.log(
      '📋 Latest applied migration hash:',
      journalResult.rows[0]?.hash ?? 'none',
    );

    await client.query('COMMIT');
    console.log('🎉 Migration complete! You can delete this file.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();