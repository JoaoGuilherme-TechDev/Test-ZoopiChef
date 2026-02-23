/**
 * Pizza Optional Calculation Modes
 * 
 * This module implements the 5 calculation modes for pizza add-ons/optionals:
 * 
 * 1. sum_each_part: Sum = optional value is added for each part
 *    Example: 2-flavor pizza, optional R$4 => +R$8 total
 * 
 * 2. proportional: Proportional = optional value calculated proportionally
 *    Example: optional R$6 for whole pizza, 3 parts => +R$6 total (R$2 per part for reference)
 * 
 * 3. pizza_total_split: Total shown on main item, system displays per-part breakdown
 *    The final total stays on the main item. No duplication.
 * 
 * 4. max_part_value: Charge by the highest optional value among parts
 *    Example: half A optional R$3, half B optional R$5 => charges +R$5
 * 
 * 5. per_flavor_part: Optional applied only to the specific flavor chosen
 *    Example: extra cheese only for Calabresa (1/2) => adds only to that half
 */

import type { OptionalCalcMode } from '@/hooks/useProductOptions';

export interface PizzaOptionalInput {
  group_id: string;
  group_name: string;
  item_id: string;
  item_label: string;
  price: number;
  target_scope: 'whole_pizza' | string; // 'whole_pizza' or specific flavor_id
  calc_mode: OptionalCalcMode;
}

export interface PizzaOptionalCalculationResult {
  total: number;
  breakdown: Array<{
    item_label: string;
    original_price: number;
    calculated_price: number;
    calc_mode: OptionalCalcMode;
    applied_to: string; // 'pizza inteira' or flavor name
    explanation: string;
  }>;
}

/**
 * Calculate the total price of pizza optionals based on their calculation modes
 * 
 * @param optionals - Array of selected optionals with their calc_mode
 * @param partsCount - Number of flavors/parts in the pizza (1-4 typically)
 * @param flavorNames - Map of flavor_id to flavor name for display
 * @returns Calculation result with total and detailed breakdown
 */
export function calculatePizzaOptionals(
  optionals: PizzaOptionalInput[],
  partsCount: number,
  flavorNames: Record<string, string>
): PizzaOptionalCalculationResult {
  const breakdown: PizzaOptionalCalculationResult['breakdown'] = [];
  let total = 0;

  // Group optionals by calc_mode for special handling (max_part_value)
  const byCalcMode = new Map<OptionalCalcMode, PizzaOptionalInput[]>();
  for (const opt of optionals) {
    const existing = byCalcMode.get(opt.calc_mode) || [];
    existing.push(opt);
    byCalcMode.set(opt.calc_mode, existing);
  }

  // Process each optional
  for (const opt of optionals) {
    let calculatedPrice = 0;
    let appliedTo = opt.target_scope === 'whole_pizza' 
      ? 'Pizza inteira' 
      : flavorNames[opt.target_scope] || 'Sabor específico';
    let explanation = '';

    switch (opt.calc_mode) {
      case 'sum_each_part':
        // Multiply price by number of parts
        calculatedPrice = opt.price * partsCount;
        explanation = `R$${opt.price.toFixed(2)} × ${partsCount} partes = R$${calculatedPrice.toFixed(2)}`;
        break;

      case 'proportional':
        // Price stays the same regardless of parts
        calculatedPrice = opt.price;
        explanation = `R$${opt.price.toFixed(2)} (proporcional, valor fixo)`;
        break;

      case 'pizza_total_split':
        // Price stays the same, but we show per-part breakdown for display
        calculatedPrice = opt.price;
        const perPart = opt.price / partsCount;
        explanation = `R$${opt.price.toFixed(2)} total (R$${perPart.toFixed(2)}/parte para referência)`;
        break;

      case 'max_part_value':
        // This is special - we need to find the max among all max_part_value optionals
        // Only add to total if this is the highest price in its group
        const maxGroup = byCalcMode.get('max_part_value') || [];
        const maxPrice = Math.max(...maxGroup.map(o => o.price));
        if (opt.price === maxPrice) {
          // Only charge for the highest one
          calculatedPrice = opt.price;
          explanation = `Maior valor entre as partes: R$${opt.price.toFixed(2)}`;
        } else {
          calculatedPrice = 0;
          explanation = `Não cobrado (outro adicional tem maior valor)`;
        }
        break;

      case 'per_flavor_part':
        // Price applied only to specific flavor's portion
        if (opt.target_scope === 'whole_pizza') {
          // If applied to whole pizza, use full price
          calculatedPrice = opt.price;
          explanation = `R$${opt.price.toFixed(2)} (aplicado na pizza inteira)`;
        } else {
          // If applied to specific flavor, divide by parts
          calculatedPrice = opt.price / partsCount;
          explanation = `R$${opt.price.toFixed(2)} ÷ ${partsCount} partes = R$${calculatedPrice.toFixed(2)} (só no sabor ${appliedTo})`;
        }
        break;

      default:
        calculatedPrice = opt.price;
        explanation = `R$${opt.price.toFixed(2)}`;
    }

    total += calculatedPrice;

    breakdown.push({
      item_label: opt.item_label,
      original_price: opt.price,
      calculated_price: calculatedPrice,
      calc_mode: opt.calc_mode,
      applied_to: appliedTo,
      explanation,
    });
  }

  return { total, breakdown };
}

/**
 * Format calculation mode for display
 */
export function formatCalcModeLabel(mode: OptionalCalcMode): string {
  const labels: Record<OptionalCalcMode, string> = {
    sum_each_part: 'Soma por parte',
    proportional: 'Proporcional',
    pizza_total_split: 'Total no item',
    max_part_value: 'Maior valor',
    per_flavor_part: 'Por sabor',
  };
  return labels[mode] || mode;
}

/**
 * Get short description for calculation mode
 */
export function getCalcModeDescription(mode: OptionalCalcMode): string {
  const descriptions: Record<OptionalCalcMode, string> = {
    sum_each_part: 'Valor é multiplicado pelo número de sabores',
    proportional: 'Valor fixo independente do número de sabores',
    pizza_total_split: 'Valor total, sistema mostra por parte',
    max_part_value: 'Cobra apenas o maior valor entre os sabores',
    per_flavor_part: 'Valor proporcional aplicado só no sabor escolhido',
  };
  return descriptions[mode] || '';
}
