import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { and, eq } from 'drizzle-orm';

@Controller('public')
export class PublicMenuController {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * BUSCA DE CARDÁPIO COMPLETO
   * Ajustado para o formato que o Frontend do Delivery espera
   */
  @Get('menu/:slug')
  async getMenu(@Param('slug') slug: string) {
    // 1. Busca a Empresa
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.slug, slug),
    });

    if (!company || !company.is_active) {
      throw new NotFoundException('Empresa não encontrada ou inativa.');
    }

    const companyId = company.id;

    // 2. Busca todas as Categorias (Lista Flat)
    const categories = await this.db.query.categories.findMany({
      where: and(
        eq(schema.categories.company_id, companyId),
        eq(schema.categories.active, true),
      ),
      orderBy: (c, { asc }) => [asc(c.order)],
    });

    // 3. Busca todas as Subcategorias (Lista Flat)
    const subcategories = await this.db.query.subcategories.findMany({
      where: and(
        eq(schema.subcategories.company_id, companyId),
        eq(schema.subcategories.active, true),
      ),
      orderBy: (s, { asc }) => [asc(s.order)],
    });

    // 4. Busca todos os Produtos (Lista Flat com relações necessárias)
    const products = await this.db.query.products.findMany({
      where: and(
        eq(schema.products.company_id, companyId),
        eq(schema.products.active, true),
        eq(schema.products.aparece_delivery, true),
      ),
      with: {
        prices: true,
        optionsGroups: {
          with: {
            group: {
              with: {
                items: true,
              },
            },
          },
        },
      },
    });

    // 5. Busca Regras de Entrega/Bairros
    const neighborhoods = await this.db.query.taxRules.findMany({
      where: eq(schema.taxRules.company_id, companyId),
    });

    // 6. Retorna o objeto exatamente como o usePublicDeliveryMenu.ts espera
    return {
      company,
      categories,
      subcategories,
      products,
      featuredProducts: products.filter((p) => p.featured),
      saleProducts: products.filter((p) => p.is_on_sale),
      neighborhoods,
    };
  }

  /**
   * BUSCA DE CLIENTE PELO TELEFONE
   */
  @Get('customer-lookup/:phone')
  async lookupCustomer(
    @Param('phone') phone: string,
    @Query('company_id') companyId: string,
  ) {
    const cleanPhone = phone.replace(/\D/g, '');

    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(schema.customers.company_id, companyId),
        eq(schema.customers.phone, cleanPhone),
      ),
    });

    if (!customer) return null;

    return {
      name: customer.name,
      address: customer.address,
      neighborhood: customer.neighborhood,
      city: customer.city,
      state: customer.state,
      zip_code: customer.zip_code,
    };
  }
}
