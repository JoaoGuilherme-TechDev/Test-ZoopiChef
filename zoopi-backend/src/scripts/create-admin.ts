/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('⏳ Iniciando criação de empresa e super-administrador...');

  try {
    // 1. Criar a Empresa Mãe (Zoopi)
    const [company] = await db
      .insert(schema.companies)
      .values({
        name: 'Zoopi Tecnologia',
        slug: 'zoopi-admin',
        plan_type: 'gold', // Super admin sempre no melhor plano
      })
      .onConflictDoUpdate({
        target: schema.companies.slug,
        set: { name: 'Zoopi Tecnologia' },
      })
      .returning();

    console.log(`✅ Empresa verificada: ${company.name}`);

    // 2. Criptografar a senha
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 3. Criar o Usuário com global_role 'super_admin'
    const [user] = await db
      .insert(schema.users)
      .values({
        email: 'admin@zoopi.com',
        password: hashedPassword,
        global_role: 'super_admin', // Corrigido aqui
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { global_role: 'super_admin' },
      })
      .returning();

    console.log(`✅ Usuário super-admin verificado: ${user.email}`);

    // 4. Criar ou atualizar o Perfil vinculando Usuário e Empresa
    await db
      .insert(schema.profiles)
      .values({
        user_id: user.id,
        company_id: company.id,
        full_name: 'Admin Global Zoopi',
        role: 'admin', // Cargo dele dentro da empresa Zoopi
      })
      .onConflictDoUpdate({
        target: schema.profiles.user_id,
        set: { full_name: 'Admin Global Zoopi' },
      });

    console.log('\n🚀 AMBIENTE CONFIGURADO!');
    console.log('----------------------------');
    console.log('📧 Email: admin@zoopi.com');
    console.log('🔑 Senha: admin123');
    console.log('⭐ Role: super_admin');
    console.log('----------------------------');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar dados:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();
