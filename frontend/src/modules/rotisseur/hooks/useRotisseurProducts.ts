import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import type { MeatProduct, RotisseurSettings } from "../types";

export function useRotisseurProducts(
  companyId: string | undefined,
  settings: RotisseurSettings | null
) {
  return useQuery({
    queryKey: ["rotisseur-products", companyId, settings?.meat_category_ids],
    queryFn: async () => {
      if (!companyId) return { meats: [], accompaniments: [], extras: [], beverages: [] };

      // Fetch all active products
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, subcategory_id, product_type")
        .eq("company_id", companyId)
        .eq("active", true);

      if (error) {
        console.error("Error fetching products:", error);
        return { meats: [], accompaniments: [], extras: [], beverages: [] };
      }

      // Fetch product tags
      const productIds = products?.map((p) => p.id) || [];
      const { data: allTags } = await supabase
        .from("product_tags")
        .select("product_id, tag_type, tag_value")
        .in("product_id", productIds);

      // Helper to transform products
      const transformProduct = (p: any): MeatProduct => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        image_url: p.image_url,
        unit: p.product_type === "kg" ? "kg" : "un",
        tags: (allTags || [])
          .filter((t) => t.product_id === p.id)
          .map((t) => ({ tag_type: t.tag_type, tag_value: t.tag_value })),
      });

      // Filter by category if settings available
      const meatCategoryIds = settings?.meat_category_ids || [];
      const accCategoryIds = settings?.accompaniment_category_ids || [];
      const extraCategoryIds = settings?.extra_category_ids || [];
      const bevCategoryIds = settings?.beverage_category_ids || [];

      // If no categories configured, try to detect by tags
      let meats: MeatProduct[] = [];
      let accompaniments: MeatProduct[] = [];
      let extras: MeatProduct[] = [];
      let beverages: MeatProduct[] = [];

      if (meatCategoryIds.length > 0) {
        meats = (products || [])
          .filter((p) => p.subcategory_id && meatCategoryIds.includes(p.subcategory_id))
          .map(transformProduct);
      } else {
        // Fallback: detect meats by tags
        meats = (products || [])
          .filter((p) => {
            const productTags = (allTags || []).filter((t) => t.product_id === p.id);
            return productTags.some(
              (t) =>
                t.tag_type === "categoria" &&
                ["carne", "carnes", "bovino", "suino", "frango", "aves"].includes(
                  t.tag_value.toLowerCase()
                )
            );
          })
          .map(transformProduct);
      }

      if (accCategoryIds.length > 0) {
        accompaniments = (products || [])
          .filter((p) => p.subcategory_id && accCategoryIds.includes(p.subcategory_id))
          .map(transformProduct);
      } else {
        // Fallback: detect accompaniments
        accompaniments = (products || [])
          .filter((p) => {
            const productTags = (allTags || []).filter((t) => t.product_id === p.id);
            return productTags.some(
              (t) =>
                t.tag_type === "categoria" &&
                ["acompanhamento", "linguica", "frango", "aves"].includes(
                  t.tag_value.toLowerCase()
                )
            );
          })
          .map(transformProduct);
      }

      if (extraCategoryIds.length > 0) {
        extras = (products || [])
          .filter((p) => p.subcategory_id && extraCategoryIds.includes(p.subcategory_id))
          .map(transformProduct);
      } else {
        // Fallback: detect extras (molhos, temperos)
        extras = (products || [])
          .filter((p) => {
            const productTags = (allTags || []).filter((t) => t.product_id === p.id);
            return productTags.some(
              (t) =>
                t.tag_type === "categoria" &&
                ["molho", "tempero", "pao", "extra"].includes(t.tag_value.toLowerCase())
            );
          })
          .map(transformProduct);
      }

      if (bevCategoryIds.length > 0) {
        beverages = (products || [])
          .filter((p) => p.subcategory_id && bevCategoryIds.includes(p.subcategory_id))
          .map(transformProduct);
      } else {
        // Fallback: detect beverages
        beverages = (products || [])
          .filter((p) => {
            const productTags = (allTags || []).filter((t) => t.product_id === p.id);
            return productTags.some(
              (t) =>
                t.tag_type === "categoria" &&
                ["bebida", "cerveja", "refrigerante", "agua"].includes(
                  t.tag_value.toLowerCase()
                )
            );
          })
          .map(transformProduct);
      }

      return { meats, accompaniments, extras, beverages };
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });
}
