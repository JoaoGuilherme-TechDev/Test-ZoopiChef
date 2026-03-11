import { UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface TabPizzaProps {
  // Sizes
  sizes: any[];
  loadingSizes: boolean;
  selectedPizzaSizes: string[];
  setSelectedPizzaSizes: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Flavors
  allFlavors: any[];
  loadingFlavors: boolean;
  selectedPizzaFlavors: string[];
  setSelectedPizzaFlavors: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Pricing Model
  pizzaPriceModel: 'highest' | 'average' | 'proportional';
  setPizzaPriceModel: (val: 'highest' | 'average' | 'proportional') => void;
  
  // Borders/Crust Types
  borderTypes: any[];
  selectedBorderTypeId: string;
  setSelectedBorderTypeId: (val: string) => void;
  selectedPizzaBorders: string[];
  setSelectedPizzaBorders: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Dough
  doughTypes: any[];
  selectedDoughTypes: string[];
  setSelectedDoughTypes: React.Dispatch<React.SetStateAction<string[]>>;
}

export function TabPizza({
  sizes,
  loadingSizes,
  selectedPizzaSizes,
  setSelectedPizzaSizes,
  allFlavors,
  loadingFlavors,
  selectedPizzaFlavors,
  setSelectedPizzaFlavors,
  pizzaPriceModel,
  setPizzaPriceModel,
  borderTypes,
  selectedBorderTypeId,
  setSelectedBorderTypeId,
  selectedPizzaBorders,
  setSelectedPizzaBorders,
  doughTypes,
  selectedDoughTypes,
  setSelectedDoughTypes
}: TabPizzaProps) {
  
  const toggleSelection = (id: string, state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    setState(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-10 p-2 sm:p-4">
      
      {/* 1. SIZES SECTION */}
      <section className="space-y-6 bg-background/80 rounded-3xl p-5 sm:p-6 ring-1 ring-primary/40 border border-[hsla(270,100%,65%,0.22)] shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              1. Tamanhos
            </h3>
            <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">
              Selecione os tamanhos disponíveis (multi-seleção).
            </p>
          </div>
          <Badge className="text-[10px] font-extrabold uppercase px-3 py-1 bg-primary/10 text-primary ring-1 ring-primary/30">
            {selectedPizzaSizes.length} selecionados
          </Badge>
        </div>

        {loadingSizes ? (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Carregando tamanhos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sizes.map((size) => {
              const selected = selectedPizzaSizes.includes(size.id);
              return (
                <button
                  type="button"
                  key={size.id}
                  onClick={() => toggleSelection(size.id, selectedPizzaSizes, setSelectedPizzaSizes)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all text-left group ring-1",
                    selected ? "bg-primary/[0.10] shadow-md shadow-primary/25 ring-2 ring-primary/60" : "bg-muted/10 hover:bg-muted/20 ring-border/30"
                  )}
                >
                  <div className="space-y-1">
                    <span className={cn("text-sm font-semibold uppercase tracking-wide block", selected ? "text-primary" : "text-foreground")}>
                      {size.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase">{size.slices} fatias</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase">Até {size.maxFlavors} sabores</span>
                    </div>
                  </div>
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-all ring-1", selected ? "bg-primary text-white ring-primary/50" : "bg-muted ring-transparent")}>
                    {selected && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. FLAVORS SECTION */}
      <section className="space-y-6 bg-background/70 rounded-3xl p-4 sm:p-5 ring-1 ring-primary/25 border border-[hsla(270,100%,65%,0.22)] shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              2. Sabores
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Vincule os sabores disponíveis para esta pizza</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-full text-[10px] font-black" onClick={() => setSelectedPizzaFlavors(allFlavors.filter(f => f.type === 'pizza').map(f => f.id))}>Todos</Button>
            <Button type="button" variant="outline" className="h-8 rounded-full text-[10px] font-black" onClick={() => setSelectedPizzaFlavors([])}>Limpar</Button>
            <Badge variant="secondary" className="text-[10px] rounded-full">{selectedPizzaFlavors.length} selecionados</Badge>
          </div>
        </div>

        {loadingFlavors ? (
          <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">Carregando sabores...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allFlavors.filter(f => f.type === "pizza").map((f) => {
              const selected = selectedPizzaFlavors.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => toggleSelection(f.id, selectedPizzaFlavors, setSelectedPizzaFlavors)}
                  className={cn(
                    "flex items-start justify-between p-4 rounded-2xl transition-all cursor-pointer",
                    selected ? "bg-primary/[0.08] shadow-md shadow-primary/10 ring-1 ring-primary/30" : "bg-muted/10 hover:bg-muted/20"
                  )}
                >
                  <div className="flex flex-col gap-1 pr-3">
                    <span className="text-sm font-semibold">{f.name}</span>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{f.description}</p>
                  </div>
                  {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. PRICE MODEL */}
      <section className="space-y-6 bg-background/80 rounded-3xl p-5 sm:p-6 ring-1 ring-primary/40 border border-[hsla(270,100%,65%,0.22)] shadow-lg">
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            3. Modelo de Preço
          </h3>
          <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">Cálculo para múltiplos sabores</p>
        </div>
        <RadioGroup value={pizzaPriceModel} onValueChange={(val: any) => setPizzaPriceModel(val)} className="space-y-3">
          {['highest', 'average', 'proportional'].map((model) => (
            <label key={model} className={cn("flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer", pizzaPriceModel === model ? "bg-primary/[0.10] text-primary ring-2 ring-primary/60" : "bg-muted/10 hover:bg-muted/20")}>
              <div className="flex items-center gap-3">
                <RadioGroupItem value={model} id={`price-${model}`} />
                <div>
                  <div className="text-sm font-bold uppercase">{model === 'highest' ? 'Maior preço' : model === 'average' ? 'Média' : 'Por fatias'}</div>
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </section>

      {/* 4. CRUST/BORDER TYPE */}
      <section className="space-y-6 bg-background/80 rounded-3xl p-5 sm:p-6 ring-1 ring-primary/40 border border-[hsla(270,100%,65%,0.22)] shadow-lg">
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            4. Tipo de Borda
          </h3>
          <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">Configuração de borda recheada</p>
        </div>
        <RadioGroup value={selectedBorderTypeId} onValueChange={setSelectedBorderTypeId} className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className={cn("flex items-center justify-between p-3 rounded-xl cursor-pointer", selectedBorderTypeId === 'none' ? "bg-primary/[0.10] text-primary ring-2 ring-primary/60" : "bg-muted/10 hover:bg-muted/20")}>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="none" id="border-none" />
              <span className="text-sm font-bold uppercase">Sem borda</span>
            </div>
          </label>
          {borderTypes.map((bt) => (
            <label key={bt.id} className={cn("flex items-center justify-between p-3 rounded-xl cursor-pointer", selectedBorderTypeId === bt.id ? "bg-primary/[0.10] text-primary ring-2 ring-primary/60" : "bg-muted/10 hover:bg-muted/20")}>
              <div className="flex items-center gap-3">
                <RadioGroupItem value={bt.id} id={`border-${bt.id}`} />
                <span className="text-sm font-bold uppercase">{bt.name}</span>
              </div>
            </label>
          ))}
        </RadioGroup>
      </section>

      {/* 5. DOUGH TYPES */}
      <section className="space-y-6 bg-background/70 rounded-3xl p-4 sm:p-5 ring-1 ring-primary/25 border border-[hsla(270,100%,65%,0.22)] shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            5. Tipos de Massa
          </h3>
          <Badge variant="secondary" className="text-[10px] rounded-full">{selectedDoughTypes.length} selecionadas</Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {doughTypes.map((dough) => (
            <button
              key={dough.id}
              type="button"
              onClick={() => toggleSelection(dough.id, selectedDoughTypes, setSelectedDoughTypes)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-all ring-1",
                selectedDoughTypes.includes(dough.id) ? "bg-primary/[0.10] text-primary font-extrabold ring-2 ring-primary/60" : "bg-muted/10 hover:bg-muted/20 text-muted-foreground font-bold"
              )}
            >
              <span className="text-sm uppercase">{dough.name}</span>
              {selectedDoughTypes.includes(dough.id) && <CheckCircle2 className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}