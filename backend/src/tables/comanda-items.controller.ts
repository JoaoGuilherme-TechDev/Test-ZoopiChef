import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards, Request, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ComandaItemsService } from './comanda-items.service';

@Controller('comanda-items')
@UseGuards(AuthGuard('jwt'))
export class ComandaItemsController {
  constructor(private readonly comandaItemsService: ComandaItemsService) {}

  @Get()
  findAll(
    @Query('comandaId') comandaId: string,
    @Headers('company-id') companyId: string
  ) {
    return this.comandaItemsService.findAll(comandaId, companyId);
  }

  @Post()
  create(
    @Body() body: {
      comandaId: string;
      productId: string | null;
      productName: string;
      qty: number;
      unitPrice: number;
      notes?: string;
      optionsJson?: any;
    },
    @Headers('company-id') companyId: string,
    @Request() req
  ) {
    return this.comandaItemsService.create({
      ...body,
      companyId,
      createdBy: req.user.sub || req.user.id,
    });
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req
  ) {
    return this.comandaItemsService.cancel(id, body.reason, req.user.sub || req.user.id);
  }

  @Post('transfer')
  transfer(
    @Body() body: {
      itemId: string;
      targetComandaId: string;
      qtyToTransfer: number;
    },
    @Request() req
  ) {
    return this.comandaItemsService.transfer({
      ...body,
      userId: req.user.sub || req.user.id,
    });
  }

  @Post('print')
  markAsPrinted(@Body() body: { ids: string[] }) {
    return this.comandaItemsService.markAsPrinted(body.ids);
  }
}
