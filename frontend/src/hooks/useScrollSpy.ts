/**
 * useScrollSpy - Hook for scroll spy navigation (iFood-style)
 * 
 * Automatically highlights the current section in the sidebar
 * as the user scrolls through products.
 */

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface Section {
  id: string;
  name: string;
  element?: HTMLElement | null;
}

interface UseScrollSpyOptions {
  /** Offset from top of container to trigger section change */
  offset?: number;
  /** Threshold percentage of section visibility required */
  threshold?: number;
}

interface UseScrollSpyReturn {
  /** Currently active section ID */
  activeId: string | null;
  /** Set a specific section as active and scroll to it */
  scrollToSection: (sectionId: string) => void;
  /** Register a section element */
  registerSection: (id: string, element: HTMLElement | null) => void;
  /** Ref to attach to the scrollable container */
  containerRef: RefObject<HTMLDivElement>;
}

export function useScrollSpy(
  sections: Section[],
  options: UseScrollSpyOptions = {}
): UseScrollSpyReturn {
  const { offset = 100, threshold = 0.3 } = options;
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingProgrammatically = useRef(false);

  // Register a section element
  const registerSection = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      sectionsRef.current.set(id, element);
    } else {
      sectionsRef.current.delete(id);
    }
  }, []);

  // Scroll to a specific section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionsRef.current.get(sectionId);
    const container = containerRef.current;
    
    if (element && container) {
      isScrollingProgrammatically.current = true;
      setActiveId(sectionId);
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;
      
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
      
      // Reset programmatic scroll flag after animation
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 500);
    }
  }, [offset]);

  // Handle scroll events to detect current section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Skip if we're scrolling programmatically
      if (isScrollingProgrammatically.current) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerHeight = containerRect.height;
      const viewportMiddle = containerTop + containerHeight * threshold;

      let currentSection: string | null = null;
      let closestDistance = Infinity;

      sectionsRef.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionBottom = rect.bottom;
        
        // Check if section is in view
        if (sectionTop < viewportMiddle && sectionBottom > containerTop) {
          const distance = Math.abs(sectionTop - containerTop - offset);
          if (distance < closestDistance) {
            closestDistance = distance;
            currentSection = id;
          }
        }
      });

      if (currentSection && currentSection !== activeId) {
        setActiveId(currentSection);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeId, offset, threshold]);

  return {
    activeId,
    scrollToSection,
    registerSection,
    containerRef,
  };
}
