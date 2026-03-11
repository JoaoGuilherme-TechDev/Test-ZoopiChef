import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { eq, and, inArray } from 'drizzle-orm';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(companyId: string, dto: CreateCategoryDto) {
    const [category] = await this.db
      .insert(schema.categories)
      .values({
        name: dto.name,
        company_id: companyId,
        image_url: dto.image_url,
        color: dto.color,
        order: dto.order ?? 0,
        active: dto.active ?? true,
      })
      .returning();
    return category;
  }

  async findAll(companyId: string) {
    return await this.db.query.categories.findMany({
      where: eq(schema.categories.company_id, companyId),
      orderBy: (categories, { asc }) => [asc(categories.order)],
      with: {
        subcategories: true,
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const category = await this.db.query.categories.findFirst({
      where: and(
        eq(schema.categories.id, id),
        eq(schema.categories.company_id, companyId),
      ),
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }
    return category;
  }

  async update(id: string, companyId: string, dto: UpdateCategoryDto) {
    const [category] = await this.db
      .update(schema.categories)
      .set({
        ...dto,
      })
      .where(
        and(
          eq(schema.categories.id, id),
          eq(schema.categories.company_id, companyId),
        ),
      )
      .returning();

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }
    return category;
  }

  async remove(id: string, companyId: string) {
    const category = await this.db.query.categories.findFirst({
      where: and(
        eq(schema.categories.id, id),
        eq(schema.categories.company_id, companyId),
      ),
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    await this.db.transaction(async (tx) => {
      const subcategoriesToDelete = await tx.query.subcategories.findMany({
        where: and(
          eq(schema.subcategories.company_id, companyId),
          eq(schema.subcategories.category_id, id),
        ),
      });

      const subcategoryIds = subcategoriesToDelete.map((s) => s.id);

      if (subcategoryIds.length > 0) {
        await tx
          .delete(schema.products)
          .where(inArray(schema.products.subcategory_id, subcategoryIds));

        await tx
          .delete(schema.subcategories)
          .where(
            and(
              eq(schema.subcategories.company_id, companyId),
              eq(schema.subcategories.category_id, id),
            ),
          );
      }

      await tx
        .delete(schema.categories)
        .where(
          and(
            eq(schema.categories.id, id),
            eq(schema.categories.company_id, companyId),
          ),
        );
    });

    return { success: true, message: 'Categoria removida com sucesso' };
  }
}
