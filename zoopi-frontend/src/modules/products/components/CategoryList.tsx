import { useState } from "react";
import { 
  Tag, 
  ChevronDown, 
  ChevronRight, 
  Pencil, 
  Trash2, 
  Package, 
  Layers, 
  Loader2, 
  Sparkles, 
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Category, Subcategory, Product } from "../types";

interface CategoryListProps {
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  onView: (product: Product) => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: string, name: string) => void;
  onUpdateCategory: (id: string, data: Partial<Category>) => void;
  onEditSubcategory: (sub: Subcategory) => void;
  onDeleteSubcategory: (id: string, name: string) => void;
  onUpdateSubcategory: (id: string, data: Partial<Subcategory>) => void;
  onEditProduct: (prod: Product) => void;
  onDeleteProduct: (id: string, name: string) => void;
  onUpdateProduct: (id: string, data: Partial<Product>) => void;
  onApplyTemplate: (templateId: string) => void;
  isSubmitting: boolean;
  activeTemplate: string | null;
}

export function CategoryList({
  categories,
  subcategories,
  products,
  onEditCategory,
  onDeleteCategory,
  onUpdateCategory,
  onEditSubcategory,
  onDeleteSubcategory,
  onUpdateSubcategory,
  onEditProduct,
  onDeleteProduct,
  onView,
  onUpdateProduct,
  onApplyTemplate,
  isSubmitting,
  activeTemplate
}: CategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSubcategory = (id: string) => {
    setExpandedSubcategories(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: string | number) => {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount || 0);
  };

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-muted-foreground">
        <div className="p-6 bg-muted/50 rounded-full">
          <Tag className="h-12 w-12 opacity-20" />
        </div>
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-sm font-bold uppercase tracking-widest mb-2">Nenhuma categoria encontrada</p>
          <p className="text-[10px] font-medium opacity-70 mb-6">
            Você ainda não possui categorias cadastradas. Use um modelo para começar.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => onApplyTemplate('hamburgueria')} disabled={isSubmitting} className="h-11 font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-xl">
              {isSubmitting && activeTemplate === 'hamburgueria' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Hamburgueria
            </Button>
            <Button onClick={() => onApplyTemplate('pizzaria')} disabled={isSubmitting} variant="outline" className="h-11 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/10 rounded-xl">
              {isSubmitting && activeTemplate === 'pizzaria' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Pizzaria
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {categories.map((category) => {
        const isExpanded = expandedCategories.includes(category.id);
        const categorySubcategories = subcategories.filter(s => s.category_id === category.id || (s as any).categoryId === category.id);
        const categoryProducts = products.filter(p => {
          const pCatId = p.category_id || (p as any).categoryId || p.subcategory?.category_id || (p.subcategory as any)?.categoryId;
          return pCatId === category.id;
        });
        
        const productsWithoutSub = categoryProducts.filter(p => !p.subcategory_id || !categorySubcategories.some(s => s.id === p.subcategory_id));

        return (
          <div key={category.id} className="flex flex-col">
            {/* Category Header */}
            <div 
              className={cn("flex items-center justify-between p-6 cursor-pointer hover:bg-primary/[0.02] transition-colors group", isExpanded && "bg-primary/[0.01]")}
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-xl transition-all overflow-hidden flex items-center justify-center border border-border/50", isExpanded ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10")}>
                  {category.image_url ? <img src={category.image_url} alt={category.name} className="h-full w-full object-cover" /> : <Tag className="h-5 w-5" />}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" 
                      style={{
                        backgroundColor: `${category.color}`,
                        borderColor: `${category.color}`
                      }} />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{category.name}</h3>
                    <Badge variant="secondary" className="text-[9px] font-black px-1.5 h-4">{categoryProducts.length} ITENS</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">{categorySubcategories.length} SUBCATEGORIAS</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg border border-border/50">
                    <Switch checked={category.active} onCheckedChange={(checked) => onUpdateCategory(category.id, { active: checked })} className="scale-75 data-[state=checked]:bg-emerald-500" onClick={(e) => e.stopPropagation()} />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">{category.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id, category.name); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {isExpanded ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-muted/10">
                  <div className="pl-16 pr-6 pb-6 space-y-2">
                    
                    {/* Direct Products */}
                    {productsWithoutSub.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 pt-4">Produtos diretos</p>
                        {productsWithoutSub.map(p => (
                          <ProductItem key={p.id} product={p} onEdit={onEditProduct} onView={onView} onDelete={onDeleteProduct} onUpdate={onUpdateProduct} formatCurrency={formatCurrency} />
                        ))}
                      </div>
                    )}

                    {/* Subcategories */}
                    {categorySubcategories.length > 0 ? (
                      categorySubcategories.map(sub => {
                        const isSubExpanded = expandedSubcategories.includes(sub.id);
                        const subProducts = products.filter(p => p.subcategory_id === sub.id);

                        return (
                          <div key={sub.id} className="flex flex-col border border-border/50 rounded-2xl overflow-hidden bg-background/50 mb-2">
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/[0.02] group/sub" onClick={() => toggleSubcategory(sub.id)}>
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                <span className="text-xs font-bold text-foreground uppercase">{sub.name}</span>
                                <Badge variant="outline" className="text-[8px] font-bold px-1 h-3.5 border-border">{subProducts.length} PRODUTOS</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-2 py-1 bg-background rounded-lg border border-border/50">
                                  <Switch checked={sub.active} onCheckedChange={(checked) => onUpdateSubcategory(sub.id, { active: checked })} className="scale-75 data-[state=checked]:bg-emerald-500" onClick={(e) => e.stopPropagation()} />
                                  <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">{sub.active ? 'Ativo' : 'Inativo'}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                  
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); onEditSubcategory(sub); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteSubcategory(sub.id, sub.name); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                {isSubExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>
                            <AnimatePresence>
                              {isSubExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="p-4 pt-0 space-y-2">
                                    {subProducts.map(p => (
                                      <ProductItem key={p.id} product={p} onEdit={onEditProduct} onView={onView} onDelete={onDeleteProduct} onUpdate={onUpdateProduct} formatCurrency={formatCurrency} isSubItem />
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    ) : (
                       productsWithoutSub.length === 0 && <EmptyCategoryState onApplyTemplate={onApplyTemplate} isSubmitting={isSubmitting} activeTemplate={activeTemplate} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// Sub-component for individual Product Rows within the Accordion
function ProductItem({ product, onEdit, onView, onDelete, onUpdate, formatCurrency, isSubItem }: any) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-all group/item ",
        isSubItem ? "bg-muted/30 border-border/30 hover:bg-primary/[0.04] hover:border-primary/30" : "bg-primary/[0.03] border-primary/10 hover:bg-primary/[0.06] hover:border-primary/30"
      )}
    
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border border-border/50 overflow-hidden">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground/30" />}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
           
            <span className="text-[11px] font-bold text-foreground">{product.name}</span>
            {!product.active && <Badge variant="outline" className="text-[7px] font-black px-1 h-3 border-destructive/30 text-destructive bg-destructive/5 uppercase">Inativo</Badge>}
          </div>
          <span className="text-[9px] font-black text-primary">{formatCurrency(product.prices?.[0]?.price || 0)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1 bg-background rounded-lg border border-border/50">
          <Switch checked={product.active} onCheckedChange={(checked) => onUpdate(product.id, { active: checked })} className="scale-75 data-[state=checked]:bg-emerald-500" onClick={(e) => e.stopPropagation()} />
          <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">{product.active ? 'Ativo' : 'Inativo'}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <Button  variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); onView(product); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(product.id, product.name); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyCategoryState({ onApplyTemplate, isSubmitting, activeTemplate }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground bg-muted/5 rounded-2xl border border-dashed border-border/50">
      <div className="p-4 bg-muted/50 rounded-full">
        <Layers className="h-8 w-8 opacity-20" />
      </div>
      <div className="text-center max-w-xs mx-auto px-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Sem subcategorias</p>
        <p className="text-[9px] font-medium opacity-60 mb-4 uppercase">Gostaria de aplicar um modelo pronto?</p>
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={() => onApplyTemplate('hamburgueria')} disabled={isSubmitting} className="h-9 text-[9px] font-black uppercase tracking-widest bg-primary text-white rounded-lg">
            {isSubmitting && activeTemplate === 'hamburgueria' ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
            Usar Hamburgueria
          </Button>
          <Button size="sm" onClick={() => onApplyTemplate('pizzaria')} disabled={isSubmitting} variant="outline" className="h-9 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary rounded-lg">
            {isSubmitting && activeTemplate === 'pizzaria' ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
            Usar Pizzaria
          </Button>
        </div>
      </div>
    </div>
  );
}