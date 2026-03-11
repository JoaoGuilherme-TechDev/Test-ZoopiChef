import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { eq, and, desc, inArray } from 'drizzle-orm';

@Injectable()
export class OrdersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(companyId: string, dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.product_id);

    // 1. Buscar produtos COM a tabela de preços (prices)
    const dbProducts = await this.db.query.products.findMany({
      where: and(
        eq(schema.products.company_id, companyId),
        inArray(schema.products.id, productIds),
      ),
      with: {
        prices: true,
      },
    });

    if (dbProducts.length !== new Set(productIds).size) {
      throw new BadRequestException(
        'Um ou mais produtos não foram encontrados ou não pertencem à sua empresa.',
      );
    }

    return await this.db.transaction(async (tx) => {
      // 2. Gerar número do pedido sequencial
      const lastOrder = await tx
        .select({ order_number: schema.orders.order_number })
        .from(schema.orders)
        .where(eq(schema.orders.company_id, companyId))
        .orderBy(desc(schema.orders.order_number))
        .limit(1);

      const nextOrderNumber =
        lastOrder.length > 0 ? lastOrder[0].order_number + 1 : 1;

      // 3. Calcular o Total Real do Pedido usando a tabela de preços
      let totalCents = 0;
      const itemsToInsert = dto.items.map((itemDto) => {
        const product = dbProducts.find((p) => p.id === itemDto.product_id);

        // CORREÇÃO: Verificação explícita para o TypeScript
        if (!product) {
          throw new NotFoundException(
            `Produto ${itemDto.product_id} sumiu da consulta.`,
          );
        }

        // Lógica de Preço Dinâmico (Atacado vs Normal)
        let activePrice = product.prices[0]?.price || '0';

        if (
          product.wholesale_price &&
          product.wholesale_min_qty &&
          itemDto.quantity >= product.wholesale_min_qty
        ) {
          activePrice = product.wholesale_price;
        }

        const unitPriceCents = Math.round(Number(activePrice) * 100);
        const subtotal = unitPriceCents * itemDto.quantity;
        totalCents += subtotal;

        return {
          product_id: itemDto.product_id,
          quantity: itemDto.quantity,
          unit_price: activePrice,
          notes: itemDto.notes,
        };
      });

      // 4. Inserir Cabeçalho do Pedido
      const [order] = await tx
        .insert(schema.orders)
        .values({
          company_id: companyId,
          order_number: nextOrderNumber,
          customer_name: dto.customer_name,
          customer_tax_id: dto.customer_tax_id,
          payment_method: dto.payment_method,
          table_number: dto.table_number,
          total: (totalCents / 100).toFixed(2),
          status: 'pending',
        })
        .returning();

      // 5. Inserir Itens do Pedido
      const finalItems = itemsToInsert.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      await tx.insert(schema.orderItems).values(finalItems);

      return {
        ...order,
        items: finalItems,
      };
    });
  }

  async findAll(companyId: string) {
    return await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.company_id, companyId))
      .orderBy(desc(schema.orders.created_at));
  }

  async findOne(id: string, companyId: string) {
    const order = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, id), eq(schema.orders.company_id, companyId)),
      );

    if (order.length === 0)
      throw new NotFoundException('Pedido não encontrado.');

    const items = await this.db
      .select({
        id: schema.orderItems.id,
        quantity: schema.orderItems.quantity,
        unit_price: schema.orderItems.unit_price,
        product_name: schema.products.name,
      })
      .from(schema.orderItems)
      .innerJoin(
        schema.products,
        eq(schema.orderItems.product_id, schema.products.id),
      )
      .where(eq(schema.orderItems.order_id, id));

    return {
      ...order[0],
      items,
    };
  }
}
