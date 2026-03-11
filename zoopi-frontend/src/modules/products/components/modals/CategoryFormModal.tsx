// ────────────────────────────────────────────────────────────────
// FILE: src/modules/products/components/modals/CategoryFormModal.tsx
// ────────────────────────────────────────────────────────────────

import { useRef } from "react";
import { Tag, Plus, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CategoryFormData } from "../../types";

// Importando a inteligência
import { useFormError } from "@/hooks/useFormError";

interface CategoryFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CategoryFormData;
  setFormData: (data: CategoryFormData) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  editingId: string | null;
}

export function CategoryFormModal({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  isSubmitting,
  onSubmit,
  editingId
}: CategoryFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── ATIVANDO O AUTO-FOCO ──
  useFormError(); 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] md:w-[95vw] lg:max-w-[425px] rounded-3xl border border-[hsla(270,100%,65%,0.22)] shadow-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {editingId ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            {editingId ? 'Atualize os dados da sua categoria.' : 'Crie uma nova categoria.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-24 sm:w-24 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Ícone</Label>
              <div 
                className="aspect-square rounded-2xl bg-muted/30 border-2 border-dashed border-primary/20 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Cat Preview" className="w-full h-full object-cover" />
                ) : (
                  <Plus className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest">
                Nome da Categoria <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="name" 
                name="name" // IMPORTANTE: O 'name' deve bater com o que o servidor retorna
                placeholder="Ex: Pizzas" 
                className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest">Categoria Ativa</span>
            <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full h-12 font-black uppercase tracking-widest bg-primary text-white rounded-xl">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? 'Atualizar Categoria' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}