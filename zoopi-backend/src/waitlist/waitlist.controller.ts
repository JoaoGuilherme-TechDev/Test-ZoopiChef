// ================================================================
// FILE: zoopi-backend/src/waitlist/waitlist.controller.ts
// ================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import {
  CreateWaitlistEntryDto,
  SeatWaitlistEntryDto,
  CancelWaitlistEntryDto,
} from './dto/waitlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('waitlist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  /**
   * GET /api/waitlist
   * Returns { entries: WaitlistEntry[], availableTables: RestaurantTable[] }
   * Frontend uses this to render the queue and populate the seat modal
   */
  @Get()
  @Roles('admin', 'manager', 'waiter', 'cashier')
  findActive(@GetCompanyId() companyId: string) {
    return this.waitlistService.findActive(companyId);
  }

  /**
   * POST /api/waitlist
   * Body: { customer_name, customer_phone?, party_size, special_requests? }
   * Adds a new customer to the queue with status = 'waiting'
   */
  @Post()
  @Roles('admin', 'manager', 'waiter', 'cashier')
  create(
    @GetCompanyId() companyId: string,
    @Body() dto: CreateWaitlistEntryDto,
  ) {
    return this.waitlistService.create(companyId, dto);
  }

  /**
   * PATCH /api/waitlist/:id/notify
   * No body required
   * Moves entry from 'waiting' → 'notified', sets notified_at
   */
  @Patch(':id/notify')
  @Roles('admin', 'manager', 'waiter', 'cashier')
  notify(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
  ) {
    return this.waitlistService.notify(id, companyId);
  }

  /**
   * PATCH /api/waitlist/:id/seat
   * Body: { table_id: string }
   * Moves entry from 'notified' → 'seated'
   * Also sets restaurant_tables.status = 'occupied' for the given table
   */
  @Patch(':id/seat')
  @Roles('admin', 'manager', 'waiter', 'cashier')
  seat(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: SeatWaitlistEntryDto,
  ) {
    return this.waitlistService.seat(id, companyId, dto);
  }

  /**
   * PATCH /api/waitlist/:id/cancel
   * Body: { no_show?: boolean }
   * no_show = true  → status becomes 'no_show'
   * no_show = false → status becomes 'cancelled'
   */
  @Patch(':id/cancel')
  @Roles('admin', 'manager', 'waiter', 'cashier')
  cancel(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: CancelWaitlistEntryDto,
  ) {
    return this.waitlistService.cancel(id, companyId, dto);
  }
}