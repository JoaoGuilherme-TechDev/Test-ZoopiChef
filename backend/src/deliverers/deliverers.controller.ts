import { Controller, Get, Post, Body, Param, Delete, Query, Put, UseGuards } from '@nestjs/common';
import { DeliverersService } from './deliverers.service';
import { Deliverer } from './entities/deliverer.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('deliverers')
export class DeliverersController {
  constructor(private readonly deliverersService: DeliverersService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createDelivererDto: Partial<Deliverer>) {
    return this.deliverersService.create(createDelivererDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return this.deliverersService.findAll(companyId);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliverersService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDelivererDto: Partial<Deliverer>) {
    return this.deliverersService.update(id, updateDelivererDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliverersService.remove(id);
  }
}
