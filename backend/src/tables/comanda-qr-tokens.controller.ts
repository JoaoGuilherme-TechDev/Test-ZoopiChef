import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ComandaQRTokensService } from './comanda-qr-tokens.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('comanda-qr-tokens')
export class ComandaQRTokensController {
  constructor(private readonly service: ComandaQRTokensService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Post()
  generate(@Request() req, @Body('comandaNumber') comandaNumber: number) {
    return this.service.generate(req.user.companyId, comandaNumber);
  }

  @UseGuards(AuthGuard)
  @Post('batch')
  generateBatch(@Request() req, @Body() body: { startNumber: number; endNumber: number }) {
    return this.service.generateBatch(req.user.companyId, body.startNumber, body.endNumber);
  }

  @Get('public/:token')
  getPublicInfo(@Param('token') token: string) {
    return this.service.getPublicInfo(token);
  }
}
