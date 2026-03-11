// ================================================================
// FILE: zoopi-backend/src/waitlist/waitlist.service.ts
// ================================================================

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  CreateWaitlistEntryDto,
  SeatWaitlistEntryDto,
  CancelWaitlistEntryDto,
} from './dto/waitlist.dto';

// Statuses considered "active" (visible in the queue)
const ACTIVE_STATUSES = ['waiting', 'notified'] as const;

@Injectable()
export class WaitlistService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // ----------------------------------------------------------------
  // GET /api/waitlist
  // Returns all active entries for the company, ordered by requested_at
  // Also returns available tables so the frontend can show the seat modal
  // ----------------------------------------------------------------
  async findActive(companyId: string) {
    const entries = await this.db.query.waitlist.findMany({
      where: and(
        eq(schema.waitlist.company_id, companyId),
        inArray(schema.waitlist.status, [...ACTIVE_STATUSES]),
      ),
      orderBy: schema.waitlist.requested_at,
      with: {
        assignedTable: true,
      },
    });

    const availableTables = await this.db.query.restaurantTables.findMany({
      where: and(
        eq(schema.restaurantTables.company_id, companyId),
        eq(schema.restaurantTables.status, 'free'),
      ),
      orderBy: schema.restaurantTables.number,
    });

    return { entries, availableTables };
  }

  // ----------------------------------------------------------------
  // POST /api/waitlist
  // Adds a new customer to the queue
  // ----------------------------------------------------------------
  async create(companyId: string, dto: CreateWaitlistEntryDto) {
    const [entry] = await this.db
      .insert(schema.waitlist)
      .values({
        company_id: companyId,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone ?? null,
        party_size: dto.party_size,
        special_requests: dto.special_requests ?? null,
        status: 'waiting',
      })
      .returning();

    return entry;
  }

  // ----------------------------------------------------------------
  // PATCH /api/waitlist/:id/notify
  // Marks an entry as notified (customer called to the table)
  // ----------------------------------------------------------------
  async notify(id: string, companyId: string) {
    const entry = await this._findActiveEntry(id, companyId);

    if (entry.status !== 'waiting') {
      throw new BadRequestException(
        `Cannot notify an entry with status "${entry.status}".`,
      );
    }

    const [updated] = await this.db
      .update(schema.waitlist)
      .set({
        status: 'notified',
        notified_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.waitlist.id, id))
      .returning();

    return updated;
  }

  // ----------------------------------------------------------------
  // PATCH /api/waitlist/:id/seat
  // Seats the customer — assigns table and marks as seated
  // Also sets the restaurant table status to 'occupied'
  // ----------------------------------------------------------------
  async seat(id: string, companyId: string, dto: SeatWaitlistEntryDto) {
    const entry = await this._findActiveEntry(id, companyId);

    if (entry.status !== 'notified') {
      throw new BadRequestException(
        `Cannot seat an entry with status "${entry.status}". Notify the customer first.`,
      );
    }

    // Validate table belongs to same company and is free
    const table = await this.db.query.restaurantTables.findFirst({
      where: and(
        eq(schema.restaurantTables.id, dto.table_id),
        eq(schema.restaurantTables.company_id, companyId),
      ),
    });

    if (!table) {
      throw new NotFoundException('Mesa não encontrada.');
    }

    if (table.status !== 'free') {
      throw new BadRequestException(
        `Mesa ${table.number} não está livre (status: ${table.status}).`,
      );
    }

    // Run both updates — seat the entry and occupy the table
    const [updatedEntry] = await this.db
      .update(schema.waitlist)
      .set({
        status: 'seated',
        assigned_table_id: dto.table_id,
        seated_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.waitlist.id, id))
      .returning();

    await this.db
      .update(schema.restaurantTables)
      .set({
        status: 'occupied',
        updated_at: new Date(),
      })
      .where(eq(schema.restaurantTables.id, dto.table_id));

    return {
      ...updatedEntry,
      assignedTable: { ...table, status: 'occupied' },
    };
  }

  // ----------------------------------------------------------------
  // PATCH /api/waitlist/:id/cancel
  // Cancels an entry — either staff-cancelled or no_show
  // ----------------------------------------------------------------
  async cancel(
    id: string,
    companyId: string,
    dto: CancelWaitlistEntryDto,
  ) {
    const entry = await this._findActiveEntry(id, companyId);

    const newStatus = dto.no_show === true ? 'no_show' : 'cancelled';

    const [updated] = await this.db
      .update(schema.waitlist)
      .set({
        status: newStatus,
        updated_at: new Date(),
      })
      .where(eq(schema.waitlist.id, id))
      .returning();

    return updated;
  }

  // ----------------------------------------------------------------
  // Internal helper — fetches an active entry and throws if not found
  // ----------------------------------------------------------------
  private async _findActiveEntry(id: string, companyId: string) {
    const entry = await this.db.query.waitlist.findFirst({
      where: and(
        eq(schema.waitlist.id, id),
        eq(schema.waitlist.company_id, companyId),
        inArray(schema.waitlist.status, [...ACTIVE_STATUSES]),
      ),
    });

    if (!entry) {
      throw new NotFoundException(
        'Entrada não encontrada ou já finalizada.',
      );
    }

    return entry;
  }
}