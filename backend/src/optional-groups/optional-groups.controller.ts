import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { OptionalGroupsService } from './optional-groups.service';
import { OptionalGroup } from './entities/optional-group.entity';
import { OptionalGroupItem } from './entities/optional-group-item.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('optional-groups')
export class OptionalGroupsController {
  constructor(private readonly optionalGroupsService: OptionalGroupsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createOptionalGroupDto: Partial<OptionalGroup>) {
    return this.optionalGroupsService.create(createOptionalGroupDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return this.optionalGroupsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.optionalGroupsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateOptionalGroupDto: Partial<OptionalGroup>) {
    return this.optionalGroupsService.update(id, updateOptionalGroupDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.optionalGroupsService.remove(id);
  }

  @UseGuards(AuthGuard)
  @Post('items')
  createItem(@Body() createItemDto: Partial<OptionalGroupItem>) {
    return this.optionalGroupsService.createItem(createItemDto);
  }

  @UseGuards(AuthGuard)
  @Put('items/:id')
  updateItem(@Param('id') id: string, @Body() updateItemDto: Partial<OptionalGroupItem>) {
    return this.optionalGroupsService.updateItem(id, updateItemDto);
  }

  @UseGuards(AuthGuard)
  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.optionalGroupsService.removeItem(id);
  }

  @Post(':id/sync-products')
  syncProducts(@Param('id') id: string, @Body('subcategoryId') subcategoryId: string) {
    return this.optionalGroupsService.syncProducts(id, subcategoryId);
  }
}
