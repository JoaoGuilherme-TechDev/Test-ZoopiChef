/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLANS_KEY } from '../decorators/plans.decorator';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Busca os planos permitidos definidos no decorator @RequirePlan()
    const requiredPlans = this.reflector.getAllAndOverride<string[]>(
      PLANS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Se a rota não exige um plano específico, libera o acesso
    if (!requiredPlans) {
      return true;
    }

    // 3. Pega o usuário (injetado pelo JWT)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // 4. Regra de Ouro: Super Admin do Zoopi ignora restrições de plano (para suporte técnico)
    if (user.globalRole === 'super_admin') {
      return true;
    }

    // 5. Verifica se o plano da empresa do usuário está na lista permitida
    const hasRequiredPlan = requiredPlans.includes(user.planType);

    if (!hasRequiredPlan) {
      throw new ForbiddenException(
        `Esta funcionalidade exige um plano superior. Seu plano atual: ${user.planType}.`,
      );
    }

    // 6. (Opcional) Poderíamos checar aqui também se o plano está vencido (plan_status !== 'active')
    // mas isso geralmente é feito em um guard global de "Bloqueio de Empresa".

    return true;
  }
}
