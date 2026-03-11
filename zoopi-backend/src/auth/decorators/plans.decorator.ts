import { SetMetadata } from '@nestjs/common';

/**
 * Chave para identificar os metadados de planos exigidos.
 */
export const PLANS_KEY = 'plans';

/**
 * Decorator para definir quais planos de assinatura têm permissão em um endpoint.
 * Exemplo: @RequirePlan('silver', 'gold')
 */
export const RequirePlan = (...plans: string[]) =>
  SetMetadata(PLANS_KEY, plans);
