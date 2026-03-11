// ────────────────────────────────────────────────────────────────
// FILE: src/modules/products/components/modals/ProductFormModal.tsx
// ────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { 
  Plus, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Receipt, 
  Clock, 
  UtensilsCrossed
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Hook de inteligência que escuta o Alerta Global
import { useFormError } from "@/hooks/useFormError";

// Types
import { ProductFormData, Category, Subcategory } from "../../types";

// Tabs
import { TabInfo } from "./tabs/TabInfo";
import { TabDetails } from "./tabs/TabDetails";
import { TabFiscal } from "./tabs/TabFiscal";
import { TabPrices } from "./tabs/TabPrices";
import { TabChannels } from "./tabs/TabChannels";
import { TabLoyalty } from "./tabs/TabLoyalty";
import { TabEnologist } from "./tabs/TabEnologist";
import { TabOptionals } from "./tabs/TabOptionals";
import { TabPizza } from "./tabs/TabPizza";
import { TabAvailability } from "./tabs/TabAvailability";

interface ProductFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  categories: Category[];
  subcategories: Subcategory[];
  categoryInput: string;
  setCategoryInput: (val: string) => void;
  subcategoryInput: string;
  setSubcategoryInput: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  optionGroups: any[];
  loadingOptionGroups: boolean;
  onToggleOptionGroup: (id: string) => void;
  pizzaProps: any;
}

export function ProductFormModal({
  isOpen,
  onOpenChange,
  editingId,
  formData,
  setFormData,
  categories,
  subcategories,
  categoryInput,
  setCategoryInput,
  subcategoryInput,
  setSubcategoryInput,
  isSubmitting,
  onSubmit,
  optionGroups,
  loadingOptionGroups,
  onToggleOptionGroup,
  pizzaProps
}: ProductFormModalProps) {
  const [productTab, setProductTab] = useState<string>("info");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── ATIVANDO A INTELIGÊNCIA DE NAVEGAÇÃO ──
  // Agora o modal sabe mudar de aba e focar no erro sozinho
  useFormError({
    activeTab: productTab,
    onTabChange: setProductTab
  });

  const isPizzaVisible = 
    formData.type === "pizza" || 
    categoryInput.toLowerCase().includes("pizza") ||
    categories.find(c => c.id === formData.category_id)?.name.toLowerCase().includes("pizza");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[95vw] lg:max-w-7xl h-[90vh] overflow-hidden p-0 border-[hsla(270,100%,65%,0.22)] shadow-2xl rounded-3xl flex flex-col">
        <DialogHeader className="p-4 sm:p-8 pb-4 border-b border-primary/10">
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
            {editingId ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
            Preencha os dados técnicos e comerciais do seu item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Tabs value={productTab} onValueChange={setProductTab} className="flex flex-col flex-1 min-h-0">
            
            <div className="relative border-b border-primary/10 bg-muted/5">
              <div ref={scrollRef} className="overflow-x-auto no-scrollbar px-10 py-3">
                <TabsList className="inline-flex w-auto min-w-full gap-2 h-auto p-0 bg-transparent">
                  {/* Note: O TabsTrigger agora brilha em vermelho automaticamente se o erro for nele */}
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="fiscal" className="flex gap-2"><Receipt className="h-3 w-3" /> Fiscal</TabsTrigger>
                  <TabsTrigger value="precos">Preços</TabsTrigger>
                  <TabsTrigger value="canais">Canais</TabsTrigger>
                  <TabsTrigger value="fidelidade">Fidelidade</TabsTrigger>
                  <TabsTrigger value="enologo">Enólogo</TabsTrigger>
                  <TabsTrigger value="opcionais">Opcionais</TabsTrigger>
                  <TabsTrigger value="disponibilidade" className="flex gap-2"><Clock className="h-3 w-3" /> Disponibilidade</TabsTrigger>
                  {isPizzaVisible && (
                    <TabsTrigger value="pizza" className="flex gap-2"><UtensilsCrossed className="h-3 w-3" /> Pizza</TabsTrigger>
                  )}
                </TabsList>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar pb-32">
              <TabsContent value="info"><TabInfo formData={formData} setFormData={setFormData} categories={categories} subcategories={subcategories} categoryInput={categoryInput} setCategoryInput={setCategoryInput} subcategoryInput={subcategoryInput} setSubcategoryInput={setSubcategoryInput} /></TabsContent>
              <TabsContent value="detalhes"><TabDetails formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="fiscal"><TabFiscal formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="precos"><TabPrices formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="canais"><TabChannels formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="fidelidade"><TabLoyalty formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="enologo"><TabEnologist formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="opcionais"><TabOptionals formData={formData} onToggleGroup={onToggleOptionGroup} groups={optionGroups} isLoading={loadingOptionGroups} /></TabsContent>
              <TabsContent value="disponibilidade"><TabAvailability formData={formData} setFormData={setFormData} /></TabsContent>
              <TabsContent value="pizza"><TabPizza {...pizzaProps} /></TabsContent>
            </div>
          </Tabs>

          <div className="p-4 sm:p-8 border-t border-primary/10 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px]">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto h-12 px-8 font-black uppercase tracking-widest bg-primary text-white rounded-xl shadow-lg">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}