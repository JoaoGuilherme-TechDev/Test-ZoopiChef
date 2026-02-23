import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useTables } from "@/hooks/useTables";
import { useComandas } from "@/hooks/useComandas";
import { useSelfServiceEntries } from "@/hooks/useSelfServiceEntries";
import { useScaleConnection } from "@/hooks/useScaleConnection";
import { SelfServiceHeader } from "./SelfServiceHeader";
import { SelfServiceProductGrid } from "./SelfServiceProductGrid";
import { SelfServiceCategoryBar } from "./SelfServiceCategoryBar";
import { SelfServiceRecentEntries } from "./SelfServiceRecentEntries";
import { Loader2, LogOut, Scale } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase-shim';
import type { SelfServiceProduct } from "@/pages/SelfService";

interface SelfServiceTerminalProps {
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  operatorName: string;
  onLogout: () => void;
}

export function SelfServiceTerminal({
  company,
  operatorName,
  onLogout,
}: SelfServiceTerminalProps) {
  // Fetch data for this company specifically
  const [selectedComanda, setSelectedComanda] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [manualWeight, setManualWeight] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom fetches for this company
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [comandas, setComandas] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { weight: scaleWeight, isConnected: scaleConnected, connect: connectScale } = useScaleConnection();

  // Fetch all data on mount
  useState(() => {
    async function fetchData() {
      try {
        const [productsRes, categoriesRes, tablesRes, comandasRes, entriesRes] = await Promise.all([
          supabase
            .from("products")
            .select("*, subcategory:subcategories(*, category:categories(id, name))")
            .eq("company_id", company.id)
            .eq("active", true),
          supabase
            .from("categories")
            .select("*")
            .eq("company_id", company.id)
            .eq("active", true),
          supabase
            .from("tables")
            .select("*")
            .eq("company_id", company.id)
            .eq("active", true),
          supabase
            .from("comandas")
            .select("*")
            .eq("company_id", company.id)
            .eq("status", "open"),
          supabase
            .from("self_service_entries")
            .select("*")
            .eq("company_id", company.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
        setTables(tablesRes.data || []);
        setComandas(comandasRes.data || []);
        setEntries(entriesRes.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  });

  // Filter products for self service
  const selfServiceProducts = products.filter((p: any) => p.aparece_selfservice);

  // Filter by category if selected
  const filteredProducts = selectedCategory
    ? selfServiceProducts.filter((p: any) => p.subcategory?.category?.id === selectedCategory)
    : selfServiceProducts;

  // Get current weight
  const currentWeight = scaleConnected && scaleWeight > 0 ? scaleWeight : parseFloat(manualWeight) || 0;

  // Calculate value
  const calculateValue = useCallback((product: SelfServiceProduct) => {
    if (product.product_type === "kg" || product.product_type === "weight") {
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

    const isWeightProduct = product.product_type === "kg" || product.product_type === "weight";

    if (isWeightProduct && currentWeight <= 0) {
      toast.error("Informe o peso antes de lançar produto por kg");
      return;
    }

    setIsSubmitting(true);

    try {
      const weight = isWeightProduct ? currentWeight : 0;
      // product.price is in cents, so value is also in cents
      const valueCents = isWeightProduct 
        ? Math.round(currentWeight * product.price) 
        : product.price;

      const { data, error } = await supabase
        .from("self_service_entries")
        .insert({
          company_id: company.id,
          comanda_id: selectedComanda,
          table_id: selectedTable || null,
          product_name: product.name,
          weight_kg: weight,
          price_per_kg: product.price,
          total_value: valueCents,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to entries list
      setEntries((prev) => [data, ...prev.slice(0, 9)]);

      toast.success(`${product.name} lançado!`);
      setManualWeight("");
    } catch (err) {
      console.error("Error creating entry:", err);
      toast.error("Erro ao lançar produto");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh comandas periodically
  const refreshComandas = async () => {
    const { data } = await supabase
      .from("comandas")
      .select("*")
      .eq("company_id", company.id)
      .eq("status", "open");
    if (data) setComandas(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar with company info and logout */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-8 object-contain" />
          ) : (
            <Scale className="h-6 w-6 text-primary" />
          )}
          <div>
            <h1 className="font-semibold">{company.name}</h1>
            <p className="text-xs text-muted-foreground">Operador: {operatorName}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Header with comanda, table, weight */}
      <SelfServiceHeader
        comandas={comandas.map((c: any) => ({ id: c.id, code: String(c.command_number), status: c.status }))}
        tables={tables.map((t: any) => ({ id: t.id, number: t.number }))}
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

      {/* Main content */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left side - Products */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <SelfServiceCategoryBar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />

          <div className="flex-1 overflow-auto">
            <SelfServiceProductGrid
              products={filteredProducts.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                image_url: p.image_url,
                product_type: p.product_type,
              }))}
              currentWeight={currentWeight}
              onProductSelect={handleProductSelect}
              isSubmitting={isSubmitting}
              calculateValue={calculateValue}
            />
          </div>
        </div>

        {/* Right side - Recent entries */}
        <div className="w-80 flex-shrink-0">
          <SelfServiceRecentEntries
            entries={entries.map((e: any) => ({
              id: e.id,
              company_id: e.company_id || company.id,
              comanda_id: e.comanda_id,
              table_id: e.table_id,
              product_name: e.product_name,
              weight_kg: e.weight_kg ?? 0,
              price_per_kg: e.price_per_kg ?? e.unit_price ?? 0,
              total_value: e.total_value,
              barcode: e.barcode || null,
              created_at: e.created_at,
              created_by: e.created_by || null,
            }))}
            isLoading={false}
          />
        </div>
      </div>
    </div>
  );
}
