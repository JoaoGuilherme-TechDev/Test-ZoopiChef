import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(companyId: string, dto: CreateCustomerDto) {
    const [customer] = await this.db
      .insert(schema.customers)
      .values({ ...dto, company_id: companyId })
      .returning();
    return customer;
  }

  async findAll(companyId: string, search?: string) {
    const whereClause = search
      ? and(
          eq(schema.customers.company_id, companyId),
          or(
            ilike(schema.customers.name,   `%${search}%`),
            ilike(schema.customers.phone,  `%${search}%`),
            ilike(schema.customers.tax_id, `%${search}%`),
          ),
        )
      : eq(schema.customers.company_id, companyId);

    return this.db.query.customers.findMany({
      where: whereClause,
      orderBy: [desc(schema.customers.created_at)],
    });
  }

  async findOne(id: string, companyId: string) {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(schema.customers.id, id),
        eq(schema.customers.company_id, companyId),
      ),
      with: { addresses: true },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer;
  }

  async update(id: string, companyId: string, dto: any) {
    const [updated] = await this.db
      .update(schema.customers)
      .set({ ...dto, updated_at: new Date() })
      .where(and(eq(schema.customers.id, id), eq(schema.customers.company_id, companyId)))
      .returning();
    if (!updated) throw new NotFoundException('Cliente não encontrado.');
    return updated;
  }

  async remove(id: string, companyId: string) {
    const [deleted] = await this.db
      .delete(schema.customers)
      .where(and(eq(schema.customers.id, id), eq(schema.customers.company_id, companyId)))
      .returning();
    if (!deleted) throw new NotFoundException('Cliente não encontrado.');
    return { success: true };
  }

  // ── Addresses ───────────────────────────────────────────────────────────────

  async addAddress(companyId: string, customerId: string, dto: any) {
    const [address] = await this.db
      .insert(schema.customerAddresses)
      .values({ customer_id: customerId, ...dto })
      .returning();
    return address;
  }

  // FIX: was missing — DELETE /customers/:id/addresses/:addressId calls this
  async removeAddress(companyId: string, customerId: string, addressId: string) {
    // Verify the customer belongs to the company before deleting
    await this.findOne(customerId, companyId);

    const [deleted] = await this.db
      .delete(schema.customerAddresses)
      .where(
        and(
          eq(schema.customerAddresses.id, addressId),
          eq(schema.customerAddresses.customer_id, customerId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundException('Endereço não encontrado.');
    return { success: true };
  }

  // ── Fiado ────────────────────────────────────────────────────────────────────

  // balance_cents convention: positive = customer owes. Payments decrement it.
  // A payment larger than the debt makes balance negative = customer has credit.
  async registerPayment(companyId: string, customerId: string, amountCents: number) {
    const customer = await this.findOne(customerId, companyId);
    const newBalance = customer.balance_cents - amountCents;

    await this.db
      .update(schema.customers)
      .set({ balance_cents: newBalance, updated_at: new Date() })
      .where(eq(schema.customers.id, customerId));

    return { success: true, newBalance };
  }

  // ── Bulk import ──────────────────────────────────────────────────────────────

  async bulkImport(companyId: string, items: any[]) {
    const results = {
      created: 0,
      errors: [] as { name: string; error: string }[],
    };

    for (const item of items) {
      try {
        const cleanName = item.name?.toString().trim();
        if (!cleanName) continue;

        await this.db.insert(schema.customers).values({
          company_id: companyId,
          name:    cleanName,
          email:   item.email?.toLowerCase().trim()   || null,
          phone:   item.phone?.replace(/\D/g, '')     || null,
          tax_id:  item.tax_id?.replace(/\D/g, '')    || null,
          address: item.address                       || null,
          notes:   item.notes                         || 'Importado',
        });
        results.created++;
      } catch {
        results.errors.push({
          name:  item.name || 'Desconhecido',
          error: 'Verifique se este cliente já existe ou se os dados são inválidos.',
        });
      }
    }

    return results;
  }
}