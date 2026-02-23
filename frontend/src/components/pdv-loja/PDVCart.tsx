import { useState } from 'react';
import { Minus, Plus, Trash2, Tag, ShoppingCart, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '@/hooks/usePDVLoja';
import { Comanda } from '@/hooks/useComandas';
import { cn } from '@/lib/utils';
import { DeleteReasonModal } from './DeleteReasonModal';
import { ItemDiscountButton } from '@/components/sales/ItemDiscountButton';

interface PDVCartProps {
  items: CartItem[];
  linkedComanda: Comanda | null;
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemove: (itemId: string) => void;
  onDeleteComandaItem?: (itemId: string, reason: string) => void;
  onUpdateItemDiscount?: (itemId: string, discountCents: number, discountPercent: number) => void;
  canDeleteComandaItems?: boolean;
}

export function PDVCart({
  items,
  linkedComanda,
  onUpdateQty,
  onRemove,
  onDeleteComandaItem,
  onUpdateItemDiscount,
  canDeleteComandaItems = true,
}: PDVCartProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleDelete = (item: CartItem) => {
    if (item.fromComanda && item.comandaItemId && onDeleteComandaItem) {
      setItemToDelete(item);
      setDeleteModalOpen(true);
    } else {
      onRemove(item.id);
    }
  };

  const handleConfirmDelete = (reason: string) => {
    if (itemToDelete?.comandaItemId && onDeleteComandaItem) {
      onDeleteComandaItem(itemToDelete.comandaItemId, reason);
    }
    setItemToDelete(null);
  };

  // Separar itens por origem
  const comandaItems = items.filter(i => i.fromComanda);
  const newItems = items.filter(i => !i.fromComanda);

  // Calcular total (com descontos de item)
  const total = items.reduce((sum, item) => {
    const itemTotal = item.qty * item.unitPrice;
    const discount = item.discountCents || 0;
    return sum + itemTotal - discount;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {linkedComanda ? (
              <>
                <Tag className="h-6 w-6 text-primary" />
                <div>
                  <span className="font-bold text-xl">Comanda #{linkedComanda.command_number}</span>
                  {linkedComanda.name && (
                    <Badge variant="outline" className="ml-2">{linkedComanda.name}</Badge>
                  )}
                </div>
              </>
            ) : (
              <>
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                <span className="font-bold text-xl text-muted-foreground">Venda Direta</span>
              </>
            )}
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Total</span>
            <p className="font-bold text-2xl">{formatPrice(total)}</p>
          </div>
        </div>
      </div>

      {/* Lista de itens */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-20 w-20 mx-auto mb-4 opacity-20" />
              <p className="text-xl">Carrinho vazio</p>
              <p className="text-sm mt-2">Pressione F1 para buscar produtos</p>
            </div>
          ) : (
            <>
              {/* Itens da comanda */}
              {comandaItems.length > 0 && (
                <>
                  <div className="px-2 py-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Consumo da Comanda
                    </span>
                  </div>
                  {comandaItems.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onUpdateQty={onUpdateQty}
                      onDelete={() => handleDelete(item)}
                      onUpdateDiscount={onUpdateItemDiscount}
                      canDelete={canDeleteComandaItems}
                      formatPrice={formatPrice}
                    />
                  ))}
                </>
              )}

              {/* Novos itens */}
              {newItems.length > 0 && (
                <>
                  {comandaItems.length > 0 && <Separator className="my-4" />}
                  <div className="px-2 py-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {linkedComanda ? 'Novos Itens' : 'Itens'}
                    </span>
                  </div>
                  {newItems.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onUpdateQty={onUpdateQty}
                      onDelete={() => handleDelete(item)}
                      onUpdateDiscount={onUpdateItemDiscount}
                      canDelete={true}
                      formatPrice={formatPrice}
                      isNew
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Modal de exclusão */}
      <DeleteReasonModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemName={itemToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (itemId: string, newQty: number) => void;
  onDelete: () => void;
  onUpdateDiscount?: (itemId: string, discountCents: number, discountPercent: number) => void;
  canDelete: boolean;
  formatPrice: (price: number) => string;
  isNew?: boolean;
}

function CartItemRow({ item, onUpdateQty, onDelete, onUpdateDiscount, canDelete, formatPrice, isNew }: CartItemRowProps) {
  const subtotal = item.qty * item.unitPrice;
  const discount = item.discountCents || 0;
  const finalTotal = subtotal - discount;

  return (
    <div className={cn(
      "p-4 rounded-xl transition-colors",
      isNew ? "bg-primary/5 border-2 border-primary/20" : "bg-muted/30 border border-border"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg truncate">{item.name}</div>
          {item.notes && (
            <div className="text-sm text-muted-foreground truncate mt-1">
              {item.notes}
            </div>
          )}
        </div>
        
        <div className="text-right shrink-0">
          <div className="font-bold text-xl">{formatPrice(finalTotal)}</div>
          <div className="text-sm text-muted-foreground">
            {formatPrice(item.unitPrice)} × {item.qty}
          </div>
          {discount > 0 && (
            <div className="text-xs text-red-500">
              -{formatPrice(discount)} ({item.discountPercent?.toFixed(0)}%)
            </div>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => onUpdateQty(item.id, item.qty - 1)}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <span className="w-14 text-center font-bold text-xl">{item.qty}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => onUpdateQty(item.id, item.qty + 1)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão de desconto individual */}
          {onUpdateDiscount && (
            <ItemDiscountButton
              itemId={item.id}
              itemName={item.name}
              originalPriceCents={Math.round(subtotal * 100)}
              discountCents={Math.round(discount * 100)}
              discountPercent={item.discountPercent || 0}
              onDiscountChange={(id, cents, percent) => 
                onUpdateDiscount(id, cents / 100, percent)
              }
            />
          )}
          
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
