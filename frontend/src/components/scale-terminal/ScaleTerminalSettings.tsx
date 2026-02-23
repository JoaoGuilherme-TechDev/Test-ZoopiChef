import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Printer, ScanBarcode, Save, Loader2, PenLine, Package } from "lucide-react";
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export type SelfServiceMode = "ticket" | "auto_launch" | "manual";

interface ScaleSettings {
  selfservice_price_per_kg: number;
  selfservice_mode: SelfServiceMode;
  selfservice_product_name: string;
  selfservice_product_id: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  is_weighted: boolean;
}

export function ScaleTerminalSettings() {
  const { data: company } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<ScaleSettings>({
    selfservice_price_per_kg: 5990,
    selfservice_mode: "ticket",
    selfservice_product_name: "Self-Service",
    selfservice_product_id: null,
  });

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      if (!company?.id) return;

      try {
        const { data, error } = await supabase
          .from("companies")
          .select("selfservice_price_per_kg, selfservice_mode, selfservice_product_name, selfservice_product_id")
          .eq("id", company.id)
          .single();

        if (error) throw error;

        if (data) {
          const d = data as any;
          setSettings({
            selfservice_price_per_kg: d.selfservice_price_per_kg || 5990,
            selfservice_mode: (d.selfservice_mode as SelfServiceMode) || "ticket",
            selfservice_product_name: d.selfservice_product_name || "Self-Service",
            selfservice_product_id: d.selfservice_product_id || null,
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [company?.id]);

  // Load products for selection
  useEffect(() => {
    async function loadProducts() {
      if (!company?.id) return;

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, is_weighted")
          .eq("company_id", company.id)
          .eq("active", true)
          .eq("is_weighted", true)
          .order("name");

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    }

    loadProducts();
  }, [company?.id]);

  const handleProductSelect = (productId: string) => {
    if (productId === "custom") {
      setSettings(prev => ({
        ...prev,
        selfservice_product_id: null,
      }));
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSettings(prev => ({
          ...prev,
          selfservice_product_id: productId,
          selfservice_product_name: product.name,
          selfservice_price_per_kg: Math.round(product.price * 100),
        }));
      }
    }
  };

  const handleSave = async () => {
    if (!company?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          selfservice_price_per_kg: settings.selfservice_price_per_kg,
          selfservice_mode: settings.selfservice_mode,
          selfservice_product_name: settings.selfservice_product_name,
          selfservice_product_id: settings.selfservice_product_id,
        } as any)
        .eq("id", company.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="font-display">Terminal de Balança</CardTitle>
              <CardDescription>
                Configure o modo de operação da balança automática
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Modo de Operação</Label>
            <RadioGroup
              value={settings.selfservice_mode}
              onValueChange={(value) => setSettings(prev => ({ 
                ...prev, 
                selfservice_mode: value as SelfServiceMode 
              }))}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Modo Ticket */}
              <label
                htmlFor="mode-ticket"
                className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.selfservice_mode === "ticket"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="ticket" id="mode-ticket" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="w-5 h-5 text-primary" />
                    <span className="font-medium">Modo Ticket</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Imprime ticket com código de barras. Cliente apresenta no caixa.
                  </p>
                </div>
              </label>

              {/* Modo Automático */}
              <label
                htmlFor="mode-auto"
                className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.selfservice_mode === "auto_launch"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="auto_launch" id="mode-auto" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ScanBarcode className="w-5 h-5 text-primary" />
                    <span className="font-medium">Lançamento Automático</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cliente passa a comanda no leitor após pesar. Lança automático.
                  </p>
                </div>
              </label>

              {/* Modo Manual */}
              <label
                htmlFor="mode-manual"
                className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.selfservice_mode === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <PenLine className="w-5 h-5 text-primary" />
                    <span className="font-medium">Lançamento Manual</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Operador digita o peso manualmente e lança na comanda.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product-select" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produto do Self-Service
            </Label>
            <Select
              value={settings.selfservice_product_id || "custom"}
              onValueChange={handleProductSelect}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Selecione um produto do cadastro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <span className="text-muted-foreground">Personalizado (digitar nome e preço)</span>
                </SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{product.name}</span>
                      <span className="text-muted-foreground text-sm">
                        R$ {product.price.toFixed(2)}/kg
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Selecione um produto cadastrado ou escolha "Personalizado" para definir manualmente
            </p>
          </div>

          {/* Price per Kg - only if custom */}
          {!settings.selfservice_product_id && (
            <div className="space-y-2">
              <Label htmlFor="price">Preço por Kg (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={(settings.selfservice_price_per_kg / 100).toFixed(2)}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  selfservice_price_per_kg: Math.round(parseFloat(e.target.value || "0") * 100),
                }))}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Valor cobrado por quilograma no self-service
              </p>
            </div>
          )}

          {/* Product Name - only if custom */}
          {!settings.selfservice_product_id && (
            <div className="space-y-2">
              <Label htmlFor="product-name">Nome do Produto</Label>
              <Input
                id="product-name"
                value={settings.selfservice_product_name}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  selfservice_product_name: e.target.value,
                }))}
                placeholder="Self-Service"
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Nome que aparece no ticket e na comanda
              </p>
            </div>
          )}

          {/* Selected product info */}
          {settings.selfservice_product_id && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Produto selecionado:</p>
              <p className="text-lg font-bold">{settings.selfservice_product_name}</p>
              <p className="text-muted-foreground">
                R$ {(settings.selfservice_price_per_kg / 100).toFixed(2)}/kg
              </p>
            </div>
          )}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <Printer className="w-4 h-4 text-primary" />
              Modo Ticket
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-6">
              <li>Cliente coloca o prato na balança</li>
              <li>Sistema captura o peso automaticamente</li>
              <li>Imprime ticket com peso, valor e código de barras</li>
              <li>No caixa, operador lê o código de barras para lançar no PDV</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <ScanBarcode className="w-4 h-4 text-primary" />
              Modo Lançamento Automático
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-6">
              <li>Cliente coloca o prato na balança</li>
              <li>Sistema captura o peso e pede para passar a comanda</li>
              <li>Cliente passa a comanda no leitor de código de barras</li>
              <li>Sistema lança o peso automaticamente na comanda</li>
              <li>Cliente retira o prato e segue</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4 text-primary" />
              Modo Lançamento Manual
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-6">
              <li>Operador visualiza o peso na balança física</li>
              <li>Digita o peso manualmente no sistema</li>
              <li>Seleciona ou escaneia a comanda do cliente</li>
              <li>Sistema lança o peso na comanda selecionada</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
