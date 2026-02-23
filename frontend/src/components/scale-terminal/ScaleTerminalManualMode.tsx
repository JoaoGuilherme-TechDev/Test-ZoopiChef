import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Scale, Check, Loader2, ScanBarcode, ShoppingCart, Trash2, Plus, Send } from "lucide-react";
import { supabase } from '@/lib/supabase-shim';
import { toast } from "sonner";
import type { ScaleConfig } from "@/hooks/useScaleConfig";
import { createPrintJobsForOrder } from "@/utils/createPrintJobsForOrder";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface CartItem {
  id: string;
  productName: string;
  weightKg: number;
  valueCents: number;
}

interface ScaleTerminalManualModeProps {
  companyId: string;
  pricePerKgCents: number;
  productName: string;
  scaleConfig?: ScaleConfig | null;
}

export function ScaleTerminalManualMode({
  companyId,
  pricePerKgCents,
  productName,
  scaleConfig,
}: ScaleTerminalManualModeProps) {
  const [weight, setWeight] = useState("");
  const [comandaCode, setComandaCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const comandaInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  const weightKg = parseFloat(weight.replace(",", ".")) || 0;
  const valueCents = Math.round(weightKg * pricePerKgCents);
  const cartTotalCents = cart.reduce((sum, item) => sum + item.valueCents, 0);
  const cartTotalWeight = cart.reduce((sum, item) => sum + item.weightKg, 0);

  useEffect(() => {
    // Focus on weight input initially
    weightInputRef.current?.focus();
  }, []);

  const handleAddToCart = () => {
    if (weightKg <= 0) {
      toast.error("Digite um peso válido");
      weightInputRef.current?.focus();
      return;
    }

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      productName,
      weightKg,
      valueCents,
    };

    setCart(prev => [...prev, newItem]);
    setWeight("");
    weightInputRef.current?.focus();
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
    toast.info("Carrinho limpo");
  };

  const handleSendToComanda = async () => {
    if (cart.length === 0) {
      toast.error("Adicione itens ao carrinho primeiro");
      return;
    }

    if (!comandaCode.trim()) {
      toast.error("Digite ou escaneie o código da comanda");
      comandaInputRef.current?.focus();
      return;
    }

    setIsProcessing(true);

    try {
      const rawCode = comandaCode.trim();
      const numericCode = Number.parseInt(rawCode, 10);

      // Find comanda by number (most common) and fallback to "code" (QR/uuid) when not numeric
      // NOTE: we cast to "any" here to avoid Supabase's very deep generated types blowing up TS (TS2589)
      let comandaQuery: any = (supabase as any)
        .from("comandas")
        .select("id, status")
        .eq("company_id", companyId);

      if (!Number.isNaN(numericCode) && numericCode > 0) {
        comandaQuery = comandaQuery.eq("command_number", numericCode);
      } else {
        comandaQuery = comandaQuery.eq("code", rawCode);
      }

      const { data: comanda, error: comandaError } = await comandaQuery.maybeSingle();

      if (comandaError) throw comandaError;

      if (!comanda) {
        toast.error("Comanda não encontrada");
        setComandaCode("");
        comandaInputRef.current?.focus();
        setIsProcessing(false);
        return;
      }

      // Accept 'open' status - operator can launch to any open comanda
      if (comanda.status === "closed") {
        toast.error("Comanda está fechada");
        setComandaCode("");
        comandaInputRef.current?.focus();
        setIsProcessing(false);
        return;
      }

      // Insert all cart items as self-service entries
      const entries = cart.map(item => ({
        company_id: companyId,
        comanda_id: comanda.id,
        product_name: item.productName,
        weight_kg: item.weightKg,
        price_per_kg: pricePerKgCents,
        total_value: item.valueCents,
      }));

      const { error: insertError } = await supabase
        .from("self_service_entries")
        .insert(entries);

      if (insertError) throw insertError;

      // =============================================
      // TAMBÉM inserir em comanda_items para aparecer na comanda
      // =============================================
      const comandaItemsToInsert = cart.map(item => ({
        company_id: companyId,
        comanda_id: comanda.id,
        product_id: null, // Self-service genérico não tem product_id
        product_name_snapshot: item.productName,
        qty: item.weightKg,
        unit_price_snapshot: pricePerKgCents / 100, // Convert cents to reais
        notes: `Peso: ${item.weightKg.toFixed(3)} kg`,
        options_json: null,
      }));

      const { error: comandaItemsError } = await supabase
        .from("comanda_items")
        .insert(comandaItemsToInsert);

      if (comandaItemsError) {
        console.error("Error inserting comanda_items:", comandaItemsError);
        // Continue - self_service_entries already inserted
      }

      // Show success
      setShowSuccess(true);
      toast.success(`${cart.length} item(s) lançado(s) na comanda ${comandaCode}`);

      // Reset after delay
      setTimeout(() => {
        setShowSuccess(false);
        setWeight("");
        setComandaCode("");
        setCart([]);
        weightInputRef.current?.focus();
      }, 2000);
    } catch (error) {
      console.error("Error launching weight:", error);
      toast.error("Erro ao lançar peso");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddToCart();
    }
  };

  const handleComandaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendToComanda();
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-500 p-4">
        <div className="text-center text-white animate-scale-in">
          <Check className="w-32 h-32 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-2">Lançado!</h1>
          <p className="text-2xl opacity-90">
            {cartTotalWeight.toFixed(3)} kg - {formatCurrency(cartTotalCents / 100)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Scale className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold">Lançamento Manual</h1>
            <p className="text-sm text-muted-foreground">{productName}</p>
          </div>

          {/* Price info */}
          <div className="text-center py-2 px-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Preço por kg</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(pricePerKgCents / 100)}
            </p>
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-sm font-medium">
              Peso (kg)
            </Label>
            <div className="flex gap-2">
              <Input
                ref={weightInputRef}
                id="weight"
                type="text"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={handleWeightKeyDown}
                placeholder="0,000"
                className="text-center text-2xl h-14 font-mono flex-1"
                disabled={isProcessing}
              />
              <Button
                onClick={handleAddToCart}
                disabled={isProcessing || weightKg <= 0}
                className="h-14 w-14"
                variant="secondary"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Current Value Display */}
          <div className="text-center py-3 px-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Valor do item atual</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(valueCents / 100)}
            </p>
          </div>

          {/* Cart Section */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Carrinho</h3>
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.length} item(s)</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCart}
                  className="text-destructive hover:text-destructive h-8"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum item no carrinho
              </p>
            ) : (
              <>
                <ScrollArea className="max-h-32">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.weightKg.toFixed(3)} kg
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {formatCurrency(item.valueCents / 100)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(cartTotalCents / 100)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Comanda Input */}
          <div className="space-y-2">
            <Label htmlFor="comanda" className="text-sm font-medium flex items-center gap-2">
              <ScanBarcode className="w-4 h-4" />
              Código da Comanda
            </Label>
            <Input
              ref={comandaInputRef}
              id="comanda"
              type="text"
              value={comandaCode}
              onChange={(e) => setComandaCode(e.target.value)}
              onKeyDown={handleComandaKeyDown}
              placeholder="Digite ou escaneie"
              className="text-center text-xl h-12"
              disabled={isProcessing}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendToComanda}
            disabled={isProcessing || cart.length === 0 || !comandaCode.trim()}
            className="w-full h-12 text-lg gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar para Comanda ({cart.length})
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
