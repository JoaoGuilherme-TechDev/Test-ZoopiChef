import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CombosService } from './combos.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.combosService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('companyId') companyId: string) {
    return this.combosService.findOne(id, companyId);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createComboDto: any) {
    return this.combosService.create(createComboDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComboDto: any) {
    return this.combosService.update(id, updateComboDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.combosService.remove(id);
  }

  // Groups
  @UseGuards(AuthGuard)
  @Post('groups')
  createGroup(@Body() createGroupDto: any) {
    return this.combosService.createGroup(createGroupDto);
  }

  @UseGuards(AuthGuard)
  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() updateGroupDto: any) {
    return this.combosService.updateGroup(id, updateGroupDto);
  }

  @UseGuards(AuthGuard)
  @Delete('groups/:id')
  removeGroup(@Param('id') id: string) {
    return this.combosService.removeGroup(id);
  }

  // Items
  @UseGuards(AuthGuard)
  @Post('groups/items')
  createGroupItem(@Body() createItemDto: any) {
    return this.combosService.createGroupItem(createItemDto);
  }

  @UseGuards(AuthGuard)
  @Patch('groups/items/:id')
  updateGroupItem(@Param('id') id: string, @Body() updateItemDto: any) {
    return this.combosService.updateGroupItem(id, updateItemDto);
  }

  @UseGuards(AuthGuard)
  @Delete('groups/items/:id')
  removeGroupItem(@Param('id') id: string) {
    return this.combosService.removeGroupItem(id);
  }
}
