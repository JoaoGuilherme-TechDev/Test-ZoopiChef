import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Barcode, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useActiveProducts, Product } from '@/hooks/useProducts';

interface PDVProductSearchProps {
  onAddProduct: (product: Product) => void;
  showSearch: boolean;
  onToggleSearch: (show: boolean) => void;
}

export function PDVProductSearch({ onAddProduct, showSearch, onToggleSearch }: PDVProductSearchProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: products = [], isLoading } = useActiveProducts();

  // Focar no input quando abrir busca
  useEffect(() => {
    if (showSearch) {
      inputRef.current?.focus();
    }
  }, [showSearch]);

  // Filtrar produtos - só mostra se houver busca
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];

    const searchLower = search.toLowerCase().trim();
    
    return products.filter(p => {
      const matchName = p.name.toLowerCase().includes(searchLower);
      const matchInternalCode = p.internal_code?.includes(searchLower);
      const matchEanCode = p.ean_code?.includes(searchLower);
      return matchName || matchInternalCode || matchEanCode;
    }).slice(0, 20);
  }, [products, search]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length === 1) {
      onAddProduct(filteredProducts[0]);
      setSearch('');
    }
    if (e.key === 'Escape') {
      setSearch('');
      onToggleSearch(false);
    }
  }, [filteredProducts, onAddProduct, onToggleSearch]);

  const handleAddAndClear = (product: Product) => {
    onAddProduct(product);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setSearch('');
    onToggleSearch(false);
  };

  if (!showSearch) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header da busca */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Digite o nome, código ou leia o código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 h-14 text-xl"
              autoFocus
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14"
            onClick={handleClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Barcode className="h-4 w-4" />
          <span>Leia o código de barras ou digite para buscar • ESC para fechar</span>
        </div>
      </div>

      {/* Lista de produtos */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando produtos...
            </div>
          ) : !search.trim() ? (
            <div className="text-center py-12 text-muted-foreground">
              <Barcode className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Digite para buscar produtos</p>
              <p className="text-sm">ou leia o código de barras</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhum produto encontrado</p>
              <p className="text-sm">Tente outro termo de busca</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary cursor-pointer transition-all group"
                onClick={() => handleAddAndClear(product)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg truncate">{product.name}</span>
                    {product.is_on_sale && (
                      <Badge variant="destructive" className="text-xs">PROMO</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {product.internal_code && (
                      <span>Cód: {product.internal_code}</span>
                    )}
                    {product.ean_code && (
                      <span className="flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        {product.ean_code}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {product.is_on_sale && product.sale_price ? (
                      <>
                        <div className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </div>
                        <div className="font-bold text-xl text-green-500">
                          {formatPrice(product.sale_price)}
                        </div>
                      </>
                    ) : (
                      <div className="font-bold text-xl">{formatPrice(product.price)}</div>
                    )}
                  </div>
                  <Button 
                    size="lg" 
                    className="h-12 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
