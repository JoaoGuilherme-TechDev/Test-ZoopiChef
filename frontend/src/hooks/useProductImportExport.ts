import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { 
  parseCSVContent, 
  processImportData, 
  readFileAsText,
  transforms,
  validators,
  ColumnMapping,
  ImportResult,
  downloadTemplate,
  exportDataToCSV
} from '@/utils/importExportUtils';

// ============================================
// PRODUCTS IMPORT/EXPORT
// ============================================

export interface ProductImportRow {
  internal_code: string;
  ean_code: string | null;
  name: string;
  description: string | null;
  category: string;
  subcategory: string;
  unit: string;
  price: number;
  cost: number | null;
  stock: number | null;
  // Campos Fiscais
  ncm_code: string | null;
  cfop_code: string | null;
  cest_code: string | null;
  tax_status: string | null;
  origem: string | null;
  // Campos de Controle
  is_weighted: boolean | null;
  aparece_ifood: boolean | null;
  aparece_delivery: boolean | null;
  production_location: string | null;
}

const PRODUCT_MAPPINGS: ColumnMapping[] = [
  { 
    header: 'Código Interno', 
    field: 'internal_code', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Código de Barras', 
    field: 'ean_code', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Nome', 
    field: 'name', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Descrição', 
    field: 'description', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Categoria', 
    field: 'category', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Subcategoria', 
    field: 'subcategory', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Unidade', 
    field: 'unit', 
    required: false,
    transform: (v) => v || 'UN',
  },
  { 
    header: 'Valor Venda', 
    field: 'price', 
    required: true,
    transform: transforms.toNumber,
    validate: validators.positiveNumber,
  },
  { 
    header: 'Valor Custo', 
    field: 'cost', 
    required: false,
    transform: transforms.toNumber,
    validate: validators.positiveNumber,
  },
  { 
    header: 'Estoque', 
    field: 'stock', 
    required: false,
    transform: transforms.toNumber,
  },
  // Campos Fiscais
  { 
    header: 'NCM', 
    field: 'ncm_code', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'CFOP', 
    field: 'cfop_code', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'CEST', 
    field: 'cest_code', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Tributação', 
    field: 'tax_status', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Origem', 
    field: 'origem', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  // Campos de Controle
  { 
    header: 'Produto Pesado', 
    field: 'is_weighted', 
    required: false,
    transform: transforms.toBoolean,
  },
  { 
    header: 'Aparece iFood', 
    field: 'aparece_ifood', 
    required: false,
    transform: transforms.toBoolean,
  },
  { 
    header: 'Aparece Delivery', 
    field: 'aparece_delivery', 
    required: false,
    transform: transforms.toBoolean,
  },
  { 
    header: 'Local Produção', 
    field: 'production_location', 
    required: false,
    transform: transforms.toStringOrNull,
  },
];

export function useImportProducts() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const content = await readFileAsText(file);
      const rows = parseCSVContent(content);
      const result = processImportData<ProductImportRow>(rows, PRODUCT_MAPPINGS);

      if (result.success.length === 0) {
        return result;
      }

      // Fetch existing categories and subcategories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('company_id', company.id);

      const { data: subcategories } = await supabase
        .from('subcategories')
        .select('id, name, category_id')
        .eq('company_id', company.id);

      const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]));
      const subcategoryMap = new Map(
        subcategories?.map(s => [`${s.category_id}:${s.name.toLowerCase()}`, s.id])
      );

      const productsToInsert: any[] = [];
      const newCategories: Map<string, string> = new Map();
      const newSubcategories: Map<string, { name: string; categoryId: string }> = new Map();

      // First pass: identify missing categories and subcategories
      for (const item of result.success) {
        const catKey = item.category.toLowerCase();
        if (!categoryMap.has(catKey) && !newCategories.has(catKey)) {
          newCategories.set(catKey, item.category);
        }
      }

      // Create missing categories
      if (newCategories.size > 0) {
        const { data: createdCats } = await supabase
          .from('categories')
          .insert(
            Array.from(newCategories.values()).map(name => ({
              company_id: company.id,
              name,
              active: true,
            }))
          )
          .select('id, name');

        createdCats?.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));
      }

      // Second pass: identify missing subcategories
      for (const item of result.success) {
        const catId = categoryMap.get(item.category.toLowerCase());
        if (!catId) continue;

        const subKey = `${catId}:${item.subcategory.toLowerCase()}`;
        if (!subcategoryMap.has(subKey) && !newSubcategories.has(subKey)) {
          newSubcategories.set(subKey, { name: item.subcategory, categoryId: catId });
        }
      }

      // Create missing subcategories
      if (newSubcategories.size > 0) {
        const { data: createdSubs } = await supabase
          .from('subcategories')
          .insert(
            Array.from(newSubcategories.values()).map(({ name, categoryId }) => ({
              company_id: company.id,
              category_id: categoryId,
              name,
              active: true,
            }))
          )
          .select('id, name, category_id');

        createdSubs?.forEach(s => 
          subcategoryMap.set(`${s.category_id}:${s.name.toLowerCase()}`, s.id)
        );
      }

      // Build products to insert
      for (let i = 0; i < result.success.length; i++) {
        const item = result.success[i];
        const catId = categoryMap.get(item.category.toLowerCase());
        if (!catId) {
          result.errors.push({
            row: i + 2,
            field: 'Categoria',
            value: item.category,
            message: 'Categoria não encontrada',
          });
          continue;
        }

        const subKey = `${catId}:${item.subcategory.toLowerCase()}`;
        const subId = subcategoryMap.get(subKey);
        if (!subId) {
          result.errors.push({
            row: i + 2,
            field: 'Subcategoria',
            value: item.subcategory,
            message: 'Subcategoria não encontrada',
          });
          continue;
        }

        productsToInsert.push({
          company_id: company.id,
          subcategory_id: subId,
          name: item.name,
          description: item.description,
          price: item.price ?? 0,
          internal_code: item.internal_code,
          ean_code: item.ean_code,
          // Campos Fiscais
          ncm_code: item.ncm_code,
          cfop_code: item.cfop_code,
          cest_code: item.cest_code,
          tax_status: item.tax_status,
          origem: item.origem,
          // Campos de Controle
          is_weighted: item.is_weighted ?? false,
          aparece_ifood: item.aparece_ifood ?? true,
          aparece_delivery: item.aparece_delivery ?? true,
          production_location: item.production_location,
          active: true,
        });
      }

      if (productsToInsert.length > 0) {
        const { error } = await supabase
          .from('products')
          .insert(productsToInsert);

        if (error) throw error;
      }

      return {
        ...result,
        inserted: productsToInsert.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      
      const insertedCount = 'inserted' in data ? data.inserted : data.success.length;
      if (data.errors.length > 0) {
        toast.warning(`Importação parcial: ${insertedCount || 0} produtos importados, ${data.errors.length} erros`);
      } else {
        toast.success(`${insertedCount || 0} produtos importados com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao importar produtos: ' + error.message);
    },
  });
}

export function useExportProducts() {
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategory:subcategories(
            name,
            category:categories(name)
          )
        `)
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      const columns = [
        { key: 'internal_code', header: 'Código Interno' },
        { key: 'ean_code', header: 'Código de Barras' },
        { key: 'name', header: 'Nome' },
        { key: 'description', header: 'Descrição' },
        { key: 'category_name', header: 'Categoria' },
        { key: 'subcategory_name', header: 'Subcategoria' },
        { key: 'unit', header: 'Unidade' },
        { 
          key: 'price', 
          header: 'Valor Venda',
          format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00',
        },
        { 
          key: 'cost', 
          header: 'Valor Custo',
          format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00',
        },
        { key: 'stock', header: 'Estoque' },
        // Campos Fiscais
        { key: 'ncm_code', header: 'NCM' },
        { key: 'cfop_code', header: 'CFOP' },
        { key: 'cest_code', header: 'CEST' },
        { key: 'tax_status', header: 'Tributação' },
        { key: 'origem', header: 'Origem' },
        // Campos de Controle
        { 
          key: 'is_weighted', 
          header: 'Produto Pesado',
          format: (v: boolean) => v ? 'Sim' : 'Não',
        },
        { 
          key: 'aparece_ifood', 
          header: 'Aparece iFood',
          format: (v: boolean) => v ? 'Sim' : 'Não',
        },
        { 
          key: 'aparece_delivery', 
          header: 'Aparece Delivery',
          format: (v: boolean) => v ? 'Sim' : 'Não',
        },
        { key: 'production_location', header: 'Local Produção' },
      ];

      const data = products?.map((p: any) => ({
        ...p,
        category_name: p.subcategory?.category?.name || '',
        subcategory_name: p.subcategory?.name || '',
        unit: 'UN',
        cost: 0,
        stock: 0,
      })) || [];

      exportDataToCSV(data, columns, 'produtos_exportados');

      return { count: data.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} produtos exportados com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao exportar produtos: ' + error.message);
    },
  });
}

export function downloadProductsTemplate() {
  downloadTemplate('template_produtos', [
    'Código Interno',
    'Código de Barras',
    'Nome',
    'Descrição',
    'Categoria',
    'Subcategoria',
    'Unidade',
    'Valor Venda',
    'Valor Custo',
    'Estoque',
    // Campos Fiscais
    'NCM',
    'CFOP',
    'CEST',
    'Tributação',
    'Origem',
    // Campos de Controle
    'Produto Pesado',
    'Aparece iFood',
    'Aparece Delivery',
    'Local Produção',
  ]);
}

// ============================================
// FLAVORS IMPORT/EXPORT
// ============================================

export interface FlavorImportRow {
  code: string | null;
  name: string;
  description: string | null;
  highlight: string | null;
}

const FLAVOR_MAPPINGS: ColumnMapping[] = [
  { 
    header: 'Código', 
    field: 'code', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Nome', 
    field: 'name', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Descrição', 
    field: 'description', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Destaque', 
    field: 'highlight', 
    required: false,
    transform: transforms.toStringOrNull,
  },
];

export function useImportFlavors() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const content = await readFileAsText(file);
      const rows = parseCSVContent(content);
      const result = processImportData<FlavorImportRow>(rows, FLAVOR_MAPPINGS);

      if (result.success.length === 0) {
        return result;
      }

      const flavorsToInsert = result.success.map(item => ({
        company_id: company.id,
        name: item.name,
        description: item.description,
        ingredients_raw: item.description,
        highlight_group: item.highlight,
        active: true,
        usage_type: 'ambos' as const,
      }));

      const { error } = await supabase
        .from('flavors')
        .insert(flavorsToInsert);

      if (error) throw error;

      return {
        ...result,
        inserted: flavorsToInsert.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flavors'] });
      
      const insertedCount = 'inserted' in data ? data.inserted : data.success.length;
      if (data.errors.length > 0) {
        toast.warning(`Importação parcial: ${insertedCount || 0} sabores importados, ${data.errors.length} erros`);
      } else {
        toast.success(`${insertedCount || 0} sabores importados com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao importar sabores: ' + error.message);
    },
  });
}

export function useExportFlavors() {
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data: flavors, error } = await supabase
        .from('flavors')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      const columns = [
        { key: 'id', header: 'Código' },
        { key: 'name', header: 'Nome' },
        { key: 'ingredients_raw', header: 'Descrição' },
        { key: 'highlight_group', header: 'Destaque' },
      ];

      exportDataToCSV(flavors || [], columns, 'sabores_exportados');

      return { count: flavors?.length || 0 };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} sabores exportados com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao exportar sabores: ' + error.message);
    },
  });
}

export function downloadFlavorsTemplate() {
  downloadTemplate('template_sabores', [
    'Código',
    'Nome',
    'Descrição',
    'Destaque',
  ]);
}
