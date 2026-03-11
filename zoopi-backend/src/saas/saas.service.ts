import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class SaasService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Lista todas as empresas cadastradas no Zoopi.
   * Útil para o seu dashboard de administração global.
   */
  async findAllCompanies() {
    return await this.db.query.companies.findMany({
      orderBy: [desc(schema.companies.created_at)],
      // Inclui a contagem de perfis para você saber o tamanho da equipe do cliente
      with: {
        profiles: true,
      },
    });
  }

  /**
   * Atualiza o plano de um cliente.
   * Ex: Quando o cliente paga o boleto do Plano Gold.
   */
  async updateCompanyPlan(
    id: string,
    dto: {
      plan_type: 'free' | 'bronze' | 'silver' | 'gold';
      expires_at?: string;
      plan_status?: string;
    },
  ) {
    const [updated] = await this.db
      .update(schema.companies)
      .set({
        plan_type: dto.plan_type,
        plan_status: dto.plan_status || 'active',
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
        updated_at: new Date(),
      })
      .where(eq(schema.companies.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return updated;
  }

  /**
   * Bloqueia ou desbloqueia uma empresa.
   * Se 'is_active' for false, ninguém daquela empresa consegue logar.
   */
  async toggleCompanyStatus(id: string, isActive: boolean) {
    const [updated] = await this.db
      .update(schema.companies)
      .set({
        is_active: isActive,
        updated_at: new Date(),
      })
      .where(eq(schema.companies.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return {
      message: `Empresa ${updated.name} está agora ${isActive ? 'ATIVA' : 'BLOQUEADA'}.`,
      is_active: updated.is_active,
    };
  }
}
