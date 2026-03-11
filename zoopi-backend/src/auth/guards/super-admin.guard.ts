/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verifica se o usuário logado é um Super Admin do sistema Zoopi
    if (user?.globalRole !== 'super_admin') {
      throw new ForbiddenException(
        'Acesso negado: Esta rota é restrita aos administradores globais do Zoopi.',
      );
    }

    return true;
  }
}
