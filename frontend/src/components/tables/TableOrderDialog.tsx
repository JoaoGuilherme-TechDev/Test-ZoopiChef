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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTableCommands, useTableCommandItems } from '@/hooks/useTableCommands';
import { useProducts } from '@/hooks/useProducts';
import { useSubcategories } from '@/hooks/useSubcategories';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, Search, Image, Send } from 'lucide-react';

interface TableOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tableId: string;
  tableNumber: number;
}

export function TableOrderDialog({ 
  open, 
  onOpenChange,
  sessionId,
  tableId,
  tableNumber
}: TableOrderDialogProps) {
  const { commands, createCommand } = useTableCommands(sessionId);
  const productsQuery = useProducts();
  const subcategoriesQuery = useSubcategories();
  const products = productsQuery.data || [];
  const subcategories = subcategoriesQuery.data || [];
  
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<string, { quantity: number; notes: string }>>({});

  const { addItem } = useTableCommandItems(selectedCommandId || undefined);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    if (selectedSubcategoryId && p.subcategory_id !== selectedSubcategoryId) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const updateCart = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId]?.quantity || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { 
        ...prev, 
        [productId]: { 
          quantity: newQty, 
          notes: prev[productId]?.notes || '' 
        } 
      };
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [productId, { quantity }]) => {
    const product = products.find(p => p.id === productId);
    return sum + (product?.price || 0) * 100 * quantity;
  }, 0);

  const cartItems = Object.keys(cart).length;

  const handleAddToCommand = async () => {
    if (cartItems === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    toast.info('Enviando pedido...');

    let cmdId = selectedCommandId;

    if (!cmdId) {
      // Create a new command automatically
      try {
        const existingNumbers = commands.filter(c => c.number).map(c => c.number as number);
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        const newCommand = await createCommand.mutateAsync({
          sessionId,
          tableId,
          number: nextNumber,
        });
        
        cmdId = newCommand.id;
        setSelectedCommandId(newCommand.id);
        toast.info(`Comanda ${nextNumber} criada automaticamente`);
      } catch (error) {
        toast.error('Erro ao criar comanda');
        return;
      }
    }

    try {
      for (const [productId, { quantity, notes }] of Object.entries(cart)) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        await addItem.mutateAsync({
          commandId: cmdId,
          sessionId,
          tableId,
          productId,
          productName: product.name,
          quantity,
          unitPriceCents: Math.round(product.price * 100),
          notes: notes || undefined,
        });
      }

      toast.success('Pedido lançado com sucesso!');
      setCart({});
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao adicionar itens');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Lançar Pedido - Mesa {tableNumber}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
          {/* Left: Product Selection */}
          <div className="col-span-2 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Subcategorias em Badges com scroll horizontal nativo */}
            <div className="w-full overflow-x-auto whitespace-nowrap mb-3">
              <div className="flex gap-2 pb-2">
                <Badge
                  variant={selectedSubcategoryId === null ? 'default' : 'outline'}
                  className="cursor-pointer shrink-0 px-3 py-1"
                  onClick={() => setSelectedSubcategoryId(null)}
                >
                  Todos
                </Badge>
                {subcategories.filter(s => s.active).map((sub) => (
                  <Badge
                    key={sub.id}
                    variant={selectedSubcategoryId === sub.id ? 'default' : 'outline'}
                    className="cursor-pointer shrink-0 px-3 py-1"
                    onClick={() => setSelectedSubcategoryId(sub.id)}
                  >
                    {sub.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Product grid com scroll nativo */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => {
                  const inCart = cart[product.id]?.quantity || 0;
                  return (
                    <div 
                      key={product.id} 
                      className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
                        inCart > 0 
                          ? 'border-primary bg-primary/10 shadow-md' 
                          : 'hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => updateCart(product.id, 1)}
                    >
                      <div className="flex gap-3">
                        {/* Product image */}
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Image className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{product.name}</h4>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                          <span className="font-bold text-sm text-primary">
                            {formatCurrency(product.price * 100)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 mt-2">
                        {inCart > 0 ? (
                          <div className="flex items-center gap-2 bg-primary/20 rounded-lg p-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 rounded-full bg-background"
                              onClick={(e) => { e.stopPropagation(); updateCart(product.id, -1); }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center font-bold">{inCart}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 rounded-full bg-background"
                              onClick={(e) => { e.stopPropagation(); updateCart(product.id, 1); }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-7"
                            onClick={(e) => { e.stopPropagation(); updateCart(product.id, 1); }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Cart & Command Selection */}
          <div className="border-l-2 border-primary/20 pl-4 flex flex-col bg-muted/30 rounded-r-lg min-h-0 overflow-hidden">
            <div className="space-y-2 mb-3">
              <Label>Comanda</Label>
              <Select 
                value={selectedCommandId || 'new'} 
                onValueChange={(v) => setSelectedCommandId(v === 'new' ? null : v)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione ou crie nova" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Nova Comanda</SelectItem>
                  {commands.filter(c => c.status === 'open').map((cmd) => (
                    <SelectItem key={cmd.id} value={cmd.id}>
                      {cmd.name || `Comanda ${cmd.number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <h4 className="font-medium mb-2">Carrinho ({cartItems} itens)</h4>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {Object.entries(cart).map(([productId, { quantity }]) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;
                    return (
                      <div key={productId} className="flex justify-between items-center p-2 bg-background rounded-lg border text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="default" className="text-xs px-2">{quantity}x</Badge>
                          <span className="truncate font-medium">{product.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(product.price * 100 * quantity)}
                        </span>
                      </div>
                    );
                  })}
                  {cartItems === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Clique nos produtos para adicionar
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t mt-auto">
              <div className="flex justify-between mb-4 p-2 bg-primary/10 rounded-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              
              <Button 
                className="w-full h-11" 
                disabled={cartItems === 0 || addItem.isPending}
                onClick={handleAddToCommand}
              >
                {addItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Lançar Pedido
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}