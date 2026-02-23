export const PRODUCTION_LOCATIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'chapa', label: 'Chapa' },
  { value: 'forno', label: 'Forno' },
  { value: 'bar', label: 'Bar' },
  { value: 'montagem', label: 'Montagem' },
  { value: 'sobremesas', label: 'Sobremesas' },
] as const;

export type ProductionLocationValue = (typeof PRODUCTION_LOCATIONS)[number]['value'];
