import { Clock, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductFormData } from "../../../types";

interface TabAvailabilityProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabAvailability({ formData, setFormData }: TabAvailabilityProps) {
  const daysOfWeek = [
    'Segunda', 
    'Terça', 
    'Quarta', 
    'Quinta', 
    'Sexta', 
    'Sábado', 
    'Domingo'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        
        {/* Days of the week selection */}
        <div className="p-6 border border-primary/20 rounded-3xl bg-muted/5 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Dias da Semana
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {daysOfWeek.map((day) => (
              <div 
                key={day} 
                className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/10 hover:border-primary/30 transition-colors"
              >
                <span className="text-[10px] font-bold uppercase">{day}</span>
                <Switch 
                  className="scale-75 data-[state=checked]:bg-emerald-500" 
                  defaultChecked 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Time windows configuration */}
        <div className="p-6 border border-primary/20 rounded-3xl bg-muted/5 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Horários de Disponibilidade
          </h4>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label className="text-[10px] font-black uppercase tracking-widest">Início</Label>
                <Input 
                  type="time" 
                  className="h-11 rounded-xl bg-background border-primary/20 focus:border-primary" 
                  defaultValue="00:00" 
                />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <Label className="text-[10px] font-black uppercase tracking-widest">Fim</Label>
                <Input 
                  type="time" 
                  className="h-11 rounded-xl bg-background border-primary/20 focus:border-primary" 
                  defaultValue="23:59" 
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="h-11 w-full sm:w-auto rounded-xl border-dashed border-primary/30 text-primary font-black uppercase text-[10px] tracking-widest px-6 hover:bg-primary/5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Horário
              </Button>
            </div>
            
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                Se nenhum horário for definido, o produto ficará disponível durante 
                todo o horário de funcionamento do estabelecimento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}