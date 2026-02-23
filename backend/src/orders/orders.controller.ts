import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createOrderDto: Partial<Order> & { items?: any[] }) {
    return this.ordersService.create(createOrderDto);
  }

  @Post('from-comanda')
  createFromComanda(@Body() body: any) {
    return this.ordersService.createFromComanda(body);
  }

  @Post('from-table')
  createFromTable(@Body() body: any) {
    return this.ordersService.createFromTable(body);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('cashSessionId') cashSessionId?: string,
    @Query('startDate') startDate?: string,
    @Query('customerId') customerId?: string,
  ) {
    if (!companyId && !customerId) return [];
    return this.ordersService.findAll(companyId, status, cashSessionId, startDate ? new Date(startDate) : undefined, customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: Partial<Order>) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @UseGuards(AuthGuard)
  @Put('items/:itemId/status')
  updateItemStatus(@Param('itemId') itemId: string, @Body('status') status: string) {
    return this.ordersService.updateItemStatus(itemId, status);
  }
}
