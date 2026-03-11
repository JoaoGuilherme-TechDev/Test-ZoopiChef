import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../database/schema.js';
import 'dotenv/config';

async function seedMenu() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000';
  const SLUG = 'pizzaria-demo';

  console.log('⏳ Garantindo que a empresa exista e criando cardápio...');

  try {
    // 1. Garantir que a empresa existe (usando upsert)
    await db
      .insert(schema.companies)
      .values({
        id: COMPANY_ID,
        name: 'Pizzaria Drizzle Demo',
        slug: SLUG,
        is_active: true,
      })
      .onConflictDoUpdate({
        target: schema.companies.id,
        set: { name: 'Pizzaria Drizzle Demo' },
      });

    console.log('✅ Empresa verificada.');

    await db.transaction(async (tx) => {
      // Limpar cardápio antigo para evitar duplicados (Opcional, mas ajuda no teste)
      await tx
        .delete(schema.categories)
        .where(eq(schema.categories.company_id, COMPANY_ID));

      // 2. Criar Categoria: Pizzas
      const [catPizzas] = await tx
        .insert(schema.categories)
        .values({
          company_id: COMPANY_ID,
          name: 'Pizzas',
          active: true,
          order: 1,
        })
        .returning();

      // 3. Criar Subcategoria: Tradicionais
      const [subTradicional] = await tx
        .insert(schema.subcategories)
        .values({
          company_id: COMPANY_ID,
          category_id: catPizzas.id,
          name: 'Pizzas Tradicionais',
          active: true,
          order: 1,
        })
        .returning();

      // 4. Criar Produto: Margherita
      const [prodMarg] = await tx
        .insert(schema.products)
        .values({
          company_id: COMPANY_ID,
          subcategory_id: subTradicional.id,
          name: 'Pizza Margherita',
          description:
            'Molho de tomate, mussarela, manjericão fresco e azeite.',
          display_on_tablet: true,
          active: true,
          type: 'simple',
        })
        .returning();

      await tx.insert(schema.productPrices).values({
        product_id: prodMarg.id,
        label: 'Tamanho Único',
        price: '45.00',
      });

      // 5. Criar Categoria: Bebidas
      const [catBebidas] = await tx
        .insert(schema.categories)
        .values({
          company_id: COMPANY_ID,
          name: 'Bebidas',
          active: true,
          order: 2,
        })
        .returning();

      // 6. Criar Subcategoria: Refrigerantes
      const [subRefri] = await tx
        .insert(schema.subcategories)
        .values({
          company_id: COMPANY_ID,
          category_id: catBebidas.id,
          name: 'Refrigerantes',
          active: true,
          order: 1,
        })
        .returning();

      // 7. Criar Produto: Coca-Cola
      const [prodCoke] = await tx
        .insert(schema.products)
        .values({
          company_id: COMPANY_ID,
          subcategory_id: subRefri.id,
          name: 'Coca-Cola Latinha',
          description: '350ml bem gelada.',
          display_on_tablet: true,
          active: true,
          type: 'simple',
        })
        .returning();

      await tx.insert(schema.productPrices).values({
        product_id: prodCoke.id,
        label: 'Padrão',
        price: '7.00',
      });
    });

    console.log('✅ Cardápio e Empresa prontos para o Tablet!');
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
  }
}

// Helper para usar eq no script
import { eq } from 'drizzle-orm';
seedMenu();
