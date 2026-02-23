import { useQuery } from '@tanstack/react-query';
import { getProductTags } from '../services/tagService';
import { ProductTag } from '../types';

// SRP: this hook only fetches tags for a product.
export function useProductTags(productId: string | undefined) {
  return useQuery<ProductTag[]>({
    queryKey: ['product_tags', productId],
    queryFn: async () => {
      if (!productId) return [];
      return getProductTags(productId);
    },
    enabled: !!productId,
  });
}
