/**
 * Parses pizza_snapshot from selected_options_json to extract structured pizza data.
 * Used by KDS cards to display pizza configuration details.
 */

export interface ParsedPizzaFlavor {
  name: string;
  removedIngredients: string[];
  observation?: string;
}

export interface ParsedPizzaOptional {
  groupName: string;
  label: string;
  price?: number;
}

export interface ParsedPizzaData {
  size: string | null;
  doughType: string | null;
  borderName: string | null;
  borderType: string | null;
  flavors: ParsedPizzaFlavor[];
  optionals: ParsedPizzaOptional[];
  observations: string | null;
}

export function parsePizzaSnapshot(selectedOptionsJson: unknown): ParsedPizzaData | null {
  if (!selectedOptionsJson) return null;

  let obj = selectedOptionsJson;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch { return null; }
  }

  if (typeof obj !== 'object' || obj === null) return null;

  const pizza = (obj as any).pizza_snapshot;
  if (!pizza) return null;

  // Extract size
  const size = pizza.size || null;

  // Extract dough type
  const doughType = pizza.selected_dough_type?.name || pizza.selected_dough_type || null;

  // Extract border
  let borderName: string | null = null;
  let borderType: string | null = null;
  
  if (pizza.selected_border) {
    borderName = pizza.selected_border.name || null;
    borderType = pizza.selected_border_type?.name || pizza.selected_border_type || null;
  }

  // Extract flavors
  const flavors: ParsedPizzaFlavor[] = [];
  if (Array.isArray(pizza.selected_flavors)) {
    pizza.selected_flavors.forEach((f: any) => {
      const name = (f.name || f.label || '').trim();
      if (name) {
        flavors.push({
          name,
          removedIngredients: Array.isArray(f.removedIngredients) ? f.removedIngredients : [],
          observation: f.observation || undefined,
        });
      }
    });
  }

  // Extract optionals
  const optionals: ParsedPizzaOptional[] = [];
  if (Array.isArray(pizza.selected_optionals)) {
    pizza.selected_optionals.forEach((o: any) => {
      const label = (o.item_label || o.label || o.name || '').trim();
      if (label) {
        optionals.push({
          groupName: o.group_name || '',
          label,
          price: o.price,
        });
      }
    });
  }

  // Only return if we actually found pizza data
  if (!size && !doughType && flavors.length === 0) return null;

  return {
    size,
    doughType,
    borderName,
    borderType,
    flavors,
    optionals,
    observations: null, // Observations come from item.notes, handled by caller
  };
}
