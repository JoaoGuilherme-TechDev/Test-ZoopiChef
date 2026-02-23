import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { FlavorGroupsService } from './flavor-groups.service';
import { FlavorGroup } from './entities/flavor-group.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('flavor-groups')
export class FlavorGroupsController {
  constructor(private readonly flavorGroupsService: FlavorGroupsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createFlavorGroupDto: Partial<FlavorGroup>) {
    return this.flavorGroupsService.create(createFlavorGroupDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return this.flavorGroupsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flavorGroupsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateFlavorGroupDto: Partial<FlavorGroup>) {
    return this.flavorGroupsService.update(id, updateFlavorGroupDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flavorGroupsService.remove(id);
  }
}
