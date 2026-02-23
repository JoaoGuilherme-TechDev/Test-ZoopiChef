
import { useQuery } from '@tanstack/react-query';

// Types must be preserved for compilation
export interface DeliveryProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_featured: boolean;
  is_on_sale: boolean;
  sale_price: number | null;
  product_type?: string | null;
  has_flavors?: boolean;
  min_optional_price?: number | null;
  subcategory: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
}

export interface DeliveryCategory {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
    products: DeliveryProduct[];
  }[];
}

export interface DeliveryCompany {
  id: string;
  name: string;
  address: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  cover_banner_url: string | null;
  opening_hours: any;
  welcome_message: string | null;
  public_menu_layout: string | null;
  reservations_enabled: boolean;
  daily_menu_enabled: boolean;
  daily_menu_image_url: string | null;
  daily_menu_description: string | null;
}

export function useDeliveryMenu(companySlug: string) {
  return useQuery({
    queryKey: ['deliveryMenu', companySlug],
    queryFn: async () => {
      throw new Error('Supabase integration removed. Please migrate to Backend API.');
      
      // Return empty structure to satisfy TS if needed, but error is better to signal migration need.
      /*
      return {
        company: {} as DeliveryCompany,
        categories: [],
        featuredProducts: [],
        saleProducts: [],
        deliveryConfig: {},
        neighborhoods: [],
      };
      */
    },
    enabled: false, // Disable query
  });
}
