import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TableQRTokensService } from './table-qr-tokens.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('table-qr-tokens')
export class TableQRTokensController {
  constructor(private readonly service: TableQRTokensService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Post()
  generate(@Request() req, @Body('tableId') tableId: string) {
    return this.service.generate(req.user.companyId, tableId);
  }

  @UseGuards(AuthGuard)
  @Post('batch')
  generateBatch(@Request() req, @Body('tableIds') tableIds: string[]) {
    return this.service.generateBatch(req.user.companyId, tableIds);
  }

  @Get('public/:token')
  getPublicInfo(@Param('token') token: string) {
    return this.service.getPublicInfo(token);
  }
}
