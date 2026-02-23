// Wine types for enhanced Sommelier module

// Tipos de vinho com cores das taças
export type WineType = 'tinto' | 'branco' | 'espumante' | 'rose';

export interface WineTypeOption {
  value: WineType;
  label: string;
  icon: string; // Emoji da taça
  color: string; // Cor CSS
}

export const WINE_TYPE_OPTIONS: WineTypeOption[] = [
  { value: 'tinto', label: 'Tinto', icon: '🍷', color: 'bg-red-700' },
  { value: 'branco', label: 'Branco', icon: '🥂', color: 'bg-amber-100' },
  { value: 'espumante', label: 'Espumante', icon: '🍾', color: 'bg-yellow-200' },
  { value: 'rose', label: 'Rosé', icon: '🌸', color: 'bg-pink-300' },
];

// Sabor/Corpo do vinho
export type WineBody = 'seco' | 'suave' | 'demi_sec' | 'fortificado';

export interface WineBodyOption {
  value: WineBody;
  label: string;
  icon: string;
  description: string;
}

export const WINE_BODY_OPTIONS: WineBodyOption[] = [
  { value: 'seco', label: 'Seco', icon: '🔥', description: 'Pouco ou nenhum açúcar residual' },
  { value: 'suave', label: 'Suave', icon: '🍯', description: 'Leve doçura, fácil de beber' },
  { value: 'demi_sec', label: 'Demi-Sec', icon: '🍬', description: 'Meio doce, equilibrado' },
  { value: 'fortificado', label: 'Fortificado / Sobremesa', icon: '🍫', description: 'Doce, ideal para sobremesas' },
];

// Nacionalidade com bandeiras
export interface WineCountry {
  code: string;
  name: string;
  flag: string;
}

export const WINE_COUNTRIES: WineCountry[] = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'FR', name: 'França', flag: '🇫🇷' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺' },
  { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
  { code: 'NZ', name: 'Nova Zelândia', flag: '🇳🇿' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
];

// Regiões com ícones
export interface WineRegion {
  key: string;
  name: string;
  country: string;
  icon: string;
}

export const WINE_REGIONS: WineRegion[] = [
  { key: 'vale_sao_francisco', name: 'Vale do São Francisco', country: 'BR', icon: '🌵' },
  { key: 'serra_gaucha', name: 'Serra Gaúcha', country: 'BR', icon: '⛰️' },
  { key: 'mendoza', name: 'Mendoza', country: 'AR', icon: '🏔️' },
  { key: 'maipo', name: 'Vale do Maipo', country: 'CL', icon: '🌿' },
  { key: 'bordeaux', name: 'Bordeaux', country: 'FR', icon: '🏰' },
  { key: 'borgonha', name: 'Borgonha', country: 'FR', icon: '🍇' },
  { key: 'champagne', name: 'Champagne', country: 'FR', icon: '✨' },
  { key: 'toscana', name: 'Toscana', country: 'IT', icon: '🌻' },
  { key: 'piemonte', name: 'Piemonte', country: 'IT', icon: '🌄' },
  { key: 'rioja', name: 'Rioja', country: 'ES', icon: '🌞' },
  { key: 'douro', name: 'Douro', country: 'PT', icon: '🚢' },
  { key: 'napa', name: 'Napa Valley', country: 'US', icon: '🌴' },
  { key: 'barossa', name: 'Barossa Valley', country: 'AU', icon: '🦘' },
];

// Tipos de uvas com ícones
export interface GrapeType {
  key: string;
  name: string;
  icon: string;
  wineTypes: WineType[];
  description: string;
}

export const GRAPE_TYPES: GrapeType[] = [
  { key: 'cabernet_sauvignon', name: 'Cabernet Sauvignon', icon: '🍇', wineTypes: ['tinto'], description: 'Encorpado, notas de cassis e cedro' },
  { key: 'merlot', name: 'Merlot', icon: '🍇', wineTypes: ['tinto'], description: 'Macio, frutas vermelhas maduras' },
  { key: 'malbec', name: 'Malbec', icon: '🍇', wineTypes: ['tinto'], description: 'Intenso, ameixa e chocolate' },
  { key: 'pinot_noir', name: 'Pinot Noir', icon: '🍇', wineTypes: ['tinto', 'rose'], description: 'Elegante, cereja e terra' },
  { key: 'syrah', name: 'Syrah / Shiraz', icon: '🍇', wineTypes: ['tinto'], description: 'Especiado, pimenta preta' },
  { key: 'carmenere', name: 'Carménère', icon: '🍇', wineTypes: ['tinto'], description: 'Aveludado, pimentão e cacau' },
  { key: 'tannat', name: 'Tannat', icon: '🍇', wineTypes: ['tinto'], description: 'Muito encorpado, taninos fortes' },
  { key: 'chardonnay', name: 'Chardonnay', icon: '🍈', wineTypes: ['branco', 'espumante'], description: 'Versátil, manteiga ou mineral' },
  { key: 'sauvignon_blanc', name: 'Sauvignon Blanc', icon: '🍈', wineTypes: ['branco'], description: 'Cítrico, herbáceo' },
  { key: 'riesling', name: 'Riesling', icon: '🍈', wineTypes: ['branco'], description: 'Aromático, mel e flores' },
  { key: 'moscato', name: 'Moscato', icon: '🍈', wineTypes: ['branco', 'espumante'], description: 'Doce, floral, baixo álcool' },
  { key: 'pinot_grigio', name: 'Pinot Grigio', icon: '🍈', wineTypes: ['branco'], description: 'Leve, fresco, cítrico' },
  { key: 'gewurztraminer', name: 'Gewürztraminer', icon: '🍈', wineTypes: ['branco'], description: 'Intenso, lichia e rosas' },
];

// Cálculo de quantidade de vinho
export const WINE_ML_PER_PERSON = 375; // ml por pessoa
export const WINE_BOTTLE_ML = 750; // ml por garrafa padrão

export function calculateWineQuantity(numPeople: number): {
  totalMl: number;
  bottles: number;
  recommendation: string;
} {
  const totalMl = numPeople * WINE_ML_PER_PERSON;
  const bottles = Math.ceil(totalMl / WINE_BOTTLE_ML);
  
  let recommendation: string;
  if (numPeople <= 2) {
    recommendation = `Para ${numPeople} pessoa${numPeople > 1 ? 's' : ''}, recomendo ${bottles} garrafa${bottles > 1 ? 's' : ''} (${totalMl}ml)`;
  } else if (numPeople <= 6) {
    recommendation = `Para um grupo de ${numPeople} pessoas, sugiro ${bottles} garrafas para garantir que todos apreciem bem`;
  } else {
    recommendation = `Para ${numPeople} convidados, o ideal são ${bottles} garrafas. Considere variedade: tintos e brancos!`;
  }
  
  return { totalMl, bottles, recommendation };
}

// Perfil ampliado do usuário
export interface EnhancedWineProfile {
  wineType?: WineType;
  body?: WineBody;
  grapePreference?: string; // AI vai sugerir
  countryPreference?: string; // AI vai sugerir
  regionPreference?: string; // AI vai sugerir
  numPeople?: number;
  occasion?: string;
}
