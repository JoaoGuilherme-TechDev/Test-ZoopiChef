import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OptionsGroupsService } from './options-groups.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('options-groups')
@UseGuards(JwtAuthGuard)
export class OptionsGroupsController {
  constructor(private readonly optionsGroupsService: OptionsGroupsService) {}

  @Post()
  create(
    @GetCompanyId() companyId: string,
    @Body() createOptionGroupDto: CreateOptionGroupDto,
  ) {
    return this.optionsGroupsService.create(companyId, createOptionGroupDto);
  }

  @Get()
  findAll(@GetCompanyId() companyId: string) {
    return this.optionsGroupsService.findAll(companyId);
  }

  @Get('batch-list')
  findForBatch(@GetCompanyId() companyId: string) {
    return this.optionsGroupsService.findForBatch(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.optionsGroupsService.findOne(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() updateOptionGroupDto: any, // Pode usar o PartialType do mapped-types se preferir
  ) {
    return this.optionsGroupsService.update(
      id,
      companyId,
      updateOptionGroupDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.optionsGroupsService.remove(id, companyId);
  }
}
