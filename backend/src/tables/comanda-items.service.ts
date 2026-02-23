import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ComandaItem } from './entities/comanda-item.entity';
import { Comanda } from './entities/comanda.entity';
import { ComandaEvent } from './entities/comanda-event.entity';
import { ComandasService } from './comandas.service';

@Injectable()
export class ComandaItemsService {
  constructor(
    @InjectRepository(ComandaItem)
    private comandaItemsRepository: Repository<ComandaItem>,
    @InjectRepository(Comanda)
    private comandasRepository: Repository<Comanda>,
    @InjectRepository(ComandaEvent)
    private comandaEventsRepository: Repository<ComandaEvent>,
    private readonly comandasService: ComandasService,
  ) {}

  async findAll(comandaId: string, companyId?: string) {
    const where: any = { comandaId };
    if (companyId) {
      where.companyId = companyId;
    }
    return this.comandaItemsRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: {
    companyId: string;
    comandaId: string;
    productId: string | null;
    productName: string;
    qty: number;
    unitPrice: number;
    notes?: string;
    optionsJson?: any;
    createdBy?: string;
  }) {
    const comanda = await this.comandasRepository.findOne({ where: { id: dto.comandaId } });
    if (!comanda) throw new NotFoundException('Comanda not found');

    const item = this.comandaItemsRepository.create({
      companyId: dto.companyId,
      comandaId: dto.comandaId,
      productId: dto.productId,
      productName: dto.productName,
      qty: dto.qty,
      unitPrice: dto.unitPrice,
      totalPrice: dto.qty * dto.unitPrice,
      notes: dto.notes,
      optionsJson: dto.optionsJson,
      createdBy: dto.createdBy,
      status: 'ordered',
    });

    const savedItem = await this.comandaItemsRepository.save(item);

    await this.comandaEventsRepository.save({
      companyId: dto.companyId,
      comandaId: dto.comandaId,
      eventType: 'add_item',
      meta: {
        product_name: dto.productName,
        qty: dto.qty,
        unit_price: dto.unitPrice,
        item_id: savedItem.id,
      },
      createdBy: dto.createdBy,
    });

    await this.comandasService.recalculateTotals(dto.comandaId);

    return savedItem;
  }

  async cancel(id: string, reason: string, userId?: string) {
    const item = await this.comandaItemsRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    item.canceledAt = new Date();
    item.cancelReason = reason;
    item.status = 'canceled';
    
    const savedItem = await this.comandaItemsRepository.save(item);

    await this.comandaEventsRepository.save({
      companyId: item.companyId,
      comandaId: item.comandaId,
      eventType: 'cancel_item',
      meta: {
        item_id: item.id,
        reason,
        product_name: item.productName,
      },
      createdBy: userId,
    });

    await this.comandasService.recalculateTotals(item.comandaId);

    return savedItem;
  }

  async transfer(dto: {
    itemId: string;
    targetComandaId: string;
    qtyToTransfer: number;
    userId?: string;
  }) {
    const item = await this.comandaItemsRepository.findOne({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const sourceComandaId = item.comandaId; // Capture before mutation

    const targetComanda = await this.comandasRepository.findOne({ where: { id: dto.targetComandaId } });
    if (!targetComanda) throw new NotFoundException('Target comanda not found');

    if (dto.qtyToTransfer >= item.qty) {
      // Transfer entire item
      item.comandaId = dto.targetComandaId;
      await this.comandaItemsRepository.save(item);
    } else {
      // Split item
      item.qty -= dto.qtyToTransfer;
      item.totalPrice = item.qty * item.unitPrice;
      await this.comandaItemsRepository.save(item);

      const newItem = this.comandaItemsRepository.create({
        companyId: item.companyId,
        comandaId: dto.targetComandaId,
        productId: item.productId,
        productName: item.productName,
        qty: dto.qtyToTransfer,
        unitPrice: item.unitPrice,
        totalPrice: dto.qtyToTransfer * item.unitPrice,
        notes: item.notes,
        optionsJson: item.optionsJson,
        createdBy: dto.userId,
        status: 'ordered', // Reset status? Or keep? Usually reset for new item in new comanda.
      });
      await this.comandaItemsRepository.save(newItem);
    }

    // Events
    await this.comandaEventsRepository.save([
      {
        companyId: item.companyId,
        comandaId: sourceComandaId, // Use captured source ID
        eventType: 'transfer',
        meta: {
          item_id: dto.itemId,
          qty_transferred: dto.qtyToTransfer,
          to_comanda_id: dto.targetComandaId,
          direction: 'out',
        },
        createdBy: dto.userId,
      },
      {
        companyId: item.companyId,
        comandaId: dto.targetComandaId,
        eventType: 'transfer',
        meta: {
          from_item_id: dto.itemId,
          qty_received: dto.qtyToTransfer,
          from_comanda_id: sourceComandaId, // Use captured source ID
          direction: 'in',
        },
        createdBy: dto.userId,
      }
    ]);

    await this.comandasService.recalculateTotals(sourceComandaId);
    await this.comandasService.recalculateTotals(dto.targetComandaId);

    return { success: true };
  }

  async markAsPrinted(ids: string[]) {
    await this.comandaItemsRepository.update(
      { id: In(ids) },
      { isPrinted: true, printedAt: new Date() }
    );
    return { success: true };
  }
}
