import { format } from 'date-fns';

export type SelectedOptionsJson = unknown;

const normalizeText = (text: string): string => text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

export const truncateEllipsis = (text: string, maxLen: number): string => {
  const clean = normalizeText(text);
  if (maxLen <= 0) return '';
  if (clean.length <= maxLen) return clean;
  if (maxLen === 1) return '…';
  return clean.slice(0, maxLen - 1) + '…';
};

export const formatMoneyBR = (value: number): string => {
  // Keep it predictable for printing (no locale-dependent spacing)
  const fixed = value.toFixed(2).replace('.', ',');
  return `R$ ${fixed}`;
};

export const formatMainLine = (params: {
  qty: number;
  name: string;
  price: number;
  lineLen?: number;
}): string => {
  const lineLen = params.lineLen ?? 42;
  const priceStr = formatMoneyBR(params.price);
  const leftRaw = `${params.qty}x ${normalizeText(params.name)}`;

  // Reserve: 1 space before price
  const leftMax = Math.max(0, lineLen - priceStr.length - 1);
  const left = truncateEllipsis(leftRaw, leftMax);
  return left.padEnd(leftMax, ' ') + ' ' + priceStr;
};

const parseSelectedOptions = (so: any): any | null => {
  if (!so) return null;
  if (typeof so === 'string') {
    try {
      return JSON.parse(so);
    } catch {
      return null;
    }
  }
  return so;
};

/**
 * Detect if groupName looks like a flavor/sabor group
 */
const isFlavorGroup = (groupName: string): boolean => {
  const n = groupName.toLowerCase();
  return n.includes('sabor') || n.includes('flavor') || n.includes('pizza');
};

/**
 * Detect if groupName looks like a border/borda group
 */
const isBorderGroup = (groupName: string): boolean => {
  const n = groupName.toLowerCase();
  return n.includes('borda') || n.includes('border') || n.includes('recheio');
};

/**
 * Detect if groupName looks like a beverage group
 */
const isBeverageGroup = (groupName: string): boolean => {
  const n = groupName.toLowerCase();
  return n.includes('bebida') || n.includes('refri') || n.includes('drink') || n.includes('suco');
};

/**
 * Extract ONLY the selected values from selected_options_json.
 * NEVER print the group names (questions like "Escolha o sabor").
 * 
 * Returns structured lines ready for printing.
 */
export const buildItemChildLines = (params: {
  selectedOptionsJson?: SelectedOptionsJson;
  notes?: string | null;
  childMaxLen?: number;
}): string[] => {
  const childMaxLen = params.childMaxLen ?? 38;
  const obj = parseSelectedOptions(params.selectedOptionsJson);
  const dedupe = new Set<string>();

  const flavors: string[] = [];
  const borders: string[] = [];
  const extras: string[] = [];
  const observations: string[] = [];

  const add = (bucket: string[], line: string) => {
    const key = normalizeText(line).toLowerCase();
    if (!key) return;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    bucket.push(truncateEllipsis(line, childMaxLen));
  };

  if (obj && typeof obj === 'object') {
    // Handle different formats of selected_options_json
    let groups: any[] = [];

    // Format 1: Array of groups with groupName/groupId and items
    // [{groupId, groupName, items: [{id, label, price, quantity}]}]
    if (Array.isArray(obj)) {
      groups = obj;
    }
    // Format 2: Object with selected_options array
    // {selected_options: [{group_id, group_name, items: [...]}]}
    else if (Array.isArray((obj as any).selected_options)) {
      groups = (obj as any).selected_options;
    }
    // Format 3: Pizza snapshot format
    // {pizza_snapshot: {selected_flavors: [...], selected_optionals: [...]}}
    else if ((obj as any).pizza_snapshot) {
      const pizza = (obj as any).pizza_snapshot;
      
      // Handle flavors
      if (Array.isArray(pizza.selected_flavors) && pizza.selected_flavors.length > 0) {
        const fraction = pizza.selected_flavors.length === 1 ? '1/1' : `1/${pizza.selected_flavors.length}`;
        pizza.selected_flavors.forEach((f: any) => {
          const name = normalizeText(f.name || f.label || '');
          if (name) {
            const removed = Array.isArray(f.removedIngredients) && f.removedIngredients.length > 0
              ? ` (sem ${f.removedIngredients.join(', ')})`
              : '';
            add(flavors, `${fraction} ${name}${removed}`);
          }
        });
      }
      
      // Handle optionals (borders, extras)
      if (Array.isArray(pizza.selected_optionals) && pizza.selected_optionals.length > 0) {
        pizza.selected_optionals.forEach((o: any) => {
          const label = normalizeText(o.item_label || o.label || o.name || '');
          if (label) {
            add(borders, `Borda ${label}`);
          }
        });
      }
    }

    // Process groups (Format 1 and 2)
    groups.forEach((g: any) => {
      // Get group name (camelCase or snake_case)
      const groupName = normalizeText(g.group_name || g.groupName || '');
      const items = Array.isArray(g.items) ? g.items : [];
      
      if (items.length === 0) return;

      // Determine what kind of group this is based on the group name
      const isFlavor = isFlavorGroup(groupName);
      const isBorder = isBorderGroup(groupName);
      const isBeverage = isBeverageGroup(groupName);

      if (isFlavor) {
        // For flavors: calculate fraction and list each one
        const fraction = items.length === 1 ? '1/1' : `1/${items.length}`;
        items.forEach((item: any) => {
          const label = normalizeText(item.label || item.name || '');
          if (label) {
            const removed = Array.isArray(item.removedIngredients) && item.removedIngredients.length > 0
              ? ` (sem ${item.removedIngredients.join(', ')})`
              : '';
            add(flavors, `${fraction} ${label}${removed}`);
          }
        });
      } else if (isBorder) {
        // For borders: just list the selected border
        items.forEach((item: any) => {
          const label = normalizeText(item.label || item.name || '');
          if (label) {
            add(borders, `Borda ${label}`);
          }
        });
      } else if (isBeverage) {
        // For beverages: show with quantity
        items.forEach((item: any) => {
          const label = normalizeText(item.label || item.name || '');
          if (label) {
            const qty = Number(item.quantity) || Number(item.qty) || 1;
            add(extras, `${qty}x ${label}`);
          }
        });
      } else {
        // For other optional groups: list items with quantity
        items.forEach((item: any) => {
          const label = normalizeText(item.label || item.name || '');
          if (label) {
            const qty = Number(item.quantity) || Number(item.qty) || 1;
            if (qty > 1) {
              add(extras, `${qty}x ${label}`);
            } else {
              add(extras, label);
            }
          }
        });
      }
    });
  }

  // Handle notes - parse legacy format if we don't have structured data yet
  if (params.notes) {
    const cleanNotes = normalizeText(params.notes);
    if (cleanNotes) {
      // Check if notes look like auto-generated option summaries
      // These typically have patterns like "Sabor:", "Borda:", "|" separators
      // Also catch typos like "Esolha" (missing 'c')
      const looksAutoGenerated = 
        cleanNotes.includes(' | ') ||
        /sabor|borda|bebida|escolh|esolh|selecione|qual\s/i.test(cleanNotes);
      
      const hasStructuredData = flavors.length > 0 || borders.length > 0 || extras.length > 0;
      
      // If we have auto-generated notes but NO structured data, try to parse them
      if (looksAutoGenerated && !hasStructuredData) {
        // Parse legacy format like: "Esolha o sabor: 1/2 Calabresa, 1/2 Mussarela | Borda: Cheddar"
        const parts = cleanNotes.split(' | ');
        for (const part of parts) {
          const colonIdx = part.indexOf(':');
          if (colonIdx === -1) continue;
          
          const groupPart = part.substring(0, colonIdx).toLowerCase();
          const valuePart = part.substring(colonIdx + 1).trim();
          
          // Determine what kind of group this is
          const isFlavor = /sabor|esolh|escolh/i.test(groupPart);
          const isBorder = /borda|recheio/i.test(groupPart);
          const isBeverage = /bebida|refri|drink/i.test(groupPart);
          
          if (isFlavor) {
            // Parse flavors like "1/2 Calabresa, 1/2 Mussarela"
            const flavorItems = valuePart.split(',').map(f => f.trim()).filter(Boolean);
            for (const f of flavorItems) {
              add(flavors, f);
            }
          } else if (isBorder) {
            // Parse borders like "1/1 Cheddar"
            const borderItems = valuePart.split(',').map(b => b.trim()).filter(Boolean);
            for (const b of borderItems) {
              // Clean up "1/1 " prefix if present
              const cleanBorder = b.replace(/^\d+\/\d+\s*/, '');
              if (cleanBorder) add(borders, `Borda ${cleanBorder}`);
            }
          } else if (isBeverage) {
            // Parse beverages
            const beverageItems = valuePart.split(',').map(b => b.trim()).filter(Boolean);
            for (const b of beverageItems) {
              add(extras, b);
            }
          }
        }
      }
      
      // NEVER add auto-generated notes (questions like "Escolha o sabor")
      // Only add notes if they are genuine customer observations
      if (!looksAutoGenerated) {
        add(observations, `OBS: ${cleanNotes}`);
      }
    }
  }

  // Final filter: remove any line that still looks like a question
  const isQuestionLabel = (text: string): boolean => {
    const lower = text.toLowerCase();
    return (
      lower.includes('escolha') ||
      lower.includes('esolha') ||
      lower.includes('selecione') ||
      lower.includes('qual ') ||
      lower.includes('?')
    );
  };

  const allLines = [...flavors, ...borders, ...extras, ...observations];
  return allLines.filter(line => !isQuestionLabel(line));
};

export const buildItemPrintBlock = (params: {
  qty: number;
  name: string;
  price: number;
  selectedOptionsJson?: SelectedOptionsJson;
  notes?: string | null;
  lineLen?: number;
  childMaxLen?: number;
}): string => {
  const lineLen = params.lineLen ?? 42;
  const main = formatMainLine({ qty: params.qty, name: params.name, price: params.price, lineLen });
  const children = buildItemChildLines({
    selectedOptionsJson: params.selectedOptionsJson,
    notes: params.notes,
    childMaxLen: params.childMaxLen ?? lineLen - 4,
  });

  const childLines = children.map((c) => `    ${c}`);
  return [main, ...childLines].join('\n');
};

/**
 * Build item lines in plain text format for production tickets.
 * Uses 6-space indentation for child lines (as per thermal printer spec).
 */
export const buildProductionItemLines = (params: {
  qty: number;
  name: string;
  selectedOptionsJson?: SelectedOptionsJson;
  notes?: string | null;
  lineLen?: number;
}): string[] => {
  const lineLen = params.lineLen ?? 48;
  const INDENT = '      '; // 6 spaces
  const lines: string[] = [];
  
  // Main item line in UPPERCASE (simulating bold)
  const mainLine = `${params.qty} X ${normalizeText(params.name).toUpperCase()}`;
  lines.push(truncateEllipsis(mainLine, lineLen));
  
  // Child lines (options/modifiers)
  const children = buildItemChildLines({
    selectedOptionsJson: params.selectedOptionsJson,
    notes: params.notes,
    childMaxLen: lineLen - INDENT.length,
  });
  
  children.forEach(child => {
    lines.push(INDENT + child.toUpperCase());
  });
  
  return lines;
};
