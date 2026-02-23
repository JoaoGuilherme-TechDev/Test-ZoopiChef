import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalConfig } from './entities/fiscal-config.entity';

@Injectable()
export class FiscalService {
  constructor(
    @InjectRepository(FiscalConfig)
    private fiscalConfigRepository: Repository<FiscalConfig>,
  ) {}

  async getConfig(companyId: string): Promise<FiscalConfig | null> {
    return this.fiscalConfigRepository.findOne({ where: { companyId } });
  }

  async createOrUpdateConfig(companyId: string, config: Partial<FiscalConfig>): Promise<FiscalConfig> {
    const existing = await this.getConfig(companyId);
    if (existing) {
      Object.assign(existing, config);
      return this.fiscalConfigRepository.save(existing);
    }
    const newConfig = this.fiscalConfigRepository.create({ ...config, companyId });
    return this.fiscalConfigRepository.save(newConfig);
  }
}
