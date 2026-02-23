/**
 * ScrollSpyCategoryNav - Unified scroll spy navigation for Tablet, QR Code, and Public menus
 * 
 * iFood-style: As user scrolls products, the active category/subcategory updates in sidebar.
 * Clicking a category scrolls to that section smoothly.
 */

import { useRef, useEffect, useCallback, useState, MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface CategorySection {
  id: string;
  name: string;
  image_url?: string | null;
  productCount: number;
  subcategories?: SubcategorySection[];
}

export interface SubcategorySection {
  id: string;
  name: string;
  categoryId: string;
  image_url?: string | null;
  productCount: number;
}

interface ScrollSpyCategoryNavProps {
  sections: CategorySection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
  orientation?: 'vertical' | 'horizontal';
  primaryColor?: string;
  className?: string;
  showImages?: boolean;
  showCounts?: boolean;
  showAllOption?: boolean;
  onAllClick?: () => void;
  isAllActive?: boolean;
}

export function ScrollSpyCategoryNav({
  sections,
  activeSection,
  onSectionClick,
  orientation = 'horizontal',
  primaryColor = 'hsl(var(--primary))',
  className,
  showImages = true,
  showCounts = true,
  showAllOption = false,
  onAllClick,
  isAllActive = false,
}: ScrollSpyCategoryNavProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active item into view
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
      <ScrollArea className={cn('w-full whitespace-nowrap', className)}>
        <div className="flex gap-2 p-2">
          {showAllOption && (
            <Button
              variant={isAllActive ? 'default' : 'outline'}
              size="sm"
              onClick={onAllClick}
              className="shrink-0"
              style={isAllActive ? { backgroundColor: primaryColor } : undefined}
            >
              Todos
            </Button>
          )}
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <Button
                key={section.id}
                ref={isActive ? activeRef : null}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  'shrink-0 gap-2 transition-all',
                  isActive && 'ring-2 ring-offset-1 ring-offset-background'
                )}
                style={isActive ? { backgroundColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties : undefined}
              >
                {showImages && section.image_url && (
                  <img
                    src={section.image_url}
                    alt={section.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                )}
                <span>{section.name}</span>
                {showCounts && isActive && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs ml-1 border-current/30">
                    {section.productCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Vertical sidebar
  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-2 space-y-1">
        {showAllOption && (
          <Button
            variant={isAllActive ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={onAllClick}
          >
            Todos
          </Button>
        )}
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Button
              key={section.id}
              ref={isActive ? activeRef : null}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-2 h-auto py-2 transition-all',
                isActive && 'ring-1'
              )}
              style={isActive ? { 
                borderLeft: `3px solid ${primaryColor}`,
                '--tw-ring-color': primaryColor 
              } as React.CSSProperties : undefined}
              onClick={() => onSectionClick(section.id)}
            >
              {showImages && section.image_url ? (
                <img
                  src={section.image_url}
                  alt={section.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : showImages ? (
                <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm flex-shrink-0">🍽️</span>
              ) : null}
              <span className="truncate flex-1 text-left">{section.name}</span>
              {showCounts && (
                <Badge variant="outline" className="text-xs">
                  {section.productCount}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Hook for scroll spy behavior
export interface UseScrollSpyOptions {
  offset?: number; // Offset from top when calculating active section
  throttleMs?: number; // Throttle scroll events
  useWindowScroll?: boolean; // Use window scroll instead of container scroll
}

export interface UseScrollSpyReturn {
  activeId: string | null;
  registerRef: (id: string) => (el: HTMLDivElement | null) => void;
  scrollToSection: (sectionId: string) => void;
  containerRef: MutableRefObject<HTMLDivElement | null>;
}

export function useScrollSpyNav(
  sectionIds: string[],
  options: UseScrollSpyOptions = {}
): UseScrollSpyReturn {
  const { offset = 120, throttleMs = 100, useWindowScroll = false } = options;
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isScrollingProgrammatically = useRef(false);
  const lastScrollTime = useRef(0);
  const stableSectionIds = useRef<string[]>(sectionIds);

  // Update stable ref when sectionIds change
  useEffect(() => {
    stableSectionIds.current = sectionIds;
    // Initialize activeId if not set
    if (activeId === null && sectionIds.length > 0) {
      setActiveId(sectionIds[0]);
    } else if (activeId && !sectionIds.includes(activeId) && sectionIds.length > 0) {
      setActiveId(sectionIds[0]);
    }
  }, [sectionIds, activeId]);

  // Register section refs
  const registerRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

  // Scroll to a specific section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current.get(sectionId);
    
    if (!element) {
      console.warn('[ScrollSpy] Section not found:', sectionId, 'Available:', Array.from(sectionRefs.current.keys()));
      return;
    }

    isScrollingProgrammatically.current = true;
    setActiveId(sectionId);

    // Calculate scroll position
    const elementRect = element.getBoundingClientRect();
    
    if (useWindowScroll || !containerRef.current) {
      const scrollTop = window.scrollY + elementRect.top - offset;
      window.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      });
    } else {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      });
    }

    // Reset flag after animation
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 800);
  }, [offset, useWindowScroll]);

  // Set up scroll listener
  useEffect(() => {
    const currentSectionIds = stableSectionIds.current;

    const handleScroll = () => {
      // Throttle
      const now = Date.now();
      if (now - lastScrollTime.current < throttleMs) return;
      lastScrollTime.current = now;

      // Skip if programmatic scroll
      if (isScrollingProgrammatically.current) return;

      const ids = stableSectionIds.current;
      if (ids.length === 0) return;

      // Check if at the very bottom
      const lastId = ids[ids.length - 1];
      if (useWindowScroll || !containerRef.current) {
        const doc = document.documentElement;
        const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 5;
        if (atBottom && lastId) {
          setActiveId((prev) => (prev !== lastId ? lastId : prev));
          return;
        }
      } else {
        const c = containerRef.current;
        if (c) {
          const atBottom = c.scrollTop + c.clientHeight >= c.scrollHeight - 5;
          if (atBottom && lastId) {
            setActiveId((prev) => (prev !== lastId ? lastId : prev));
            return;
          }
        }
      }

      // Get viewport reference
      let triggerPoint: number;
      let viewportTop: number;
      let viewportBottom: number;

      if (useWindowScroll || !containerRef.current) {
        triggerPoint = offset;
        viewportTop = 0;
        viewportBottom = window.innerHeight;
      } else {
        const containerRect = containerRef.current.getBoundingClientRect();
        triggerPoint = containerRect.top + offset;
        viewportTop = containerRect.top;
        viewportBottom = containerRect.bottom;
      }

      let currentSection: string | null = null;
      let minDistance = Infinity;

      // Find the section closest to the trigger point that has passed it
      sectionRefs.current.forEach((element, id) => {
        if (!ids.includes(id)) return;
        const rect = element.getBoundingClientRect();
        
        if (rect.top <= triggerPoint && rect.bottom > viewportTop) {
          const distance = Math.abs(rect.top - triggerPoint);
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = id;
          }
        }
      });

      // Fallback: first visible section
      if (!currentSection) {
        let firstVisibleTop = Infinity;
        sectionRefs.current.forEach((element, id) => {
          if (!ids.includes(id)) return;
          const rect = element.getBoundingClientRect();
          if (rect.top >= viewportTop && rect.top < viewportBottom) {
            if (rect.top < firstVisibleTop) {
              firstVisibleTop = rect.top;
              currentSection = id;
            }
          }
        });
      }

      // Another fallback: any partially visible
      if (!currentSection) {
        sectionRefs.current.forEach((element, id) => {
          if (!ids.includes(id)) return;
          const rect = element.getBoundingClientRect();
          if (rect.bottom > viewportTop && rect.top < viewportBottom) {
            if (!currentSection) currentSection = id;
          }
        });
      }

      if (currentSection) {
        setActiveId((prev) => (prev !== currentSection ? currentSection : prev));
      }
    };

    // Only listen to one scroll source to avoid conflicts
    if (useWindowScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      const container = containerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll, { passive: true });
      }
    }

    // Initial check
    const timeoutId = setTimeout(handleScroll, 200);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      const container = containerRef.current;
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      clearTimeout(timeoutId);
    };
  }, [offset, throttleMs, useWindowScroll]);

  return {
    activeId,
    registerRef,
    scrollToSection,
    containerRef,
  };
}

// Floating indicator that shows current category
interface FloatingIndicatorProps {
  categoryName: string;
  visible: boolean;
  primaryColor?: string;
}

export function FloatingCategoryBadge({
  categoryName,
  visible,
  primaryColor = 'hsl(var(--primary))',
}: FloatingIndicatorProps) {
  const [show, setShow] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible && categoryName) {
      setDisplayName(categoryName);
      setShow(true);
      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Hide after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setShow(false);
      }, 2000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, categoryName]);

  if (!show || !displayName) return null;

  return (
    <div
      className={cn(
        'fixed top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full shadow-lg',
        'animate-in fade-in slide-in-from-top-2 duration-300'
      )}
      style={{ backgroundColor: primaryColor, color: 'white' }}
    >
      <span className="font-semibold text-sm">{displayName}</span>
    </div>
  );
}
