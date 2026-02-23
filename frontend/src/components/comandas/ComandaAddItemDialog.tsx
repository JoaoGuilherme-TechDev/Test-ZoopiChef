import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, Loader2, ChefHat, X, Image } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useComandaItemMutations } from '@/hooks/useComandaItems';
import { useComandaOrderProduction } from '@/hooks/useComandaOrderProduction';
import { useCheckProductHasOptionals } from '@/hooks/useProductOptionalGroups';
import { ProductOptionalsDialog } from '@/components/orders/ProductOptionalsDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ComandaAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandaId: string;
  commandNumber: number;
  commandName?: string | null;
  onSuccess: () => void;
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
  unitPrice: number;
  notes?: string;
  optionsJson?: any;
  optionsDescription?: string;
  imageUrl?: string;
}

export function ComandaAddItemDialog({
  open,
  onOpenChange,
  comandaId,
  commandNumber,
  commandName,
  onSuccess,
}: ComandaAddItemDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [showOptionalsDialog, setShowOptionalsDialog] = useState(false);
  const [productForOptionals, setProductForOptionals] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: subcategories = [] } = useSubcategories();
  const { addItem } = useComandaItemMutations();
  const { createComandaOrder } = useComandaOrderProduction();
  const { checkProduct } = useCheckProductHasOptionals();

  const activeProducts = products.filter((p: any) => p.active);

  const filteredProducts = activeProducts.filter((product: any) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase());
    const matchesSubcategory =
      selectedSubcategoryId === null || product.subcategory_id === selectedSubcategoryId;
    return matchesSearch && matchesSubcategory;
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleSelectProduct = async (product: any) => {
    const hasOptionals = await checkProduct(product.id);
    
    if (hasOptionals) {
      setProductForOptionals(product);
      setShowOptionalsDialog(true);
    } else {
      // Add directly to cart
      addToCart({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        imageUrl: product.image_url,
      });
    }
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      // Group identical items in the cart (same product + same optionals + same notes)
      const optionsKey = item.optionsJson ? JSON.stringify(item.optionsJson) : '';
      const notesKey = (item.optionsDescription || item.notes || '').trim();

      const existingIndex = prev.findIndex((i) => {
        const iOptionsKey = i.optionsJson ? JSON.stringify(i.optionsJson) : '';
        const iNotesKey = (i.optionsDescription || i.notes || '').trim();
        return i.productId === item.productId && iOptionsKey === optionsKey && iNotesKey === notesKey;
      });
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += item.quantity;
        return updated;
      }
      
      return [...prev, item];
    });
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity += delta;
      if (updated[index].quantity <= 0) {
        updated.splice(index, 1);
      }
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionalsConfirm = async (
    selectedOptionals: SelectedOptional[],
    totalPrice: number,
    optionalsDescription: string
  ) => {
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

    addToCart({
      productId: productForOptionals.id,
      productName: productForOptionals.name,
      quantity: 1,
      unitPrice: totalPrice,
      optionsJson,
      optionsDescription: optionalsDescription,
      imageUrl: productForOptionals.image_url,
    });

    setProductForOptionals(null);
    setShowOptionalsDialog(false);
  };

  const handleSendToProduction = async () => {
    if (cart.length === 0) return;

    setIsSending(true);
    // toast.info removed to reduce notification spam

    try {
      // 1. Add items to comanda_items table
      for (const item of cart) {
        await addItem.mutateAsync({
          comandaId,
          productId: item.productId,
          productName: item.productName,
          qty: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.optionsDescription || item.notes,
          optionsJson: item.optionsJson,
        });
      }

      // 2. Create order for KDS production
      await createComandaOrder.mutateAsync({
        comandaId,
        commandNumber,
        commandName,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.optionsDescription || item.notes,
          optionsJson: item.optionsJson,
        })),
      });

      // sem toast de sucesso (usuário não quer balões)
      setCart([]);
      // Keep dialog open - don't call onSuccess to close it
    } catch (error) {
      console.error('Error sending to production:', error);
      toast.error('Erro ao enviar para produção');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (cart.length > 0) {
      if (!confirm('Existem itens no carrinho. Deseja sair e perder os itens?')) {
        return;
      }
    }
    setCart([]);
    setSearch('');
    setSelectedSubcategoryId(null);
    setProductForOptionals(null);
    setShowOptionalsDialog(false);
    onOpenChange(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity * 100, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Lançar Itens - Comanda {commandName || `#${commandNumber}`}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
            {/* Left: Product Selection */}
            <div className="col-span-2 flex flex-col min-h-0 overflow-hidden">
              <div className="space-y-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>

                {/* Subcategorias em Badges com scroll horizontal nativo */}
                <div className="w-full overflow-x-auto whitespace-nowrap">
                  <div className="flex gap-2 pb-2">
                    <Badge
                      variant={selectedSubcategoryId === null ? 'default' : 'outline'}
                      className="cursor-pointer whitespace-nowrap px-3 py-1"
                      onClick={() => setSelectedSubcategoryId(null)}
                    >
                      Todos
                    </Badge>
                    {subcategories.filter(s => s.active).map((sub) => (
                      <Badge
                        key={sub.id}
                        variant={selectedSubcategoryId === sub.id ? 'default' : 'outline'}
                        className="cursor-pointer whitespace-nowrap px-3 py-1"
                        onClick={() => setSelectedSubcategoryId(sub.id)}
                      >
                        {sub.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product grid com scroll nativo */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                {productsLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-24 animate-pulse bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filteredProducts.map((product: any) => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={cn(
                          'p-3 rounded-lg border-2 text-left transition-all cursor-pointer',
                          'bg-card hover:bg-accent hover:border-primary/50'
                        )}
                      >
                        <div className="flex gap-2">
                          {/* Product image */}
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Image className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm line-clamp-2">{product.name}</div>
                            <div className="text-sm font-bold text-primary mt-1">
                              {formatCurrency(product.price * 100)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cart */}
            <div className="border-l-2 border-primary/20 pl-4 flex flex-col bg-muted/30 rounded-r-lg min-h-0 overflow-hidden">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                Carrinho
                {cartItemsCount > 0 && (
                  <Badge variant="secondary">{cartItemsCount} itens</Badge>
                )}
              </h4>

              {/* Cart items com scroll nativo */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Clique nos produtos para adicionar
                    </p>
                  ) : (
                    cart.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 bg-background rounded-lg border space-y-1"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {item.productName}
                            </div>
                            {item.optionsDescription && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.optionsDescription}
                              </div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromCart(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(index, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(index, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(item.unitPrice * item.quantity * 100)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {cart.length > 0 && (
                <div className="pt-4 border-t mt-4 space-y-3">
                  <div className="flex justify-between p-2 bg-primary/10 rounded-lg">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(cartTotal)}</span>
                  </div>
                  
                  <Button
                    className="w-full h-11"
                    disabled={isSending}
                    onClick={handleSendToProduction}
                  >
                    {isSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChefHat className="mr-2 h-4 w-4" />
                    )}
                    Lançar Pedido
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Optionals Dialog */}
      {productForOptionals && (
        <ProductOptionalsDialog
          open={showOptionalsDialog}
          onOpenChange={(open) => {
            setShowOptionalsDialog(open);
            if (!open) setProductForOptionals(null);
          }}
          product={{
            id: productForOptionals.id,
            name: productForOptionals.name,
            price: productForOptionals.price,
          }}
          onConfirm={handleOptionalsConfirm}
        />
      )}
    </>
  );
}
