// src/tables/tables.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from './tables.service';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';
import { timeStamp } from 'console';

@Controller('tables')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  findAll(@GetCompanyId() companyId: string) {
    return this.tablesService.findAll(companyId);
  }

  @Post()
  create(@GetCompanyId() companyId: string, @Body() dto: CreateTableDto) {
    return this.tablesService.create(companyId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.update(id, companyId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.tablesService.remove(id, companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(id, companyId, dto);
  }

  @Get(':id/session')
  getSession(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.tablesService.getSession(id, companyId);
  }

  @Post(':id/close')
  closeTable(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.tablesService.closeTable(id, companyId);
  }

  @Post(':id/print')
  printBill(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.tablesService.printBill(id, companyId);
  }

  @Post(':id/commands')
  createCommand(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: CreateCommandDto,
  ) {
    return this.tablesService.createCommand(id, companyId, dto);
  }

  @Patch(':id/commands/:cmdId/close')
  closeCommand(
    @Param('id') id: string,
    @Param('cmdId') cmdId: string,
    @GetCompanyId() companyId: string,
  ) {
    return this.tablesService.closeCommand(id, cmdId, companyId);
  }

  @Delete(':id/items/:itemId')
  deleteItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @GetCompanyId() companyId: string,
  ) {
    return this.tablesService.deleteItem(id, itemId, companyId);
  }

  @Delete(':id/items')
  deleteAllItems(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.tablesService.deleteAllItems(id, companyId);
  }

  @Post(':id/payments')
  submitPayment(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: SubmitPaymentDto,
  ){
    return this.tablesService.submitPayment(id, companyId, dto);
  }

  @Post(':id/orders')
  launchOrder(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: LaunchOrderDto,
  ) {
    return this.tablesService.launchOrder(id, companyId, dto);
  }

  @Post(':id/transfer/items')
  transferItems(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: TransferItemsDto,
  ) {
    return this.tablesService.transferItems(id, companyId, dto);
  }

  @Post(':id/transfer/table')
  transferTable(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: TransferTableDto,
  ) {
    return this.tablesService.transferTable(id, companyId, dto);
  }

  @Post(':id/merge')
  mergeTables(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: MergeTablesDto,
  ) {
    return this.tablesService.mergeTables(id, companyId, dto);
  }
}