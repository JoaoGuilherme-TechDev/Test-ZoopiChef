import React, { useState, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { KitchenTicketElement } from './types';
import { KitchenTicketElementRenderer } from './KitchenTicketElementRenderer';

interface KitchenTicketCanvasProps {
  elements: KitchenTicketElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<KitchenTicketElement>) => void;
  paperWidth: 58 | 80;
  zoom: number;
}

const PAPER_WIDTHS = {
  58: 230, // pixels for 58mm
  80: 320, // pixels for 80mm
};

export function KitchenTicketCanvas({
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  paperWidth,
  zoom,
}: KitchenTicketCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const containerWidth = PAPER_WIDTHS[paperWidth];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    onSelect(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);

    if (!delta) return;

    const element = elements.find(el => el.id === active.id);
    if (!element) return;

    // Calculate new position - FREE MOVEMENT X and Y
    const deltaXPercent = (delta.x / (containerWidth * zoom)) * 100;
    const deltaY = delta.y / zoom;

    const newX = Math.max(0, Math.min(100 - element.position.width, element.position.x + deltaXPercent));
    const newY = Math.max(0, element.position.y + deltaY);

    onUpdateElement(element.id, {
      position: {
        ...element.position,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY),
      },
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas === 'true') {
      onSelect(null);
    }
  };

  // Calculate canvas height based on elements
  const maxY = elements.reduce((max, el) => Math.max(max, el.position.y + el.position.height), 200);
  const canvasHeight = Math.max(400, maxY + 100);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex justify-center p-4 bg-muted/30 overflow-auto min-h-[500px]"
        style={{ transformOrigin: 'top center' }}
      >
        <div
          ref={canvasRef}
          data-canvas="true"
          onClick={handleCanvasClick}
          className="bg-white shadow-lg relative"
          style={{
            width: containerWidth * zoom,
            minHeight: canvasHeight * zoom,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          {/* Paper texture simulation */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px)',
              backgroundSize: '100% 4px',
            }}
            data-canvas="true"
          />

          {/* Elements - NO AUTO SORTING, exact user positions */}
          {elements.map((element) => (
            <KitchenTicketElementRenderer
              key={element.id}
              element={element}
              isSelected={selectedId === element.id}
              onSelect={() => onSelect(element.id)}
              onUpdate={(updates) => onUpdateElement(element.id, updates)}
              containerWidth={containerWidth * zoom}
            />
          ))}

          {/* Empty state */}
          {elements.length === 0 && (
            <div 
              className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
              data-canvas="true"
            >
              Adicione elementos usando o painel à direita
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="opacity-50 bg-primary/20 rounded px-2 py-1 text-xs">
            Arrastando...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
