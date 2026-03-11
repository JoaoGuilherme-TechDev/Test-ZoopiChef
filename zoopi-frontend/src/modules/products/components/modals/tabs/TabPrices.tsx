import { Tag, TrendingUp, ShoppingBag, Calculator, Percent, Coins, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ProductFormData } from "../../../types";
import { useEffect, useState } from "react";

interface TabPricesProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabPrices({ formData, setFormData }: TabPricesProps) {
  const [suggestedPrice, setSuggestedPrice] = useState<string>("0,00");

  // Helper to format as BRL while typing
  const formatBRL = (value: string | number) => {
    if (!value) return "";
    // Remove all non-digits
    const cleanValue = value.toString().replace(/\D/g, "");
    // Convert to number (cents)
    const cents = parseInt(cleanValue) || 0;
    // Format as currency
    return (cents / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper to parse BRL string back to decimal number for calculations
  const parseBRL = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  // Handle Input Changes with BRL Mask
  const handleCurrencyChange = (field: keyof ProductFormData, value: string) => {
    const formatted = formatBRL(value);
    setFormData({ ...formData, [field]: formatted });
  };

  // Automatic Suggested Price Calculation
  useEffect(() => {
    const cost = parseBRL(formData.cost_price?.toString() || "");
    const margin = parseFloat(formData.profit_margin?.toString() || "0");

    if (cost > 0 && margin > 0) {
      const suggested = cost + (cost * margin) / 100;
      setSuggestedPrice(suggested.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
    } else {
      setSuggestedPrice("0,00");
    }
  }, [formData.cost_price, formData.profit_margin]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. SEÇÃO DE CUSTO E MARGEM (ENTRADA) */}
      <div className="bg-muted/20 p-6 rounded-3xl border border-primary/10 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-primary/70">Base de Cálculo</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Coins className="h-3 w-3" /> Preço de Custo
            </Label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground group-focus-within:text-primary transition-colors">R$</span>
              <Input 
                placeholder="0,00" 
                className="h-12 pl-10 bg-background border-primary/20 rounded-xl focus:border-primary focus:ring-primary/20 transition-all font-medium"
                value={formData.cost_price}
                onChange={(e) => handleCurrencyChange('cost_price', e.target.value)}
              />
            </div>
            <p className="text-[9px] text-muted-foreground uppercase px-1">Valor pago ao fornecedor</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Percent className="h-3 w-3" /> Margem de Lucro
            </Label>
            <div className="relative group">
              <Input 
                type="number"
                placeholder="0" 
                className="h-12 bg-background border-primary/20 rounded-xl focus:border-primary focus:ring-primary/20 transition-all font-medium pr-10"
                value={formData.profit_margin}
                onChange={(e) => setFormData({...formData, profit_margin: e.target.value})}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground group-focus-within:text-primary transition-colors">%</span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase px-1">Porcentagem de lucro</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-emerald-500" /> Preço Sugerido
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">R$</span>
              <Input 
                readOnly
                className="h-12 pl-10 bg-emerald-500/5 border-emerald-500/20 rounded-xl font-bold text-emerald-600 cursor-not-allowed"
                value={suggestedPrice}
              />
            </div>
            <p className="text-[9px] text-emerald-600/70 font-bold uppercase px-1 italic">
              Cálculo Automático
            </p>
          </div>
        </div>
      </div>

      {/* 2. PREÇOS DE VENDA (SAÍDA PRINCIPAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2 p-1">
          <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
            <span>Preço de Venda Final</span>
            <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Usará o Sugerido se vazio</span>
          </Label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary group-focus-within:scale-110 transition-transform">R$</span>
            <Input 
              placeholder="0,00" 
              className="h-14 pl-10 bg-primary/5 border-primary/40 rounded-2xl focus:border-primary focus:ring-primary/30 transition-all font-black text-lg text-primary shadow-sm"
              value={formData.price}
              onChange={(e) => handleCurrencyChange('price', e.target.value)}
            />
            {suggestedPrice !== "0,00" && suggestedPrice !== formData.price && formData.price !== "" && (
              <button 
                type="button"
                onClick={() => setFormData({...formData, price: suggestedPrice})}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md transition-colors uppercase"
              >
                Usar Sugerido
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 p-1">
          <Label className="text-[10px] font-black uppercase tracking-widest">Preço em Promoção</Label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 group-focus-within:scale-110 transition-transform">R$</span>
            <Input 
              placeholder="0,00" 
              className="h-14 pl-10 bg-emerald-500/5 border-emerald-500/30 rounded-2xl focus:border-emerald-500 focus:ring-emerald-500/20 transition-all font-bold text-lg text-emerald-600 shadow-sm"
              value={formData.sale_price}
              onChange={(e) => handleCurrencyChange('sale_price', e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-2">
              <Tag className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Ativar Promoção</span>
            </div>
            <Switch 
              checked={formData.is_on_sale}
              onCheckedChange={(checked) => setFormData({...formData, is_on_sale: checked})}
              className="scale-75 data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 3. ATACADO (ESTRATÉGICO) */}
      <div className="bg-amber-500/5 p-6 rounded-3xl border border-amber-500/10 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-700/70">Venda em Atacado</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Qtd. Mínima Atacado</Label>
            <div className="relative group">
              <Input 
                type="number"
                placeholder="Ex: 10" 
                className="h-12 bg-background border-amber-500/20 rounded-xl focus:border-amber-500 focus:ring-amber-500/20 transition-all font-medium"
                value={formData.wholesale_min_qty}
                onChange={(e) => setFormData({...formData, wholesale_min_qty: e.target.value})}
              />
              <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/40" />
            </div>
            <p className="text-[9px] text-muted-foreground uppercase px-1">A partir de quantas unidades</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Preço Atacado (Unit.)</Label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 group-focus-within:text-amber-700 transition-colors">R$</span>
              <Input 
                placeholder="0,00" 
                className="h-12 pl-10 bg-background border-amber-500/20 rounded-xl focus:border-amber-500 focus:ring-amber-500/20 transition-all font-bold text-amber-700"
                value={formData.wholesale_price}
                onChange={(e) => handleCurrencyChange('wholesale_price', e.target.value)}
              />
            </div>
            <p className="text-[9px] text-muted-foreground uppercase px-1">Valor unitário no atacado</p>
          </div>
        </div>
      </div>

    </div>
  );
}
