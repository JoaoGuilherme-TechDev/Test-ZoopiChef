import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  NFeWizardData, 
  NFeWizardItem, 
  WizardStep, 
  ManifestStatus,
  NFeFinalizationResult,
  MarginLevel 
} from '../types/nfe-wizard';
import { calculateMarginLevel, calculateMarginPercent } from '../types/nfe-wizard';
import type { NFeParseResult } from '../types/nfe';

export function useNFeWizard() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('manifest');
  const [wizardData, setWizardData] = useState<NFeWizardData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize wizard from parsed XML
  const initializeFromParse = useCallback((parseResult: NFeParseResult) => {
    const items: NFeWizardItem[] = parseResult.items.map(item => ({
      ...item,
      conversion_factor: 1,
      cfop_entry: '',
      is_new_item: !item.linked_erp_item_id,
      needs_creation: !item.linked_erp_item_id,
    }));

    setWizardData({
      import_id: parseResult.import_id,
      manifest_status: 'none',
      supplier: parseResult.supplier,
      invoice: parseResult.invoice,
      totals: parseResult.totals,
      items,
      default_cfop_entry: '',
    });
    setCurrentStep('manifest');
  }, []);

  // Set manifest status
  const setManifestStatus = useCallback((status: ManifestStatus) => {
    if (!wizardData) return;
    setWizardData({
      ...wizardData,
      manifest_status: status,
      manifest_date: status !== 'none' ? new Date().toISOString() : undefined,
    });
  }, [wizardData]);

  // Update single item
  const updateItem = useCallback((index: number, updates: Partial<NFeWizardItem>) => {
    if (!wizardData) return;
    
    const items = [...wizardData.items];
    const item = { ...items[index], ...updates };
    
    // Recalculate margin if sale_price or cost changed
    if (updates.sale_price !== undefined || updates.vUnCom !== undefined) {
      const costPrice = updates.vUnCom ?? item.vUnCom;
      const salePrice = updates.sale_price ?? item.sale_price ?? 0;
      item.margin_percent = calculateMarginPercent(costPrice, salePrice);
      item.margin_level = calculateMarginLevel(costPrice, salePrice);
    }
    
    items[index] = item;
    setWizardData({ ...wizardData, items });
  }, [wizardData]);

  // Update all items with default CFOP
  const applyDefaultCFOP = useCallback((cfop: string) => {
    if (!wizardData) return;
    const items = wizardData.items.map(item => ({
      ...item,
      cfop_entry: item.cfop_entry || cfop,
    }));
    setWizardData({ ...wizardData, items, default_cfop_entry: cfop });
  }, [wizardData]);

  // Set financial data
  const setFinancialData = useCallback((data: {
    category_id?: string;
    cost_center_id?: string;
    payment_conditions?: {
      installments: number;
      first_due_date: string;
      interval_days: number;
    };
    notes?: string;
  }) => {
    if (!wizardData) return;
    setWizardData({ ...wizardData, ...data });
  }, [wizardData]);

  // Get next internal code
  const getNextInternalCode = async (): Promise<string> => {
    if (!company?.id) return '000001';
    
    const { data, error } = await supabase.rpc('get_next_erp_internal_code', {
      p_company_id: company.id,
    });
    
    if (error) {
      console.error('Error getting next internal code:', error);
      return '000001';
    }
    
    return data || '000001';
  };

  // Finalize and create all records
  const finalize = useMutation({
    mutationFn: async (): Promise<NFeFinalizationResult> => {
      if (!wizardData || !company?.id || !user?.id) {
        throw new Error('Dados incompletos');
      }

      setIsProcessing(true);
      const errors: string[] = [];
      let purchaseEntryId: string | undefined;
      let payableId: string | undefined;
      let stockMovementsCount = 0;
      let updatedRecipesCount = 0;

      try {
        // 1. Create/update ERP items for new products
        for (const item of wizardData.items) {
          if (item.needs_creation && !item.linked_erp_item_id) {
            const internalCode = await getNextInternalCode();
            
            const { data: newItem, error: createError } = await (supabase as any)
              .from('erp_items')
              .insert({
                company_id: company.id,
                name: item.product_name_override || item.xProd,
                sku: item.cProd,
                item_type: 'raw',
                track_stock: true,
                min_stock: 0,
                current_stock: 0,
                avg_cost: item.vUnCom,
                last_cost: item.vUnCom,
                ean_code: item.ean_code || item.cEAN || null,
                internal_code: internalCode,
                category_id: item.category_id || null,
                subcategory_id: item.subcategory_id || null,
                sale_price: item.sale_price || 0,
                cfop_entry: item.cfop_entry || null,
                ncm_code: item.NCM || null,
              })
              .select()
              .single();

            if (createError) {
              errors.push(`Erro ao criar item ${item.xProd}: ${createError.message}`);
              continue;
            }

            item.linked_erp_item_id = newItem.id;
            item.linked_erp_item_name = newItem.name;

            // Save supplier link
            await (supabase as any)
              .from('erp_supplier_product_links')
              .upsert({
                company_id: company.id,
                supplier_cnpj: wizardData.supplier.cnpj,
                supplier_id: wizardData.supplier.id || null,
                supplier_product_code: item.cProd,
                supplier_product_name: item.xProd,
                supplier_ean: item.cEAN || null,
                erp_item_id: newItem.id,
                conversion_factor: item.conversion_factor || 1,
                purchase_unit: item.uCom,
                stock_unit: item.conversion_unit_to || item.uCom,
              }, {
                onConflict: 'company_id,supplier_cnpj,supplier_product_code',
              });
          } else if (item.linked_erp_item_id) {
            // Update existing item if sale_price changed
            if (item.sale_price && item.sale_price > 0) {
              await (supabase as any)
                .from('erp_items')
                .update({
                  sale_price: item.sale_price,
                  last_cost: item.vUnCom,
                })
                .eq('id', item.linked_erp_item_id);
            }
          }
        }

        // 2. Create purchase entry
        const { data: entry, error: entryError } = await (supabase as any)
          .from('erp_purchase_entries')
          .insert({
            company_id: company.id,
            supplier_id: wizardData.supplier.id || null,
            entry_date: wizardData.invoice.date,
            invoice_number: wizardData.invoice.number,
            freight: wizardData.totals.freight,
            taxes: 0,
            status: 'posted',
            notes: `NF-e ${wizardData.invoice.number} - ${wizardData.supplier.name}\nChave: ${wizardData.invoice.access_key}`,
            created_by: user.id,
            posted_at: new Date().toISOString(),
            posted_by: user.id,
          })
          .select()
          .single();

        if (entryError) throw entryError;
        purchaseEntryId = entry.id;

        // 3. Create purchase entry items
        const entryItems = wizardData.items
          .filter(i => i.linked_erp_item_id)
          .map(item => ({
            company_id: company.id,
            entry_id: entry.id,
            erp_item_id: item.linked_erp_item_id,
            qty: item.qCom * (item.conversion_factor || 1),
            unit_cost: item.vUnCom / (item.conversion_factor || 1),
            total_cost: item.vProd,
          }));

        if (entryItems.length > 0) {
          await (supabase as any)
            .from('erp_purchase_entry_items')
            .insert(entryItems);
        }

        // 4. Create stock movements
        for (const item of wizardData.items) {
          if (!item.linked_erp_item_id) continue;

          const convertedQty = item.qCom * (item.conversion_factor || 1);
          const unitCost = item.vUnCom / (item.conversion_factor || 1);

          // Get current stock
          const { data: currentItem } = await (supabase as any)
            .from('erp_items')
            .select('current_stock, avg_cost')
            .eq('id', item.linked_erp_item_id)
            .single();

          const oldStock = currentItem?.current_stock || 0;
          const oldAvgCost = currentItem?.avg_cost || 0;
          const newStock = oldStock + convertedQty;
          
          // Calculate new weighted average cost
          const newAvgCost = oldStock === 0 
            ? unitCost
            : ((oldStock * oldAvgCost) + (convertedQty * unitCost)) / newStock;

          // Create movement
          await (supabase as any)
            .from('erp_stock_movements')
            .insert({
              company_id: company.id,
              erp_item_id: item.linked_erp_item_id,
              movement_type: 'purchase_in',
              qty: convertedQty,
              unit_cost_snapshot: unitCost,
              balance_after: newStock,
              source_table: 'erp_purchase_entries',
              source_id: entry.id,
              reason: `NF-e ${wizardData.invoice.number}`,
              created_by: user.id,
            });

          // Update item stock
          await (supabase as any)
            .from('erp_items')
            .update({
              current_stock: newStock,
              avg_cost: newAvgCost,
              last_cost: unitCost,
            })
            .eq('id', item.linked_erp_item_id);

          stockMovementsCount++;
        }

        // 5. Create account payable if category selected
        if (wizardData.category_id) {
          const conditions = wizardData.payment_conditions || {
            installments: 1,
            first_due_date: wizardData.invoice.date,
            interval_days: 30,
          };

          const installmentValue = Math.round((wizardData.totals.total * 100) / conditions.installments);
          const firstDueDate = new Date(conditions.first_due_date);

          for (let i = 0; i < conditions.installments; i++) {
            const dueDate = new Date(firstDueDate);
            dueDate.setDate(dueDate.getDate() + (i * conditions.interval_days));

            const { data: payable, error: payableError } = await (supabase as any)
              .from('erp_payables_installments')
              .insert({
                company_id: company.id,
                supplier_id: wizardData.supplier.id || null,
                description: conditions.installments > 1 
                  ? `NF-e ${wizardData.invoice.number} - ${i + 1}/${conditions.installments}`
                  : `NF-e ${wizardData.invoice.number} - ${wizardData.supplier.name}`,
                amount_cents: installmentValue,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending',
                category_id: wizardData.category_id,
                cost_center_id: wizardData.cost_center_id || null,
                origin: 'nfe_import',
                reference_table: 'erp_nfe_imports',
                reference_id: wizardData.import_id,
                notes: wizardData.notes || null,
                created_by: user.id,
              })
              .select()
              .single();

            if (!payableError && i === 0) {
              payableId = payable.id;
            }
          }
        }

        // 6. Update recipes that use these items
        const itemIds = wizardData.items
          .filter(i => i.linked_erp_item_id)
          .map(i => i.linked_erp_item_id);

        if (itemIds.length > 0) {
          const { data: affectedRecipes } = await (supabase as any)
            .from('erp_recipe_lines')
            .select('recipe_id')
            .in('component_item_id', itemIds);

          if (affectedRecipes && affectedRecipes.length > 0) {
            updatedRecipesCount = new Set(affectedRecipes.map((r: any) => r.recipe_id)).size;
          }
        }

        // 7. Update import record
        await (supabase as any)
          .from('erp_nfe_imports')
          .update({
            status: 'imported',
            purchase_entry_id: purchaseEntryId,
            payable_id: payableId || null,
            category_id: wizardData.category_id || null,
            cost_center_id: wizardData.cost_center_id || null,
            cfop_entry: wizardData.default_cfop_entry || null,
            manifest_status: wizardData.manifest_status,
            manifest_date: wizardData.manifest_date || null,
            financial_generated: !!wizardData.category_id,
            stock_generated: true,
            imported_by: user.id,
            imported_at: new Date().toISOString(),
            items_json: wizardData.items,
          })
          .eq('id', wizardData.import_id);

        return {
          success: errors.length === 0,
          purchase_entry_id: purchaseEntryId,
          payable_id: payableId,
          stock_movements_count: stockMovementsCount,
          updated_recipes_count: updatedRecipesCount,
          errors: errors.length > 0 ? errors : undefined,
        };

      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('NF-e importada com sucesso!', {
          description: `${result.stock_movements_count} movimentações de estoque criadas`,
        });
        if (result.updated_recipes_count && result.updated_recipes_count > 0) {
          toast.info(`${result.updated_recipes_count} fichas técnicas afetadas pelas alterações de custo`);
        }
      } else {
        toast.warning('NF-e importada com avisos', {
          description: result.errors?.join(', '),
        });
      }
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp-purchase-entries'] });
      queryClient.invalidateQueries({ queryKey: ['erp-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['erp-payables'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-product-links'] });
      
      setCurrentStep('complete');
    },
    onError: (error: Error) => {
      toast.error('Erro ao finalizar importação', { description: error.message });
    },
  });

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    const steps: WizardStep[] = ['manifest', 'items', 'financial', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const steps: WizardStep[] = ['manifest', 'items', 'financial', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  // Reset wizard
  const reset = useCallback(() => {
    setWizardData(null);
    setCurrentStep('manifest');
    setIsProcessing(false);
  }, []);

  return {
    currentStep,
    wizardData,
    isProcessing: isProcessing || finalize.isPending,
    initializeFromParse,
    setManifestStatus,
    updateItem,
    applyDefaultCFOP,
    setFinancialData,
    getNextInternalCode,
    finalize: finalize.mutateAsync,
    goToStep,
    nextStep,
    prevStep,
    reset,
  };
}
