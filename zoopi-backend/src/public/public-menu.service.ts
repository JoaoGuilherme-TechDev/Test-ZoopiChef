import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class PublicMenuService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getMenuBySlug(slug: string) {
    // 1. Buscar a empresa pelo slug
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.slug, slug),
    });

    if (!company) return null;

    const companyId = company.id;

    // 2. Buscar Categorias (tabela 'categories' do seu schema)
    const categories = await this.db.query.categories.findMany({
      where: and(
        eq(schema.categories.company_id, companyId),
        eq(schema.categories.active, true)
      ),
      orderBy: (categories, { asc }) => [asc(categories.order)],
    });

    // 3. Buscar Produtos com todas as relações do seu schema
    const products = await this.db.query.products.findMany({
      where: and(
        eq(schema.products.company_id, companyId),
        eq(schema.products.active, true),
        eq(schema.products.aparece_delivery, true)
      ),
      with: {
        prices: true, // Relação 'prices' definida no seu schema
        category: true,
        subcategory: true,
        optionsGroups: { // Relação 'optionsGroups' via tabela pivô
          with: {
            group: {
              with: {
                items: true // Itens do grupo de opcionais
              }
            }
          }
        },
      }
    });

    // 4. Mapeamento Seguro
    // Como seu schema não tem 'neighborhoods', 'whatsapp', 'address', 
    // vamos retornar valores padrão para não quebrar o Frontend.
    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url,
        // Campos que ainda não existem no seu schema (TODO: Adicionar no futuro)
        whatsapp: "", 
        address: "",
        opening_hours: "Consulte no WhatsApp",
      },
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        image_url: c.image_url
      })),
      products: products.map(p => ({
        ...p,
        // O Drizzle retorna as relações aninhadas, vamos simplificar para o front
        optionsGroups: p.optionsGroups?.map(og => ({
          group: {
            id: og.group.id,
            name: og.group.name,
            min_qty: og.group.min_qty,
            max_qty: og.group.max_qty,
            items: og.group.items
          }
        }))
      })),
      // Retornando array vazio já que a tabela não existe no seu schema.ts
      neighborhoods: [] 
    };
  }
}