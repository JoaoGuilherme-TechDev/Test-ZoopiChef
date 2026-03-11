/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const slug =
        createCompanyDto.slug || this.generateSlug(createCompanyDto.name);

      const [newCompany] = await this.db
        .insert(schema.companies)
        .values({
          name: createCompanyDto.name,
          slug: slug,
        })
        .returning();

      return newCompany;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Uma empresa com este slug já existe.');
      }
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async associateUser(companyId: string, userId: string, fullName?: string) {
    const existing = await this.db.query.profiles.findFirst({
      where: and(
        eq(schema.profiles.company_id, companyId),
        eq(schema.profiles.user_id, userId),
      ),
    });

    if (existing) {
      return existing;
    }

    const [profile] = await this.db
      .insert(schema.profiles)
      .values({
        company_id: companyId,
        user_id: userId,
        full_name: fullName || 'Usuário',
      })
      .returning();

    return profile;
  }

  async findAll() {
    return await this.db.query.companies.findMany();
  }

  async findOne(id: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.id, id),
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  async findBySlug(slug: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.slug, slug),
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const [updatedCompany] = await this.db
      .update(schema.companies)
      .set({
        ...updateCompanyDto,
        updated_at: new Date(),
      })
      .where(eq(schema.companies.id, id))
      .returning();

    if (!updatedCompany) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return updatedCompany;
  }

  async remove(id: string) {
    const [deletedCompany] = await this.db
      .delete(schema.companies)
      .where(eq(schema.companies.id, id))
      .returning();

    if (!deletedCompany) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return { message: 'Empresa removida com sucesso' };
  }
}
