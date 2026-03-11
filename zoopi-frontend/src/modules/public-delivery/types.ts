import { Product, Category, Subcategory } from "@/modules/products/types";

// Extensão do tipo de produto para o contexto de Delivery Público
export interface PublicProduct extends Product {
  // O backend do Zoopi usa um array de prices, vamos garantir o acesso facilitado
  calculatedPrice: number;
  hasPromotion: boolean;
}

export interface NeighborhoodFee {
  id: string;
  neighborhood: string;
  fee: number;
  city?: string;
}

export interface DeliveryCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url?: string | null;
  address?: string;
  whatsapp: string;
  opening_hours?: any;
  welcome_message?: string;
  reservations_enabled?: boolean;
  theme_color?: string;
}

// Resposta completa do cardápio baseada no que o useDeliveryMenu espera
export interface DeliveryMenuResponse {
  company: DeliveryCompany;
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[]; // Lista bruta filtrada por aparece_delivery
  featuredProducts: Product[];
  saleProducts: Product[];
  neighborhoods: NeighborhoodFee[];
}

// Tipos para o Carrinho (Cart)
export interface SelectedOption {
  id: string;
  name: string;
  price: number;
  groupName: string;
}

export interface CartItem {
  cartItemId: string; // Identificador único (ID + Hash de opções)
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  options: SelectedOption[];
  notes?: string;
}