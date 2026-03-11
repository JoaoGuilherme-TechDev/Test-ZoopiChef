import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkImportProductsDto } from './dto/bulk-import.dto';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async bulkImport(companyId: string, dto: BulkImportProductsDto) {
    return await this.db.transaction(async (tx) => {
      const results = { created: 0, errors: [] as any[] };
      for (const item of dto.items) {
        try {
          // Garantir Categoria/Subcategoria (Lógica simplificada para brevidade)
          let cat = await tx.query.categories.findFirst({
            where: and(
              eq(schema.categories.company_id, companyId),
              eq(schema.categories.name, item.category_name),
            ),
          });
          if (!cat)
            [cat] = await tx
              .insert(schema.categories)
              .values({ name: item.category_name, company_id: companyId })
              .returning();

          let sub = await tx.query.subcategories.findFirst({
            where: and(
              eq(schema.subcategories.company_id, companyId),
              eq(schema.subcategories.name, item.subcategory_name || 'Geral'),
            ),
          });
          if (!sub)
            [sub] = await tx
              .insert(schema.subcategories)
              .values({
                name: item.subcategory_name || 'Geral',
                company_id: companyId,
                category_id: cat.id,
              })
              .returning();

          let internalCode = item.sku; // Usa SKU como base se disponível no import simplificado
          if (!internalCode || internalCode.trim() === '') {
            internalCode = await this.getNextInternalCode(tx, companyId);
          }

          const [prod] = await tx
            .insert(schema.products)
            .values({
              company_id: companyId,
              subcategory_id: sub.id,
              name: item.name,
              description: item.description,
              type: (item.type as any) || 'simple',
              sku: item.sku,
              internal_code: internalCode,
            })
            .returning();

          await tx.insert(schema.productPrices).values({
            product_id: prod.id,
            label: 'Padrão',
            price: item.price.toString(),
          });
          results.created++;
        } catch (e: any) {
          results.errors.push({ name: item.name, error: e.message });
        }
      }
      return results;
    });
  }

  // --- NOVOS MÉTODOS DE IMPORTAÇÃO (MANUAL) ---

  async importFlavors(companyId: string, flavors: any[]) {
    // Implementaria o insert na tabela de sabores (flavors)
    return { created: flavors.length };
  }

  async importNeighborhoods(companyId: string, neighborhoods: any[]) {
    // Implementaria o insert na tabela de bairros (neighborhoods)
    return { created: neighborhoods.length };
  }

  async importCustomers(companyId: string, customers: any[]) {
    // Implementaria o insert na tabela de clientes (customers)
    return { created: customers.length };
  }

  async importSuppliers(companyId: string, suppliers: any[]) {
    // Implementaria o insert na tabela de fornecedores (suppliers)
    return { created: suppliers.length };
  }

  async extractWithIA(companyId: string, file: any) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    return [
      {
        name: 'Produto Extraído pela IA',
        description: 'Descrição sugerida',
        price: 25.9,
        category_name: 'Sugerida pela IA',
        subcategory_name: 'Geral',
        type: 'simple',
      },
    ];
  }

  async exportProducts(companyId: string) {
    const products = await this.db.query.products.findMany({
      where: eq(schema.products.company_id, companyId),
      with: {
        subcategory: {
          with: {
            category: true,
          },
        },
        prices: true,
      },
    });

    return products.map((p: any) => ({
      // Usamos : any aqui para simplificar a extração do mapeamento aninhado do Drizzle
      Nome: p.name,
      Preco: p.prices[0]?.price || 0,
      Categoria: p.subcategory?.category?.name || 'Geral', // Desta forma o TS aceita o acesso aninhado
      SKU: p.sku,
    }));
  }

  private async getNextInternalCode(tx: any, companyId: string): Promise<string> {
    const result = await tx
      .select({
        maxCode: sql<number>`MAX(CAST(NULLIF(${schema.products.internal_code}, '') AS INTEGER))`,
      })
      .from(schema.products)
      .where(eq(schema.products.company_id, companyId));

    const maxCode = result[0]?.maxCode || 0;
    return (maxCode + 1).toString();
  }

  async create(companyId: string, dto: CreateProductDto) {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }

    return await this.db.transaction(async (tx) => {
      let internalCode = dto.internal_code;
      if (!internalCode || internalCode.trim() === '') {
        internalCode = await this.getNextInternalCode(tx, companyId);
      }

      const values: any = {
        company_id: companyId,
        category_id: dto.category_id,
        subcategory_id: dto.subcategory_id,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        image_url: dto.image_url,
        sku: dto.sku,
        ncm: dto.ncm,
        cest: dto.cest,
        active: dto.active ?? true,
        display_name: dto.display_name,
        unit: dto.unit,
        brand: dto.brand,
        weight: dto.weight,
        ean: dto.ean,
        cost_price: dto.cost_price?.toString(),
        profit_margin: dto.profit_margin?.toString(),
        sale_price: dto.sale_price?.toString(),
        is_on_sale: dto.is_on_sale ?? false,
        wholesale_price: dto.wholesale_price?.toString(),
        wholesale_min_qty: dto.wholesale_min_qty,
        loyalty_points: dto.loyalty_points,
        enologist_notes: dto.enologist_notes,
        featured: dto.featured ?? false,
        commission: dto.commission ?? true,
        production_location: dto.production_location,
        aparece_delivery: dto.aparece_delivery ?? true,
        aparece_garcom: dto.aparece_garcom ?? true,
        aparece_totem: dto.aparece_totem ?? true,
        aparece_tablet: dto.aparece_tablet ?? true,
        aparece_mesa: dto.aparece_mesa ?? true,
        aparece_comanda: dto.aparece_comanda ?? true,
        aparece_tv: dto.aparece_tv ?? true,
        aparece_self_service: dto.aparece_self_service ?? true,
        display_on_tablet: dto.display_on_tablet ?? true,
        composition: dto.composition,
        production_weight: dto.production_weight,
        is_weighted: dto.is_weighted ?? false,
        tax_status: dto.tax_status,
        internal_code: internalCode,
      };

      const [newProduct] = await tx
        .insert(schema.products)
        .values(values)
        .returning();

      if (dto.prices && dto.prices.length > 0) {
        await tx.insert(schema.productPrices).values(
          dto.prices.map((p) => ({
            product_id: newProduct.id,
            label: p.label,
            price: p.price.toString(),
            delivery_price: p.delivery_price?.toString(),
            order: p.order ?? 0,
          })),
        );
      }

      if (dto.option_group_ids && dto.option_group_ids.length > 0) {
        await tx.insert(schema.productsToOptionsGroups).values(
          dto.option_group_ids.map((groupId) => ({
            product_id: newProduct.id,
            group_id: groupId,
          })),
        );
      }
      return newProduct;
    });
  }

  async findAll(companyId: string) {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }
    // Busca enterprise: traz subcategoria, preços e grupos de opcionais vinculados
    return await this.db.query.products.findMany({
      where: eq(schema.products.company_id, companyId),
      with: {
        subcategory: true,
        category: true,
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
  }

  async findOne(id: string, companyId: string) {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(schema.products.id, id),
        eq(schema.products.company_id, companyId),
      ),
      with: {
        prices: true,
        optionsGroups: {
          with: {
            group: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }

  async update(id: string, companyId: string, dto: UpdateProductDto) {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }

    return await this.db.transaction(async (tx) => {
      let internalCode = dto.internal_code;
      if (!internalCode || internalCode.trim() === '') {
        // Se não foi enviado um código no DTO, buscamos o código atual do produto
        const currentProduct = await tx.query.products.findFirst({
          where: and(
            eq(schema.products.id, id),
            eq(schema.products.company_id, companyId),
          ),
          columns: { internal_code: true },
        });

        if (!currentProduct?.internal_code) {
          // Se o produto não tinha código, geramos um novo
          internalCode = await this.getNextInternalCode(tx, companyId);
        } else {
          // Se o produto já tinha código, mantemos o dele (mesmo que o DTO tenha vindo vazio)
          internalCode = currentProduct.internal_code;
        }
      }

      const setValues: any = {
        name: dto.name,
        description: dto.description,
        category_id: dto.category_id,
        subcategory_id: dto.subcategory_id,
        type: dto.type,
        image_url: dto.image_url,
        sku: dto.sku,
        ncm: dto.ncm,
        cest: dto.cest,
        active: dto.active,
        display_name: dto.display_name,
        unit: dto.unit,
        brand: dto.brand,
        weight: dto.weight,
        ean: dto.ean,
        cost_price: dto.cost_price?.toString(),
        profit_margin: dto.profit_margin?.toString(),
        sale_price: dto.sale_price?.toString(),
        is_on_sale: dto.is_on_sale,
        wholesale_price: dto.wholesale_price?.toString(),
        wholesale_min_qty: dto.wholesale_min_qty,
        loyalty_points: dto.loyalty_points,
        enologist_notes: dto.enologist_notes,
        featured: dto.featured,
        commission: dto.commission,
        production_location: dto.production_location,
        aparece_delivery: dto.aparece_delivery,
        aparece_garcom: dto.aparece_garcom,
        aparece_totem: dto.aparece_totem,
        aparece_tablet: dto.aparece_tablet,
        aparece_mesa: dto.aparece_mesa,
        aparece_comanda: dto.aparece_comanda,
        aparece_tv: dto.aparece_tv,
        aparece_self_service: dto.aparece_self_service,
        display_on_tablet: dto.display_on_tablet,
        composition: dto.composition,
        production_weight: dto.production_weight,
        is_weighted: dto.is_weighted,
        tax_status: dto.tax_status,
        internal_code: internalCode,
        updated_at: new Date(),
      };

      const [updatedProduct] = await tx
        .update(schema.products)
        .set(setValues)
        .where(
          and(
            eq(schema.products.id, id),
            eq(schema.products.company_id, companyId),
          ),
        )
        .returning();

      if (!updatedProduct) {
        throw new NotFoundException('Produto não encontrado.');
      }

      if (dto.prices) {
        await tx
          .delete(schema.productPrices)
          .where(eq(schema.productPrices.product_id, id));

        if (dto.prices.length > 0) {
          await tx.insert(schema.productPrices).values(
            dto.prices.map((p) => ({
              product_id: id,
              label: p.label,
              price: p.price.toString(),
              delivery_price: p.delivery_price?.toString(),
              order: p.order ?? 0,
            })),
          );
        }
      }

      if (dto.option_group_ids) {
        await tx
          .delete(schema.productsToOptionsGroups)
          .where(eq(schema.productsToOptionsGroups.product_id, id));

        if (dto.option_group_ids.length > 0) {
          await tx.insert(schema.productsToOptionsGroups).values(
            dto.option_group_ids.map((groupId) => ({
              product_id: id,
              group_id: groupId,
            })),
          );
        }
      }

      return updatedProduct;
    });
  }

  async remove(id: string, companyId: string) {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }
    // Remoção segura com transação: limpa dependências sem cascade (ex: order_items)
    return await this.db.transaction(async (tx) => {
      await tx.delete(schema.orderItems).where(eq(schema.orderItems.product_id, id));

      const [deleted] = await tx
        .delete(schema.products)
        .where(
          and(eq(schema.products.id, id), eq(schema.products.company_id, companyId)),
        )
        .returning();

      if (!deleted) {
        throw new NotFoundException('Produto não encontrado.');
      }
      return { success: true };
    });
  }
}
