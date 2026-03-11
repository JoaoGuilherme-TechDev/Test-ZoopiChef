import { Plus, Minus, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { useCart } from '../../contexts/CartContext';
import { useState } from 'react';
import { ProductOptionalsDialog } from './ProductOptionalsDialog';

export function ProductCard({ product }: any) {
  const { items, addItem, updateQuantity } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const cartItem = items.find((i: any) => i.productId === product.id);
  const qty = cartItem?.quantity || 0;

  const originalPrice = Number(product.prices?.[0]?.price || 0);
  const salePrice = product.is_on_sale && product.sale_price ? Number(product.sale_price) : null;
  const activePrice = salePrice ?? originalPrice;

  const handleAdd = () => {
    if (product.optionsGroups && product.optionsGroups.length > 0) {
      setIsModalOpen(true);
    } else {
      addItem(product);
    }
  };

  return (
    <>
      <div className="bg-[#0f0a1d] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-full group transition-all hover:border-purple-500/40 shadow-xl">
        {/* Imagem */}
        <div className="relative aspect-square w-full bg-[#1a162e]">
          {product.image_url ? (
            <img src={product.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={product.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-white/5" />
            </div>
          )}
          {product.featured && (
             <div className="absolute top-2 left-2 bg-[#f97316] text-[8px] font-black text-white px-2 py-0.5 rounded uppercase z-10 shadow-lg">Destaque</div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1 gap-1">
          <h3 className="text-[11px] font-black text-white uppercase leading-tight line-clamp-2 min-h-[2.2rem]">{product.name}</h3>
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight flex-1 uppercase tracking-wide opacity-60">{product.description}</p>
          
          <div className="mt-3 grid items-center justify-between pt-3 border-t border-white/5 md:grid-cols-2">  
            <div className="flex flex-col ">
              {salePrice && <span className="text-[9px] font-bold text-muted-foreground line-through decoration-red-500/50">{formatCurrency(originalPrice)}</span>}
              <span className={cn("text-[13px] font-black", salePrice ? "text-emerald-500" : "text-[#2563eb]")}>{formatCurrency(activePrice)}</span>
            </div>
            
            {qty > 0 ? (
              <div className="flex items-center gap-4 bg-white/5 rounded-lg p-1 border border-white/10">
                <button onClick={() => updateQuantity(cartItem!.cartItemId, qty - 1)} className="h-6 w-6 flex items-center justify-center bg-[#7c3aed] rounded-md text-white"><Minus className="h-3 w-3"/></button>
                <span className="text-[11px] font-black text-white w-4 text-center">{qty}</span>
                <button onClick={() => updateQuantity(cartItem!.cartItemId, qty + 1)} className="h-6 w-6 flex items-center justify-center bg-[#7c3aed] rounded-md text-white"><Plus className="h-3 w-3"/></button>
              </div>
            ) : (
              <Button onClick={handleAdd} className="h-8 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[10px] font-black uppercase rounded-lg px-4 shadow-lg shadow-blue-900/20 mt-2">
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ProductOptionalsDialog isOpen={isModalOpen} onOpenChange={setIsModalOpen} product={product} />
      )}
    </>
  );
}