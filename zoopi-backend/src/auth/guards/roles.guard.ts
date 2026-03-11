/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Pega os cargos permitidos definidos no decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Se a rota não tiver o decorator @Roles, o acesso é liberado por padrão
    if (!requiredRoles) {
      return true;
    }

    // 3. Pega o usuário que foi injetado pelo JwtAuthGuard
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // 4. Regra de Ouro: Super Admin global tem acesso a TUDO
    if (user.globalRole === 'super_admin') {
      return true;
    }

    // 5. Verifica se o cargo do usuário na empresa está na lista de permissões
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado: seu cargo (${user.role}) não tem permissão para esta ação.`,
      );
    }

    return true;
  }
}
