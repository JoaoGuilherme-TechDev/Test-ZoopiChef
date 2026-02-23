import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { Comanda } from './entities/comanda.entity';
import { ComandaItem } from './entities/comanda-item.entity';
import { ComandaPayment } from './entities/comanda-payment.entity';
import { ComandaEvent } from './entities/comanda-event.entity';
import { ComandaSettings } from './entities/comanda-settings.entity';

@Injectable()
export class ComandasService {
  constructor(
    @InjectRepository(Comanda)
    private comandasRepository: Repository<Comanda>,
    @InjectRepository(ComandaItem)
    private comandaItemsRepository: Repository<ComandaItem>,
    @InjectRepository(ComandaPayment)
    private comandaPaymentsRepository: Repository<ComandaPayment>,
    @InjectRepository(ComandaEvent)
    private comandaEventsRepository: Repository<ComandaEvent>,
    @InjectRepository(ComandaSettings)
    private comandaSettingsRepository: Repository<ComandaSettings>,
  ) {}

  // Settings
  async getSettings(companyId: string) {
    const settings = await this.comandaSettingsRepository.findOne({ where: { companyId } });
    if (!settings) {
      // Return defaults if not found
      return {
        companyId,
        noActivityMinutes: 30,
        defaultServiceFeePercent: 10,
        allowCloseWithBalance: false,
      };
    }
    return settings;
  }

  async updateSettings(companyId: string, updates: Partial<ComandaSettings>) {
    const existing = await this.comandaSettingsRepository.findOne({ where: { companyId } });
    if (existing) {
      await this.comandaSettingsRepository.update(companyId, updates);
    } else {
      await this.comandaSettingsRepository.save({ companyId, ...updates });
    }
    return this.getSettings(companyId);
  }

  // Comandas
  async findAll(companyId: string, statusFilter?: string[]) {
    const query = this.comandasRepository.createQueryBuilder('comanda')
      .where('comanda.companyId = :companyId', { companyId });

    if (statusFilter && statusFilter.length > 0) {
      query.andWhere('comanda.status IN (:...statusFilter)', { statusFilter });
    }

    query.orderBy('comanda.commandNumber', 'ASC');
    return query.getMany();
  }

  async findOne(id: string) {
    const comanda = await this.comandasRepository.findOne({ where: { id } });
    if (!comanda) throw new NotFoundException('Comanda not found');
    return comanda;
  }

  async create(dto: { companyId: string; name?: string; applyServiceFee?: boolean; serviceFeePercent?: number; createdBy?: string }) {
    // Use transaction to ensure unique command number
    return this.comandasRepository.manager.transaction(async transactionalEntityManager => {
      // 1. Lock settings row to serialize creation per company
      let settings = await transactionalEntityManager.findOne(ComandaSettings, {
        where: { companyId: dto.companyId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!settings) {
        // Create default settings if not exists
        settings = transactionalEntityManager.create(ComandaSettings, {
          companyId: dto.companyId,
          noActivityMinutes: 30,
          defaultServiceFeePercent: 10,
          allowCloseWithBalance: false,
        });
        await transactionalEntityManager.save(settings);
      }

      // 2. Get next command number safely
      const lastComanda = await transactionalEntityManager.findOne(Comanda, {
        where: { companyId: dto.companyId },
        order: { commandNumber: 'DESC' },
      });
      const nextNumber = (lastComanda?.commandNumber || 0) + 1;

      // 3. Determine service fee
      let feePercent = dto.serviceFeePercent;
      if (dto.applyServiceFee && feePercent === undefined) {
        feePercent = settings.defaultServiceFeePercent;
      }

      // 4. Create comanda
      const comanda = transactionalEntityManager.create(Comanda, {
        companyId: dto.companyId,
        commandNumber: nextNumber,
        name: dto.name,
        applyServiceFee: dto.applyServiceFee,
        serviceFeePercent: feePercent || 10,
        createdBy: dto.createdBy,
        status: 'open',
      });

      const savedComanda = await transactionalEntityManager.save(comanda);

      // 5. Register event
      await transactionalEntityManager.save(ComandaEvent, {
        companyId: dto.companyId,
        comandaId: savedComanda.id,
        eventType: 'open',
        meta: { name: dto.name, command_number: nextNumber, service_fee_percent: feePercent },
        createdBy: dto.createdBy,
      });

      return savedComanda;
    });
  }

  async update(id: string, updates: Partial<Comanda>) {
    await this.comandasRepository.update(id, updates);
    return this.findOne(id);
  }

  async close(id: string, tableNumber?: string, closedBy?: string) {
    const comanda = await this.findOne(id);
    
    // Reset to free for reuse (permanent like tables model mentioned in frontend code)
    // The frontend says: "When closing a comanda, reset it to 'free' status so it remains visible in the map and can be reused."
    
    // NOTE: The backend entity structure might differ from the frontend expectation of "permanent comandas".
    // If comandas are rows in a DB that get "closed", usually we just mark status='closed'.
    // However, the frontend code explicitly updates it to 'free' and clears totals.
    // Let's follow that logic to match the existing behavior.

    await this.comandasRepository.update(id, {
      status: 'free',
      closedAt: new Date(),
      closedBy: closedBy,
      tableNumber: tableNumber || null,
      totalAmount: 0,
      paidAmount: 0,
      discountValue: 0,
      surchargeValue: 0,
    });

    await this.comandaEventsRepository.save({
      companyId: comanda.companyId,
      comandaId: id,
      eventType: 'close',
      meta: tableNumber ? { table_number: tableNumber } : null,
      createdBy: closedBy,
    });

    return this.findOne(id);
  }

  async reopen(id: string, reopenedBy?: string) {
    const comanda = await this.findOne(id);
    
    await this.comandasRepository.update(id, {
      status: 'open',
    });

    await this.comandaEventsRepository.save({
      companyId: comanda.companyId,
      comandaId: id,
      eventType: 'reopen',
      createdBy: reopenedBy,
    });

    return this.findOne(id);
  }

  async requestBill(id: string, requestedBy?: string) {
    const comanda = await this.findOne(id);
    
    await this.comandasRepository.update(id, {
      status: 'requested_bill',
    });

    await this.comandaEventsRepository.save({
      companyId: comanda.companyId,
      comandaId: id,
      eventType: 'request_bill',
      createdBy: requestedBy,
    });

    return this.findOne(id);
  }

  async release(id: string, releasedBy?: string) {
    // Check for items
    const itemsCount = await this.comandaItemsRepository.count({
      where: { comandaId: id, canceledAt: IsNull() }
    });
    
    if (itemsCount > 0) {
      throw new BadRequestException('Não é possível liberar uma comanda com itens. Cancele os itens primeiro.');
    }

    // Check for payments
    const paymentsCount = await this.comandaPaymentsRepository.count({
      where: { comandaId: id }
    });

    if (paymentsCount > 0) {
      throw new BadRequestException('Não é possível liberar uma comanda com pagamentos registrados.');
    }

    const comanda = await this.findOne(id);

    // Release to 'free'
    await this.comandasRepository.update(id, {
      status: 'free',
      closedAt: new Date(),
      closedBy: releasedBy,
      totalAmount: 0,
      paidAmount: 0,
      discountValue: 0,
      surchargeValue: 0,
    });

    await this.comandaEventsRepository.save({
      companyId: comanda.companyId,
      comandaId: id,
      eventType: 'release',
      meta: { reason: 'No consumption' },
      createdBy: releasedBy,
    });

    return this.findOne(id);
  }

  async merge(sourceId: string, targetId: string, mergedBy?: string) {
    const source = await this.findOne(sourceId);
    
    // Move items
    await this.comandaItemsRepository.update({ comandaId: sourceId }, { comandaId: targetId });
    
    // Move payments
    await this.comandaPaymentsRepository.update({ comandaId: sourceId }, { comandaId: targetId });
    
    // Register event
    await this.comandaEventsRepository.save({
      companyId: source.companyId,
      comandaId: targetId,
      eventType: 'merge',
      meta: { merged_from: sourceId },
      createdBy: mergedBy,
    });

    // Reset source comanda
    await this.comandasRepository.update(sourceId, {
      status: 'free',
      closedAt: new Date(),
      closedBy: mergedBy,
      totalAmount: 0,
      paidAmount: 0,
      discountValue: 0,
      surchargeValue: 0,
    });

    // Recalculate target totals
    await this.recalculateTotals(targetId);
    
    return { targetId };
  }

  async recalculateTotals(id: string) {
    const comanda = await this.findOne(id);

    const items = await this.comandaItemsRepository.find({
      where: { comandaId: id, canceledAt: IsNull() }
    });

    const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    let serviceFee = 0;
    if (comanda.applyServiceFee) {
      serviceFee = subtotal * (Number(comanda.serviceFeePercent) / 100);
    }

    const totalAmount = subtotal + serviceFee + Number(comanda.surchargeValue) - Number(comanda.discountValue);

    const payments = await this.comandaPaymentsRepository.find({
      where: { comandaId: id }
    });

    const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    await this.comandasRepository.update(id, {
      totalAmount,
      paidAmount,
      lastActivityAt: new Date(),
    });
    
    return { totalAmount, paidAmount };
  }

  async checkBatch(companyId: string, startNumber: number, endNumber: number) {
    const existing = await this.comandasRepository.createQueryBuilder('c')
      .select('c.commandNumber')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.commandNumber >= :start', { start: startNumber })
      .andWhere('c.commandNumber <= :end', { end: endNumber })
      .getMany();
    
    return existing.map(e => e.commandNumber);
  }

  async batchCreate(dto: { companyId: string; startNumber: number; endNumber: number; applyServiceFee: boolean; serviceFeePercent: number; createdBy?: string }) {
    // 1. Find existing numbers in range
    const existingNumbers = await this.checkBatch(dto.companyId, dto.startNumber, dto.endNumber);
    const existingSet = new Set(existingNumbers);
    const toCreateNumbers = [];
    const skipped = [];

    for (let i = dto.startNumber; i <= dto.endNumber; i++) {
       if (existingSet.has(i)) {
           skipped.push(i);
       } else {
           toCreateNumbers.push(i);
       }
    }

    if (toCreateNumbers.length === 0) {
       return { created: [], skipped, failed: [] };
    }

    // 2. Insert new ones
    const createdComandas = [];
    const failed = [];

    // Process in chunks or individually to be safe
    for (const n of toCreateNumbers) {
        try {
            const comanda = this.comandasRepository.create({
                companyId: dto.companyId,
                commandNumber: n,
                status: 'free',
                applyServiceFee: dto.applyServiceFee,
                serviceFeePercent: dto.serviceFeePercent,
                createdBy: dto.createdBy
            });
            
            const saved = await this.comandasRepository.save(comanda);
            createdComandas.push(saved);

            await this.comandaEventsRepository.save({
                companyId: dto.companyId,
                comandaId: saved.id,
                eventType: 'open',
                meta: { command_number: saved.commandNumber, batch: true },
                createdBy: dto.createdBy
            });
        } catch (err) {
            // Check if error is unique constraint violation (race condition)
            if (err.code === '23505') { // Postgres unique_violation
                skipped.push(n);
            } else {
                failed.push({ number: n, reason: err.message });
            }
        }
    }

    return {
        created: createdComandas.map(c => c.commandNumber),
        skipped,
        failed
    };
  }
}
