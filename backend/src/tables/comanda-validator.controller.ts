import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ComandaValidatorService } from './comanda-validator.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('comanda-validator')
export class ComandaValidatorController {
  constructor(private readonly service: ComandaValidatorService) {}

  @UseGuards(AuthGuard)
  @Get('tokens')
  findAllTokens(@Request() req) {
    return this.service.findAllTokens(req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Post('tokens')
  createToken(@Request() req, @Body('name') name: string) {
    return this.service.createToken(req.user.companyId, name);
  }

  @UseGuards(AuthGuard)
  @Patch('tokens/:id')
  updateToken(@Param('id') id: string, @Body() updates: any) {
    return this.service.updateToken(id, updates);
  }

  @UseGuards(AuthGuard)
  @Delete('tokens/:id')
  deleteToken(@Param('id') id: string) {
    return this.service.deleteToken(id);
  }

  @UseGuards(AuthGuard)
  @Get('logs')
  getLogs(@Request() req) {
    return this.service.getLogs(req.user.companyId);
  }
}
