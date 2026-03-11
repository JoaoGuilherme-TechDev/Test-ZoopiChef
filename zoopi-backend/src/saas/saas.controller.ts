import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SaasService } from './saas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@Controller('saas')
@UseGuards(JwtAuthGuard, SuperAdminGuard) // Bloqueio total: Apenas Administradores do Zoopi
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  /**
   * GET /api/saas/companies
   * Lista todas as empresas do sistema para o seu dashboard administrativo.
   */
  @Get('companies')
  findAllCompanies() {
    return this.saasService.findAllCompanies();
  }

  /**
   * PATCH /api/saas/companies/:id/plan
   * Altera o plano de um cliente (Ex: Upgrade de Free para Gold)
   */
  @Patch('companies/:id/plan')
  updatePlan(
    @Param('id') id: string,
    @Body()
    dto: {
      plan_type: 'free' | 'bronze' | 'silver' | 'gold';
      expires_at?: string;
      plan_status?: string;
    },
  ) {
    return this.saasService.updateCompanyPlan(id, dto);
  }

  /**
   * PATCH /api/saas/companies/:id/status
   * Bloqueia ou desbloqueia o acesso de uma empresa inteira.
   */
  @Patch('companies/:id/status')
  toggleStatus(@Param('id') id: string, @Body('is_active') isActive: boolean) {
    return this.saasService.toggleCompanyStatus(id, isActive);
  }
}
