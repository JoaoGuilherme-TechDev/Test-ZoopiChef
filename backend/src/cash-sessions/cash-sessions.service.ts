import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSession } from './entities/cash-session.entity';

@Injectable()
export class CashSessionsService {
  constructor(
    @InjectRepository(CashSession)
    private cashSessionsRepository: Repository<CashSession>,
  ) {}

  async findOpenSession(companyId: string): Promise<CashSession | null> {
    return this.cashSessionsRepository.findOne({
      where: {
        companyId,
        status: 'open',
      },
    });
  }
}
