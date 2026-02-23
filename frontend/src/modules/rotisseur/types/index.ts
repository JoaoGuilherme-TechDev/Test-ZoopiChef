// Maître Rôtisseur Types
// Especialista em carnes para boutiques de carnes

// Métodos de preparo
export type CookingMethod = 'churrasco' | 'grelhado' | 'assado' | 'panela' | 'frigideira';

// Preferências de carne
export type MeatTexture = 'macia' | 'firme' | 'marmoreada';
export type MeatFlavor = 'suave' | 'intenso' | 'defumado';
export type MeatDoneness = 'mal_passada' | 'ao_ponto' | 'bem_passada';

// Ocasiões
export type MeatOccasion = 'familia' | 'churrasco_amigos' | 'jantar_especial' | 'dia_a_dia' | 'festa';

// Steps do fluxo
export type RotisseurStep = 
  | 'identification'
  | 'welcome' 
  | 'cooking_method' 
  | 'preferences'
  | 'occasion'
  | 'meat_selection' 
  | 'accompaniments' 
  | 'extras'
  | 'beverages'
  | 'quantity'
  | 'summary'
  | 'checkout';

// Customer info for the session
export interface RotisseurCustomerInfo {
  id?: string;
  phone: string;
  name: string;
  has_gluten_intolerance?: boolean;
  has_lactose_intolerance?: boolean;
  dietary_restrictions?: string[];
  allergy_notes?: string | null;
}

// Seleções do cliente
export interface MeatPreferences {
  texture?: MeatTexture;
  flavor?: MeatFlavor;
  doneness?: MeatDoneness;
  budget?: 'economico' | 'moderado' | 'premium';
}

export interface MeatProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  unit?: string; // 'kg', 'un', 'bandeja'
  subcategory_name?: string;
  tags: { tag_type: string; tag_value: string }[];
}

export interface SelectedMeat {
  product: MeatProduct;
  quantity: number; // em kg ou unidades
  aiReason?: string;
}

export interface SelectedAccompaniment {
  product: MeatProduct;
  quantity: number;
}

export interface SelectedExtra {
  product: MeatProduct;
  quantity: number;
}

export interface SelectedBeverage {
  product: MeatProduct;
  quantity: number;
}

// Sugestão da IA
export interface AIQuantitySuggestion {
  productId: string;
  productName: string;
  suggestedQuantity: number;
  unit: string;
  reason: string;
}

export interface AIMeatRecommendation {
  meatId: string;
  score: number;
  reason: string;
  servingTip?: string;
  idealDoneness?: string;
}

export interface AIRotisseurResponse {
  greeting: string;
  meatAnalysis: string;
  recommendations: AIMeatRecommendation[];
  accompanimentSuggestions: string[];
  servingTip: string;
  quantityPerPerson: {
    meat: number; // gramas
    accompaniment: number;
    extras: number;
  };
}

// Settings da empresa
export interface RotisseurSettings {
  company_id: string;
  is_enabled: boolean;
  welcome_title: string;
  welcome_subtitle: string;
  welcome_description: string;
  primary_color: string;
  accent_color: string;
  logo_url?: string;
  meat_category_ids: string[];
  accompaniment_category_ids: string[];
  extra_category_ids: string[];
  beverage_category_ids: string[];
  ai_personality: 'formal' | 'friendly' | 'expert';
}

// Sessão completa
export interface RotisseurSession {
  id?: string;
  company_id: string;
  session_token: string;
  status: 'active' | 'completed' | 'abandoned';
  
  // Preferências
  cooking_method?: CookingMethod;
  meat_preferences?: MeatPreferences;
  number_of_people?: number;
  occasion?: MeatOccasion;
  
  // Seleções
  selected_meats: SelectedMeat[];
  selected_accompaniments: SelectedAccompaniment[];
  selected_extras: SelectedExtra[];
  selected_beverages: SelectedBeverage[];
  
  // Sugestões IA
  ai_suggestions?: AIRotisseurResponse;
  ai_quantities?: AIQuantitySuggestion[];
  
  // Pedido
  order_id?: string;
  ticket_number?: string;
}

// Cart item para checkout
export interface RotisseurCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
  category: 'meat' | 'accompaniment' | 'extra' | 'beverage';
  aiSuggestion?: string;
}

// Constantes para UI
export const COOKING_METHODS: { id: CookingMethod; label: string; icon: string; description: string }[] = [
  { id: 'churrasco', label: 'Churrasco', icon: '🔥', description: 'Na brasa, espeto ou grelha' },
  { id: 'grelhado', label: 'Grelhado', icon: '🍖', description: 'Bisteca, grelhados rápidos' },
  { id: 'assado', label: 'Assado', icon: '🍗', description: 'Forno, assados de panela' },
  { id: 'panela', label: 'Cozido/Panela', icon: '🍲', description: 'Ensopados, carnes de panela' },
  { id: 'frigideira', label: 'Frigideira', icon: '🍳', description: 'Bifes, acebolados' },
];

export const MEAT_TEXTURES: { id: MeatTexture; label: string }[] = [
  { id: 'macia', label: 'Macia e suculenta' },
  { id: 'firme', label: 'Firme e consistente' },
  { id: 'marmoreada', label: 'Marmoreada (gordura entremeada)' },
];

export const MEAT_FLAVORS: { id: MeatFlavor; label: string }[] = [
  { id: 'suave', label: 'Sabor suave' },
  { id: 'intenso', label: 'Sabor intenso' },
  { id: 'defumado', label: 'Toque defumado' },
];

export const MEAT_DONENESS: { id: MeatDoneness; label: string }[] = [
  { id: 'mal_passada', label: 'Mal passada' },
  { id: 'ao_ponto', label: 'Ao ponto' },
  { id: 'bem_passada', label: 'Bem passada' },
];

export const OCCASIONS: { id: MeatOccasion; label: string; icon: string }[] = [
  { id: 'churrasco_amigos', label: 'Churrasco com amigos', icon: '🎉' },
  { id: 'familia', label: 'Almoço em família', icon: '👨‍👩‍👧‍👦' },
  { id: 'jantar_especial', label: 'Jantar especial', icon: '🍽️' },
  { id: 'dia_a_dia', label: 'Dia a dia', icon: '🏠' },
  { id: 'festa', label: 'Festa/Evento', icon: '🎊' },
];

export const BUDGET_OPTIONS = [
  { id: 'economico', label: 'Econômico', description: 'Cortes acessíveis e saborosos' },
  { id: 'moderado', label: 'Moderado', description: 'Bom custo-benefício' },
  { id: 'premium', label: 'Premium', description: 'Os melhores cortes' },
] as const;
