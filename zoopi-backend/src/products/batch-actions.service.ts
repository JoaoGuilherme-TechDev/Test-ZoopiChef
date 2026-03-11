import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  BatchLinkOptionalDto,
  BatchRemoveOptionalDto,
  BatchVisibilityDto,
  BatchUpdateStatusDto,
  BatchProductionLocationDto,
} from './dto/batch-actions.dto';

@Injectable()
export class BatchActionsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async linkOptionalGroups(companyId: string, dto: BatchLinkOptionalDto) {
    return await this.db.transaction(async (tx) => {
      for (const productId of dto.productIds) {
        for (const link of dto.groupLinks) {
          await tx
            .insert(schema.productsToOptionsGroups)
            .values({
              product_id: productId,
              group_id: link.groupId,
              min_select: link.minSelect,
              max_select: link.maxSelect,
              order: link.sortOrder,
              calc_mode: link.calcMode,
            })
            .onConflictDoUpdate({
              target: [
                schema.productsToOptionsGroups.product_id,
                schema.productsToOptionsGroups.group_id,
              ],
              set: {
                min_select: link.minSelect,
                max_select: link.maxSelect,
                order: link.sortOrder,
                calc_mode: link.calcMode,
              },
            });
        }
      }
      return { success: true };
    });
  }

  async removeOptionalGroups(companyId: string, dto: BatchRemoveOptionalDto) {
    await this.db
      .delete(schema.productsToOptionsGroups)
      .where(
        and(
          inArray(schema.productsToOptionsGroups.product_id, dto.productIds),
          inArray(schema.productsToOptionsGroups.group_id, dto.groupIds),
        ),
      );
    return { success: true };
  }

  async updateVisibility(companyId: string, dto: BatchVisibilityDto) {
    await this.db
      .update(schema.products)
      .set({
        ...dto.visibility,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(schema.products.company_id, companyId),
          inArray(schema.products.id, dto.productIds),
        ),
      );
    return { success: true };
  }

  async updateStatus(companyId: string, dto: BatchUpdateStatusDto) {
    await this.db
      .update(schema.products)
      .set({ active: dto.active, updated_at: new Date() })
      .where(
        and(
          eq(schema.products.company_id, companyId),
          inArray(schema.products.id, dto.entityIds),
        ),
      );
    return { success: true };
  }

  async updateProductionLocation(
    companyId: string,
    dto: BatchProductionLocationDto,
  ) {
    await this.db
      .update(schema.products)
      .set({
        production_location: dto.productionLocation,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(schema.products.company_id, companyId),
          inArray(schema.products.id, dto.entityIds),
        ),
      );
    return { success: true };
  }
}
