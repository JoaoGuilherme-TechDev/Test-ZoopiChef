import { SetMetadata } from '@nestjs/common';

/**
 * Chave que identifica os metadados de cargo no sistema de segurança.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator para definir quais cargos têm permissão em um endpoint.
 * Exemplo: @Roles('admin', 'manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
