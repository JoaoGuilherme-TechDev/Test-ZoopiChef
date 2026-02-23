/**
 * AttractScreen - Fullscreen idle/attract mode
 * 
 * Displays a playlist of images/videos in loop.
 * Tap anywhere to start ordering.
 */

import { useState, useEffect, useCallback } from 'react';
import { useKioskState, kioskActions } from '@/stores/kioskStore';
import { PlaylistItem } from '@/hooks/useKiosk';
import { cn } from '@/lib/utils';

export function AttractScreen() {
  const device = useKioskState(s => s.device);
  const playlist = device?.idle_playlist || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Default attract content if no playlist
  const defaultContent = {
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80',
    seconds: 10,
  };

  const items: PlaylistItem[] = playlist.length > 0 ? playlist : [defaultContent];
  const currentItem = items[currentIndex];

  // Auto-advance playlist
  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsTransitioning(false);
      }, 300);
    }, (currentItem?.seconds || 8) * 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, items, currentItem?.seconds]);

  // Handle tap to start - go to IDENTIFY screen first
  const handleStart = useCallback(() => {
    kioskActions.touchActivity();
    kioskActions.setState('IDENTIFY');
  }, []);

  return (
    <div
      className="h-full w-full relative cursor-pointer"
      onClick={handleStart}
      onTouchStart={handleStart}
    >
      {/* Background content */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isTransitioning ? 'opacity-0' : 'opacity-100'
        )}
      >
        {currentItem?.type === 'video' ? (
          <video
            key={currentItem.url}
            src={currentItem.url}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            key={currentItem?.url}
            src={currentItem?.url}
            alt="Promoção"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Call to action */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-8">
        <div className="animate-bounce mb-8">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-center mb-4 text-white drop-shadow-lg">
          Toque para iniciar
        </h1>
        <p className="text-xl md:text-2xl text-white/80 text-center">
          Faça seu pedido aqui
        </p>
      </div>

      {/* Playlist indicator dots */}
      {items.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex ? 'bg-white w-6' : 'bg-white/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
