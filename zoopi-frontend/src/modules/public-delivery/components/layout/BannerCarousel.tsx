import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Banner {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
}

export function BannerCarousel({ companyId }: { companyId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Hook seguindo o padrão react-query do Zoopi
  const { data: banners = [] } = useQuery({
    queryKey: ["public-banners", companyId],
    queryFn: async () => {
      const res = await api.get<Banner[]>(`/public/banners/${companyId}`);
      return res.data;
    },
    enabled: !!companyId
  });

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const handlePrev = () => setCurrentIndex(prev => prev === 0 ? banners.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex(prev => (prev + 1) % banners.length);

  return (
    <div className="relative w-full aspect-[16/7] md:aspect-[21/9] overflow-hidden rounded-3xl border border-[hsla(270,100%,65%,0.22)] shadow-[0_0_15px_rgba(var(--primary),0.1)] bg-card/50 backdrop-blur-sm group">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img 
            src={banners[currentIndex].image_url} 
            alt={banners[currentIndex].title || 'Banner'}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay de texto com estilo Zoopi: Black, Uppercase, Neon text */}
          {(banners[currentIndex].title || banners[currentIndex].description) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
              {banners[currentIndex].title && (
                <h2 className="text-white text-2xl md:text-4xl font-black uppercase tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  {banners[currentIndex].title}
                </h2>
              )}
              {banners[currentIndex].description && (
                <p className="text-white/80 text-sm md:text-lg font-bold uppercase tracking-widest mt-2 max-w-xl">
                  {banners[currentIndex].description}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {banners.length > 1 && (
        <>
          {/* Botões de navegação estilo Neon */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-all border border-white/10"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-all border border-white/10"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          
          {/* Indicadores estilo Zoopi (Pills finos) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentIndex ? "bg-primary w-8 shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "bg-white/30 w-3 hover:bg-white/50"
                )}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}