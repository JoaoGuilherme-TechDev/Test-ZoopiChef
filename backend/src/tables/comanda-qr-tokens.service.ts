import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComandaQRToken } from './entities/comanda-qr-token.entity';
import { Company } from '../companies/entities/company.entity';
import { ComandaSettings } from './entities/comanda-settings.entity';
import { TableModuleSettings } from './entities/table-module-settings.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ComandaQRTokensService {
  constructor(
    @InjectRepository(ComandaQRToken)
    private tokensRepo: Repository<ComandaQRToken>,
    @InjectRepository(Company)
    private companiesRepo: Repository<Company>,
    @InjectRepository(ComandaSettings)
    private comandaSettingsRepo: Repository<ComandaSettings>,
    @InjectRepository(TableModuleSettings)
    private moduleSettingsRepo: Repository<TableModuleSettings>,
  ) {}

  async findAll(companyId: string) {
    return this.tokensRepo.find({ where: { companyId }, order: { comandaNumber: 'ASC' } });
  }

  async generate(companyId: string, comandaNumber: number) {
    let existing = await this.tokensRepo.findOne({ where: { companyId, comandaNumber } });
    if (existing) {
      return existing;
    }

    const token = randomUUID();
    const newToken = this.tokensRepo.create({
      companyId,
      comandaNumber,
      token,
    });
    return this.tokensRepo.save(newToken);
  }

  async generateBatch(companyId: string, start: number, end: number) {
    const tokens: ComandaQRToken[] = [];
    
    for (let i = start; i <= end; i++) {
      let existing = await this.tokensRepo.findOne({ where: { companyId, comandaNumber: i } });
      if (!existing) {
        const token = randomUUID();
        const newToken = this.tokensRepo.create({
          companyId,
          comandaNumber: i,
          token,
        });
        tokens.push(newToken);
      }
    }

    if (tokens.length > 0) {
      return this.tokensRepo.save(tokens);
    }
    return [];
  }

  async getPublicInfo(token: string) {
    const qrToken = await this.tokensRepo.findOne({ where: { token } });
    if (!qrToken) return null;

    const company = await this.companiesRepo.findOne({ 
      where: { id: qrToken.companyId },
      select: [
        'id', 'name', 'slug', 'address', 'whatsapp', 'phone', 
        'logoUrl', 'primaryColor', 'secondaryColor', 'backgroundColor', 
        'publicMenuLayout', 'welcomeMessage', 'openingHours', 
        'storeProfile', 'isActive', 'printFooterSite', 'printFooterPhone'
      ]
    });
    
    if (!company) return null;

    const settings = await this.comandaSettingsRepo.findOne({ where: { companyId: qrToken.companyId } });
    const moduleSettings = await this.moduleSettingsRepo.findOne({ where: { companyId: qrToken.companyId } });

    return {
      qrToken,
      comandaNumber: qrToken.comandaNumber,
      company,
      settings: settings || {},
      moduleSettings: moduleSettings || {
        enableQrOrdering: true,
        enableQrMenuOnly: false,
      },
    };
  }
}
