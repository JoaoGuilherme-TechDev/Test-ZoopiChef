import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { eq } from 'drizzle-orm';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('🚀 Iniciando o Seed Completo (Versão Corrigida)...');

  try {
    // 1. Criar Empresa de Teste
    const companySlug = 'zoopi-chef';
    let companyId: string;

    const existingCompany = await db.query.companies.findFirst({
      where: eq(schema.companies.slug, companySlug),
    });

    if (!existingCompany) {
      const [newCompany] = await db
        .insert(schema.companies)
        .values({
          name: 'Zoopi Chef Gourmet',
          slug: companySlug,
          primary_color: '#3b82f6',
          plan_type: 'silver', // Definindo um plano inicial
        })
        .returning();
      companyId = newCompany.id;
      console.log('✅ Empresa criada');
    } else {
      companyId = existingCompany.id;
      console.log('ℹ️ Empresa já existe');
    }

    // 2. Criar Usuário Administrador da Empresa
    const adminEmail = 'admin@zoopi.com';
    const hashedPassword = await bcrypt.hash('admin123', 10);

    let userId: string;
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, adminEmail),
    });

    if (!existingUser) {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          email: adminEmail,
          password: hashedPassword,
          global_role: 'user', // Corrigido: papel no sistema é 'user'
        })
        .returning();
      userId = newUser.id;

      await db.insert(schema.profiles).values({
        user_id: userId,
        company_id: companyId,
        full_name: 'Dono do Restaurante',
        role: 'admin', // Papel na empresa é 'admin'
      });
      console.log('✅ Usuário e Perfil criados');
    } else {
      console.log('ℹ️ Usuário já existe');
    }

    // 3. Criar Categorias e Subcategorias
    console.log('⏳ Criando Cardápio...');

    const [catPizzas] = await db
      .insert(schema.categories)
      .values({
        company_id: companyId,
        name: 'Pizzas',
        order: 1,
      })
      .returning();

    const [subTradicional] = await db
      .insert(schema.subcategories)
      .values({
        company_id: companyId,
        category_id: catPizzas.id,
        name: 'Tradicionais',
        order: 1,
      })
      .returning();

    // PRODUTO: Margherita
    const [prodMargherita] = await db
      .insert(schema.products)
      .values({
        company_id: companyId,
        subcategory_id: subTradicional.id,
        name: 'Pizza Margherita',
        description: 'Molho, mussarela, manjericão e azeite.',
        type: 'simple',
        aparece_tablet: true,
        display_on_tablet: true,
      })
      .returning();

    await db.insert(schema.productPrices).values([
      { product_id: prodMargherita.id, label: 'Média', price: '45.00' },
      { product_id: prodMargherita.id, label: 'Grande', price: '60.00' },
    ]);

    // 4. Criar Eventos de Mesa
    console.log('⏳ Criando Eventos de Mesa...');
    await db.insert(schema.tableEvents).values([
      {
        company_id: companyId,
        table_number: '05',
        type: 'call_waiter',
        status: 'pending',
      },
      {
        company_id: companyId,
        table_number: '12',
        type: 'ask_bill',
        status: 'pending',
      },
    ]);

    console.log('\n✨ SEED FINALIZADO COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
