import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

interface DateFilters {
  startDate: string;
  endDate: string;
}

// Relatório de NCM
export interface NCMReportData {
  ncm_code: string;
  product_count: number;
  total_quantity_sold: number;
  total_value: number;
  percentage: number;
}

// Relatório de CFOP
export interface CFOPReportData {
  cfop_code: string;
  description: string;
  product_count: number;
  total_value: number;
  percentage: number;
}

// Relatório de Tributos por Produto
export interface ProductTaxData {
  product_id: string;
  product_name: string;
  ncm: string;
  cfop: string;
  total_sold: number;
  estimated_icms: number;
  estimated_pis: number;
  estimated_cofins: number;
  total_taxes: number;
}

// Resumo de Impostos Estimados
export interface TaxSummaryData {
  tax_type: string;
  base_value: number;
  estimated_rate: number;
  estimated_value: number;
}

// Conferência NCM
export interface NCMCheckData {
  product_id: string;
  product_name: string;
  category_name: string;
  ncm_code: string;
  cfop_code: string;
  has_ncm: boolean;
  has_cfop: boolean;
  status: 'ok' | 'warning' | 'error';
}

export function useNCMReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-ncm', company?.id, filters],
    queryFn: async (): Promise<NCMReportData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select('id, ncm_code')
        .eq('company_id', company.id);

      const ncmMap: Record<string, { count: number; qty: number; value: number }> = {};

      (items || []).forEach(item => {
        const product = products?.find(p => p.id === item.product_id);
        const ncm = product?.ncm_code || '00000000';

        if (!ncmMap[ncm]) {
          ncmMap[ncm] = { count: 0, qty: 0, value: 0 };
        }

        ncmMap[ncm].count += 1;
        ncmMap[ncm].qty += item.quantity || 0;
        ncmMap[ncm].value += (item.unit_price || 0) * (item.quantity || 0);
      });

      const totalValue = Object.values(ncmMap).reduce((sum, n) => sum + n.value, 0);

      return Object.entries(ncmMap).map(([ncm, data]) => ({
        ncm_code: ncm,
        product_count: data.count,
        total_quantity_sold: data.qty,
        total_value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      })).sort((a, b) => b.total_value - a.total_value);
    },
    enabled: !!company?.id,
  });
}

export function useCFOPReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-cfop', company?.id, filters],
    queryFn: async (): Promise<CFOPReportData[]> => {
      if (!company?.id) return [];

      const cfopDescriptions: Record<string, string> = {
        '5101': 'Venda de produção do estabelecimento',
        '5102': 'Venda de mercadoria adquirida',
        '5405': 'Venda de mercadoria sujeita ao ICMS-ST',
        '5933': 'Prestação de serviço tributado pelo ISS',
        '6102': 'Venda interestadual de mercadoria',
      };

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select('id, cfop_code')
        .eq('company_id', company.id);

      const cfopMap: Record<string, { count: number; value: number }> = {};

      (items || []).forEach(item => {
        const product = products?.find(p => p.id === item.product_id);
        const cfop = product?.cfop_code || '5102';

        if (!cfopMap[cfop]) {
          cfopMap[cfop] = { count: 0, value: 0 };
        }

        cfopMap[cfop].count += 1;
        cfopMap[cfop].value += (item.unit_price || 0) * (item.quantity || 0);
      });

      const totalValue = Object.values(cfopMap).reduce((sum, c) => sum + c.value, 0);

      return Object.entries(cfopMap).map(([cfop, data]) => ({
        cfop_code: cfop,
        description: cfopDescriptions[cfop] || 'Outros',
        product_count: data.count,
        total_value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      })).sort((a, b) => b.total_value - a.total_value);
    },
    enabled: !!company?.id,
  });
}

export function useTaxSummaryReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-tax-summary', company?.id, filters],
    queryFn: async (): Promise<TaxSummaryData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      const totalBase = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Estimativas baseadas em Simples Nacional (valores aproximados)
      const icmsRate = 3.5;
      const pisRate = 0.65;
      const cofinsRate = 3.0;

      return [
        { 
          tax_type: 'ICMS (estimado)', 
          base_value: totalBase, 
          estimated_rate: icmsRate, 
          estimated_value: totalBase * (icmsRate / 100) 
        },
        { 
          tax_type: 'PIS (estimado)', 
          base_value: totalBase, 
          estimated_rate: pisRate, 
          estimated_value: totalBase * (pisRate / 100) 
        },
        { 
          tax_type: 'COFINS (estimado)', 
          base_value: totalBase, 
          estimated_rate: cofinsRate, 
          estimated_value: totalBase * (cofinsRate / 100) 
        },
      ];
    },
    enabled: !!company?.id,
  });
}

export function useProductTaxReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-product-tax', company?.id, filters],
    queryFn: async (): Promise<ProductTaxData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select('id, ncm_code, cfop_code')
        .eq('company_id', company.id);

      // Taxas estimadas (Simples Nacional)
      const icmsRate = 0.035;
      const pisRate = 0.0065;
      const cofinsRate = 0.03;

      const productMap: Record<string, ProductTaxData> = {};

      (items || []).forEach(item => {
        const product = products?.find(p => p.id === item.product_id);

        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            ncm: product?.ncm_code || '',
            cfop: product?.cfop_code || '5102',
            total_sold: 0,
            estimated_icms: 0,
            estimated_pis: 0,
            estimated_cofins: 0,
            total_taxes: 0,
          };
        }

        const value = (item.unit_price || 0) * (item.quantity || 0);
        productMap[item.product_id].total_sold += value;

        const icms = value * icmsRate;
        const pis = value * pisRate;
        const cofins = value * cofinsRate;
        
        productMap[item.product_id].estimated_icms += icms;
        productMap[item.product_id].estimated_pis += pis;
        productMap[item.product_id].estimated_cofins += cofins;
        productMap[item.product_id].total_taxes += icms + pis + cofins;
      });

      return Object.values(productMap).sort((a, b) => b.total_sold - a.total_sold);
    },
    enabled: !!company?.id,
  });
}

export function useNCMCheckReport() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-ncm-check', company?.id],
    queryFn: async (): Promise<NCMCheckData[]> => {
      if (!company?.id) return [];

      const { data: products } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          ncm_code, 
          cfop_code,
          subcategory:subcategories(category:categories(name))
        `)
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      return (products || []).map(product => {
        const hasNcm = !!(product.ncm_code && product.ncm_code.length >= 8);
        const hasCfop = !!(product.cfop_code && product.cfop_code.length >= 4);
        
        let status: 'ok' | 'warning' | 'error' = 'ok';
        if (!hasNcm && !hasCfop) status = 'error';
        else if (!hasNcm || !hasCfop) status = 'warning';

        return {
          product_id: product.id,
          product_name: product.name,
          category_name: (product.subcategory as any)?.category?.name || 'Sem Categoria',
          ncm_code: product.ncm_code || '',
          cfop_code: product.cfop_code || '',
          has_ncm: hasNcm,
          has_cfop: hasCfop,
          status,
        };
      });
    },
    enabled: !!company?.id,
  });
}
