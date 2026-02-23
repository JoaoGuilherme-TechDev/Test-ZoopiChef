import { useGlobalPanicShortcut } from '@/hooks/useGlobalPanicShortcut';

/**
 * Componente invisível que escuta globalmente por 5x Espaço
 * para acionar o botão de pânico em qualquer tela do sistema.
 */
export function GlobalPanicListener() {
  useGlobalPanicShortcut();
  return null;
}
