import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableQRToken } from './entities/table-qr-token.entity';
import { Company } from '../companies/entities/company.entity';
import { TableModuleSettings } from './entities/table-module-settings.entity';
import { CompanyTableSettings } from './entities/company-table-settings.entity';
import { CompanyIntegrations } from '../companies/entities/company-integrations.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class TableQRTokensService {
  constructor(
    @InjectRepository(TableQRToken)
    private tokensRepo: Repository<TableQRToken>,
    @InjectRepository(Company)
    private companiesRepo: Repository<Company>,
    @InjectRepository(TableModuleSettings)
    private moduleSettingsRepo: Repository<TableModuleSettings>,
    @InjectRepository(CompanyTableSettings)
    private tableSettingsRepo: Repository<CompanyTableSettings>,
    @InjectRepository(CompanyIntegrations)
    private integrationsRepo: Repository<CompanyIntegrations>,
  ) {}

  async findAll(companyId: string) {
    return this.tokensRepo.find({ where: { companyId } });
  }

  async generate(companyId: string, tableId: string) {
    let existing = await this.tokensRepo.findOne({ where: { companyId, tableId } });
    if (existing) {
      return existing;
    }

    const token = randomUUID();
    const newToken = this.tokensRepo.create({
      companyId,
      tableId,
      token,
    });
    return this.tokensRepo.save(newToken);
  }

  async generateBatch(companyId: string, tableIds: string[]) {
    const tokens: TableQRToken[] = [];
    
    for (const tableId of tableIds) {
      let existing = await this.tokensRepo.findOne({ where: { companyId, tableId } });
      if (!existing) {
        const token = randomUUID();
        const newToken = this.tokensRepo.create({
          companyId,
          tableId,
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
    const qrToken = await this.tokensRepo.findOne({ 
      where: { token },
      relations: ['table'] 
    });
    
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

    const settings = await this.moduleSettingsRepo.findOne({ where: { companyId: qrToken.companyId } });
    const tableSettings = await this.tableSettingsRepo.findOne({ where: { companyId: qrToken.companyId } });
    const integrations = await this.integrationsRepo.findOne({ where: { companyId: qrToken.companyId } });

    return {
      qrToken,
      table: qrToken.table,
      company,
      settings: settings || {
        enableQrOrdering: true,
        enableQrMenuOnly: false,
      },
      tableSettings: tableSettings || null,
      pixSettings: integrations ? {
        pixEnabled: integrations.pixEnabled || false,
        pixKey: integrations.pixKey || null,
        pixKeyType: integrations.pixKeyType || null,
      } : null,
    };
  }
}
