import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ── Static routes first — must come before :id to avoid shadowing ──────────

  @Get('export')
  async exportCustomers(@GetCompanyId() companyId: string) {
    const customers = await this.customersService.findAll(companyId);
    return customers.map(c => ({
      Nome:      c.name,
      Email:     c.email     || '',
      Telefone:  c.phone     || '',
      Documento: c.tax_id    || '',
      Endereco:  c.address   || '',
      Saldo:     (c.balance_cents / 100).toFixed(2),
    }));
  }

  @Post('bulk')
  async bulkImport(
    @GetCompanyId() companyId: string,
    @Body('items') items: any[],
  ) {
    return this.customersService.bulkImport(companyId, items);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  create(
    @GetCompanyId() companyId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(companyId, dto);
  }

  @Get()
  findAll(
    @GetCompanyId() companyId: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(companyId, search);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
  ) {
    return this.customersService.findOne(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: any,
  ) {
    return this.customersService.update(id, companyId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
  ) {
    return this.customersService.remove(id, companyId);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  @Post(':id/addresses')
  addAddress(
    @Param('id') customerId: string,
    @GetCompanyId() companyId: string,
    @Body() dto: any,
  ) {
    return this.customersService.addAddress(companyId, customerId, dto);
  }

  // FIX: was missing — frontend deleteAddress mutation calls this route
  @Delete(':id/addresses/:addressId')
  removeAddress(
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
    @GetCompanyId() companyId: string,
  ) {
    return this.customersService.removeAddress(companyId, customerId, addressId);
  }

  // ── Fiado ─────────────────────────────────────────────────────────────────

  @Post(':id/pay')
  registerPayment(
    @Param('id') customerId: string,
    @GetCompanyId() companyId: string,
    @Body('amount_cents') amountCents: number,
  ) {
    return this.customersService.registerPayment(companyId, customerId, amountCents);
  }
}