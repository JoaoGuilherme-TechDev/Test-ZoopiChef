import { 
  Package, 
  ArrowUpDown, 
  Pencil, 
  Trash2, 
  Loader2, 
  Sparkles,
  Eye,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Product, SortField, SortOrder } from "../types";

interface ProductTableProps {
  products: Product[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (id: string, name: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onApplyTemplate: (templateId: string) => void;
  isSubmitting: boolean;
  activeTemplate: string | null;
}

export function ProductTable({
  products,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onView,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  onApplyTemplate,
  isSubmitting,
  activeTemplate
}: ProductTableProps) {
  
  const formatCurrency = (value: string | number) => {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(amount || 0);
  };

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th 
                className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground "
              >
                <div className="flex items-center gap-2">
                  Produto 
                </div>
              </th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código</th>
              <th 
                className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground "
              >
                <div className="flex items-center gap-2">
                  Preço
                 
                </div>
              </th>
              <th 
                className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground "
                
              >
                <div className="flex items-center gap-2">
                  Categoria
                  
                </div>
              </th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {products.length > 0 ? (
              products.map((product) => (
                <tr 
                  key={product.id} 
                  className="group hover:bg-primary/[0.04] transition-colors "
           
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border/50">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {product.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">
                          {product.description || "Sem descrição"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <code className="text-[10px] font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                      {product.internal_code || product.sku || "N/A"}
                    </code>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      {product.is_on_sale && product.sale_price ? (
                        <>
                          <span className="text-[14px] font-bold text-muted-foreground line-through opacity-60">
                            {product.prices?.[0]?.price ? formatCurrency(product.prices[0].price) : "R$ 0,00"}
                          </span>
                          <span className="text-sm font-black text-emerald-500 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {formatCurrency(product.sale_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-black text-foreground">
                          {product.prices?.[0]?.price
                            ? formatCurrency(product.prices[0].price)
                            : "R$ 0,00"
                          }
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <Badge 
                      variant="outline" 
                      className="w-fit text-[9px] font-black uppercase"
                      style={{
                        backgroundColor: product.category?.color ? `${product.category.color}15` : undefined,
                        color: product.category?.color || undefined,
                        borderColor: product.category?.color ? `${product.category.color}` : undefined
                      }}
                    >
                      {product.category?.name || "Geral"}
                    </Badge>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); onView(product); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full hover:bg-red-500/10 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); onDelete(product.id, product.name); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center py-24 gap-6 text-muted-foreground">
                    <div className="p-6 bg-muted/50 rounded-full">
                      <Package className="h-12 w-12 opacity-20" />
                    </div>
                    <div className="text-center max-w-md mx-auto px-6">
                      <p className="text-sm font-bold uppercase tracking-widest mb-2">Nenhum produto encontrado</p>
                      <p className="text-[10px] font-medium opacity-70 mb-6">
                        Você ainda não possui produtos cadastrados. Gostaria de usar o modelo de uma hamburgueria ou pizzaria para começar?
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={() => onApplyTemplate('hamburgueria')}
                          disabled={isSubmitting}
                          className="h-11 font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-xl"
                        >
                          {isSubmitting && activeTemplate === 'hamburgueria' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          Hamburgueria
                        </Button>
                        <Button 
                          onClick={() => onApplyTemplate('pizzaria')}
                          disabled={isSubmitting}
                          variant="outline"
                          className="h-11 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
                        >
                          {isSubmitting && activeTemplate === 'pizzaria' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          Pizzaria
                        </Button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-6 border-t border-border/50 bg-muted/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-border"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-border"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}