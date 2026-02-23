import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { TableModuleSettingsService } from './table-module-settings.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('table-module-settings')
export class TableModuleSettingsController {
  constructor(private readonly service: TableModuleSettingsService) {}

  @UseGuards(AuthGuard)
  @Get()
  findOne(@Request() req) {
    return this.service.findOne(req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Post()
  upsert(@Request() req, @Body() updates: any) {
    return this.service.upsert(req.user.companyId, updates);
  }
}
