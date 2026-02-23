/**
 * TabletFeaturedCarousel - "Mural da Casa" carousel showing featured products
 * Displays highlighted dishes with auto-scroll animation
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeaturedProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_on_sale: boolean;
  sale_price: number | null;
}

interface TabletFeaturedCarouselProps {
  companyId: string;
  primaryColor: string;
  onProductClick?: (product: FeaturedProduct) => void;
}

export function TabletFeaturedCarousel({ 
  companyId, 
  primaryColor,
  onProductClick 
}: TabletFeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch featured products
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['tablet-featured-products', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, image_url, price, is_on_sale, sale_price')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('is_featured', true)
        .eq('aparece_tablet', true)
        .order('ordem_destaque', { ascending: true, nullsFirst: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []) as FeaturedProduct[];
    },
    enabled: !!companyId,
  });

  // Check scroll availability
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [featuredProducts]);

  // Auto scroll effect
  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 280, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (featuredProducts.length === 0) return null;

  return (
    <div className="relative py-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 mb-3">
        <Sparkles className="h-5 w-5" style={{ color: primaryColor }} />
        <h2 className="font-bold text-lg">Destaques da Casa</h2>
      </div>

      {/* Carousel container */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg h-10 w-10"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {featuredProducts.map((product) => {
            const displayPrice = product.is_on_sale && product.sale_price 
              ? product.sale_price 
              : product.price;

            return (
              <Card
                key={product.id}
                className="flex-shrink-0 w-64 overflow-hidden cursor-pointer snap-start hover:shadow-lg transition-shadow"
                onClick={() => onProductClick?.(product)}
              >
                {/* Image */}
                <div className="relative h-40 bg-muted">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Featured badge */}
                  <Badge 
                    className="absolute top-2 left-2 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Destaque
                  </Badge>

                  {/* Sale badge */}
                  {product.is_on_sale && product.sale_price && (
                    <Badge variant="destructive" className="absolute top-2 right-2">
                      Promoção
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {product.is_on_sale && product.sale_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {(product.price / 100).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <span className="font-bold" style={{ color: primaryColor }}>
                      R$ {(displayPrice / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg h-10 w-10"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
