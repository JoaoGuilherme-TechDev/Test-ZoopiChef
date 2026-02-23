// Types for the Sommelier Virtual module (40 years experience)

export type ConsumptionContext = 'local' | 'takeaway';
export type WineIntensity = 'suave' | 'equilibrado' | 'intenso';
export type WineSweetness = 'seco' | 'meio_seco' | 'doce';
export type WineOccasion = 'jantar' | 'relaxar' | 'presente' | 'comemoracao';

// NEW: Sommelier approach mode
export type SommelierApproach = 'wine_first' | 'food_first';

// Sommelier step includes identification
export type SommelierStep = 'identification' | 'welcome' | 'approach' | 'context' | 'profile' | 'food_selection' | 'wines' | 'wine_detail' | 'pairing' | 'checkout';

// Customer info for sommelier session
export interface SommelierCustomerInfo {
  id?: string;
  phone: string;
  name: string;
  has_gluten_intolerance?: boolean;
  has_lactose_intolerance?: boolean;
  dietary_restrictions?: string[];
  allergy_notes?: string;
}

// NEW: Food categories for reverse pairing
export type FoodCategory = 
  | 'carnes_vermelhas' 
  | 'aves' 
  | 'peixes_frutos_mar' 
  | 'massas' 
  | 'queijos' 
  | 'saladas_leves'
  | 'sobremesas'
  | 'petiscos';

export interface FoodSelection {
  categories: FoodCategory[];
  details?: string; // Optional free text for specific dish
}

export const FOOD_CATEGORIES: { key: FoodCategory; label: string; icon: string; examples: string }[] = [
  { key: 'carnes_vermelhas', label: 'Carnes Vermelhas', icon: '🥩', examples: 'Picanha, Filé, Costela, Cordeiro' },
  { key: 'aves', label: 'Aves', icon: '🍗', examples: 'Frango, Peru, Pato, Codorna' },
  { key: 'peixes_frutos_mar', label: 'Peixes e Frutos do Mar', icon: '🐟', examples: 'Salmão, Camarão, Lula, Bacalhau' },
  { key: 'massas', label: 'Massas', icon: '🍝', examples: 'Lasanha, Espaguete, Ravioli, Risoto' },
  { key: 'queijos', label: 'Queijos', icon: '🧀', examples: 'Brie, Gorgonzola, Parmesão, Mussarela' },
  { key: 'saladas_leves', label: 'Saladas e Pratos Leves', icon: '🥗', examples: 'Salada Caesar, Carpaccio, Ceviche' },
  { key: 'sobremesas', label: 'Sobremesas', icon: '🍰', examples: 'Chocolate, Frutas, Tortas, Sorvete' },
  { key: 'petiscos', label: 'Petiscos e Aperitivos', icon: '🫒', examples: 'Azeitonas, Bruschetta, Tábua de frios' },
];

export interface WineProfile {
  intensity?: WineIntensity;
  sweetness?: WineSweetness;
  occasion?: WineOccasion;
}

export interface ProductTag {
  id: string;
  company_id: string;
  product_id: string;
  tag_type: string;
  tag_value: string;
  created_at: string;
}

export type CheckoutMode = 'suggestion' | 'totem' | 'qrcode_table';

export interface SommelierSettings {
  id: string;
  company_id: string;
  enabled: boolean;
  qr_code_enabled: boolean;
  totem_enabled: boolean;
  delivery_button_enabled: boolean;
  welcome_title: string;
  welcome_subtitle: string;
  context_question: string;
  max_suggestions: number;
  // Checkout settings
  checkout_mode: CheckoutMode;
  require_customer_phone: boolean;
  require_customer_name: boolean;
  print_ticket_enabled: boolean;
  ticket_header_text: string;
  created_at: string;
  updated_at: string;
}

export interface WineProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tags: ProductTag[];
  sensoryProfile?: string;
  badge?: string;
}

export interface PairingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tags: ProductTag[];
  matchScore: number;
  prepTip?: string; // Dica de preparo do Enólogo para harmonização
}

// Cart item with sommelier metadata
export interface SommelierCartItem {
  productId: string;
  quantity: number;
  sommelierSuggested?: boolean;
  sommelierWineId?: string;
  sommelierTip?: string;
}

// New types for proactive suggestions
export type PairingCategory = 'palate_cleanser' | 'starter' | 'main' | 'side' | 'dessert' | 'takeaway';

export interface CategorizedPairings {
  palateCleanser: PairingProduct[];
  starters: PairingProduct[];
  mains: PairingProduct[];
  sides: PairingProduct[];
  desserts: PairingProduct[];
  takeaway: PairingProduct[];
  avoidWith: string[];
}

export interface SommelierSuggestion {
  pairings: CategorizedPairings;
  sommelierTip: string;
  waterRecommendation: 'com_gas' | 'sem_gas' | null;
  waterReason: string;
  preSelectedIds: string[];
  kitDiscount: number;
  kitName: string | null;
  // New: separate pairings by match quality
  topSuggestions: PairingProduct[]; // Score > 10
  goodPairings: PairingProduct[];   // Score 5-10  
  otherOptions: PairingProduct[];   // Score < 5 or all remaining
}

export interface WineCarouselCategory {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export const WINE_CAROUSEL_CATEGORIES: WineCarouselCategory[] = [
  { key: 'sommelier_pick', label: 'Escolha do Enólogo', icon: '🍷', description: 'Selecionados especialmente' },
  { key: 'best_sellers', label: 'Mais Vendidos', icon: '🔥', description: 'Os preferidos dos clientes' },
  { key: 'customer_favorites', label: 'Preferidos dos Clientes', icon: '⭐', description: 'Avaliações excelentes' },
  { key: 'best_value', label: 'Melhor Custo-Benefício', icon: '💰', description: 'Ótima qualidade por um bom preço' },
  { key: 'gift', label: 'Para Presentear', icon: '🎁', description: 'Perfeitos para ocasiões especiais' },
];

export const INTENSITY_LABELS: Record<WineIntensity, string> = { suave: 'Suave', equilibrado: 'Equilibrado', intenso: 'Intenso' };
export const SWEETNESS_LABELS: Record<WineSweetness, string> = { seco: 'Seco', meio_seco: 'Meio Seco', doce: 'Doce' };
export const OCCASION_LABELS: Record<WineOccasion, string> = { jantar: 'Jantar', relaxar: 'Relaxar', presente: 'Presente', comemoracao: 'Comemoração' };

// Sommelier dynamic phrases based on wine type
export const SOMMELIER_PHRASES = {
  water: {
    tinto_encorpado: {
      recommendation: 'sem_gas' as const,
      reason: 'Para vinhos tintos encorpados, recomendo água SEM gás - preserva melhor a percepção dos taninos e não interfere na estrutura do vinho.',
    },
    tinto_leve: {
      recommendation: 'sem_gas' as const,
      reason: 'Água sem gás é ideal para acompanhar este tinto leve, mantendo o equilíbrio do paladar.',
    },
    branco: {
      recommendation: 'com_gas' as const,
      reason: 'Uma água COM gás complementa perfeitamente a acidez refrescante deste branco, limpando o paladar entre goles.',
    },
    rose: {
      recommendation: 'com_gas' as const,
      reason: 'Para rosés frescos, água com gás realça a experiência, combinando com sua leveza característica.',
    },
    espumante: {
      recommendation: 'sem_gas' as const,
      reason: 'Para espumantes, água SEM gás é essencial - não queremos competir com as borbulhas do vinho!',
    },
    default: {
      recommendation: 'sem_gas' as const,
      reason: 'Água mineral natural é sempre uma escolha segura para limpar o paladar entre os goles.',
    },
  },
  greetings: {
    local: [
      'Excelente escolha! Preparei a harmonização perfeita para você aproveitar aqui.',
      'Ótima seleção! Veja o que combina perfeitamente para uma experiência completa.',
      'Maravilha! Tenho sugestões especiais para tornar sua experiência inesquecível.',
    ],
    takeaway: [
      'Escolha impecável! Preparei sugestões para você harmonizar em casa.',
      'Ótimo gosto! Leve também estes acompanhamentos para uma experiência completa.',
      'Perfeito! Veja o que combina para você aproveitar quando quiser.',
    ],
  },
};