import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ViewMode, SortField } from "../types";

interface ProductFiltersProps {
  viewMode: ViewMode;
  setViewMode: (val: ViewMode) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  sortField: SortField;
  setSortField: (val: SortField) => void;
}

export function ProductFilters({ 
  viewMode, 
  setViewMode, 
  searchTerm, 
  setSearchTerm,
  sortField,
  setSortField
}: ProductFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-2 rounded-2xl border border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl w-full md:w-auto">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ver por</span>
          <Select value={viewMode} onValueChange={(val) => setViewMode(val as ViewMode)}>
            <SelectTrigger className="w-[140px] md:w-[160px] h-10 rounded-lg bg-background border border-border text-xs font-black uppercase tracking-widest">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="products">Produtos</SelectItem>
              <SelectItem value="categories">Categorias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Select */}
        {viewMode === "products" && (
          <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl w-full md:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtrar por</span>
            <Select value={sortField} onValueChange={(val) => setSortField(val as SortField)}>
              <SelectTrigger className="w-[140px] md:w-[160px] h-10 rounded-lg bg-background border border-border text-xs font-black uppercase tracking-widest">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="category">Categoria</SelectItem>
                <SelectItem value="price">Preço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Search Input */}
      {viewMode === "products" && (
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 bg-muted/30 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 text-xs"
          />
        </div>
      )} 
    </div>
  );
}