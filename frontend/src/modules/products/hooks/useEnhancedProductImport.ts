import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import {
  parseCSVContent,
  readFileAsText,
  transforms,
} from '@/utils/importExportUtils';

// ─── Types ───

export interface ImportProduct {
  // === OLD TEMPLATE FIELDS (100% backward compatible) ===
  name: string;
  description?: string;
  price: number;
  category: string;
  subcategory?: string;
  sku?: string;
  stock?: number;
  status?: string;
  observations?: string;
  product_type?: string;
  optional_group?: string;
  // Old template extras
  internal_code?: string;
  ean_code?: string;
  ncm_code?: string;
  cfop_code?: string;
  cest_code?: string;
  tax_status?: string;
  origem?: string;
  unit?: string;
  cost?: number;
  composition?: string;
  is_weighted?: boolean;
  aparece_ifood?: boolean;
  aparece_delivery?: boolean;
  production_location?: string;

  // === NEW TEMPLATE FIELDS (extension) ===
  image_url?: string;
  multiple_image_urls?: string;
  is_pizza?: boolean;
  pizza_sizes?: string;
  pizza_flavors?: string;
  pizza_borders?: string;
  pizza_optionals?: string;
  allows_half?: boolean;
  price_by_size?: string;
  display_order?: number;
  visibility_status?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  product: ImportProduct;
  row: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationSummary {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
  newCategories: string[];
  newSubcategories: string[];
  imagesToDownload: number;
  duplicates: number;
  templateType: 'old' | 'new' | 'merged';
}

export interface ImportPhaseResult {
  imported: number;
  updated: number;
  errors: number;
  warnings: number;
  errorDetails: { product: string; error: string; row: number }[];
  warningDetails: { product: string; warning: string; row: number }[];
  products: { id: string; name: string }[];
  imageMap: Record<string, { productId: string; urls: string[] }>;
}

export interface ImageResult {
  originalUrl: string;
  publicUrl?: string;
  success: boolean;
  error?: string;
  productName: string;
}

export interface ImportReport {
  phase1: { summary: ValidationSummary; results: ValidationResult[] } | null;
  phase2: ImportPhaseResult | null;
  phase3: { results: ImageResult[]; summary: { total: number; success: number; failures: number } } | null;
}

export type ImportStep = 'upload' | 'preview' | 'importing' | 'report';

// ─── Column Header Mapping (unified: old + new, multilingual / flexible) ───

const COLUMN_ALIASES: Record<string, string[]> = {
  // OLD TEMPLATE COLUMNS (PT-BR headers)
  name: ['product_name', 'nome', 'nome do produto', 'name', 'produto'],
  category: ['category', 'categoria'],
  subcategory: ['subcategory', 'subcategoria'],
  price: ['price', 'preço', 'preco', 'valor', 'valor venda'],
  description: ['description', 'descrição', 'descricao'],
  sku: ['sku', 'código interno', 'codigo interno', 'cod interno', 'internal_code', 'codigo_sku'],
  stock: ['stock', 'estoque', 'qtd', 'quantidade'],
  status: ['status', 'situação', 'situacao', 'ativo'],
  observations: ['observacoes', 'observações', 'observations', 'obs'],
  product_type: ['tipo_produto', 'tipo produto', 'product_type', 'tipo'],
  optional_group: ['grupo_opcionais', 'grupo opcionais', 'optional_group', 'opcionais grupo'],
  ean_code: ['ean_code', 'código de barras', 'codigo de barras', 'ean', 'barcode'],
  ncm_code: ['ncm_code', 'ncm'],
  cfop_code: ['cfop_code', 'cfop'],
  cest_code: ['cest_code', 'cest'],
  tax_status: ['tax_status', 'tributação', 'tributacao'],
  origem: ['origem', 'origin'],
  unit: ['unidade', 'unit', 'un'],
  cost: ['valor custo', 'custo', 'cost', 'valor_custo'],
  composition: ['composition', 'composição', 'composicao', 'ingredientes'],
  is_weighted: ['is_weighted', 'produto pesado', 'pesado', 'peso'],
  aparece_ifood: ['aparece ifood', 'aparece_ifood', 'ifood'],
  aparece_delivery: ['aparece delivery', 'aparece_delivery'],
  production_location: ['local produção', 'local producao', 'production_location'],

  // NEW TEMPLATE COLUMNS
  image_url: ['image_url', 'imagem', 'imagem_url', 'image', 'foto', 'url_imagem', 'url_imagem_principal'],
  multiple_image_urls: ['multiple_image_urls', 'imagens', 'urls_imagens', 'fotos', 'urls_imagens_secundarias'],
  is_pizza: ['is_pizza', 'pizza', 'é pizza', 'e_pizza', 'eh_pizza'],
  pizza_sizes: ['pizza_sizes', 'tamanhos_pizza', 'tamanhos'],
  pizza_flavors: ['pizza_flavors', 'sabores_pizza', 'sabores'],
  pizza_borders: ['pizza_borders', 'bordas_pizza', 'bordas'],
  pizza_optionals: ['pizza_optionals', 'opcionais_pizza'],
  allows_half: ['permite_meio_a_meio', 'meio a meio', 'allows_half', 'half'],
  price_by_size: ['preco_por_tamanho', 'preço por tamanho', 'price_by_size'],
  display_order: ['ordem_exibicao', 'ordem exibição', 'display_order', 'ordem'],
  visibility_status: ['status_visibilidade', 'visibilidade', 'visibility_status'],
};

// OLD TEMPLATE UNIQUE HEADERS (used for auto-detection)
const OLD_ONLY_HEADERS = ['código interno', 'codigo interno', 'código de barras', 'codigo de barras', 'valor venda', 'valor custo', 'tributação', 'tributacao', 'local produção', 'local producao', 'aparece ifood'];
const NEW_ONLY_HEADERS = ['image_url', 'url_imagem', 'url_imagem_principal', 'is_pizza', 'eh_pizza', 'pizza_sizes', 'tamanhos_pizza', 'permite_meio_a_meio', 'preco_por_tamanho', 'ordem_exibicao', 'status_visibilidade'];

function detectTemplateType(headers: string[]): 'old' | 'new' | 'merged' {
  const normalized = headers.map(h => h.toLowerCase().trim());
  const hasOld = OLD_ONLY_HEADERS.some(oh => normalized.some(h => h.includes(oh) || oh.includes(h)));
  const hasNew = NEW_ONLY_HEADERS.some(nh => normalized.some(h => h.includes(nh) || nh.includes(h)));
  
  if (hasOld && hasNew) return 'merged';
  if (hasNew) return 'new';
  return 'old'; // Default to old for backward compatibility
}

function resolveColumnIndex(headers: string[], field: string): number {
  const aliases = COLUMN_ALIASES[field] || [field];
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[_\-\s]+/g, ' ').trim());
  
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
    const idx = normalizedHeaders.findIndex(h => h === normalizedAlias || h.includes(normalizedAlias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseBoolean(val: string): boolean {
  return ['true', 'sim', 'yes', '1', 's', 'x'].includes(val.toLowerCase().trim());
}

function parseRowToProduct(row: string[], headers: string[]): ImportProduct {
  const get = (field: string): string => {
    const idx = resolveColumnIndex(headers, field);
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };

  const priceStr = get('price');
  const price = transforms.toNumber(priceStr);

  const costStr = get('cost');
  const cost = costStr ? transforms.toNumber(costStr) : undefined;

  const stockStr = get('stock');
  const stock = stockStr ? transforms.toNumber(stockStr) : undefined;

  const displayOrderStr = get('display_order');
  const displayOrder = displayOrderStr ? transforms.toNumber(displayOrderStr) : undefined;

  return {
    // Old fields
    name: get('name'),
    description: get('description') || undefined,
    price: price ?? 0,
    category: get('category'),
    subcategory: get('subcategory') || undefined,
    sku: get('sku') || undefined,
    stock: stock ?? undefined,
    status: get('status') || undefined,
    observations: get('observations') || undefined,
    product_type: get('product_type') || undefined,
    optional_group: get('optional_group') || undefined,
    internal_code: get('sku') || undefined,
    ean_code: get('ean_code') || undefined,
    ncm_code: get('ncm_code') || undefined,
    cfop_code: get('cfop_code') || undefined,
    cest_code: get('cest_code') || undefined,
    tax_status: get('tax_status') || undefined,
    origem: get('origem') || undefined,
    unit: get('unit') || undefined,
    cost: cost ?? undefined,
    composition: get('composition') || undefined,
    is_weighted: get('is_weighted') ? parseBoolean(get('is_weighted')) : undefined,
    aparece_ifood: get('aparece_ifood') ? parseBoolean(get('aparece_ifood')) : undefined,
    aparece_delivery: get('aparece_delivery') ? parseBoolean(get('aparece_delivery')) : undefined,
    production_location: get('production_location') || undefined,

    // New fields
    image_url: get('image_url') || undefined,
    multiple_image_urls: get('multiple_image_urls') || undefined,
    is_pizza: get('is_pizza') ? parseBoolean(get('is_pizza')) : undefined,
    pizza_sizes: get('pizza_sizes') || undefined,
    pizza_flavors: get('pizza_flavors') || undefined,
    pizza_borders: get('pizza_borders') || undefined,
    pizza_optionals: get('pizza_optionals') || undefined,
    allows_half: get('allows_half') ? parseBoolean(get('allows_half')) : undefined,
    price_by_size: get('price_by_size') || undefined,
    display_order: displayOrder ?? undefined,
    visibility_status: get('visibility_status') || undefined,
  };
}

// ─── Unified Template download ───

export function downloadUnifiedProductsTemplate() {
  const BOM = '\uFEFF';
  const headers = [
    // Old fields
    'nome', 'categoria', 'subcategoria', 'preco', 'descricao',
    'codigo_sku', 'estoque', 'ativo', 'observacoes', 'tipo_produto', 'grupo_opcionais',
    // New fields
    'url_imagem_principal', 'urls_imagens_secundarias',
    'eh_pizza', 'tamanhos_pizza', 'sabores_pizza', 'bordas_pizza', 'opcionais_pizza',
    'permite_meio_a_meio', 'preco_por_tamanho', 'ordem_exibicao', 'status_visibilidade',
  ];
  const example = [
    'X-Burger Especial', 'Lanches', 'Hamburgueres', '29.90', 'Hambúrguer artesanal com cheddar',
    'XBURG001', '50', 'ativo', '', 'simples', '',
    'https://exemplo.com/xburger.jpg', '',
    'false', '', '', '', '',
    'false', '', '1', 'cardapio',
  ];
  const content = BOM + headers.join(';') + '\n' + example.join(';') + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template_produtos_unificado.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Keep old function name for backward compatibility
export const downloadEnhancedProductsTemplate = downloadUnifiedProductsTemplate;

// ─── Report export ───

export function exportImportReport(report: ImportReport) {
  const lines: string[] = [];
  lines.push('=== RELATÓRIO DE IMPORTAÇÃO ===');
  lines.push(`Data: ${new Date().toLocaleString('pt-BR')}`);
  lines.push('');

  if (report.phase1) {
    const s = report.phase1.summary;
    lines.push(`[VALIDAÇÃO] Total: ${s.total} | Válidos: ${s.valid} | Erros: ${s.errors} | Avisos: ${s.warnings}`);
    lines.push(`Template detectado: ${s.templateType === 'old' ? 'Clássico' : s.templateType === 'new' ? 'Novo' : 'Mesclado'}`);
    if (s.duplicates > 0) lines.push(`Duplicatas encontradas: ${s.duplicates} (serão atualizados)`);
    if (s.newCategories.length > 0) lines.push(`Novas categorias: ${s.newCategories.join(', ')}`);
    if (s.newSubcategories.length > 0) lines.push(`Novas subcategorias: ${s.newSubcategories.join(', ')}`);
    lines.push('');
  }

  if (report.phase2) {
    lines.push(`[IMPORTAÇÃO] Criados: ${report.phase2.imported} | Atualizados: ${report.phase2.updated || 0} | Erros: ${report.phase2.errors}`);
    for (const err of report.phase2.errorDetails) {
      lines.push(`  Linha ${err.row}: ${err.product} — ${err.error}`);
    }
    for (const warn of report.phase2.warningDetails) {
      lines.push(`  Aviso Linha ${warn.row}: ${warn.product} — ${warn.warning}`);
    }
    lines.push('');
  }

  if (report.phase3) {
    const s = report.phase3.summary;
    lines.push(`[IMAGENS] Total: ${s.total} | Sucesso: ${s.success} | Falhas: ${s.failures}`);
    for (const r of report.phase3.results.filter(r => !r.success)) {
      lines.push(`  ❌ ${r.productName}: ${r.error} (${r.originalUrl})`);
    }
  }

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_importacao_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportImportReportCSV(report: ImportReport) {
  const BOM = '\uFEFF';
  const rows: string[] = ['Fase;Linha;Produto;Tipo;Mensagem'];

  if (report.phase1) {
    for (const r of report.phase1.results) {
      for (const e of r.errors) {
        rows.push(`Validação;${r.row};${r.product.name};Erro;${e.message}`);
      }
      for (const w of r.warnings) {
        rows.push(`Validação;${r.row};${r.product.name};Aviso;${w.message}`);
      }
    }
  }

  if (report.phase2) {
    for (const e of report.phase2.errorDetails) {
      rows.push(`Importação;${e.row};${e.product};Erro;${e.error}`);
    }
    for (const w of report.phase2.warningDetails) {
      rows.push(`Importação;${w.row};${w.product};Aviso;${w.warning}`);
    }
  }

  if (report.phase3) {
    for (const r of report.phase3.results) {
      rows.push(`Imagens;;${r.productName};${r.success ? 'Sucesso' : 'Erro'};${r.success ? r.publicUrl : r.error}`);
    }
  }

  const content = BOM + rows.join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_importacao_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Main Hook ───

export function useEnhancedProductImport() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedProducts, setParsedProducts] = useState<ImportProduct[]>([]);
  const [detectedTemplate, setDetectedTemplate] = useState<'old' | 'new' | 'merged'>('old');
  const [report, setReport] = useState<ImportReport>({ phase1: null, phase2: null, phase3: null });

  // Parse CSV file client-side
  const parseFile = async (file: File): Promise<{ products: ImportProduct[]; templateType: 'old' | 'new' | 'merged' }> => {
    const content = await readFileAsText(file);
    const rows = parseCSVContent(content);

    if (rows.length < 2) {
      throw new Error('Arquivo vazio ou sem dados');
    }

    const headers = rows[0];
    const templateType = detectTemplateType(headers);
    const products: ImportProduct[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every(cell => !cell.trim())) continue; // skip empty rows
      products.push(parseRowToProduct(row, headers));
    }

    return { products, templateType };
  };

  // Phase 1: Validate (dry-run)
  const validateProducts = useMutation({
    mutationFn: async ({ products, templateType }: { products: ImportProduct[]; templateType: 'old' | 'new' | 'merged' }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('product-import-enhanced', {
        body: {
          action: 'validate',
          companyId: company.id,
          products,
          templateType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na validação');

      return data as {
        summary: ValidationSummary;
        results: ValidationResult[];
      };
    },
    onSuccess: (data) => {
      setReport(prev => ({ ...prev, phase1: data }));
      setStep('preview');
    },
    onError: (error: any) => {
      toast.error('Erro na validação: ' + error.message);
    },
  });

  // Phase 2: Import products
  const importProducts = useMutation({
    mutationFn: async (products: ImportProduct[]) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      setStep('importing');

      const { data, error } = await supabase.functions.invoke('product-import-enhanced', {
        body: {
          action: 'import',
          companyId: company.id,
          products,
          templateType: detectedTemplate,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na importação');

      return data as ImportPhaseResult;
    },
    onSuccess: async (data) => {
      setReport(prev => ({ ...prev, phase2: data }));

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });

      // Phase 3: Download images if any
      if (data.imageMap && Object.keys(data.imageMap).length > 0) {
        toast.info('Baixando imagens dos produtos...');
        await downloadImages.mutateAsync(data.imageMap);
      } else {
        setStep('report');
        const msg = [];
        if (data.imported > 0) msg.push(`${data.imported} criado(s)`);
        if ((data.updated || 0) > 0) msg.push(`${data.updated} atualizado(s)`);
        toast.success(msg.length > 0 ? `Importação concluída: ${msg.join(', ')}` : 'Nenhum produto importado');
      }
    },
    onError: (error: any) => {
      toast.error('Erro na importação: ' + error.message);
      setStep('report');
    },
  });

  // Phase 3: Download images
  const downloadImages = useMutation({
    mutationFn: async (imageMap: Record<string, { productId: string; urls: string[] }>) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('product-import-enhanced', {
        body: {
          action: 'download_images',
          companyId: company.id,
          products: [],
          createdProductImageMap: imageMap,
        },
      });

      if (error) throw error;
      return data as {
        results: ImageResult[];
        summary: { total: number; success: number; failures: number };
      };
    },
    onSuccess: (data) => {
      setReport(prev => ({ ...prev, phase3: data }));
      setStep('report');

      queryClient.invalidateQueries({ queryKey: ['products'] });

      if (data.summary.failures > 0) {
        toast.warning(`${data.summary.success} imagem(ns) baixada(s), ${data.summary.failures} falha(s)`);
      } else if (data.summary.success > 0) {
        toast.success(`${data.summary.success} imagem(ns) baixada(s) com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao baixar imagens: ' + error.message);
      setStep('report');
    },
  });

  // Orchestrate full flow
  const startImport = async (file: File) => {
    try {
      const { products, templateType } = await parseFile(file);
      if (products.length === 0) {
        toast.error('Nenhum produto encontrado no arquivo');
        return;
      }
      setParsedProducts(products);
      setDetectedTemplate(templateType);
      await validateProducts.mutateAsync({ products, templateType });
    } catch (error: any) {
      toast.error('Erro ao ler arquivo: ' + error.message);
    }
  };

  const confirmImport = async () => {
    if (parsedProducts.length === 0) return;
    // Only import valid products
    const validProducts = report.phase1
      ? parsedProducts.filter((_, i) => report.phase1!.results[i]?.valid)
      : parsedProducts;

    if (validProducts.length === 0) {
      toast.error('Nenhum produto válido para importar');
      return;
    }

    await importProducts.mutateAsync(validProducts);
  };

  const reset = () => {
    setStep('upload');
    setParsedProducts([]);
    setDetectedTemplate('old');
    setReport({ phase1: null, phase2: null, phase3: null });
  };

  return {
    step,
    parsedProducts,
    report,
    detectedTemplate,
    isValidating: validateProducts.isPending,
    isImporting: importProducts.isPending,
    isDownloadingImages: downloadImages.isPending,
    startImport,
    confirmImport,
    reset,
  };
}
