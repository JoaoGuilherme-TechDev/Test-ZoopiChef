import { UtensilsCrossed } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProductFormData } from "../../../types";

interface TabDetailsProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabDetails({ formData, setFormData }: TabDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Descriptions Section */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Descrição Completa
          </Label>
          <Textarea 
            placeholder="Descreva os ingredientes, tamanho, peso..." 
            className="min-h-[100px] bg-muted/30 rounded-2xl resize-none border border-primary/40"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Composição / Ingredientes
          </Label>
          <Textarea 
            placeholder="Liste os ingredientes detalhadamente..." 
            className="min-h-[100px] bg-muted/30 border border-primary/40 rounded-2xl resize-none"
            value={formData.composition}
            onChange={(e) => setFormData({...formData, composition: e.target.value})}
          />
          <p className="text-[9px] text-muted-foreground uppercase font-bold px-1">
            Ingredientes separados por vírgula ( , ) formam uma lista simples. 
            Itens separados por ponto e vírgula ( ; ) são tratados como itens compostos.
          </p>
        </div>
      </div>

      {/* Brand Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Marca / Fabricante
          </Label>
          <Input 
            placeholder="Ex: Coca-Cola" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.brand}
            onChange={(e) => setFormData({...formData, brand: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Unidade de Medida
          </Label>
          <Select 
            value={formData.unit}
            onValueChange={(val) => setFormData({...formData, unit: val})}
          >
            <SelectTrigger className="h-12 bg-muted/30 border border-primary/40 rounded-xl">
              <SelectValue placeholder="UN" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="un">Unidade (un)</SelectItem>
              <SelectItem value="kg">Quilo (kg)</SelectItem>
              <SelectItem value="g">Grama (g)</SelectItem>
              <SelectItem value="lt">Litro (lt)</SelectItem>
              <SelectItem value="ml">Mililitro (ml)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Peso Líquido/Produção
          </Label>
          <Input 
            type="number"
            placeholder="1.0" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.production_weight}
            onChange={(e) => setFormData({...formData, production_weight: e.target.value})}
          />
        </div>
      </div>

      {/* Measurement Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
      </div>
      
      {/* Weighted Product Toggle */}
      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <div>
            <Label className="text-xs font-bold uppercase">Produto Pesável</Label>
            <p className="text-[9px] text-muted-foreground uppercase">
              Solicitar peso na venda
            </p>
          </div>
        </div>
        <Switch 
          checked={formData.is_weighted}
          onCheckedChange={(checked) => setFormData({...formData, is_weighted: checked})}
        />
      </div>
    </div>
  );
}