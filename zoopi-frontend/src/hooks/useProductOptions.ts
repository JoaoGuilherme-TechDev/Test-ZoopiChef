export type OptionalCalcMode = 'sum' | 'avg' | 'highest' | 'fixed';

export const CALC_MODE_LABELS: Record<OptionalCalcMode, string> = {
  sum: 'Soma (Padrão)',
  avg: 'Média de Preços',
  highest: 'Pelo maior valor',
  fixed: 'Valor fixo do grupo'
};