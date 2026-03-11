import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class SubcategoriesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(companyId: string, createSubcategoryDto: CreateSubcategoryDto) {
    const [subcategory] = await this.db
      .insert(schema.subcategories)
      .values({
        name: createSubcategoryDto.name,
        company_id: companyId,
        category_id: createSubcategoryDto.category_id,
        order: createSubcategoryDto.order ?? 0,
        active: true,
      })
      .returning();
    return subcategory;
  }

  async findAll(companyId: string) {
    return await this.db.query.subcategories.findMany({
      where: eq(schema.subcategories.company_id, companyId),
      orderBy: (sub, { asc }) => [asc(sub.order)],
      with: {},
    });
  }

  async findOne(id: string, companyId: string) {
    const subcategory = await this.db.query.subcategories.findFirst({
      where: and(
        eq(schema.subcategories.id, id),
        eq(schema.subcategories.company_id, companyId),
      ),
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategoria não encontrada.');
    }
    return subcategory;
  }

  async update(
    id: string,
    companyId: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
  ) {
    const [subcategory] = await this.db
      .update(schema.subcategories)
      .set(updateSubcategoryDto)
      .where(
        and(
          eq(schema.subcategories.id, id),
          eq(schema.subcategories.company_id, companyId),
        ),
      )
      .returning();

    if (!subcategory) {
      throw new NotFoundException('Subcategoria não encontrada.');
    }
    return subcategory;
  }

  async remove(id: string, companyId: string) {
    const [subcategory] = await this.db
      .delete(schema.subcategories)
      .where(
        and(
          eq(schema.subcategories.id, id),
          eq(schema.subcategories.company_id, companyId),
        ),
      )
      .returning();

    if (!subcategory) {
      throw new NotFoundException('Subcategoria não encontrada.');
    }
    return { message: 'Subcategoria removida com sucesso' };
  }
}
