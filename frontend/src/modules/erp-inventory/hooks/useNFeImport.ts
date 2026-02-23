import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { NFeParseResult, NFeImport, NFeParsedItem, SupplierProductLink } from '../types/nfe';

export function useNFeImport() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch pending NF-e imports
  const importsQuery = useQuery({
    queryKey: ['nfe-imports', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_nfe_imports')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NFeImport[];
    },
    enabled: !!company?.id,
  });

  // Fetch supplier product links
  const linksQuery = useQuery({
    queryKey: ['supplier-product-links', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_supplier_product_links')
        .select(`
          *,
          erp_item:erp_items(id, name)
        `)
        .eq('company_id', company.id);
      if (error) throw error;
      return data as SupplierProductLink[];
    },
    enabled: !!company?.id,
  });

  // Parse XML and get suggestions
  const parseXML = async (xmlContent: string): Promise<NFeParseResult> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('nfe-parse-xml', {
        body: { xmlContent, suggestWithAI: true },
      });

      if (error) throw error;
      if (data.error) {
        if (data.existing_id) {
          throw new Error(`NF-e já importada (${data.status})`);
        }
        throw new Error(data.error);
      }

      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      return data as NFeParseResult;
    } finally {
      setIsProcessing(false);
    }
  };

  // Update item link in import
  const updateItemLink = useMutation({
    mutationFn: async ({
      importId,
      itemIndex,
      erpItemId,
      erpItemName,
    }: {
      importId: string;
      itemIndex: number;
      erpItemId: string;
      erpItemName: string;
    }) => {
      // Get current import
      const { data: current, error: fetchError } = await (supabase as any)
        .from('erp_nfe_imports')
        .select('items_json')
        .eq('id', importId)
        .single();

      if (fetchError) throw fetchError;

      // Update the item
      const items = [...(current.items_json as NFeParsedItem[])];
      items[itemIndex] = {
        ...items[itemIndex],
        linked_erp_item_id: erpItemId,
        linked_erp_item_name: erpItemName,
        link_source: 'manual',
      };

      // Save back
      const { error } = await (supabase as any)
        .from('erp_nfe_imports')
        .update({ items_json: items })
        .eq('id', importId);

      if (error) throw error;
      return { importId, items };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao vincular item: ' + err.message);
    },
  });

  // Create new ERP item from NF-e item
  const createItemFromNFe = useMutation({
    mutationFn: async ({
      importId,
      itemIndex,
      nfeItem,
      itemType,
      baseUnitId,
    }: {
      importId: string;
      itemIndex: number;
      nfeItem: NFeParsedItem;
      itemType: string;
      baseUnitId?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Create ERP item
      const { data: newItem, error: createError } = await (supabase as any)
        .from('erp_items')
        .insert({
          company_id: company.id,
          name: nfeItem.xProd,
          sku: nfeItem.cProd,
          item_type: itemType,
          base_unit_id: baseUnitId || null,
          track_stock: true,
          min_stock: 0,
          current_stock: 0,
          avg_cost: nfeItem.vUnCom,
          last_cost: nfeItem.vUnCom,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update the import item link
      const { data: current } = await (supabase as any)
        .from('erp_nfe_imports')
        .select('items_json, supplier_cnpj')
        .eq('id', importId)
        .single();

      const items = [...(current.items_json as NFeParsedItem[])];
      items[itemIndex] = {
        ...items[itemIndex],
        linked_erp_item_id: newItem.id,
        linked_erp_item_name: newItem.name,
        link_source: 'manual',
      };

      await (supabase as any)
        .from('erp_nfe_imports')
        .update({ items_json: items })
        .eq('id', importId);

      // Create the supplier link for future imports
      await (supabase as any)
        .from('erp_supplier_product_links')
        .insert({
          company_id: company.id,
          supplier_cnpj: current.supplier_cnpj,
          supplier_product_code: nfeItem.cProd,
          supplier_product_name: nfeItem.xProd,
          supplier_ean: nfeItem.cEAN || null,
          erp_item_id: newItem.id,
        });

      return { newItem, importId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-product-links'] });
      toast.success('Item criado e vinculado!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar item: ' + err.message);
    },
  });

  // Save link for future imports
  const saveSupplierLink = useMutation({
    mutationFn: async ({
      supplierCnpj,
      supplierId,
      productCode,
      productName,
      ean,
      erpItemId,
    }: {
      supplierCnpj: string;
      supplierId?: string;
      productCode: string;
      productName: string;
      ean?: string;
      erpItemId: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await (supabase as any)
        .from('erp_supplier_product_links')
        .upsert({
          company_id: company.id,
          supplier_id: supplierId || null,
          supplier_cnpj: supplierCnpj,
          supplier_product_code: productCode,
          supplier_product_name: productName,
          supplier_ean: ean || null,
          erp_item_id: erpItemId,
        }, {
          onConflict: 'company_id,supplier_cnpj,supplier_product_code',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-product-links'] });
      toast.success('Vínculo salvo para próximas notas!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao salvar vínculo: ' + err.message);
    },
  });

  // Confirm import and create purchase entry
  const confirmImport = useMutation({
    mutationFn: async (importId: string) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      // Get import data
      const { data: nfeImport, error: fetchError } = await (supabase as any)
        .from('erp_nfe_imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (fetchError) throw fetchError;

      const items = nfeImport.items_json as NFeParsedItem[];
      const unlinkedItems = items.filter(i => !i.linked_erp_item_id);
      
      if (unlinkedItems.length > 0) {
        throw new Error(`Ainda há ${unlinkedItems.length} item(s) sem vínculo`);
      }

      // Create purchase entry
      const { data: entry, error: entryError } = await (supabase as any)
        .from('erp_purchase_entries')
        .insert({
          company_id: company.id,
          supplier_id: nfeImport.supplier_id,
          entry_date: nfeImport.issue_date,
          invoice_number: nfeImport.invoice_number,
          freight: nfeImport.freight_value || 0,
          taxes: 0,
          status: 'draft',
          notes: `Importado da NF-e ${nfeImport.invoice_number} - Chave: ${nfeImport.access_key}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create entry items
      const entryItems = items.map(item => ({
        company_id: company.id,
        entry_id: entry.id,
        erp_item_id: item.linked_erp_item_id,
        qty: item.qCom,
        unit_cost: item.vUnCom,
        total_cost: item.vProd,
      }));

      const { error: itemsError } = await (supabase as any)
        .from('erp_purchase_entry_items')
        .insert(entryItems);

      if (itemsError) throw itemsError;

      // Save all links for future imports
      const linksToSave = items
        .filter(i => i.link_source !== 'history') // Only save new links
        .map(item => ({
          company_id: company.id,
          supplier_id: nfeImport.supplier_id,
          supplier_cnpj: nfeImport.supplier_cnpj,
          supplier_product_code: item.cProd,
          supplier_product_name: item.xProd,
          supplier_ean: item.cEAN || null,
          erp_item_id: item.linked_erp_item_id,
        }));

      if (linksToSave.length > 0) {
        await (supabase as any)
          .from('erp_supplier_product_links')
          .upsert(linksToSave, {
            onConflict: 'company_id,supplier_cnpj,supplier_product_code',
          });
      }

      // Update import status
      await (supabase as any)
        .from('erp_nfe_imports')
        .update({
          status: 'imported',
          purchase_entry_id: entry.id,
          imported_by: user.id,
          imported_at: new Date().toISOString(),
        })
        .eq('id', importId);

      return { entry, importId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      queryClient.invalidateQueries({ queryKey: ['erp-purchase-entries'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-product-links'] });
      toast.success('NF-e importada com sucesso! Entrada criada como rascunho.');
    },
    onError: (err: Error) => {
      toast.error('Erro ao importar: ' + err.message);
    },
  });

  // Cancel import
  const cancelImport = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await (supabase as any)
        .from('erp_nfe_imports')
        .update({ status: 'cancelled' })
        .eq('id', importId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      toast.success('Importação cancelada');
    },
    onError: (err: Error) => {
      toast.error('Erro ao cancelar: ' + err.message);
    },
  });

  return {
    imports: importsQuery.data || [],
    supplierLinks: linksQuery.data || [],
    isLoading: importsQuery.isLoading,
    isProcessing,
    parseXML,
    updateItemLink,
    createItemFromNFe,
    saveSupplierLink,
    confirmImport,
    cancelImport,
  };
}
