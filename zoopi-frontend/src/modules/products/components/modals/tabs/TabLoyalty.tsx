import { Star, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductFormData } from "../../../types";

interface TabLoyaltyProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabLoyalty({ formData, setFormData }: TabLoyaltyProps) {
  // Logic to calculate how many units are needed for a typical reward (100 pts)
  const unitsToReward = formData.loyalty_points > 0 
    ? Math.ceil(100 / (formData.loyalty_points || 1)) 
    : '--';

  return (
    <div className="space-y-6">
      <div className="p-8 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/[0.02] relative overflow-hidden group">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
          
          {/* Decorative Icon */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <Star className="h-10 w-10 text-amber-500 animate-pulse" />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-6">
            <div>
              <h4 className="text-lg font-black uppercase tracking-tighter mb-1 flex items-center gap-2">
                Fidelidade Zoopi
                <Badge className="bg-amber-500 text-[8px] font-black uppercase tracking-widest px-1.5 h-4">VIP</Badge>
              </h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-70">
                Recompense seus clientes fiéis com pontos acumulativos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Points Input */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  Pontos por Unidade
                  <div className="h-1 w-1 rounded-full bg-amber-500" />
                </Label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="0" 
                    className="h-14 bg-background border border-primary/40 rounded-2xl font-black text-xl pl-6 text-amber-500 focus:ring-amber-500/20"
                    value={formData.loyalty_points}
                    onChange={(e) => setFormData({
                      ...formData, 
                      loyalty_points: e.target.value ? parseInt(e.target.value) : 0
                    })}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    PTS
                  </span>
                </div>
              </div>

              {/* Prediction Box */}
              <div className="p-4 rounded-2xl bg-background/50 border border-primary/10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Previsão de Resgate</span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-bold">
                  A cada {unitsToReward} unidades, o cliente acumula pontos suficientes para um benefício exclusivo de 100 pontos.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Blurs */}
        <div className="absolute -bottom-12 -right-12 h-48 w-48 bg-amber-500/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute -top-12 -left-12 h-32 w-32 bg-primary/5 blur-[40px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
