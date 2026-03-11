import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BatchActionsService } from './batch-actions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';
import {
  BatchLinkOptionalDto,
  BatchRemoveOptionalDto,
  BatchVisibilityDto,
  BatchUpdateStatusDto,
  BatchProductionLocationDto,
} from './dto/batch-actions.dto';

@Controller('batch-actions')
@UseGuards(JwtAuthGuard)
export class BatchActionsController {
  constructor(private readonly service: BatchActionsService) {}

  @Post('link-optionals')
  linkOptionals(
    @GetCompanyId() companyId: string,
    @Body() dto: BatchLinkOptionalDto,
  ) {
    return this.service.linkOptionalGroups(companyId, dto);
  }

  @Post('remove-optionals')
  removeOptionals(
    @GetCompanyId() companyId: string,
    @Body() dto: BatchRemoveOptionalDto,
  ) {
    return this.service.removeOptionalGroups(companyId, dto);
  }

  @Post('visibility')
  updateVisibility(
    @GetCompanyId() companyId: string,
    @Body() dto: BatchVisibilityDto,
  ) {
    return this.service.updateVisibility(companyId, dto);
  }

  @Post('status')
  updateStatus(
    @GetCompanyId() companyId: string,
    @Body() dto: BatchUpdateStatusDto,
  ) {
    return this.service.updateStatus(companyId, dto);
  }

  @Post('production-location')
  updateProduction(
    @GetCompanyId() companyId: string,
    @Body() dto: BatchProductionLocationDto,
  ) {
    return this.service.updateProductionLocation(companyId, dto);
  }
}
