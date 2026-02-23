import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyIntegrations } from './entities/company-integrations.entity';
import { CompanyAISettings } from './entities/company-ai-settings.entity';
import { CompanyPublicLinks } from './entities/company-public-links.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    @InjectRepository(CompanyIntegrations)
    private companyIntegrationsRepository: Repository<CompanyIntegrations>,
    @InjectRepository(CompanyAISettings)
    private companyAISettingsRepository: Repository<CompanyAISettings>,
    @InjectRepository(CompanyPublicLinks)
    private companyPublicLinksRepository: Repository<CompanyPublicLinks>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private entityManager: EntityManager,
  ) {}

  async findByUser(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.companyId) {
      return null;
    }
    return this.companiesRepository.findOne({ where: { id: user.companyId } });
  }

  async create(createCompanyDto: { name: string; slug: string; userId: string }) {
    // Transactional creation of company and updating user
    return await this.entityManager.transaction(async (manager) => {
      const company = manager.create(Company, {
        name: createCompanyDto.name,
        slug: createCompanyDto.slug,
        ownerUserId: createCompanyDto.userId,
        // Set defaults
        orderSoundEnabled: true,
        storeProfile: 'restaurant',
        isActive: true,
        isTemplate: false,
        menuToken: Math.random().toString(36).substring(7), // Simple token generation
      });

      const savedCompany = await manager.save(Company, company);

      // Create Public Links
      const publicLinks = manager.create(CompanyPublicLinks, {
        companyId: savedCompany.id,
        menuToken: Math.random().toString(36).substring(7),
        tvToken: Math.random().toString(36).substring(7),
        roletaToken: Math.random().toString(36).substring(7),
        kdsToken: Math.random().toString(36).substring(7),
        scaleToken: Math.random().toString(36).substring(7),
        menuTokenV2: 'm_' + Math.random().toString(36).substring(2, 15),
        tvTokenV2: 'tv_' + Math.random().toString(36).substring(2, 15),
        roletaTokenV2: 'r_' + Math.random().toString(36).substring(2, 15),
        kdsTokenV2: 'k_' + Math.random().toString(36).substring(2, 15),
        scaleTokenV2: 's_' + Math.random().toString(36).substring(2, 15),
      });
      await manager.save(CompanyPublicLinks, publicLinks);

      // Update user with company_id and role if needed
      // Assuming the creator becomes 'admin' of the company if they don't have one
      // But based on existing logic, we just link them.
      await manager.update(User, createCompanyDto.userId, {
        companyId: savedCompany.id,
        role: 'admin', // Enforce admin role for creator? existing logic implies it.
      });

      return savedCompany;
    });
  }

  async findAll() {
    return this.companiesRepository.find();
  }

  async findOne(id: string) {
    const company = await this.companiesRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async findBySlug(slug: string) {
    const company = await this.companiesRepository.findOne({ where: { slug } });
    if (!company) {
      throw new NotFoundException(`Company with slug ${slug} not found`);
    }
    return company;
  }

  async update(id: string, updateCompanyDto: any) {
    const company = await this.findOne(id);
    // Remove fields that shouldn't be updated directly or handle them safely
    const { id: _, ...updates } = updateCompanyDto;
    
    await this.companiesRepository.update(id, updates);
    return this.findOne(id);
  }

  async remove(id: string) {
    const company = await this.findOne(id);
    return this.companiesRepository.remove(company as any);
  }

  async findUsers(companyId: string) {
    return this.usersRepository.find({
      where: { companyId },
    });
  }

  async findIntegrations(companyId: string) {
    return this.companyIntegrationsRepository.findOne({ where: { companyId } });
  }

  async upsertIntegrations(companyId: string, updates: any) {
    const existing = await this.findIntegrations(companyId);
    if (existing) {
      await this.companyIntegrationsRepository.update(companyId, updates);
      return this.findIntegrations(companyId);
    }
    const created = this.companyIntegrationsRepository.create({
      companyId,
      ...updates,
    });
    return this.companyIntegrationsRepository.save(created);
  }

  async findAISettings(companyId: string) {
    return this.companyAISettingsRepository.findOne({ where: { companyId } });
  }

  async upsertAISettings(companyId: string, updates: any) {
    const existing = await this.findAISettings(companyId);
    if (existing) {
      await this.companyAISettingsRepository.update(companyId, updates);
      return this.findAISettings(companyId);
    }
    const created = this.companyAISettingsRepository.create({
      companyId,
      ...updates,
    });
    return this.companyAISettingsRepository.save(created);
  }

  async findPublicLinks(companyId: string) {
    let links = await this.companyPublicLinksRepository.findOne({ where: { companyId } });
    if (!links) {
      // Create if missing (auto-heal)
      const newLinks = this.companyPublicLinksRepository.create({
        companyId,
        menuToken: Math.random().toString(36).substring(7),
        tvToken: Math.random().toString(36).substring(7),
        roletaToken: Math.random().toString(36).substring(7),
        kdsToken: Math.random().toString(36).substring(7),
        scaleToken: Math.random().toString(36).substring(7),
        menuTokenV2: 'm_' + Math.random().toString(36).substring(2, 15),
        tvTokenV2: 'tv_' + Math.random().toString(36).substring(2, 15),
        roletaTokenV2: 'r_' + Math.random().toString(36).substring(2, 15),
        kdsTokenV2: 'k_' + Math.random().toString(36).substring(2, 15),
        scaleTokenV2: 's_' + Math.random().toString(36).substring(2, 15),
      });
      links = await this.companyPublicLinksRepository.save(newLinks);
    }
    return links;
  }
}
