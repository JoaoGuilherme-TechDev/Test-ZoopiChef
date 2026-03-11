import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class TenantService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getCompanyBySlug(slug: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.slug, slug),
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    if (!company.is_active) {
      throw new NotFoundException('Empresa inativa.');
    }

    return company;
  }

  async getMenu(slug: string) {
    // 1. Busca a empresa
    const company = await this.getCompanyBySlug(slug);

    // 2. Busca a estrutura do cardápio: Categorias -> Subcategorias -> Produtos (apenas ativos e visíveis no tablet)
    const menu = await this.db.query.categories.findMany({
      where: and(
        eq(schema.categories.company_id, company.id),
        eq(schema.categories.active, true),
      ),
      orderBy: (categories, { asc }) => [asc(categories.order)],
      with: {
        subcategories: {
          where: eq(schema.subcategories.active, true),
          orderBy: (s, { asc }) => [asc(s.order)],
          with: {
            products: {
              where: and(
                eq(schema.products.active, true),
                eq(schema.products.aparece_tablet, true),
              ),
              with: {
                prices: true,
              },
            },
          },
        },
      },
    });

    return {
      company,
      categories: menu,
    };
  }
}
