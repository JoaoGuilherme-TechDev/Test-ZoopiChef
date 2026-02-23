/**
 * ScrollSpyMenu - iFood-style scroll spy navigation
 * 
 * Shows active category/subcategory as user scrolls through products.
 * Clicking a category scrolls to that section.
 */

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  image_url?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  image_url?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  subcategory_id?: string;
  category_id?: string;
}

export interface ScrollSpySection {
  id: string;
  name: string;
  type: 'category' | 'subcategory';
  parentId?: string; // for subcategory, the category id
  image_url?: string | null;
  products: Product[];
}

interface ScrollSpyMenuProps {
  sections: ScrollSpySection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  orientation?: 'vertical' | 'horizontal';
  showImages?: boolean;
  className?: string;
}

export function ScrollSpyMenu({
  sections,
  activeSection,
  onSectionClick,
  primaryColor = '#ea580c',
  accentColor = '#ea580c',
  backgroundColor = '#1f2937',
  textColor = '#ffffff',
  orientation = 'vertical',
  showImages = true,
  className,
}: ScrollSpyMenuProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active item into view when it changes
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: orientation === 'vertical' ? 'center' : 'nearest',
        inline: orientation === 'horizontal' ? 'center' : 'nearest',
      });
    }
  }, [activeSection, orientation]);

  if (orientation === 'horizontal') {
    return (
      <ScrollArea className={cn('w-full', className)}>
        <div className="flex gap-2 p-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                ref={isActive ? activeRef : null}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full transition-all whitespace-nowrap shrink-0',
                  isActive
                    ? 'ring-2 ring-offset-2 font-semibold'
                    : 'opacity-70 hover:opacity-100'
                )}
                style={{
                  backgroundColor: isActive ? accentColor : backgroundColor,
                  color: textColor,
                  '--tw-ring-color': accentColor,
                } as React.CSSProperties}
              >
                {showImages && section.image_url && (
                  <img 
                    src={section.image_url} 
                    alt={section.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="text-sm">{section.name}</span>
                {isActive && (
                  <Badge 
                    variant="outline" 
                    className="ml-1 h-5 px-1.5 text-xs border-white/30"
                    style={{ color: textColor }}
                  >
                    {section.products.length}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    );
  }

  // Vertical orientation (sidebar)
  return (
    <ScrollArea className={cn('h-full', className)} style={{ backgroundColor }}>
      <div className="p-2 space-y-1">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSectionClick(section.id)}
              className={cn(
                'w-full text-left transition-all rounded-lg overflow-hidden',
                isActive
                  ? 'ring-2 shadow-lg'
                  : 'opacity-70 hover:opacity-100'
              )}
              style={{
                borderLeftWidth: '4px',
                borderLeftStyle: 'solid',
                borderLeftColor: isActive ? accentColor : 'transparent',
                backgroundColor: isActive ? `${accentColor}20` : 'transparent',
                color: textColor,
                '--tw-ring-color': accentColor,
              } as React.CSSProperties}
            >
              {showImages && section.image_url ? (
                <div className="w-full aspect-[3/2] overflow-hidden">
                  <img 
                    src={section.image_url} 
                    alt={section.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : showImages ? (
                <div 
                  className="w-full aspect-[3/2] flex items-center justify-center"
                  style={{ backgroundColor: `${backgroundColor}80` }}
                >
                  <span className="text-3xl">🍽️</span>
                </div>
              ) : null}
              <div className="p-3 flex items-center justify-between">
                <span className={cn('font-medium', showImages ? 'text-sm' : 'text-base')}>
                  {section.name}
                </span>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ 
                    borderColor: `${textColor}30`,
                    color: textColor,
                    backgroundColor: isActive ? accentColor : 'transparent',
                  }}
                >
                  {section.products.length}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Hook to manage scroll spy state
export function useScrollSpySections<T extends { id: string }>(
  items: T[],
  containerRef: React.RefObject<HTMLDivElement>
) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id || null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isScrollingProgrammatically = useRef(false);

  // Register a section element
  const registerRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

  // Scroll to a section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current.get(sectionId);
    const container = containerRef.current;
    
    if (element && container) {
      isScrollingProgrammatically.current = true;
      setActiveId(sectionId);
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = 80; // header offset
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;
      
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
      
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 600);
    }
  }, [containerRef]);

  // Handle scroll to detect active section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      const offset = 100;
      
      let currentSection: string | null = null;
      let minDistance = Infinity;

      sectionRefs.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        const sectionTop = rect.top - containerTop;
        
        // Find section closest to the top offset
        if (sectionTop <= offset && rect.bottom > containerTop) {
          const distance = Math.abs(sectionTop - offset);
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = id;
          }
        }
      });

      // If no section is at or above offset, use first visible one
      if (!currentSection) {
        sectionRefs.current.forEach((element, id) => {
          const rect = element.getBoundingClientRect();
          if (rect.top >= containerTop && rect.top < containerRect.bottom) {
            if (!currentSection) currentSection = id;
          }
        });
      }

      if (currentSection && currentSection !== activeId) {
        setActiveId(currentSection);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeId, containerRef]);

  return {
    activeId,
    setActiveId,
    registerRef,
    scrollToSection,
  };
}

// Floating indicator component that shows current category
interface FloatingCategoryIndicatorProps {
  categoryName: string;
  visible: boolean;
  accentColor?: string;
  textColor?: string;
}

export function FloatingCategoryIndicator({
  categoryName,
  visible,
  accentColor = '#ea580c',
  textColor = '#ffffff',
}: FloatingCategoryIndicatorProps) {
  if (!visible || !categoryName) return null;

  return (
    <div
      className={cn(
        'fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full shadow-lg',
        'transition-all duration-300 animate-in fade-in slide-in-from-top-2'
      )}
      style={{
        backgroundColor: accentColor,
        color: textColor,
      }}
    >
      <span className="font-semibold text-sm">{categoryName}</span>
    </div>
  );
}
