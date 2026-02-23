import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableModuleSettings } from './entities/table-module-settings.entity';

@Injectable()
export class TableModuleSettingsService {
  constructor(
    @InjectRepository(TableModuleSettings)
    private settingsRepository: Repository<TableModuleSettings>,
  ) {}

  async findOne(companyId: string) {
    return this.settingsRepository.findOne({ where: { companyId } });
  }

  async upsert(companyId: string, updates: Partial<TableModuleSettings>) {
    // Check if settings exist
    let settings = await this.settingsRepository.findOne({ where: { companyId } });
    if (settings) {
      await this.settingsRepository.update(companyId, updates);
    } else {
      settings = this.settingsRepository.create({
        companyId,
        ...updates,
      });
      await this.settingsRepository.save(settings);
    }
    return this.settingsRepository.findOne({ where: { companyId } });
  }
}
