import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationSettings } from './entities/reservation-settings.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { ReservationBlock } from './entities/reservation-block.entity';
import { SmartWaitlistEntry } from './entities/smart-waitlist-entry.entity';
import { SmartWaitlistSettings } from './entities/smart-waitlist-settings.entity';
import { TableSession } from '../tables/entities/table-session.entity';
import { Comanda } from '../tables/entities/comanda.entity';
import { Table } from '../tables/entities/table.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(ReservationSettings)
    private settingsRepository: Repository<ReservationSettings>,
    @InjectRepository(WaitlistEntry)
    private waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(ReservationBlock)
    private blocksRepository: Repository<ReservationBlock>,
    @InjectRepository(SmartWaitlistEntry)
    private smartWaitlistRepository: Repository<SmartWaitlistEntry>,
    @InjectRepository(SmartWaitlistSettings)
    private smartWaitlistSettingsRepository: Repository<SmartWaitlistSettings>,
    @InjectRepository(TableSession)
    private sessionsRepository: Repository<TableSession>,
    @InjectRepository(Comanda)
    private comandasRepository: Repository<Comanda>,
    @InjectRepository(Table)
    private tablesRepository: Repository<Table>,
    private dataSource: DataSource,
  ) {}

  async findAll(companyId: string, startDate?: string, endDate?: string) {
    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.reservationDate = Between(startDate, endDate);
    } else if (startDate) {
      where.reservationDate = startDate;
    }

    return this.reservationsRepository.find({
      where,
      relations: ['table', 'customer'],
      order: {
        reservationDate: 'ASC',
        reservationTime: 'ASC',
      },
    });
  }

  async create(createReservationDto: Partial<Reservation>) {
    const reservation = this.reservationsRepository.create(createReservationDto);
    return this.reservationsRepository.save(reservation);
  }

  async update(id: string, updates: Partial<Reservation>) {
    await this.reservationsRepository.update(id, updates);
    return this.findOne(id);
  }

  async findOne(id: string) {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['table', 'customer'],
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    return reservation;
  }

  async remove(id: string) {
    const reservation = await this.findOne(id);
    return this.reservationsRepository.remove(reservation);
  }

  // Status changes
  async confirm(id: string) {
    return this.update(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedVia: 'system',
    });
  }

  async cancel(id: string, reason?: string) {
    return this.update(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason,
    });
  }

  async markNoShow(id: string) {
    return this.update(id, { status: 'no_show' });
  }

  async complete(id: string) {
    return this.update(id, { status: 'completed' });
  }

  // Settings
  async getSettings(companyId: string) {
    let settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        companyId,
        // defaults are handled by entity
      });
      await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async upsertSettings(companyId: string, updates: Partial<ReservationSettings>) {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, updates);
    return this.settingsRepository.save(settings);
  }

  // Waitlist
  async getWaitlist(companyId: string) {
    return this.waitlistRepository.find({
      where: { companyId, status: 'waiting' },
      order: { desiredDate: 'ASC', createdAt: 'ASC' },
    });
  }

  async addToWaitlist(entry: Partial<WaitlistEntry>) {
    const newEntry = this.waitlistRepository.create(entry);
    return this.waitlistRepository.save(newEntry);
  }

  async removeFromWaitlist(id: string) {
    return this.waitlistRepository.delete(id);
  }

  async convertWaitlistToReservation(waitlistId: string, reservationId: string) {
    return this.waitlistRepository.update(waitlistId, {
      status: 'converted',
      convertedToReservationId: reservationId,
    });
  }

  // Blocks
  async getBlocks(companyId: string, startDate?: string, endDate?: string) {
    const where: any = { companyId };
    if (startDate && endDate) {
      where.blockDate = Between(startDate, endDate);
    } else if (startDate) {
      where.blockDate = startDate;
    }

    return this.blocksRepository.find({ where });
  }

  async addBlock(block: Partial<ReservationBlock>) {
    const newBlock = this.blocksRepository.create(block);
    return this.blocksRepository.save(newBlock);
  }

  async removeBlock(id: string) {
    return this.blocksRepository.delete(id);
  }

  // Smart Waitlist
  async getSmartWaitlist(companyId: string) {
    return this.smartWaitlistRepository.find({
      where: { companyId },
      order: { priorityScore: 'DESC', requestedAt: 'ASC' },
    });
  }

  async addToSmartWaitlist(entry: Partial<SmartWaitlistEntry>) {
    const newEntry = this.smartWaitlistRepository.create(entry);
    return this.smartWaitlistRepository.save(newEntry);
  }

  async updateSmartWaitlistEntry(id: string, updates: Partial<SmartWaitlistEntry>) {
    await this.smartWaitlistRepository.update(id, updates);
    return this.smartWaitlistRepository.findOne({ where: { id } });
  }

  async removeFromSmartWaitlist(id: string) {
    return this.smartWaitlistRepository.delete(id);
  }

  async seatSmartWaitlistEntry(waitlistId: string, tableId: string) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Get Waitlist Entry
      const entry = await manager.findOne(SmartWaitlistEntry, { where: { id: waitlistId } });
      if (!entry) throw new NotFoundException('Waitlist entry not found');
      
      // Allow seating if waiting or notified
      if (entry.status !== 'waiting' && entry.status !== 'notified') {
        throw new Error(`Entry is ${entry.status}, cannot seat`);
      }

      // 2. Get Table
      const table = await manager.findOne(Table, { where: { id: tableId } });
      if (!table) throw new NotFoundException('Table not found');

      // 3. Check if table is free (no open session)
      const existingSession = await manager.findOne(TableSession, {
        where: {
          tableId: table.id,
          status: 'open',
        },
      });

      if (existingSession) {
        throw new Error(`Table ${table.number} is already occupied`);
      }

      // 4. Create Session
      const session = manager.create(TableSession, {
        companyId: entry.companyId,
        tableId: table.id,
        status: 'open',
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        peopleCount: entry.partySize,
        openedAt: new Date(),
        lastActivityAt: new Date(),
      });
      await manager.save(session);

      // 5. Create Comanda
      // Find next command number
      const lastComanda = await manager.findOne(Comanda, {
        where: { companyId: entry.companyId },
        order: { commandNumber: 'DESC' },
      });
      const nextNumber = (lastComanda?.commandNumber || 0) + 1;

      const comanda = manager.create(Comanda, {
        companyId: entry.companyId,
        commandNumber: nextNumber,
        status: 'open',
        tableNumber: table.number.toString(),
        name: entry.customerName || `Mesa ${table.number}`,
        openedAt: new Date(),
        lastActivityAt: new Date(),
      });
      await manager.save(comanda);

      // 6. Update Waitlist Entry
      entry.status = 'seated';
      entry.assignedTableId = table.id;
      entry.assignedTableNumber = table.number;
      entry.comandaId = comanda.id;
      entry.actualSeatTime = new Date();
      await manager.save(entry);

      // 7. Update Table Status
      table.status = 'occupied';
      table.currentOrderId = comanda.id;
      await manager.save(table);

      return {
        success: true,
        sessionId: session.id,
        comandaId: comanda.id,
        tableNumber: table.number,
        commandNumber: comanda.commandNumber,
        customerName: entry.customerName,
      };
    });
  }

  // Smart Waitlist Settings
  async getSmartWaitlistSettings(companyId: string) {
    let settings = await this.smartWaitlistSettingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      settings = this.smartWaitlistSettingsRepository.create({
        companyId,
      });
      await this.smartWaitlistSettingsRepository.save(settings);
    }

    return settings;
  }

  async upsertSmartWaitlistSettings(companyId: string, updates: Partial<SmartWaitlistSettings>) {
    const settings = await this.getSmartWaitlistSettings(companyId);
    Object.assign(settings, updates);
    return this.smartWaitlistSettingsRepository.save(settings);
  }
}
