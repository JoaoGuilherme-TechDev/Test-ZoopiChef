import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '@/lib/utils';

export function CartButton({ onClick }: { onClick: () => void }) {
  const { totalItems, totalPrice } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 z-50 md:w-[400px]"
        >
          <button
            onClick={onClick}
            className="w-full h-16 rounded-2xl p-[2px] overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 shadow-[0_10px_40px_rgba(147,51,234,0.4)] group relative"
          >
            {/* Efeito de brilho interno animado */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="bg-[#050214]/90 backdrop-blur-md w-full h-full rounded-[14px] flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                {/* Ícone com Contador */}
                <div className="relative">
                  <div className="h-10 w-10 bg-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                    <ShoppingBag className="h-5 w-5 text-purple-500" />
                  </div>
                  <motion.span 
                    key={totalItems}
                    initial={{ scale: 1.5 }} animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-[#050214]"
                  >
                    {totalItems}
                  </motion.span>
                </div>

                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Seu Pedido</span>
                  <span className="text-base font-black text-white tracking-tighter">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="flex items-center gap-2 bg-blue-600 py-2 px-4 rounded-xl shadow-lg shadow-blue-900/40 group-hover:bg-blue-500 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Ver Carrinho</span>
                <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}