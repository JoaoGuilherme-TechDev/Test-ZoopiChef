import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Barcode, X, Settings as SettingsIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveProducts, Product } from '@/hooks/useProducts';
import { useProductOptionGroups, OptionGroup, SelectedOption, validateOptions, calculateTotalWithOptions } from '@/hooks/useProductOptions';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export interface CartItem {
  product: Product;
  quantity: number;
  options?: SelectedOption[];
  totalPrice: number;
  notes?: string;
}

interface SmartPOSProductSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (item: CartItem) => void;
}

export function SmartPOSProductSearch({ open, onOpenChange, onAddProduct }: SmartPOSProductSearchProps) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: products = [], isLoading } = useActiveProducts();
  const { data: optionGroups = [], isLoading: loadingOptions } = useProductOptionGroups(selectedProduct?.id);

  // Focus input when opening
  useEffect(() => {
    if (open && !selectedProduct) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, selectedProduct]);

  // Reset options when selecting new product
  useEffect(() => {
    setSelectedOptions([]);
  }, [selectedProduct?.id]);

  // Filter products - search by name, internal_code, or ean_code
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];

    const searchTerm = search.trim();
    const searchLower = searchTerm.toLowerCase();
    
    return products.filter(p => {
      // Match by name (case insensitive)
      const matchName = p.name.toLowerCase().includes(searchLower);
      
      // Match by internal code (case insensitive, partial match)
      const matchInternalCode = p.internal_code 
        ? p.internal_code.toLowerCase().includes(searchLower)
        : false;
      
      // Match by EAN code (exact prefix or contains - numeric)
      const matchEanCode = p.ean_code 
        ? p.ean_code.includes(searchTerm) || p.ean_code.startsWith(searchTerm)
        : false;
      
      // Match by numeric code directly (searches both internal and EAN)
      const isNumeric = /^\d+$/.test(searchTerm);
      const matchNumeric = isNumeric && (
        (p.internal_code && p.internal_code.includes(searchTerm)) ||
        (p.ean_code && p.ean_code.includes(searchTerm))
      );
      
      return matchName || matchInternalCode || matchEanCode || matchNumeric;
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
      handleSelectProduct(filteredProducts[0]);
    }
    if (e.key === 'Escape') {
      if (selectedProduct) {
        setSelectedProduct(null);
        setSearch('');
      } else {
        setSearch('');
        onOpenChange(false);
      }
    }
  }, [filteredProducts, selectedProduct, onOpenChange]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearch('');
  };

  const handleOptionChange = (group: OptionGroup, itemId: string, itemLabel: string, priceDelta: number) => {
    setSelectedOptions(prev => {
      const existingGroupIndex = prev.findIndex(o => o.group_id === group.id);
      
      if (group.type === 'single') {
        // Radio - replace selection
        if (existingGroupIndex >= 0) {
          const newOptions = [...prev];
          newOptions[existingGroupIndex] = {
            group_id: group.id,
            group_name: group.name,
            items: [{ id: itemId, label: itemLabel, price_delta: priceDelta }]
          };
          return newOptions;
        } else {
          return [...prev, {
            group_id: group.id,
            group_name: group.name,
            items: [{ id: itemId, label: itemLabel, price_delta: priceDelta }]
          }];
        }
      } else {
        // Checkbox - toggle
        if (existingGroupIndex >= 0) {
          const existingItems = prev[existingGroupIndex].items;
          const itemExists = existingItems.some(i => i.id === itemId);
          
          if (itemExists) {
            const newItems = existingItems.filter(i => i.id !== itemId);
            if (newItems.length === 0) {
              return prev.filter((_, i) => i !== existingGroupIndex);
            }
            const newOptions = [...prev];
            newOptions[existingGroupIndex] = { ...newOptions[existingGroupIndex], items: newItems };
            return newOptions;
          } else {
            // Check max selection
            if (existingItems.length >= group.max_select) {
              toast.error(`Máximo de ${group.max_select} opções neste grupo`);
              return prev;
            }
            const newOptions = [...prev];
            newOptions[existingGroupIndex] = {
              ...newOptions[existingGroupIndex],
              items: [...existingItems, { id: itemId, label: itemLabel, price_delta: priceDelta }]
            };
            return newOptions;
          }
        } else {
          return [...prev, {
            group_id: group.id,
            group_name: group.name,
            items: [{ id: itemId, label: itemLabel, price_delta: priceDelta }]
          }];
        }
      }
    });
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // Validate options
    const { valid, errors } = validateOptions(optionGroups, selectedOptions);
    if (!valid) {
      errors.forEach(err => toast.error(err));
      return;
    }

    const basePrice = selectedProduct.is_on_sale && selectedProduct.sale_price 
      ? selectedProduct.sale_price 
      : selectedProduct.price;
    
    const totalPrice = calculateTotalWithOptions(basePrice, selectedOptions);

    onAddProduct({
      product: selectedProduct,
      quantity: 1,
      options: selectedOptions.length > 0 ? selectedOptions : undefined,
      totalPrice,
    });

    setSelectedProduct(null);
    setSelectedOptions([]);
    setSearch('');
    
    // Keep dialog open for more products
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setSearch('');
    setSelectedProduct(null);
    setSelectedOptions([]);
    onOpenChange(false);
  };

  const basePrice = selectedProduct 
    ? (selectedProduct.is_on_sale && selectedProduct.sale_price ? selectedProduct.sale_price : selectedProduct.price)
    : 0;
  const totalWithOptions = calculateTotalWithOptions(basePrice, selectedOptions);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            {selectedProduct ? selectedProduct.name : 'Buscar Produto'}
          </DialogTitle>
        </DialogHeader>

        {!selectedProduct ? (
          // Search View
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                placeholder="Nome, código ou código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 bg-gray-800 border-gray-700 text-white h-12"
                autoFocus
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearch('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Barcode className="h-3 w-3" />
              <span>Leia o código de barras ou digite • ESC para fechar</span>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-center py-12 text-gray-400">
                    Carregando produtos...
                  </div>
                ) : !search.trim() ? (
                  <div className="text-center py-12 text-gray-500">
                    <Barcode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Digite para buscar produtos</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nenhum produto encontrado</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-primary cursor-pointer transition-all"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">{product.name}</span>
                          {product.is_on_sale && (
                            <Badge variant="destructive" className="text-xs">PROMO</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          {product.internal_code && <span>Cód: {product.internal_code}</span>}
                          {product.ean_code && <span className="flex items-center gap-1"><Barcode className="h-3 w-3" />{product.ean_code}</span>}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {product.is_on_sale && product.sale_price ? (
                          <>
                            <div className="text-xs text-gray-500 line-through">{formatPrice(product.price)}</div>
                            <div className="font-bold text-green-400">{formatPrice(product.sale_price)}</div>
                          </>
                        ) : (
                          <div className="font-bold text-white">{formatPrice(product.price)}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Options View
          <div className="p-4 space-y-4">
            {loadingOptions ? (
              <div className="text-center py-8 text-gray-400">
                Carregando opções...
              </div>
            ) : optionGroups.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>Produto sem opcionais</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-4 pr-2">
                  {optionGroups.map((group) => (
                    <div key={group.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{group.name}</span>
                        {group.required && (
                          <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        {group.type === 'single' 
                          ? 'Escolha uma opção'
                          : `Escolha de ${group.min_select} até ${group.max_select} opções`
                        }
                      </p>
                      
                      <div className="space-y-2">
                        {group.type === 'single' ? (
                          <RadioGroup
                            value={selectedOptions.find(o => o.group_id === group.id)?.items[0]?.id || ''}
                            onValueChange={(value) => {
                              const item = group.items?.find(i => i.id === value);
                              if (item) handleOptionChange(group, item.id, item.label, item.price_delta);
                            }}
                          >
                            {group.items?.map((item) => (
                              <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value={item.id} id={item.id} />
                                  <Label htmlFor={item.id} className="text-gray-300 cursor-pointer">
                                    {item.label}
                                  </Label>
                                </div>
                                {item.price_delta !== 0 && (
                                  <span className={item.price_delta > 0 ? 'text-green-400' : 'text-red-400'}>
                                    {item.price_delta > 0 ? '+' : ''}{formatPrice(item.price_delta)}
                                  </span>
                                )}
                              </div>
                            ))}</RadioGroup>
                        ) : (
                          group.items?.map((item) => {
                            const isSelected = selectedOptions
                              .find(o => o.group_id === group.id)
                              ?.items.some(i => i.id === item.id);
                            
                            return (
                              <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={item.id}
                                    checked={isSelected}
                                    onCheckedChange={() => handleOptionChange(group, item.id, item.label, item.price_delta)}
                                  />
                                  <Label htmlFor={item.id} className="text-gray-300 cursor-pointer">
                                    {item.label}
                                  </Label>
                                </div>
                                {item.price_delta !== 0 && (
                                  <span className={item.price_delta > 0 ? 'text-green-400' : 'text-red-400'}>
                                    {item.price_delta > 0 ? '+' : ''}{formatPrice(item.price_delta)}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Total and Actions */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total:</span>
                <span className="text-2xl font-bold text-green-400">
                  {formatPrice(totalWithOptions)}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-700"
                  onClick={() => setSelectedProduct(null)}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleAddToCart}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

