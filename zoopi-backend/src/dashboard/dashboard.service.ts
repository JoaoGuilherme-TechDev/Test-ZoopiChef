/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, gte } from 'drizzle-orm';

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Calcula as métricas principais do dia e dados para o gráfico semanal.
   */
  async getStats(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 1. Buscar todos os pedidos da empresa nos últimos 7 dias
    const allRecentOrders = await this.db.query.orders.findMany({
      where: and(
        eq(schema.orders.company_id, companyId),
        gte(schema.orders.created_at, sevenDaysAgo),
      ),
    });

    // 2. Filtrar pedidos de HOJE que não foram cancelados
    const todayOrders = allRecentOrders.filter(
      (o) => new Date(o.created_at) >= today && o.status !== 'cancelled',
    );

    // 3. Cálculos de HOJE
    const totalRevenueToday = todayOrders.reduce(
      (acc, o) => acc + Number(o.total),
      0,
    );
    const countToday = todayOrders.length;
    const ticketMedio = countToday > 0 ? totalRevenueToday / countToday : 0;

    // 4. Pedidos que ainda estão em produção (KDS)
    const activeOrders = todayOrders.filter((o) =>
      ['pending', 'preparing', 'ready'].includes(o.status),
    ).length;

    // 5. Preparar dados para o gráfico dos últimos 7 dias (Soma por dia)
    const chartData = this.prepareWeeklyChartData(allRecentOrders);

    return {
      vendas_hoje: totalRevenueToday.toFixed(2),
      pedidos_hoje: countToday,
      ticket_medio: ticketMedio.toFixed(2),
      pedidos_ativos: activeOrders,
      tendencia_vendas: '+10%', // No futuro podemos comparar com o dia anterior
      chartData,
    };
  }

  /**
   * Helper para formatar os dados para o gráfico do Recharts no Frontend
   */
  private prepareWeeklyChartData(orders: any[]) {
    const daysMap = new Map();

    // Inicializa os últimos 7 dias com valor 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toLocaleDateString('pt-BR', { weekday: 'short' });
      daysMap.set(label, 0);
    }

    // Soma os totais de pedidos válidos em cada dia
    orders.forEach((order) => {
      if (order.status !== 'cancelled') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const label = new Date(order.created_at).toLocaleDateString('pt-BR', {
          weekday: 'short',
        });
        if (daysMap.has(label)) {
          const currentTotal = daysMap.get(label);
          daysMap.set(label, currentTotal + Number(order.total));
        }
      }
    });

    // Converte o Map em Array para o JSON
    return Array.from(daysMap, ([name, total]) => ({
      name,
      total: Number(total.toFixed(2)),
    }));
  }
}
