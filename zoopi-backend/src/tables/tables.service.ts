// ================================================================
// FILE: src/tables/tables.service.ts  (full replacement)
// ================================================================

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, inArray, count } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
  CreateCommandDto,
  LaunchOrderDto,
  TransferItemsDto,
  TransferTableDto,
  MergeTablesDto,
  SubmitPaymentDto,
} from './dto/tables.dto';

@Injectable()
export class TablesService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async findAll(companyId: string) {
    return this.db.query.restaurantTables.findMany({
      where: eq(schema.restaurantTables.company_id, companyId),
      orderBy: schema.restaurantTables.number,
    });
  }

  async findOne(id: string, companyId: string) {
    const table = await this.db.query.restaurantTables.findFirst({
      where: and(
        eq(schema.restaurantTables.id, id),
        eq(schema.restaurantTables.company_id, companyId),
      ),
    });
    if (!table) throw new NotFoundException('Mesa não encontrada');
    return table;
  }

  async create(companyId: string, dto: CreateTableDto) {
    const [{ value: tableCount }] = await this.db
      .select({ value: count() })
      .from(schema.restaurantTables)
      .where(eq(schema.restaurantTables.company_id, companyId));

    const nextNumber = Number(tableCount) + 1;

    const [table] = await this.db
      .insert(schema.restaurantTables)
      .values({
        company_id: companyId,
        number: nextNumber,
        name: `Mesa ${nextNumber}`,
        capacity: dto.capacity ?? 4,
        section: dto.section ?? null,
      })
      .returning();

    return table;
  }

  async update(id: string, companyId: string, dto: UpdateTableDto) {
    const [table] = await this.db
      .update(schema.restaurantTables)
      .set({ ...dto, updated_at: new Date() })
      .where(
        and(
          eq(schema.restaurantTables.id, id),
          eq(schema.restaurantTables.company_id, companyId),
        ),
      )
      .returning();
    if (!table) throw new NotFoundException('Mesa não encontrada');
    return table;
  }

  async remove(id: string, companyId: string) {
    const [table] = await this.db
      .delete(schema.restaurantTables)
      .where(
        and(
          eq(schema.restaurantTables.id, id),
          eq(schema.restaurantTables.company_id, companyId),
        ),
      )
      .returning();
    if (!table) throw new NotFoundException('Mesa não encontrada');
    return table;
  }

async updateStatus(id: string, companyId: string, dto: UpdateTableStatusDto) {

  
  const result = await this.db
    .update(schema.restaurantTables)
    .set({ status: dto.status as any, updated_at: new Date() })
    .where(
      and(
        eq(schema.restaurantTables.id, id),
        eq(schema.restaurantTables.company_id, companyId),
      ),
    )
    .returning();
    

  return result[0];
}


  // ─── SESSION ─────────────────────────────────────────────────────────────

  async getSession(tableId: string, companyId: string) {
    const table = await this.findOne(tableId, companyId);

    const commands = await this.db.query.commands.findMany({
      where: and(
        eq(schema.commands.table_id, tableId),
        eq(schema.commands.company_id, companyId),
        eq(schema.commands.status, 'open'),
      ),
    });

    const items = await this.db.query.tableSessionItems.findMany({
      where: and(
        eq(schema.tableSessionItems.table_id, tableId),
        eq(schema.tableSessionItems.company_id, companyId),
      ),
      with: { product: true, command: true },
      orderBy: schema.tableSessionItems.created_at,
    });

    // Fetch payments for this table session (not yet deleted/closed)
    const payments = await this.db.query.tablePayments.findMany({
      where: and(
        eq(schema.tablePayments.table_id, tableId),
        eq(schema.tablePayments.company_id, companyId),
      ),
      with: { customer: true },
      orderBy: schema.tablePayments.created_at,
    });

    const total = items.reduce(
      (sum, item) => sum + Number(item.unit_price) * item.quantity,
      0,
    );

    const paidTotal = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const remaining = Math.max(0, total - paidTotal);

    return {
      table,
      commands,
      items,
      payments: payments.map((p) => ({
        id:           p.id,
        amount:       Number(p.amount),
        method:       p.method,
        mode:         p.mode,
        customer_id:  p.customer_id,
        customer_name: p.customer?.name ?? p.customer_name,
        command_id:   p.command_id,
        created_at:   p.created_at,
      })),
      total,
      paidTotal,
      remaining,
    };
  }

  async closeTable(tableId: string, companyId: string) {
    await this.db
      .update(schema.commands)
      .set({ status: 'closed', updated_at: new Date() })
      .where(
        and(
          eq(schema.commands.table_id, tableId),
          eq(schema.commands.company_id, companyId),
          eq(schema.commands.status, 'open'),
        ),
      );

    await this.db
      .delete(schema.tableSessionItems)
      .where(
        and(
          eq(schema.tableSessionItems.table_id, tableId),
          eq(schema.tableSessionItems.company_id, companyId),
        ),
      );

    // Clear payments for this session too
    await this.db
      .delete(schema.tablePayments)
      .where(
        and(
          eq(schema.tablePayments.table_id, tableId),
          eq(schema.tablePayments.company_id, companyId),
        ),
      );

    return this.updateStatus(tableId, companyId, { status: 'free' });
  }

  async printBill(tableId: string, companyId: string) {
    return this.getSession(tableId, companyId);
  }

  // ─── PAYMENTS ────────────────────────────────────────────────────────────

  async submitPayment(tableId: string, companyId: string, dto: SubmitPaymentDto) {
    await this.findOne(tableId, companyId);

    const [payment] = await this.db
      .insert(schema.tablePayments)
      .values({
        company_id:    companyId,
        table_id:      tableId,
        command_id:    dto.command_id   ?? null,
        customer_id:   dto.customer_id  ?? null,
        customer_name: dto.customer_name ?? null,
        method:        dto.method,
        mode:          dto.mode,
        amount:        String(dto.amount),
      })
      .returning();

    // Mark table as "payment" status when a payment is registered
    await this.updateStatus(tableId, companyId, { status: 'payment' });

    return payment;
  }

  // ─── COMMANDS ────────────────────────────────────────────────────────────

  async createCommand(tableId: string, companyId: string, dto: CreateCommandDto) {
    await this.findOne(tableId, companyId);

    const now = new Date();

    const [command] = await this.db
      .insert(schema.commands)
      .values({
        table_id:   tableId,
        company_id: companyId,
        name:       dto.name,
        status:     'open',
        created_at: now,
        updated_at: now,
      })
      .returning();

    return command;
  }

  async closeCommand(tableId: string, commandId: string, companyId: string) {
    const [command] = await this.db
      .update(schema.commands)
      .set({ status: 'closed', updated_at: new Date() })
      .where(
        and(
          eq(schema.commands.id, commandId),
          eq(schema.commands.table_id, tableId),
          eq(schema.commands.company_id, companyId),
        ),
      )
      .returning();
    if (!command) throw new NotFoundException('Comanda não encontrada');
    return command;
  }

  // ─── ITEMS ───────────────────────────────────────────────────────────────

  async deleteItem(tableId: string, itemId: string, companyId: string) {
    const [item] = await this.db
      .delete(schema.tableSessionItems)
      .where(
        and(
          eq(schema.tableSessionItems.id, itemId),
          eq(schema.tableSessionItems.table_id, tableId),
          eq(schema.tableSessionItems.company_id, companyId),
        ),
      )
      .returning();
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async deleteAllItems(tableId: string, companyId: string) {
    return this.db
      .delete(schema.tableSessionItems)
      .where(
        and(
          eq(schema.tableSessionItems.table_id, tableId),
          eq(schema.tableSessionItems.company_id, companyId),
        ),
      );
  }

  // ─── ORDERS ──────────────────────────────────────────────────────────────

  async launchOrder(tableId: string, companyId: string, dto: LaunchOrderDto) {

    await this.findOne(tableId, companyId);

    const productIds = dto.items.map((i) => i.product_id);

    const products = await this.db.query.products.findMany({
      where: inArray(schema.products.id, productIds),
      with: { prices: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const rows = dto.items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new NotFoundException(`Produto ${item.product_id} não encontrado`);
      }

      const unitPrice =
        (product.is_on_sale && product.sale_price)
          ? product.sale_price
          : product.prices?.[0]?.price
          ?? product.sale_price
          ?? '0.00';

      return {
        company_id: companyId,
        table_id:   tableId,
        command_id: item.command_id ?? null,
        product_id: item.product_id,
        quantity:   item.quantity,
        unit_price: unitPrice,
        note:       item.note ?? null,
      };
    });

    const inserted = await this.db
      .insert(schema.tableSessionItems)
      .values(rows)
      .returning();

    await this.updateStatus(tableId, companyId, { status: 'occupied' });

    return inserted;
  }

  // ─── TRANSFER & MERGE ────────────────────────────────────────────────────

  async transferItems(tableId: string, companyId: string, dto: TransferItemsDto) {
    return this.db
      .update(schema.tableSessionItems)
      .set({
        table_id:   dto.target_table_id,
        command_id: dto.target_command_id ?? null,
      })
      .where(
        and(
          inArray(schema.tableSessionItems.id, dto.item_ids),
          eq(schema.tableSessionItems.table_id, tableId),
          eq(schema.tableSessionItems.company_id, companyId),
        ),
      )
      .returning();
  }

  async transferTable(tableId: string, companyId: string, dto: TransferTableDto) {
    await this.db
      .update(schema.tableSessionItems)
      .set({ table_id: dto.target_table_id })
      .where(
        and(
          eq(schema.tableSessionItems.table_id, tableId),
          eq(schema.tableSessionItems.company_id, companyId),
        ),
      );

    await this.db
      .update(schema.commands)
      .set({ table_id: dto.target_table_id, updated_at: new Date() })
      .where(
        and(
          eq(schema.commands.table_id, tableId),
          eq(schema.commands.company_id, companyId),
          eq(schema.commands.status, 'open'),
        ),
      );

    await this.updateStatus(tableId, companyId, { status: 'free' });
    await this.updateStatus(dto.target_table_id, companyId, { status: 'occupied' });

    return { success: true };
  }

  async mergeTables(tableId: string, companyId: string, dto: MergeTablesDto) {
    await this.db
      .update(schema.tableSessionItems)
      .set({ table_id: tableId })
      .where(
        and(
          eq(schema.tableSessionItems.table_id, dto.source_table_id),
          eq(schema.tableSessionItems.company_id, companyId),
        ),
      );

    await this.db
      .update(schema.commands)
      .set({ table_id: tableId, updated_at: new Date() })
      .where(
        and(
          eq(schema.commands.table_id, dto.source_table_id),
          eq(schema.commands.company_id, companyId),
          eq(schema.commands.status, 'open'),
        ),
      );

    await this.updateStatus(dto.source_table_id, companyId, { status: 'free' });

    return { success: true };
  }
}