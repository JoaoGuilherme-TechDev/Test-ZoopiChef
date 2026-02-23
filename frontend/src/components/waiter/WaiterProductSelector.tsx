import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCompany } from '@/hooks/useCompany';
import { useTableCommandItems, TableCommand } from '@/hooks/useTableCommands';
import { useTableOrderProduction } from '@/hooks/useTableOrderProduction';
import { useCheckProductHasOptionals } from '@/hooks/useProductOptionalGroups';
import { ProductOptionalsDialog } from '@/components/orders/ProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { Search, Plus, Minus, Loader2, ShoppingCart, Settings2, Keyboard, Pizza } from 'lucide-react';
import { toast } from 'sonner';
interface WaiterProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tableId: string;
  tableNumber: number;
  commandId: string | null;
  commands: TableCommand[];
  onCreateCommand: (name?: string) => Promise<void>;
  onOrderComplete?: () => void; // Callback when order is successfully sent
}

interface SelectedOptional {
  groupId: string;
  groupName: string;
  items: Array<{
    id: string;
    label: string;
    price: number;
    quantity?: number;
  }>;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // em reais
  notes?: string;
  optionsJson?: any;
  optionsDescription?: string;
}

export function WaiterProductSelector({
  open,
  onOpenChange,
  sessionId,
  tableId,
  tableNumber,
  commandId,
  commands,
  onCreateCommand,
  onOrderComplete,
}: WaiterProductSelectorProps) {
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(commandId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showOptionalsDialog, setShowOptionalsDialog] = useState(false);
  const [productForOptionals, setProductForOptionals] = useState<{ id: string; name: string; price: number } | null>(null);
  
  // Pizza state
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [pizzaProduct, setPizzaProduct] = useState<{ id: string; name: string; price: number; subcategory?: any } | null>(null);

  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const { data: company } = useCompany();
  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const { checkProduct } = useCheckProductHasOptionals();

  const { addItem } = useTableCommandItems(selectedCommandId || undefined);
  const { createTableOrder } = useTableOrderProduction();

  // Update selected command when prop changes
  useEffect(() => {
    setSelectedCommandId(commandId);
  }, [commandId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  useEffect(() => {
    console.log('[WaiterProductSelector] open=', open);
    console.log('[WaiterProductSelector] categories=', categories.length);
    console.log('[WaiterProductSelector] products=', products.length);
    console.log('[WaiterProductSelector] selectedCategoryId=', selectedCategoryId);
    if (products[0]) console.log('[WaiterProductSelector] sample product=', products[0]);
    if (productsQuery.error) console.log('[WaiterProductSelector] products error=', productsQuery.error);
    if (categoriesQuery.error) console.log('[WaiterProductSelector] categories error=', categoriesQuery.error);
  }, [open, categories.length, products.length, selectedCategoryId, productsQuery.error, categoriesQuery.error]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;

      if (selectedCategoryId) {
        const categoryIdFromProduct =
          p.subcategory?.category_id ??
          p.subcategory?.category?.id ??
          (p.subcategory as any)?.category_id;

        if (categoryIdFromProduct !== selectedCategoryId) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesCode = p.internal_code?.toLowerCase().includes(term);
        const matchesEan = p.ean_code?.includes(term);
        if (!matchesName && !matchesCode && !matchesEan) return false;
      }
      return true;
    });
  }, [products, searchTerm, selectedCategoryId]);

  const updateCart = (product: { id: string; name: string; price: number }, delta: number) => {
    setCart(prev => {
      const current = prev[product.id]?.quantity || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [product.id]: {
          productId: product.id,
          productName: product.name,
          quantity: newQty,
          unitPrice: prev[product.id]?.unitPrice ?? product.price,
          notes: prev[product.id]?.notes || '',
          optionsJson: prev[product.id]?.optionsJson,
          optionsDescription: prev[product.id]?.optionsDescription,
        }
      };
    });
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
  };

  const handleSelectProduct = async (product: { id: string; name: string; price: number; subcategory?: any }) => {
    // PIZZA CHECK FIRST - STRICT: Only category name === "Pizza" enables pizza behavior
    if (isPizzaCategory(product)) {
      setPizzaProduct(product);
      setShowPizzaDialog(true);
      return;
    }
    
    // IMPORTANT: if the optionals check hangs on mobile/network, we still need to add the product.
    try {
      const hasOptionals = await withTimeout(checkProduct(product.id), 1200);
      if (hasOptionals) {
        setProductForOptionals(product);
        setShowOptionalsDialog(true);
        return;
      }
      updateCart(product, 1);
    } catch {
      // fallback: adiciona sem opcionais
      updateCart(product, 1);
    }
  };
  
  // Handle pizza confirmation
  const handlePizzaConfirm = (selection: any) => {
    if (!pizzaProduct) return;
    
    // Build notes string including removed ingredients and observations
    const flavorsDetails = (selection.flavors || []).map((f: any) => {
      let detail = f.name;
      if (f.removedIngredients?.length > 0) {
        detail += ` (sem ${f.removedIngredients.join(', ')})`;
      }
      if (f.observation) {
        detail += ` [${f.observation}]`;
      }
      return detail;
    }).join(', ');
    
    const borderNote = selection.selectedBorder ? ` | Borda: ${selection.selectedBorder.name}` : '';
    const doughTypeNote = selection.selectedDoughType ? ` | Massa: ${selection.selectedDoughType.name}` : '';
    const borderTypeNote = selection.selectedBorderType ? ` | Tipo Borda: ${selection.selectedBorderType.name}` : '';
    const optionalsNote = selection.selectedOptionals?.length > 0 
      ? ` | Adicionais: ${selection.selectedOptionals.map((o: any) => `${o.quantity}x ${o.name}`).join(', ')}`
      : '';
    
    const doughDelta = selection.selectedDoughType?.price_delta || 0;
    const borderTypeDelta = selection.selectedBorderType?.price_delta || 0;
    const totalPrice = (selection.totalPrice || 0) + (selection.borderTotal || 0) + (selection.optionalsTotal || 0) + doughDelta + borderTypeDelta;
    const description = `${selection.size} - ${flavorsDetails}${doughTypeNote}${borderNote}${borderTypeNote}${optionalsNote}`;
    
    setCart(prev => {
      const uniqueKey = `${pizzaProduct.id}_pizza_${Date.now()}`;
      return {
        ...prev,
        [uniqueKey]: {
          productId: pizzaProduct.id,
          productName: pizzaProduct.name,
          quantity: 1,
          unitPrice: totalPrice,
          notes: description,
          optionsJson: {
            pizza_snapshot: {
              size: selection.size,
              pricing_model: selection.pricing_model,
              selected_flavors: selection.flavors || [],
              selected_border: selection.selectedBorder || null,
              border_total: selection.borderTotal || 0,
              selected_optionals: selection.selectedOptionals || [],
              optionals_total: selection.optionalsTotal || 0,
              selected_dough_type: selection.selectedDoughType || null,
              selected_border_type: selection.selectedBorderType || null,
            },
          },
          optionsDescription: description,
        },
      };
    });
    
    setPizzaProduct(null);
    setShowPizzaDialog(false);
  };

  const handleOptionalsConfirm = (selectedOptionals: SelectedOptional[], totalPrice: number, optionalsDescription: string) => {
    if (!productForOptionals) return;

    const optionsJson = selectedOptionals.map(group => ({
      groupId: group.groupId,
      groupName: group.groupName,
      items: group.items.map(item => ({
        id: item.id,
        label: item.label,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    }));

    setCart(prev => ({
      ...prev,
      [productForOptionals.id]: {
        productId: productForOptionals.id,
        productName: productForOptionals.name,
        quantity: (prev[productForOptionals.id]?.quantity || 0) + 1,
        unitPrice: totalPrice,
        notes: optionalsDescription,
        optionsJson,
        optionsDescription: optionalsDescription,
      }
    }));

    setProductForOptionals(null);
    setShowOptionalsDialog(false);
  };

  const cartTotal = Object.values(cart).reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity), 0
  );

  const cartItemsCount = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity, 0
  );

  const handleSubmit = async () => {
    if (Object.keys(cart).length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    setIsSubmitting(true);

    try {
      // If no command selected, create one automatically
      let targetCommandId = selectedCommandId;

      if (!targetCommandId) {
        const openCommands = commands.filter(c => c.status === 'open');
        if (openCommands.length === 0) {
          await onCreateCommand();
          onOpenChange(false);
          setCart({});
          return;
        }
        targetCommandId = openCommands[0].id;
      }

      // Add items to command
      for (const item of Object.values(cart)) {
        await addItem.mutateAsync({
          commandId: targetCommandId,
          sessionId,
          tableId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.unitPrice * 100),
          notes: item.optionsDescription || item.notes || undefined,
        });
      }

      // Create order for production (KDS)
      const selectedCommand = commands.find(c => c.id === targetCommandId);
      await createTableOrder.mutateAsync({
        sessionId,
        tableId,
        tableNumber,
        commandNumber: selectedCommand?.number || 1,
        commandName: selectedCommand?.name,
        items: Object.values(cart).map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.unitPrice * 100),
          notes: item.optionsDescription || item.notes,
          selectedOptionsJson: item.optionsJson,
        })),
      });

       // sem toast de sucesso (usuário não quer balões)
      setCart({});
      onOpenChange(false);
      
      // Navigate back to tables map
      if (onOrderComplete) {
        onOrderComplete();
      }
    } catch (error) {
      toast.error('Erro ao enviar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Adicionar Produtos - Mesa {tableNumber}</DialogTitle>
          </DialogHeader>

          {/* Command Selector */}
          <div className="px-4 py-2 border-b">
            <Select
              value={selectedCommandId || 'auto'}
              onValueChange={(v) => setSelectedCommandId(v === 'auto' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a comanda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Comanda automática</SelectItem>
                {commands.filter(c => c.status === 'open').map((cmd) => (
                  <SelectItem key={cmd.id} value={cmd.id}>
                    {cmd.name ? `${cmd.name} (${cmd.number})` : `Comanda ${cmd.number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search and Category Filter */}
          <div className="px-4 py-2 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou EAN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <div
              className="w-full overflow-x-auto whitespace-nowrap"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex gap-2 pb-2">
                <Badge
                  variant={selectedCategoryId === null ? 'default' : 'outline'}
                  className="cursor-pointer shrink-0"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => setSelectedCategoryId(null)}
                >
                  Todos
                </Badge>
                {categories.filter(c => c.active).map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                    className="cursor-pointer shrink-0"
                    style={{ touchAction: 'manipulation' }}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Products List */}
          <div
            className="flex-1 overflow-y-auto px-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="space-y-2 py-2">
              {(productsQuery.isLoading || categoriesQuery.isLoading) && (
                <div className="py-10 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Carregando produtos...
                </div>
              )}

              {(productsQuery.isError || categoriesQuery.isError) && (
                <div className="py-10 text-sm text-destructive">
                  Erro ao carregar produtos/categorias.
                </div>
              )}

              {!productsQuery.isLoading && !categoriesQuery.isLoading && filteredProducts.length === 0 && (
                <div className="py-10 text-sm text-muted-foreground">
                  Nenhum produto encontrado para este filtro.
                </div>
              )}

              {filteredProducts.map((product) => {
                const inCart = cart[product.id]?.quantity || 0;
                const hasOptionsSelected = !!cart[product.id]?.optionsJson;

                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    style={{ touchAction: 'manipulation' }}
                    onClick={() => handleSelectProduct(product)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelectProduct(product);
                    }}
                    className={`p-3 border rounded-lg flex items-center gap-3 select-none cursor-pointer active:scale-[0.99] transition-transform ${
                      inCart > 0 ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    {/* Product Image */}
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-14 h-14 rounded-lg object-cover"
                        loading="lazy"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                        {isPizzaCategory(product) && (
                          <Badge variant="secondary" className="text-[10px] bg-orange-500/20 text-orange-600">
                            <Pizza className="h-3 w-3 mr-1" />
                            Pizza
                          </Badge>
                        )}
                        {hasOptionsSelected && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Settings2 className="h-3 w-3 mr-1" />
                            Opcionais
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {inCart > 0 ? (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            style={{ touchAction: 'manipulation' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCart(product, -1);
                            }}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{inCart}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            style={{ touchAction: 'manipulation' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCart(product, 1);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          style={{ touchAction: 'manipulation' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProduct(product);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Summary & Submit */}
          <div className="p-4 border-t bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>{cartItemsCount} itens</span>
              </div>
              <span className="text-xl font-bold">{formatCurrency(cartTotal)}</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={cartItemsCount === 0 || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar para Produção
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Keyboard className="h-3 w-3" />
              Digite o código ou EAN para buscar rapidamente
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {productForOptionals && (
        <ProductOptionalsDialog
          open={showOptionalsDialog}
          onOpenChange={(next) => {
            setShowOptionalsDialog(next);
            if (!next) setProductForOptionals(null);
          }}
          product={productForOptionals}
          onConfirm={handleOptionalsConfirm}
        />
      )}
      
      {/* Pizza Configurator Dialog */}
      {pizzaProduct && (
        <PizzaConfiguratorDialog
          open={showPizzaDialog}
          onClose={() => {
            setShowPizzaDialog(false);
            setPizzaProduct(null);
          }}
          companyId={company?.id}
          productId={pizzaProduct.id}
          productName={pizzaProduct.name}
          onConfirm={handlePizzaConfirm}
        />
      )}
    </>
  );
}
