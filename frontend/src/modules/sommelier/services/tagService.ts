// Sommelier Product Tags Service - Single Source of Truth (SSOT) for tag operations
// Following SRP: This service handles only tag-related operations

import { supabase } from '@/lib/supabase-shim';
import { ProductTag } from '../types';

export interface CreateTagInput {
  company_id: string;
  product_id: string;
  tag_type: string;
  tag_value: string;
}

export interface TagFilter {
  tag_type?: string;
  tag_value?: string;
}

/**
 * Fetch all tags for a product
 */
export async function getProductTags(productId: string): Promise<ProductTag[]> {
  const { data, error } = await supabase
    .from('product_tags')
    .select('*')
    .eq('product_id', productId);

  if (error) throw error;
  return data as ProductTag[];
}

/**
 * Fetch tags for multiple products
 */
export async function getProductsTagsBulk(productIds: string[]): Promise<Map<string, ProductTag[]>> {
  if (productIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('product_tags')
    .select('*')
    .in('product_id', productIds);

  if (error) throw error;

  const tagsMap = new Map<string, ProductTag[]>();
  for (const tag of (data as ProductTag[])) {
    const existing = tagsMap.get(tag.product_id) || [];
    existing.push(tag);
    tagsMap.set(tag.product_id, existing);
  }
  return tagsMap;
}

/**
 * Add a tag to a product
 */
export async function addProductTag(input: CreateTagInput): Promise<ProductTag> {
  const { data, error } = await supabase
    .from('product_tags')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as ProductTag;
}

/**
 * Remove a tag from a product
 */
export async function removeProductTag(tagId: string): Promise<void> {
  const { error } = await supabase
    .from('product_tags')
    .delete()
    .eq('id', tagId);

  if (error) throw error;
}

/**
 * Update a tag value
 */
export async function updateProductTag(tagId: string, tagValue: string): Promise<void> {
  const { error } = await supabase
    .from('product_tags')
    .update({ tag_value: tagValue })
    .eq('id', tagId);

  if (error) throw error;
}

/**
 * Check if a product has a specific tag
 */
export function hasTag(tags: ProductTag[], tagType: string, tagValue?: string): boolean {
  return tags.some(
    (t) => t.tag_type === tagType && (tagValue === undefined || t.tag_value === tagValue)
  );
}

/**
 * Get tag value for a specific type
 */
export function getTagValue(tags: ProductTag[], tagType: string): string | undefined {
  const tag = tags.find((t) => t.tag_type === tagType);
  return tag?.tag_value;
}

/**
 * Filter products that match all specified tags
 */
export function filterByTags<T extends { tags: ProductTag[] }>(
  products: T[],
  filters: TagFilter[]
): T[] {
  return products.filter((product) =>
    filters.every((filter) =>
      product.tags.some(
        (t) =>
          t.tag_type === filter.tag_type &&
          (filter.tag_value === undefined || t.tag_value === filter.tag_value)
      )
    )
  );
}
