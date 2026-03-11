import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /api/orders
   * Criação de pedido (Garçom, Caixa ou Admin)
   */
  @Post()
  @Roles('admin', 'manager', 'waiter', 'cashier')
  create(
    @GetCompanyId() companyId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(companyId, createOrderDto);
  }

  /**
   * GET /api/orders
   * Listagem de pedidos da empresa (Cozinha e Salão)
   */
  @Get()
  @Roles('admin', 'manager', 'waiter', 'cashier', 'chef')
  findAll(@GetCompanyId() companyId: string) {
    return this.ordersService.findAll(companyId);
  }

  /**
   * GET /api/orders/:id
   * Detalhes de um pedido específico
   */
  @Get(':id')
  @Roles('admin', 'manager', 'waiter', 'cashier', 'chef')
  findOne(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.ordersService.findOne(id, companyId);
  }

  /**
   * PATCH /api/orders/:id/status
   * Atualiza o status do pedido.
   */
  @Patch(':id/status')
  @Roles('admin', 'manager', 'chef', 'waiter')
  updateStatus(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatus(id, companyId, status);
  }
}