import { useCart } from '../../contexts/CartContext';
import { formatCurrency, formatWhatsAppLink } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, MessageCircle, Trash2, Minus, Plus } from 'lucide-react';
import { DeliveryCompany } from '../../types';

export function CartSidebar({ company }: { company: DeliveryCompany }) {
  const { items, totalPrice, totalItems, updateQuantity, removeItem, updateItemNotes } = useCart();

  return (
    <div className="hidden lg:flex flex-col h-[calc(100vh-100px)] sticky top-24 w-full bg-card/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-primary/10 bg-primary/5 flex items-center gap-3">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black uppercase tracking-tighter">Meu Pedido</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-2">
            <ShoppingBag className="h-10 w-10" />
            <p className="text-[10px] font-black uppercase tracking-widest">Carrinho Vazio</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.cartItemId} className="space-y-2 group">
              <div className="flex justify-between gap-2">
                <span className="text-[11px] font-black uppercase leading-tight flex-1">{item.name}</span>
                <span className="text-[11px] font-black text-primary">{formatCurrency(item.price * item.quantity)}</span>
              </div>
              {item.options.map((opt, i) => (
                <p key={i} className="text-[9px] text-muted-foreground font-bold uppercase">+ {opt.name}</p>
              ))}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 bg-background/40 rounded-xl p-1 border border-white/5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-[10px] font-black w-4 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <button onClick={() => removeItem(item.cartItemId)} className="text-[9px] font-black text-destructive uppercase opacity-0 group-hover:opacity-100 transition-opacity">Remover</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-primary/5 border-t border-primary/10 space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Total</span>
          <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(totalPrice)}</span>
        </div>
        <Button 
          disabled={items.length === 0}
          className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-all"
          onClick={() => { /* Mesma lógica de WhatsApp do CartSheet */ }}
        >
          <MessageCircle className="h-4 w-4" /> Finalizar Pedido
        </Button>
      </div>
    </div>
  );
}