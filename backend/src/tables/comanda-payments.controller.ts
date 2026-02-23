import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ComandaPaymentsService } from './comanda-payments.service';

@Controller('comanda-payments')
@UseGuards(AuthGuard('jwt'))
export class ComandaPaymentsController {
  constructor(private readonly comandaPaymentsService: ComandaPaymentsService) {}

  @Get()
  findAll(
    @Query('comandaId') comandaId: string,
    @Headers('company-id') companyId: string
  ) {
    return this.comandaPaymentsService.findAll(comandaId, companyId);
  }

  @Post()
  create(
    @Body() body: {
      comandaId: string;
      amount: number;
      paymentMethod: string;
      paidByName?: string;
      paidByUserId?: string;
      customerId?: string;
      loyaltyPointsAwarded?: number;
      nsu?: string;
    },
    @Headers('company-id') companyId: string,
    @Request() req
  ) {
    return this.comandaPaymentsService.create({
      ...body,
      companyId,
      createdBy: req.user.sub || req.user.id,
    });
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('company-id') companyId: string
  ) {
    return this.comandaPaymentsService.remove(id, companyId);
  }
}
