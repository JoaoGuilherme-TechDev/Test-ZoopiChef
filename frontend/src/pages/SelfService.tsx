import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useTables } from "@/hooks/useTables";
import { useComandas } from "@/hooks/useComandas";
import { useSelfServiceEntries } from "@/hooks/useSelfServiceEntries";
import { useScaleConnection } from "@/hooks/useScaleConnection";
import { SelfServiceHeader } from "@/components/self-service/SelfServiceHeader";
import { SelfServiceProductGrid } from "@/components/self-service/SelfServiceProductGrid";
import { SelfServiceCategoryBar } from "@/components/self-service/SelfServiceCategoryBar";
import { SelfServiceRecentEntries } from "@/components/self-service/SelfServiceRecentEntries";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase-shim';

export interface SelfServiceProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  product_type?: string;
  category_id?: string;
  subcategory_id?: string;
}

export default function SelfService() {
  const { company } = useCompanyContext();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: categories } = useCategories();
  const { tables } = useTables();
  const { comandas } = useComandas();
  const { entries, isLoading: loadingEntries, refetch: refetchEntries } = useSelfServiceEntries(10);
  const { weight: scaleWeight, isConnected: scaleConnected, connect: connectScale } = useScaleConnection();

  const [selectedComanda, setSelectedComanda] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [manualWeight, setManualWeight] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products that have aparece_selfservice = true (cast to any for new field)
  const selfServiceProducts = products?.filter((p: any) => p.aparece_selfservice && p.active) || [];

  // Filter by category if selected
  const filteredProducts = selectedCategory
    ? selfServiceProducts.filter((p: any) => p.subcategory?.category?.id === selectedCategory)
    : selfServiceProducts;

  // Get current weight (scale or manual)
  const currentWeight = scaleConnected && scaleWeight > 0 ? scaleWeight : parseFloat(manualWeight) || 0;

  // Calculate value based on weight and price
  const calculateValue = useCallback((product: SelfServiceProduct) => {
    if (product.product_type === 'kg' || product.product_type === 'weight') {
      return currentWeight * product.price;
    }
    return product.price;
  }, [currentWeight]);

  // Handle product selection
  const handleProductSelect = async (product: SelfServiceProduct) => {
    if (!selectedComanda) {
      toast.error("Selecione uma comanda primeiro");
      return;
    }

    const isWeightProduct = product.product_type === 'kg' || product.product_type === 'weight';
    
    if (isWeightProduct && currentWeight <= 0) {
      toast.error("Informe o peso antes de lançar produto por kg");
      return;
    }

    setIsSubmitting(true);

    try {
      const weight = isWeightProduct ? currentWeight : null;
      const value = isWeightProduct ? currentWeight * product.price : product.price;

      // Create self service entry
      const { error } = await supabase.from("self_service_entries" as any).insert({
        company_id: company?.id,
        comanda_id: selectedComanda,
        table_id: selectedTable || null,
        product_id: product.id,
        product_name: product.name,
        weight_kg: weight,
        unit_price: product.price,
        total_value: value,
      });

      if (error) throw error;

      // Also add to comanda items if needed
      // This could be implemented later to sync with comanda

      toast.success(`${product.name} lançado com sucesso!`);
      setManualWeight("");
      refetchEntries();
    } catch (error) {
      console.error("Error creating entry:", error);
      toast.error("Erro ao lançar produto");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header with comanda, table, weight inputs */}
        <SelfServiceHeader
          comandas={(comandas || []).map(c => ({ id: c.id, code: String(c.command_number), status: c.status }))}
          tables={(tables || []).map(t => ({ id: t.id, number: t.number }))}
          selectedComanda={selectedComanda}
          selectedTable={selectedTable}
          manualWeight={manualWeight}
          scaleWeight={scaleWeight}
          scaleConnected={scaleConnected}
          currentWeight={currentWeight}
          onComandaChange={setSelectedComanda}
          onTableChange={setSelectedTable}
          onManualWeightChange={setManualWeight}
          onConnectScale={connectScale}
        />

        {/* Main content area */}
        <div className="flex flex-1 gap-4 p-4 overflow-hidden">
          {/* Left side - Products */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Category bar */}
            <SelfServiceCategoryBar
              categories={categories || []}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />

            {/* Product grid */}
            <div className="flex-1 overflow-auto">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <SelfServiceProductGrid
                  products={filteredProducts}
                  currentWeight={currentWeight}
                  onProductSelect={handleProductSelect}
                  isSubmitting={isSubmitting}
                  calculateValue={calculateValue}
                />
              )}
            </div>
          </div>

          {/* Right side - Recent entries */}
          <div className="w-80 flex-shrink-0">
            <SelfServiceRecentEntries
              entries={entries || []}
              isLoading={loadingEntries}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
