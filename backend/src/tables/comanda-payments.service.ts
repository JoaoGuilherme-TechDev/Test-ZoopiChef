import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComandaPayment } from './entities/comanda-payment.entity';
import { Comanda } from './entities/comanda.entity';
import { ComandaEvent } from './entities/comanda-event.entity';
import { ComandasService } from './comandas.service';

@Injectable()
export class ComandaPaymentsService {
  constructor(
    @InjectRepository(ComandaPayment)
    private comandaPaymentsRepository: Repository<ComandaPayment>,
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
    return this.comandaPaymentsRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: {
    companyId: string;
    comandaId: string;
    amount: number;
    paymentMethod: string;
    paidByName?: string;
    paidByUserId?: string;
    customerId?: string;
    loyaltyPointsAwarded?: number;
    nsu?: string;
    createdBy?: string;
  }) {
    const comanda = await this.comandasRepository.findOne({ where: { id: dto.comandaId } });
    if (!comanda) throw new NotFoundException('Comanda not found');

    // Calculate loyalty points using the existing database function
    let loyaltyPointsAwarded = 0;
    if (dto.customerId) {
      try {
        const result = await this.comandasRepository.query(
          'SELECT award_loyalty_points($1, $2, $3, $4) as points',
          [dto.companyId, dto.customerId, dto.amount, dto.paymentMethod]
        );
        if (result && result[0] && result[0].points) {
          loyaltyPointsAwarded = Number(result[0].points);
        }
      } catch (error) {
        console.error('Error awarding loyalty points:', error);
        // Continue without awarding points if it fails, to not block payment
      }
    }

    // Override or use the calculated points
    const finalLoyaltyPoints = dto.loyaltyPointsAwarded || loyaltyPointsAwarded;

    const payment = this.comandaPaymentsRepository.create({
      companyId: dto.companyId,
      comandaId: dto.comandaId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paidByName: dto.paidByName,
      paidByUserId: dto.paidByUserId,
      customerId: dto.customerId,
      loyaltyPointsAwarded: finalLoyaltyPoints,
      nsu: dto.nsu,
      createdBy: dto.createdBy,
    });

    const savedPayment = await this.comandaPaymentsRepository.save(payment);

    // Register event
    await this.comandaEventsRepository.save({
      companyId: dto.companyId,
      comandaId: dto.comandaId,
      eventType: 'payment',
      meta: { 
        amount: dto.amount,
        payment_method: dto.paymentMethod,
        paid_by_name: dto.paidByName,
        customer_id: dto.customerId,
        loyalty_points_awarded: finalLoyaltyPoints,
      },
      createdBy: dto.createdBy,
    });

    await this.comandasService.recalculateTotals(dto.comandaId);

    return savedPayment;
  }

  async remove(id: string, companyId: string) {
    const payment = await this.comandaPaymentsRepository.findOne({ where: { id, companyId } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.comandaPaymentsRepository.remove(payment);
    
    await this.comandasService.recalculateTotals(payment.comandaId);
    
    return { success: true, comandaId: payment.comandaId };
  }
}
