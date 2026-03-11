// ────────────────────────────────────────────────────────────────
// FILE: src/modules/products/components/modals/SubcategoryFormModal.tsx
// ────────────────────────────────────────────────────────────────

import { Layers, Plus, Loader2 } from "lucide-react";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { SubcategoryFormData, Category } from "../../types";

// Importando a inteligência
import { useFormError } from "@/hooks/useFormError";

interface SubcategoryFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: SubcategoryFormData;
  setFormData: (data: SubcategoryFormData) => void;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  editingId: string | null;
}

export function SubcategoryFormModal({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  categories,
  isSubmitting,
  onSubmit,
  editingId
}: SubcategoryFormModalProps) {
  
  // ── ATIVANDO O AUTO-FOCO E DESTAQUE ──
  useFormError();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] md:w-[95vw] lg:max-w-[425px] rounded-3xl border border-[hsla(270,100%,65%,0.22)] shadow-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {editingId ? 'Editar Subcategoria' : 'Nova Subcategoria'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            {editingId ? 'Atualize os dados da sua subcategoria.' : 'Crie uma nova subcategoria.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Nome da Subcategoria */}
            <div className="space-y-2">
              <Label htmlFor="sub-name" className="text-[10px] font-black uppercase tracking-widest">
                Nome da Subcategoria <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="sub-name" 
                name="name" // Mapeado para bater com o erro do servidor
                placeholder="Ex: Pizzas de Carne" 
                className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            {/* Categoria Pai */}
            <div className="space-y-2">
              <Label htmlFor="sub-category" className="text-[10px] font-black uppercase tracking-widest">
                Categoria Pai <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.category_id}
                onValueChange={(val) => setFormData({...formData, category_id: val})}
                required
              >
                <SelectTrigger className="h-12 bg-muted/30 border border-primary/40 rounded-xl">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest">Subcategoria Ativa</span>
            <Switch 
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
            />
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-12 font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-xl"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? 'Atualizar Subcategoria' : 'Criar Subcategoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}