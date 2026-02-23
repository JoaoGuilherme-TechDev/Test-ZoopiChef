import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ComandasService } from './comandas.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('comandas')
export class ComandasController {
  constructor(private readonly comandasService: ComandasService) {}

  @UseGuards(AuthGuard)
  @Get('check-batch')
  checkBatch(@Request() req, @Query('start') start: number, @Query('end') end: number) {
    return this.comandasService.checkBatch(req.user.companyId, Number(start), Number(end));
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req, @Query('status') status?: string | string[]) {
    // If status is a string, convert to array
    const statusFilter = typeof status === 'string' ? [status] : status;
    return this.comandasService.findAll(req.user.companyId, statusFilter);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comandasService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req, @Body() createComandaDto: any) {
    return this.comandasService.create({
      ...createComandaDto,
      companyId: req.user.companyId,
      createdBy: req.user.userId,
    });
  }

  @UseGuards(AuthGuard)
  @Post('batch')
  batchCreate(@Request() req, @Body() body: { startNumber: number; endNumber: number; applyServiceFee: boolean; serviceFeePercent: number }) {
    return this.comandasService.batchCreate({
      companyId: req.user.companyId,
      startNumber: body.startNumber,
      endNumber: body.endNumber,
      applyServiceFee: body.applyServiceFee,
      serviceFeePercent: body.serviceFeePercent,
      createdBy: req.user.userId,
    });
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComandaDto: any) {
    return this.comandasService.update(id, updateComandaDto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/close')
  close(@Request() req, @Param('id') id: string, @Body() body: { tableNumber?: string }) {
    return this.comandasService.close(id, body.tableNumber, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post(':id/reopen')
  reopen(@Request() req, @Param('id') id: string) {
    return this.comandasService.reopen(id, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post(':id/request-bill')
  requestBill(@Request() req, @Param('id') id: string) {
    return this.comandasService.requestBill(id, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post(':id/release')
  release(@Request() req, @Param('id') id: string) {
    return this.comandasService.release(id, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('merge')
  merge(@Request() req, @Body() body: { sourceId: string; targetId: string }) {
    return this.comandasService.merge(body.sourceId, body.targetId, req.user.userId);
  }
}

@Controller('comanda-settings')
export class ComandaSettingsController {
  constructor(private readonly comandasService: ComandasService) {}

  @UseGuards(AuthGuard)
  @Get()
  getSettings(@Request() req) {
    return this.comandasService.getSettings(req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Post() // Or Patch
  updateSettings(@Request() req, @Body() body: any) {
    return this.comandasService.updateSettings(req.user.companyId, body);
  }
}
