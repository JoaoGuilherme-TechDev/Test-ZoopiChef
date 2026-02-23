/**
 * Pizza KDS V2 - Stage Definitions
 * 
 * This is a COMPLETELY INDEPENDENT implementation from the original KDS.
 * Uses a clean state machine with 4 fixed stages for pizza production.
 */

// The 4 fixed stages for pizza production + done state
export type PizzaKdsV2Stage = 'massa_borda' | 'recheio' | 'forno' | 'finalizacao' | 'done';

// Labels in Portuguese for UI display
export const PIZZA_KDS_V2_STAGE_LABELS: Record<PizzaKdsV2Stage, string> = {
  massa_borda: 'Massa + Borda',
  recheio: 'Recheio',
  forno: 'Forno',
  finalizacao: 'Finalização',
  done: 'Concluído',
};

// Short labels for compact displays
export const PIZZA_KDS_V2_STAGE_SHORT_LABELS: Record<PizzaKdsV2Stage, string> = {
  massa_borda: 'M+B',
  recheio: 'Rech',
  forno: 'Forno',
  finalizacao: 'Final',
  done: '✓',
};

// Stage order for progression
export const PIZZA_KDS_V2_STAGE_ORDER: PizzaKdsV2Stage[] = [
  'massa_borda',
  'recheio',
  'forno',
  'finalizacao',
  'done',
];

// Visual configuration for each stage
export const PIZZA_KDS_V2_STAGE_CONFIG: Record<PizzaKdsV2Stage, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  massa_borda: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: '🫓',
  },
  recheio: {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: '🍅',
  },
  forno: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: '🔥',
  },
  finalizacao: {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: '✨',
  },
  done: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: '✓',
  },
};

// Urgency levels for orders
export type PizzaKdsV2Urgency = 'normal' | 'attention' | 'urgent';

export const PIZZA_KDS_V2_URGENCY_CONFIG: Record<PizzaKdsV2Urgency, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  normal: {
    label: 'Normal',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  attention: {
    label: 'Atenção',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
  },
  urgent: {
    label: 'Urgente',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-400',
  },
};

/**
 * Gets the next stage in the production pipeline
 * Returns null if already at 'done'
 */
export function getNextStage(currentStage: PizzaKdsV2Stage): PizzaKdsV2Stage | null {
  const currentIndex = PIZZA_KDS_V2_STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= PIZZA_KDS_V2_STAGE_ORDER.length - 1) {
    return null;
  }
  return PIZZA_KDS_V2_STAGE_ORDER[currentIndex + 1];
}

/**
 * Gets all processable stages (excludes 'done')
 */
export function getProcessableStages(): PizzaKdsV2Stage[] {
  return PIZZA_KDS_V2_STAGE_ORDER.filter(s => s !== 'done');
}

/**
 * Checks if a stage is processable (not 'done')
 */
export function isProcessableStage(stage: PizzaKdsV2Stage): boolean {
  return stage !== 'done';
}
