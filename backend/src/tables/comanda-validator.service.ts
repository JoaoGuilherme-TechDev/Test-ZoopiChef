import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComandaValidatorToken } from './entities/comanda-validator-token.entity';
import { ComandaValidationLog } from './entities/comanda-validation-log.entity';

@Injectable()
export class ComandaValidatorService {
  constructor(
    @InjectRepository(ComandaValidatorToken)
    private tokensRepository: Repository<ComandaValidatorToken>,
    @InjectRepository(ComandaValidationLog)
    private logsRepository: Repository<ComandaValidationLog>,
  ) {}

  async findAllTokens(companyId: string) {
    return this.tokensRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async createToken(companyId: string, name: string) {
    const token = this.tokensRepository.create({
      companyId,
      name,
      // In a real app we might generate a secure token here if needed
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });
    return this.tokensRepository.save(token);
  }

  async updateToken(id: string, updates: Partial<ComandaValidatorToken>) {
    await this.tokensRepository.update(id, updates);
    return this.tokensRepository.findOne({ where: { id } });
  }

  async deleteToken(id: string) {
    return this.tokensRepository.delete(id);
  }

  async getLogs(companyId: string) {
    return this.logsRepository.find({
      where: { companyId },
      order: { validatedAt: 'DESC' },
      take: 500,
    });
  }
}
