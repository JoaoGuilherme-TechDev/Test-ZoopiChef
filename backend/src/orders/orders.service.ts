import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusEvent } from './entities/order-status-event.entity';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusEvent)
    private orderStatusEventRepository: Repository<OrderStatusEvent>,
    private cashSessionsService: CashSessionsService,
  ) {}

  async create(createOrderDto: Partial<Order> & { items?: any[] }): Promise<Order> {
    const { items, ...orderData } = createOrderDto;
    
    // Create order first
    const order = this.ordersRepository.create(orderData);
    const savedOrder = await this.ordersRepository.save(order);

    // Create items if any
    if (items && items.length > 0) {
      const orderItems = items.map(item => {
        return this.orderItemsRepository.create({
          ...item,
          orderId: savedOrder.id,
        });
      });
      await this.orderItemsRepository.save(orderItems);
      savedOrder.items = orderItems;
    }

    return this.findOne(savedOrder.id);
  }

  async createFromComanda(dto: {
    companyId: string;
    comandaId: string;
    commandNumber: number;
    commandName?: string | null;
    items: any[];
  }) {
    const total = (dto.items || []).reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    const commandLabel = dto.commandName || `#${dto.commandNumber}`;
    const customerNameForKDS = `COMANDA ${dto.commandNumber}${dto.commandName ? ` - ${dto.commandName}` : ''}`;
    const acceptedAt = new Date();

    return this.ordersRepository.manager.transaction(async manager => {
        // 1. Create Order
        const order = manager.create(Order, {
            companyId: dto.companyId,
            orderType: 'dine_in',
            receiptType: 'dine_in',
            fulfillmentType: 'dine_in',
            customerName: customerNameForKDS,
            notes: `Comanda ${commandLabel}`,
            source: 'comanda',
            total,
            status: 'preparo',
            acceptedAt: acceptedAt,
            comandaId: dto.comandaId,
            comandaNumber: dto.commandNumber,
        });
        const savedOrder = await manager.save(order);

        // 2. Create Event
        const event = manager.create(OrderStatusEvent, {
            orderId: savedOrder.id,
            companyId: dto.companyId,
            fromStatus: null,
            toStatus: 'preparo',
            meta: { 
                source: 'comanda_auto_accept',
                comanda_id: dto.comandaId,
            },
        });
        await manager.save(event);

        // 3. Create Items
        const orderItems = dto.items.map(item => manager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
            selectedOptionsJson: item.optionsJson
        }));
        await manager.save(orderItems);
        
        savedOrder.items = orderItems;
        return savedOrder;
    });
  }

  async createFromTable(dto: {
    companyId: string;
    sessionId: string;
    tableId: string;
    tableNumber: number;
    commandName?: string | null;
    commandNumber?: number | null;
    items: any[];
  }) {
    const total = dto.items.reduce((sum, item) => sum + (item.unitPriceCents * item.quantity), 0) / 100;
    const commandLabel = dto.commandName || (dto.commandNumber ? `#${dto.commandNumber}` : '');
    const customerNameForKDS = `MESA ${dto.tableNumber}${commandLabel ? ` - Comanda ${commandLabel}` : ''}`;
    const orderNotes = commandLabel ? `Comanda ${commandLabel}` : null;
    const acceptedAt = new Date();

    return this.ordersRepository.manager.transaction(async manager => {
        // 1. Create Order
        const order = manager.create(Order, {
            companyId: dto.companyId,
            orderType: 'table',
            receiptType: 'table',
            fulfillmentType: 'table',
            tableNumber: String(dto.tableNumber),
            customerName: customerNameForKDS,
            notes: orderNotes,
            source: 'table',
            total,
            status: 'preparo',
            acceptedAt: acceptedAt,
        });
        const savedOrder = await manager.save(order);

        // 2. Create Event
        const event = manager.create(OrderStatusEvent, {
            orderId: savedOrder.id,
            companyId: dto.companyId,
            fromStatus: null,
            toStatus: 'preparo',
            meta: { 
                source: 'table_auto_accept',
                table_id: dto.tableId,
                session_id: dto.sessionId,
            },
        });
        await manager.save(event);

        // 3. Create Items
        const orderItems = dto.items.map(item => manager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPriceCents / 100,
            notes: item.notes,
            selectedOptionsJson: item.selectedOptionsJson
        }));
        await manager.save(orderItems);
        
        savedOrder.items = orderItems;
        return savedOrder;
    });
  }

  async findAll(companyId: string, status?: string, cashSessionId?: string, startDate?: Date, customerId?: string): Promise<Order[]> {
    const where: any = {};
    
    // Only filter by companyId if customerId is NOT provided or if we want to enforce company scope
    // Frontend useCustomerOrders passes customerId but maybe not companyId in the query params?
    // Actually, order entity has companyId.
    if (companyId) {
      where.companyId = companyId;
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    } else {
      // Logic for session/date filtering only applies when NOT fetching specific customer history
      if (cashSessionId) {
        where.cashSessionId = cashSessionId;
      } else if (startDate) {
        where.createdAt = MoreThanOrEqual(startDate);
      } else if (companyId) {
        // Default: check for open session, otherwise last 24h
        const openSession = await this.cashSessionsService.findOpenSession(companyId);
        if (openSession) {
          where.cashSessionId = openSession.id;
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          where.createdAt = MoreThanOrEqual(yesterday);
        }
      }
    }
    
    return this.ordersRepository.find({
      where,
      relations: ['items', 'customer', 'deliverer'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findOne(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'customer', 'deliverer'],
    });
  }

  async update(id: string, updateOrderDto: Partial<Order>): Promise<Order | null> {
    await this.ordersRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ordersRepository.delete(id);
  }

  async updateItemStatus(itemId: string, status: string): Promise<void> {
    await this.orderItemsRepository.update(itemId, { itemStatus: status });
  }
}
