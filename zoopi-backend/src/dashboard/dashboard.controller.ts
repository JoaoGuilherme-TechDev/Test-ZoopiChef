import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard) // Proteção de Login e Cargo
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/stats
   * Retorna os cards financeiros e dados do gráfico.
   * Acesso restrito a cargos de gestão.
   */
  @Get('stats')
  @Roles('admin', 'manager') // Garçons e Chefs serão bloqueados aqui
  async getStats(@GetCompanyId() companyId: string) {
    // O ID da empresa é extraído do Token para garantir que o dono só veja seus próprios dados
    return this.dashboardService.getStats(companyId);
  }
}
