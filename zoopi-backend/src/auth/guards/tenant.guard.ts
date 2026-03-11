import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // O slug pode vir dos parâmetros da URL ou de um header (ex: x-tenant-slug)
    const slug = request.params.slug || request.headers['x-tenant-slug'];

    if (!slug) {
      // Se não houver slug, verificamos se o companyId já está no user (vido do JWT)
      if (user.companyId) {
        return true;
      }
      throw new UnauthorizedException(
        'Tenant slug ou identificação de empresa ausente',
      );
    }

    // Buscar a empresa pelo slug
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.slug, slug),
    });

    if (!company) {
      throw new ForbiddenException('Empresa não encontrada ou slug inválido');
    }

    // Verificar se o usuário está associado a esta empresa
    const association = await this.db.query.profiles.findFirst({
      where: and(
        eq(schema.profiles.user_id, user.userId),
        eq(schema.profiles.company_id, company.id),
      ),
    });

    if (!association) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar os dados desta empresa',
      );
    }

    // Injetar o companyId e a empresa no request para uso posterior
    request.tenant = company;
    request.user.companyId = company.id; // Sobrescreve o companyId do JWT pelo da empresa do slug

    return true;
  }
}
