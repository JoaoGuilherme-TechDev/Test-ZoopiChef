
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ProductFormData, Category, Subcategory } from "../../../types";

interface TabInfoProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  categories: Category[];
  subcategories: Subcategory[];
  categoryInput: string;
  setCategoryInput: (val: string) => void;
  subcategoryInput: string;
  setSubcategoryInput: (val: string) => void;
}

export function TabInfo({
  formData,
  setFormData,
  categories,
  subcategories,
  categoryInput,
  setCategoryInput,
  subcategoryInput,
  setSubcategoryInput
}: TabInfoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);
  const [isSubcategoryFocused, setIsSubcategoryFocused] = useState(false);

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

  const isUuid = (id: string | undefined): boolean => 
    Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-widest">Imagem do Produto</Label>
        <div
          className="aspect-square max-h-[150px] max-w-sm rounded-3xl bg-muted/20 border-2 border-dashed border-primary/20 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/40 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          {formData.image_url ? (
            <>
              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[8px] font-black uppercase text-white tracking-widest">Alterar</span>
              </div>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">
                Upload Imagem
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Nome Exibição <span className="text-destructive">*</span>
          </Label>
          <Input 
            placeholder="Ex: Pizza Calabresa G" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Nome para Nota/Cozinha</Label>
          <Input 
            placeholder="Ex: PIZZA CALAB G" 
            className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
            value={formData.display_name}
            onChange={(e) => setFormData({...formData, display_name: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Tipo <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={formData.type}
            onValueChange={(val: any) => setFormData({...formData, type: val})}
          >
            <SelectTrigger className="h-12 w-full bg-muted/30 border border-primary/40 rounded-xl">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simples</SelectItem>
              <SelectItem value="pizza">Pizza</SelectItem>
              <SelectItem value="combo">Combo</SelectItem>
              <SelectItem value="additional">Adicional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Search Input */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">
            Categoria <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
              value={categoryInput}
              onChange={(e) => {
                const value = e.target.value;
                setCategoryInput(value);
                setFormData({ ...formData, category_id: value, subcategory_id: "" });
              }}
              onFocus={() => setIsCategoryFocused(true)}
              onBlur={() => setTimeout(() => setIsCategoryFocused(false), 200)}
              placeholder="Digite ou selecione"
              required
              autoComplete="off"
            />
            {(() => {
              const filtered = categories.filter(cat => 
                categoryInput.trim() === "" || cat.name.toLowerCase().includes(categoryInput.toLowerCase())
              );
              if (isCategoryFocused && filtered.length > 0) {
                return (
                  <div className="absolute z-20 mt-1 max-h-48 w-full rounded-md border border-primary bg-popover text-popover-foreground shadow-lg overflow-auto animate-in fade-in zoom-in-95 duration-100">
                    {filtered.map(cat => (
                      <div
                        key={cat.id}
                        className="px-3 py-2.5 cursor-pointer hover:bg-primary/10 text-xs font-bold uppercase tracking-tight transition-colors border-b border-border/50 last:border-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCategoryInput(cat.name);
                          setFormData({ ...formData, category_id: cat.id, subcategory_id: "" });
                          setSubcategoryInput("");
                        }}
                      >
                        {cat.name}
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Subcategory Search Input */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Subcategoria</Label>
          <div className="relative">
            <Input
              className="h-12 bg-muted/30 border border-primary/40 rounded-xl"
              value={subcategoryInput}
              onChange={(e) => {
                const value = e.target.value;
                setSubcategoryInput(value);
                setFormData({ ...formData, subcategory_id: value });
              }}
              onFocus={() => setIsSubcategoryFocused(true)}
              onBlur={() => setTimeout(() => setIsSubcategoryFocused(false), 200)}
              placeholder={formData.category_id ? "Digite ou selecione" : "Selecione a categoria primeiro"}
              autoComplete="off"
              disabled={!formData.category_id}
            />
            {(() => {
              const resolvedCat = categories.find(c => c.id === formData.category_id || c.name === formData.category_id)?.id || formData.category_id;
              const filtered = subcategories.filter(sub => {
                const matchesCat = sub.category_id === resolvedCat;
                const matchesSearch = subcategoryInput.trim() === "" || sub.name.toLowerCase().includes(subcategoryInput.toLowerCase());
                return matchesCat && matchesSearch;
              });

              if (formData.category_id && isSubcategoryFocused && filtered.length > 0) {
                return (
                  <div className="absolute z-20 mt-1 max-h-48 w-full rounded-md border border-primary bg-popover text-popover-foreground shadow-lg overflow-auto animate-in fade-in zoom-in-95 duration-100">
                    {filtered.map(sub => (
                      <div
                        key={sub.id}
                        className="px-3 py-2.5 cursor-pointer hover:bg-primary/10 text-xs font-bold uppercase tracking-tight transition-colors border-b border-border/50 last:border-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSubcategoryInput(sub.name);
                          setFormData({ ...formData, subcategory_id: sub.id });
                        }}
                      >
                        {sub.name}
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest">Local de Produção</Label>
          <Select 
            value={formData.production_location }
            onValueChange={(val) => setFormData({...formData, production_location: val})}
          >
            <SelectTrigger className="h-12 w-full bg-muted/30 border border-primary/40 rounded-xl">
              <SelectValue placeholder="Cozinha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cozinha">Cozinha</SelectItem>
              <SelectItem value="bar">Bar / Bebidas</SelectItem>
              <SelectItem value="copa">Copa</SelectItem>
              <SelectItem value="churrasqueira">Churrasqueira</SelectItem>
              <SelectItem value="forno">Forno de Pizza</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}