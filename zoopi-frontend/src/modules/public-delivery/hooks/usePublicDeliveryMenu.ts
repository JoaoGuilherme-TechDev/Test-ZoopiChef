import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DeliveryMenuResponse } from "../types";

export function usePublicDeliveryMenu(slug: string) {
  return useQuery({
    queryKey: ["public-menu", slug],
    queryFn: async () => {
      const response = await api.get<DeliveryMenuResponse>(`/public/menu/${slug}`);
      return response.data;
    },
    select: (data) => {
      // 1. Garante que products seja sempre um array, mesmo que venha nulo
      const allProducts = data.products || [];
      const deliveryProducts = allProducts.filter(p => p && p.aparece_delivery !== false);

      const getActivePrice = (product: any) => {
        if (!product) return 0;
        if (product.is_on_sale && product.sale_price) return Number(product.sale_price);
        // Pega o preço do array prices do Zoopi
        const basePrice = product.prices?.[0]?.price || 0;
        return Number(basePrice);
      };

      return {
        ...data,
        categories: data.categories || [],
        products: deliveryProducts.map(p => ({
          ...p,
          calculatedPrice: getActivePrice(p),
          hasPromotion: !!(p.is_on_sale && p.sale_price)
        })),
        featuredProducts: deliveryProducts.filter(p => p.featured === true),
        saleProducts: deliveryProducts.filter(p => p.is_on_sale === true),
        neighborhoods: data.neighborhoods || []
      };
    },
    enabled: !!slug,
  });
}