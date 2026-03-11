import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ProductFormData } from "../../../types";

interface TabFiscalProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabFiscal({ formData, setFormData }: TabFiscalProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">NCM (Fiscal)</Label>
          <Input 
            placeholder="0000.00.00" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.ncm}
            onChange={(e) => setFormData({...formData, ncm: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">CEST</Label>
          <Input 
            placeholder="00.000.00" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.cest}
            onChange={(e) => setFormData({...formData, cest: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Status Tributário</Label>
          <Select 
            value={formData.tax_status}
            onValueChange={(val) => setFormData({...formData, tax_status: val})}
          >
            <SelectTrigger className="h-12 bg-muted/30 border border-primary/40 rounded-xl">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tributado">Tributado</SelectItem>
              <SelectItem value="isento">Isento</SelectItem>
              <SelectItem value="substituicao">Substituição Tributária</SelectItem>
              <SelectItem value="nao_tributado">Não Tributado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Código Interno / SKU</Label>
          <Input 
            placeholder="EX: PROD-001" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.sku}
            onChange={(e) => setFormData({...formData, sku: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Código de Barras (EAN)</Label>
          <Input 
            placeholder="789..." 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.ean}
            onChange={(e) => setFormData({...formData, ean: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Referência Interna</Label>
          <Input 
            placeholder="Código do fornecedor..." 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.internal_code}
            onChange={(e) => setFormData({...formData, internal_code: e.target.value})}
          />
        </div>
      </div>
    </div>
  );
}