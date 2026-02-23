import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { WineProduct, PairingProduct, ProductTag, ConsumptionContext } from '../types';

// Fetch all wines (products with tag categoria:vinho)
export function useSommelierWines(companyId: string | undefined) {
  return useQuery({
    queryKey: ['sommelier_wines', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Get all products
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, price, image_url')
        .eq('company_id', companyId)
        .eq('active', true);

      if (error) throw error;

      console.log('[Sommelier] Products found:', products?.length);

      if (!products || products.length === 0) {
        console.log('[Sommelier] No products found for company:', companyId);
        return [];
      }

      // Get tags for these products
      const productIds = products.map(p => p.id);
      const { data: tags, error: tagsError } = await supabase
        .from('product_tags')
        .select('*')
        .in('product_id', productIds);

      if (tagsError) throw tagsError;

      console.log('[Sommelier] Tags found:', tags?.length);

      // Filter wines (products with categoria:vinho tag)
      const wines: WineProduct[] = products
        .filter((p) => (tags || []).some(
          (t) => t.product_id === p.id && t.tag_type === 'categoria' && t.tag_value === 'vinho'
        ))
        .map((p) => {
          const productTags = (tags || []).filter(t => t.product_id === p.id) as ProductTag[];
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image_url: p.image_url,
            tags: productTags,
            sensoryProfile: buildSensoryProfile(productTags),
            badge: getBadge(productTags),
          };
        });

      console.log('[Sommelier] Wines after filter:', wines.length, wines.map(w => w.name));

      return wines;
    },
    enabled: !!companyId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

// Fetch pairing products based on wine tags and context
export function useSommelierPairings(
  companyId: string | undefined,
  wineId: string | undefined,
  context: ConsumptionContext | null
) {
  return useQuery({
    queryKey: ['sommelier_pairings', companyId, wineId, context],
    queryFn: async () => {
      if (!companyId || !wineId || !context) return [];

      // Get all tags for the selected wine
      const { data: wineTags, error: wineTagsError } = await supabase
        .from('product_tags')
        .select('*')
        .eq('product_id', wineId);

      if (wineTagsError) throw wineTagsError;

      // Get pairing rules for this company
      const { data: rules, error: rulesError } = await supabase
        .from('sommelier_pairing_rules')
        .select('*')
        .eq('company_id', companyId)
        .or(`consumption_context.eq.${context},consumption_context.is.null`);

      if (rulesError) throw rulesError;

      // Get all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, price, image_url')
        .eq('company_id', companyId)
        .eq('active', true)
        .neq('id', wineId);

      if (productsError) throw productsError;

      // Get tags for all products
      const productIds = products.map(p => p.id);
      const { data: allTags, error: allTagsError } = await supabase
        .from('product_tags')
        .select('*')
        .in('product_id', productIds);

      if (allTagsError) throw allTagsError;

      // Filter products by context (local/viagem)
      const contextProducts = products.filter((p) => {
        const productTags = (allTags || []).filter(t => t.product_id === p.id);
        const consumoTag = productTags.find((t) => t.tag_type === 'consumo');
        if (!consumoTag) return false;
        return context === 'local' ? consumoTag.tag_value === 'local' : consumoTag.tag_value === 'viagem';
      });

      // Calculate match scores
      const pairings: PairingProduct[] = contextProducts.map((p) => {
        let matchScore = 0;
        const productTags = (allTags || []).filter(t => t.product_id === p.id);

        for (const rule of (rules || [])) {
          const wineMatch = (wineTags || []).some(
            (t) => t.tag_type === rule.wine_tag_type && t.tag_value === rule.wine_tag_value
          );
          const productMatch = productTags.some(
            (t) => t.tag_type === rule.pairing_tag_type && t.tag_value === rule.pairing_tag_value
          );
          if (wineMatch && productMatch) {
            matchScore += rule.weight;
          }
        }

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url,
          tags: productTags as ProductTag[],
          matchScore,
        };
      }).filter((p) => p.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);

      return pairings;
    },
    enabled: !!companyId && !!wineId && !!context,
  });
}

function buildSensoryProfile(tags: ProductTag[]): string {
  const parts: string[] = [];
  const tipo = tags.find((t) => t.tag_type === 'tipo');
  if (tipo) parts.push(tipo.tag_value.charAt(0).toUpperCase() + tipo.tag_value.slice(1));
  const corpo = tags.find((t) => t.tag_type === 'corpo');
  if (corpo) parts.push(corpo.tag_value);
  return parts.join(' • ');
}

function getBadge(tags: ProductTag[]): string | undefined {
  const highlight = tags.find((t) => t.tag_type === 'destaque');
  if (highlight) {
    switch (highlight.tag_value) {
      case 'sommelier_pick': return 'Escolha do Enólogo';
      case 'best_seller': return 'Mais Vendido';
      default: return undefined;
    }
  }
  return undefined;
}
