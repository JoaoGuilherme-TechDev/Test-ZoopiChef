/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(companyId: string, dto: CreateOrderDto) {
    const isTableOrder =
      typeof dto.table_number === 'string' && dto.table_number.trim() !== '';

    const normalizedTableNumber = isTableOrder
      ? dto.table_number!.trim()
      : undefined;

    const normalizedPaymentMethod =
      typeof dto.payment_method === 'string' &&
      dto.payment_method.trim() !== ''
        ? dto.payment_method.trim()
        : undefined;

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('O pedido deve conter ao menos um item.');
    }

    if (!isTableOrder && !normalizedPaymentMethod) {
      throw new BadRequestException(
        'A forma de pagamento é obrigatória para pedidos delivery.',
      );
    }

    const productIds = dto.items.map((i) => i.product_id);

    const dbProducts = await this.db.query.products.findMany({
      where: and(
        eq(schema.products.company_id, companyId),
        inArray(schema.products.id, productIds),
      ),
      with: { prices: true },
    });

    if (dbProducts.length === 0) {
      throw new BadRequestException('Nenhum produto válido encontrado.');
    }

    return await this.db.transaction(async (tx) => {
      const lastOrder = await tx
        .select({ order_number: schema.orders.order_number })
        .from(schema.orders)
        .where(eq(schema.orders.company_id, companyId))
        .orderBy(desc(schema.orders.order_number))
        .limit(1);

      const nextOrderNumber =
        lastOrder.length > 0 ? lastOrder[0].order_number + 1 : 1;

      let totalCents = 0;

      const itemsToInsert = dto.items.map((itemDto) => {
        const product = dbProducts.find((p) => p.id === itemDto.product_id);

        if (!product) {
          throw new NotFoundException(
            `Produto ${itemDto.product_id} não encontrado.`,
          );
        }

        const price = Number(product.prices[0]?.price || 0);
        totalCents += Math.round(price * 100) * itemDto.quantity;

        return {
          product_id: itemDto.product_id,
          quantity: itemDto.quantity,
          unit_price: price.toString(),
          notes: itemDto.notes,
        };
      });

      const [order] = await tx
        .insert(schema.orders)
        .values({
          company_id: companyId,
          order_number: nextOrderNumber,
          customer_name: dto.customer_name,
          customer_tax_id: dto.customer_tax_id,
          status: 'pending',
          total: (totalCents / 100).toFixed(2),
          payment_method: normalizedPaymentMethod,
          table_number: normalizedTableNumber,
        })
        .returning();

      await tx
        .insert(schema.orderItems)
        .values(itemsToInsert.map((item) => ({ ...item, order_id: order.id })));

      return { ...order, items: itemsToInsert };
    });
  }

  async findAll(companyId: string) {
    return await this.db.query.orders.findMany({
      where: eq(schema.orders.company_id, companyId),
      orderBy: [desc(schema.orders.created_at)],
    });
  }

  async findOne(id: string, companyId: string) {
    const order = await this.db.query.orders.findFirst({
      where: and(
        eq(schema.orders.id, id),
        eq(schema.orders.company_id, companyId),
      ),
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return order;
  }

  /**
   * Fluxo separado por tipo:
   * - Mesa: pending -> preparing -> ready -> delivered
   * - Delivery: pending -> preparing -> ready -> out_for_delivery -> delivered
   */
  async updateStatus(id: string, companyId: string, newStatus: string) {
    const validStatus = [
      'pending',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];

    if (!validStatus.includes(newStatus)) {
      throw new BadRequestException(`Status '${newStatus}' é inválido.`);
    }

    const currentOrder = await this.db.query.orders.findFirst({
      where: and(
        eq(schema.orders.id, id),
        eq(schema.orders.company_id, companyId),
      ),
    });

    if (!currentOrder) {
      throw new NotFoundException('Pedido não encontrado para esta empresa.');
    }

    const isTableOrder =
      typeof currentOrder.table_number === 'string' &&
      currentOrder.table_number.trim() !== '';

    const allowedTransitions: Record<string, string[]> = isTableOrder
      ? {
          pending: ['preparing', 'cancelled'],
          preparing: ['ready', 'cancelled'],
          ready: ['delivered'],
          out_for_delivery: [],
          delivered: [],
          cancelled: [],
        }
      : {
          pending: ['preparing', 'cancelled'],
          preparing: ['ready', 'cancelled'],
          ready: ['out_for_delivery', 'delivered'],
          out_for_delivery: ['delivered'],
          delivered: [],
          cancelled: [],
        };

    const currentStatus = currentOrder.status;

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transição inválida: '${currentStatus}' -> '${newStatus}'.`,
      );
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({
        status: newStatus,
        updated_at: new Date(),
      })
      .where(
        and(eq(schema.orders.id, id), eq(schema.orders.company_id, companyId)),
      )
      .returning();

    return updated;
  }
}