import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel({ products }: any) {
  if (!products || products.length === 0) return null;

  // Duplicamos a lista para criar um efeito de loop infinito suave
  const displayProducts = [...products, ...products, ...products];

  return (
    <section className="space-y-4 overflow-hidden py-2">
      <div className="flex items-center gap-2 px-4 md:px-0">
        <div className="h-6 w-6 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/30">
          <Sparkles className="h-3.5 w-3.5 text-white fill-white" />
        </div>
        <h2 className="text-sm font-black uppercase tracking-tighter text-white">Destaques</h2>
      </div>
      
      <div className="relative">
        <motion.div 
          className="flex gap-4 px-4"
          animate={{ x: [0, -1000] }} // Ajuste o valor conforme a quantidade de itens
          transition={{ 
            duration: 30, // Quanto maior, mais lento
            ease: "linear", 
            repeat: Infinity 
          }}
          whileHover={{ animationPlayState: 'paused' }} // Pausa ao passar o mouse
        >
          {displayProducts.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="w-[170px] md:w-[220px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </motion.div>
        
        {/* Degradê nas pontas para suavizar o corte */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#050214] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#050214] to-transparent z-10 pointer-events-none" />
      </div>
    </section>
  );
}