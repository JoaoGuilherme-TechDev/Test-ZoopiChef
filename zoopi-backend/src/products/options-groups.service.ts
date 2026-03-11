import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class OptionsGroupsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(companyId: string, dto: CreateOptionGroupDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Criar o grupo (Usando returning() e tratando como array)
      const groupResult = await tx
        .insert(schema.productOptionsGroups)
        .values({
          company_id: companyId,
          name: dto.name,
          min_qty: dto.min_qty,
          max_qty: dto.max_qty,
        })
        .returning();

      const group = groupResult[0];

      // 2. Criar os itens vinculados
      if (dto.items && dto.items.length > 0) {
        await tx.insert(schema.productOptionsItems).values(
          dto.items.map((item) => ({
            company_id: companyId,
            group_id: group.id,
            name: item.name,
            price: item.price.toString(),
            order: item.order ?? 0,
            active: item.active ?? true,
          })),
        );
      }

      return group;
    });
  }

  // Método necessário para o frontend de Ações em Lote
  async findForBatch(companyId: string) {
    const groups = await this.db.query.productOptionsGroups.findMany({
      where: eq(schema.productOptionsGroups.company_id, companyId),
      with: {
        items: true,
      },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      min_select: group.min_qty,
      max_select: group.max_qty,
      items_count: group.items.length,
      active: group.items.some((item) => item.active !== false),
    }));
  }

  async findAll(companyId: string) {
    return await this.db.query.productOptionsGroups.findMany({
      where: eq(schema.productOptionsGroups.company_id, companyId),
      with: {
        items: true,
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const group = await this.db.query.productOptionsGroups.findFirst({
      where: and(
        eq(schema.productOptionsGroups.id, id),
        eq(schema.productOptionsGroups.company_id, companyId),
      ),
      with: {
        items: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo de opcionais não encontrado.');
    }
    return group;
  }

  async update(id: string, companyId: string, dto: any) {
    return await this.db.transaction(async (tx) => {
      const updatedResult = await tx
        .update(schema.productOptionsGroups)
        .set({
          name: dto.name,
          min_qty: dto.min_qty,
          max_qty: dto.max_qty,
        })
        .where(
          and(
            eq(schema.productOptionsGroups.id, id),
            eq(schema.productOptionsGroups.company_id, companyId),
          ),
        )
        .returning();

      const updatedGroup = updatedResult[0];

      if (!updatedGroup) {
        throw new NotFoundException('Grupo não encontrado.');
      }

      if (dto.items) {
        await tx
          .delete(schema.productOptionsItems)
          .where(eq(schema.productOptionsItems.group_id, id));

        if (dto.items.length > 0) {
          await tx.insert(schema.productOptionsItems).values(
            dto.items.map((item: any) => ({
              company_id: companyId,
              group_id: id,
              name: item.name,
              price: item.price.toString(),
              order: item.order ?? 0,
              active: item.active ?? true,
            })),
          );
        }
      }

      return updatedGroup;
    });
  }

  async remove(id: string, companyId: string) {
    const deletedResult = await this.db
      .delete(schema.productOptionsGroups)
      .where(
        and(
          eq(schema.productOptionsGroups.id, id),
          eq(schema.productOptionsGroups.company_id, companyId),
        ),
      )
      .returning();

    if (!(deletedResult as any[]).length) {
      throw new NotFoundException('Grupo não encontrado.');
    }
    return { success: true };
  }
}
