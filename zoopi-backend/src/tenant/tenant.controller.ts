import { Controller, Get, Param } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('public/company')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':slug/menu')
  getMenu(@Param('slug') slug: string) {
    return this.tenantService.getMenu(slug);
  }
}
