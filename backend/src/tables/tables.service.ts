import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';
import { TableEvent } from './entities/table-event.entity';
import { TableSession } from './entities/table-session.entity';
import { TableCommand } from './entities/table-command.entity';
import { TableCommandItem } from './entities/table-command-item.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private tablesRepository: Repository<Table>,
    @InjectRepository(TableEvent)
    private tableEventsRepository: Repository<TableEvent>,
    @InjectRepository(TableSession)
    private tableSessionsRepository: Repository<TableSession>,
    @InjectRepository(TableCommand)
    private tableCommandsRepository: Repository<TableCommand>,
    @InjectRepository(TableCommandItem)
    private tableCommandItemsRepository: Repository<TableCommandItem>,
  ) {}

  async findAll(companyId: string) {
    return this.tablesRepository.find({
      where: { companyId },
      order: { number: 'ASC' },
    });
  }

  async findOne(id: string) {
    const table = await this.tablesRepository.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }
    return table;
  }

  async create(createTableDto: { companyId: string; number: number; name?: string }) {
    const table = this.tablesRepository.create(createTableDto);
    return this.tablesRepository.save(table);
  }

  async update(id: string, updateTableDto: any) {
    await this.tablesRepository.update(id, updateTableDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const table = await this.findOne(id);
    return this.tablesRepository.remove(table);
  }

  // Table Sessions
  async findSessions(companyId: string) {
    return this.tableSessionsRepository.find({
      where: { companyId },
      relations: ['table'],
      order: { openedAt: 'DESC' },
    });
  }

  async findActiveSessions(companyId: string) {
    return this.tableSessionsRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.table', 'table')
      .where('session.companyId = :companyId', { companyId })
      .andWhere('session.status != :status', { status: 'closed' })
      .orderBy('session.openedAt', 'DESC')
      .getMany();
  }

  async findSessionByTableId(tableId: string) {
    return this.tableSessionsRepository.findOne({
      where: { tableId, status: 'open' }, // Assuming we only want active sessions
      relations: ['table'],
    });
  }

  async createSession(createSessionDto: any) {
    const session = this.tableSessionsRepository.create(createSessionDto);
    const savedSession = await this.tableSessionsRepository.save(session) as unknown as TableSession;
    
    // Update table status to occupied
    await this.tablesRepository.update(savedSession.tableId, { status: 'occupied' });
    
    return savedSession;
  }

  async updateSession(id: string, updateSessionDto: any) {
    await this.tableSessionsRepository.update(id, updateSessionDto);
    
    const session = await this.tableSessionsRepository.findOne({ where: { id }, relations: ['table'] });
    
    if (session) {
        if (updateSessionDto.status === 'closed') {
            await this.tablesRepository.update(session.tableId, { status: 'available' });
        } else if (updateSessionDto.status === 'open' && updateSessionDto.closedAt === null) {
             // Reopening
            await this.tablesRepository.update(session.tableId, { status: 'occupied' });
        }
    }

    return session;
  }

  async getOrCreateSession(companyId: string, tableId: string, userId?: string) {
    // Check for existing open session
    const existingSession = await this.tableSessionsRepository.findOne({
      where: { 
        companyId, 
        tableId, 
        status: 'open' // Or any non-closed status?
      }
    });

    if (existingSession) {
      return existingSession;
    }

    // Create new session
    const newSession = this.tableSessionsRepository.create({
      companyId,
      tableId,
      status: 'open',
      // userId logic if needed
    });

    const savedSession = await this.tableSessionsRepository.save(newSession);
    
    // Update table status
    await this.tablesRepository.update(tableId, { status: 'occupied' });

    return savedSession;
  }

  // Table Commands
  async findCommands(sessionId: string) {
    return this.tableCommandsRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async createCommand(createCommandDto: any) {
    const command = this.tableCommandsRepository.create(createCommandDto);
    return this.tableCommandsRepository.save(command);
  }

  async updateCommand(id: string, updateCommandDto: any) {
    await this.tableCommandsRepository.update(id, updateCommandDto);
    return this.tableCommandsRepository.findOne({ where: { id } });
  }

  async deleteCommand(id: string) {
    const itemsCount = await this.tableCommandItemsRepository.count({ where: { commandId: id } });
    if (itemsCount > 0) {
      throw new Error('Não é possível excluir comanda com itens'); // Or localized message
    }
    
    const command = await this.tableCommandsRepository.findOne({ where: { id } });
    if (!command) return;
    
    return this.tableCommandsRepository.remove(command);
  }

  // Table Command Items
  async findCommandItems(commandId: string) {
    return this.tableCommandItemsRepository.find({
      where: { commandId },
      order: { createdAt: 'ASC' },
    });
  }

  async findSessionItems(sessionId: string) {
    return this.tableCommandItemsRepository.find({
      where: { sessionId },
      relations: ['command'],
      order: { createdAt: 'ASC' },
    });
  }

  async createCommandItem(createItemDto: any) {
    const item = this.tableCommandItemsRepository.create(createItemDto);
    const savedItem = await this.tableCommandItemsRepository.save(item) as unknown as TableCommandItem;
    
    await this.recalculateTotals(savedItem.sessionId, savedItem.commandId);
    
    return savedItem;
  }

  async updateCommandItem(id: string, updateItemDto: any) {
    await this.tableCommandItemsRepository.update(id, updateItemDto);
    const item = await this.tableCommandItemsRepository.findOne({ where: { id } });
    
    if (item) {
        await this.recalculateTotals(item.sessionId, item.commandId);
    }
    
    return item;
  }

  async deleteCommandItem(id: string) {
    const item = await this.tableCommandItemsRepository.findOne({ where: { id } });
    if (!item) return;
    
    await this.tableCommandItemsRepository.remove(item);
    await this.recalculateTotals(item.sessionId, item.commandId);
  }

  async transferCommandItem(itemId: string, targetCommandId: string, quantity?: number) {
    const item = await this.tableCommandItemsRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const originalCommandId = item.commandId;
    const transferQty = quantity || item.quantity;

    if (transferQty >= item.quantity) {
        // Full transfer
        item.commandId = targetCommandId;
        await this.tableCommandItemsRepository.save(item);
    } else {
        // Partial transfer
        // 1. Update original item
        item.quantity -= transferQty;
        item.totalPriceCents = item.unitPriceCents * item.quantity;
        await this.tableCommandItemsRepository.save(item);
        
        // 2. Create new item
        const newItem = this.tableCommandItemsRepository.create({
            companyId: item.companyId,
            commandId: targetCommandId,
            sessionId: item.sessionId,
            tableId: item.tableId,
            productId: item.productId,
            productName: item.productName,
            quantity: transferQty,
            unitPriceCents: item.unitPriceCents,
            totalPriceCents: item.unitPriceCents * transferQty,
            notes: item.notes,
            status: item.status,
        });
        await this.tableCommandItemsRepository.save(newItem);
    }
    
    // Recalculate totals for both commands
    await this.recalculateTotals(item.sessionId, originalCommandId);
    await this.recalculateTotals(item.sessionId, targetCommandId);
    
    return { success: true };
  }

  private async recalculateTotals(sessionId: string, commandId: string) {
    // 1. Recalculate Command Total
    const commandItems = await this.tableCommandItemsRepository.find({
        where: { commandId, status: 'delivered' } // Or any active status? Usually 'cancelled' is excluded.
    });
    // Assuming status != 'cancelled' should be counted
    const activeCommandItems = await this.tableCommandItemsRepository.createQueryBuilder('item')
        .where('item.commandId = :commandId', { commandId })
        .andWhere('item.status != :status', { status: 'cancelled' })
        .getMany();

    const commandTotal = activeCommandItems.reduce((sum, item) => sum + item.totalPriceCents, 0);
    
    await this.tableCommandsRepository.update(commandId, { totalAmountCents: commandTotal });

    // 2. Recalculate Session Total
    // Sum of all commands? Or sum of all items in session?
    // Usually session total is sum of all non-cancelled items.
    
    const activeSessionItems = await this.tableCommandItemsRepository.createQueryBuilder('item')
        .where('item.sessionId = :sessionId', { sessionId })
        .andWhere('item.status != :status', { status: 'cancelled' })
        .getMany();
        
    const sessionTotalCents = activeSessionItems.reduce((sum, item) => sum + item.totalPriceCents, 0);
    
    // Update session total (converting cents to decimal for DB)
    await this.tableSessionsRepository.update(sessionId, { totalAmount: sessionTotalCents / 100 });
  }

  // Events
  async findEvents(companyId: string, status?: string) {
    const query = this.tableEventsRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.table', 'table')
      .where('event.companyId = :companyId', { companyId });

    if (status) {
      query.andWhere('event.status = :status', { status });
    }

    query.orderBy('event.createdAt', 'DESC');

    return query.getMany();
  }

  async createEvent(createEventDto: { companyId: string; tableId: string; eventType: string; notes?: string }) {
    const event = this.tableEventsRepository.create(createEventDto);
    return this.tableEventsRepository.save(event);
  }

  async resolveEvent(id: string) {
    const event = await this.tableEventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    event.status = 'resolved';
    event.resolvedAt = new Date();
    
    return this.tableEventsRepository.save(event);
  }
}
