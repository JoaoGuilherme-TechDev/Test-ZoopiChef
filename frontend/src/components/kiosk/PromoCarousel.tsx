/**
 * PromoCarousel - Rotating header with promotions for kiosk
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromoBanner {
  id: string;
  image_url: string;
  title?: string;
  subtitle?: string;
  type: 'image' | 'video';
  duration_seconds?: number;
}

interface PromoCarouselProps {
  banners: PromoBanner[];
  height?: string;
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export function PromoCarousel({ 
  banners = [], 
  height = 'h-32',
  autoPlay = true,
  interval = 5000,
  className
}: PromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-advance slides
  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setIsTransitioning(false);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, banners.length, interval]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const goToNext = () => {
    if (banners.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
      setIsTransitioning(false);
    }, 300);
  };

  const goToPrev = () => {
    if (banners.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className={cn('relative w-full overflow-hidden shrink-0', height, className)}>
      {/* Banner content */}
      <div 
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isTransitioning ? 'opacity-0' : 'opacity-100'
        )}
      >
        {currentBanner.type === 'video' ? (
          <video
            src={currentBanner.image_url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title || 'Promoção'}
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay with text */}
        {(currentBanner.title || currentBanner.subtitle) && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
            <div className="px-8">
              {currentBanner.title && (
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {currentBanner.title}
                </h2>
              )}
              {currentBanner.subtitle && (
                <p className="text-lg text-white/90">
                  {currentBanner.subtitle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation arrows (only if multiple banners) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setIsTransitioning(false);
                }, 300);
              }}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/70'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
