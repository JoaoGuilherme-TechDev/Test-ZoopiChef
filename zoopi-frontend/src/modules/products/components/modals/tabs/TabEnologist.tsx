import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductFormData } from "../../../types";

interface TabEnologistProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabEnologist({ formData, setFormData }: TabEnologistProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Professional Info Box */}
        <div className="flex items-center gap-3 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
          <Info className="h-5 w-5 text-purple-500" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest">Notas do Enólogo</h4>
            <p className="text-[9px] text-muted-foreground uppercase font-bold">
              Informações técnicas para vinhos, destilados e bebidas especiais
            </p>
          </div>
        </div>

        {/* Tasting Notes Input */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Notas de Degustação / Detalhes Técnicos
          </Label>
          <Textarea 
            placeholder="Descreva o corpo, aroma, harmonização, teor alcoólico, safra ou castas..." 
            className="min-h-[200px] bg-muted/30 border border-primary/40 rounded-2xl resize-none focus:border-purple-500/50 transition-colors"
            value={formData.enologist_notes}
            onChange={(e) => setFormData({...formData, enologist_notes: e.target.value})}
          />
          <p className="text-[9px] text-muted-foreground uppercase font-bold px-1 italic">
            * Estas informações serão exibidas em destaque no Menu Digital para auxiliar a escolha do cliente.
          </p>
        </div>
      </div>
    </div>
  );
}