/* eslint-disable @typescript-eslint/no-explicit-any */

export type ViewMode = "products" | "categories";
export type SortField = "name" | "price" | "category";
export type SortOrder = "asc" | "desc";

// --- Shared NestJS Product Types ---
export type ProductType = 'simple' | 'pizza' | 'combo' | 'additional';

export interface ProductPrice {
  id: string;
  label: string;
  price: string;
  delivery_price: string | null;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  type: ProductType;
  image_url: string | null;
  sku: string | null;
  internal_code: string | null;
  active: boolean;
  category_id?: string;
  categoryId?: string;
  category?: {id: string, name: string, color?: string | null};
  subcategory_id?: string;
  subcategory?: {
    id: string;
    name: string;
    category_id?: string;
  };
  prices: ProductPrice[];
  optionsGroups?: {
    group: {
      id: string;
      name: string;
      items: any[];
      min_qty: number;
      max_qty: number;
    };
  }[];
  is_on_sale?: boolean;
  sale_price?: string | number;
  wholesale_price?: string | number;
  wholesale_min_qty?: string | number;
  featured?: boolean; 
  aparece_delivery?: boolean;
}

// --- Category & Subcategory ---
export interface Category {
  id: string;
  name: string;
  active: boolean;
  image_url?: string | null;
  color?: string | null;
  order?: number;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  active: boolean;
  order?: number;
}

// --- Form States ---
export interface ProductFormData {
  name: string;
  display_name: string;
  description: string;
  sku: string;
  price: string | number;
  category_id: string;
  subcategory_id: string;
  type: ProductType;
  active: boolean;
  ncm: string;
  cest: string;
  unit: string;
  brand: string;
  ean: string;
  cost_price: string | number;
  profit_margin: string | number;
  loyalty_points: number;
  enologist_notes: string;
  featured: boolean;
  commission: boolean;
  production_location: string;
  aparece_delivery: boolean;
  aparece_garcom: boolean;
  aparece_totem: boolean;
  aparece_tablet: boolean;
  aparece_mesa: boolean;
  aparece_comanda: boolean;
  aparece_tv: boolean;
  aparece_self_service: boolean;
  display_on_tablet: boolean;
  composition: string;
  production_weight: string;
  is_weighted: boolean;
  tax_status: string;
  internal_code: string;
  is_on_sale: boolean;
  sale_price: string | number;
  wholesale_price: string | number;
  wholesale_min_qty: string | number;
  image_url: string | null;
  option_group_ids: string[];
}

export interface CategoryFormData {
  name: string;
  active: boolean;
  image_url: string | null;
  color: string | null;
}

export interface SubcategoryFormData {
  name: string;
  category_id: string;
  active: boolean;
}

// --- Templates ---
export interface TemplateProduct {
  name: string;
  price: number;
  description?: string;
  type?: ProductType;
}

export interface TemplateSubcategory {
  name: string;
  products: TemplateProduct[];
}

export interface TemplateCategory {
  name: string;
  subcategories: TemplateSubcategory[];
}

export interface Template {
  id: string;
  title: string;
  description: string;
  categories: TemplateCategory[];
}