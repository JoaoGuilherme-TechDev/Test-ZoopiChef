import { useRef, useState, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from '@dnd-kit/core';
import { ReceiptElement, DYNAMIC_FIELDS, FONT_SIZE_MAP } from './types';
import { ReceiptElementRenderer } from './ReceiptElementRenderer';
import { cn } from '@/lib/utils';

interface ReceiptCanvasProps {
  elements: ReceiptElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<ReceiptElement>) => void;
  paperWidth: 58 | 80;
  zoom: number;
}

// Pixel width based on paper size (scaled for screen)
const PAPER_WIDTHS = {
  58: 230, // 58mm ~= 230px at 100%
  80: 320, // 80mm ~= 320px at 100%
};

export function ReceiptCanvas({ 
  elements, 
  selectedId, 
  onSelect, 
  onUpdateElement,
  paperWidth,
  zoom,
}: ReceiptCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // FREE DRAG - X and Y without restrictions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active || !delta) return;

    const element = elements.find(el => el.id === active.id);
    if (!element) return;

    const pixelWidth = PAPER_WIDTHS[paperWidth];
    const scaleFactor = zoom / 100;
    
    // Convert delta X from pixels to percentage
    const deltaXPercent = (delta.x / scaleFactor) / pixelWidth * 100;
    const newX = Math.max(0, Math.min(100 - element.position.width, element.position.x + deltaXPercent));
    
    // Y in pixels
    const newY = Math.max(0, element.position.y + delta.y / scaleFactor);
    
    onUpdateElement(element.id, {
      position: { 
        ...element.position, 
        x: Math.round(newX * 10) / 10, // 1 decimal precision
        y: Math.round(newY),
      },
    });

    setActiveId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelect(null);
    }
  };

  // NO AUTO-SORT - maintain exact user positions
  const canvasHeight = Math.max(
    400,
    elements.length > 0 
      ? Math.max(...elements.map(el => el.position.y + el.position.height)) + 50
      : 400
  );

  const pixelWidth = PAPER_WIDTHS[paperWidth];

  return (
    <div className="flex-1 bg-muted/50 overflow-auto p-8 flex justify-center">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // NO MODIFIERS - free movement in all directions
      >
        <div
          ref={canvasRef}
          className="bg-white shadow-2xl relative"
          style={{
            width: pixelWidth * (zoom / 100),
            minHeight: canvasHeight * (zoom / 100),
            transform: `scale(1)`,
            transformOrigin: 'top center',
          }}
          onClick={handleCanvasClick}
        >
          {/* Paper texture effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 2px)',
            }}
          />

          {/* Render elements - NO SORTING, exact positions */}
          {elements.map((element) => (
            <ReceiptElementRenderer
              key={element.id}
              element={element}
              isSelected={selectedId === element.id}
              onSelect={() => onSelect(element.id)}
              onUpdateElement={(updates) => onUpdateElement(element.id, updates)}
              zoom={zoom}
              paperWidth={pixelWidth}
            />
          ))}

          {/* Empty state */}
          {elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-sm text-center px-4">
                Arraste elementos da paleta à esquerda<br />
                ou clique para adicionar
              </p>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-80">
              {/* Overlay preview during drag */}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
