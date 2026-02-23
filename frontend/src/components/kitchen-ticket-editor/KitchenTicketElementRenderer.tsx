import React, { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { 
  KitchenTicketElement, 
  KITCHEN_DYNAMIC_FIELDS, 
  KITCHEN_FONT_SIZE_MAP 
} from './types';

interface KitchenTicketElementRendererProps {
  element: KitchenTicketElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<KitchenTicketElement>) => void;
  containerWidth: number;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function KitchenTicketElementRenderer({
  element,
  isSelected,
  onSelect,
  onUpdate,
  containerWidth,
}: KitchenTicketElementRendererProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: element.id,
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startPosition: typeof element.position;
  } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startPosition: { ...element.position },
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;
      
      const { handle, startX, startY, startPosition } = resizeStartRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const deltaXPercent = (deltaX / containerWidth) * 100;

      let newPosition = { ...startPosition };

      // Handle resize based on which handle is being dragged
      if (handle.includes('e')) {
        newPosition.width = Math.max(10, startPosition.width + deltaXPercent);
      }
      if (handle.includes('w')) {
        const widthChange = -deltaXPercent;
        newPosition.width = Math.max(10, startPosition.width + widthChange);
        newPosition.x = Math.max(0, startPosition.x - widthChange);
      }
      if (handle.includes('s')) {
        newPosition.height = Math.max(8, startPosition.height + deltaY);
      }
      if (handle.includes('n')) {
        const heightChange = -deltaY;
        newPosition.height = Math.max(8, startPosition.height + heightChange);
        newPosition.y = Math.max(0, startPosition.y - heightChange);
      }

      // Clamp values
      newPosition.x = Math.max(0, Math.min(100 - newPosition.width, newPosition.x));
      newPosition.width = Math.min(100 - newPosition.x, newPosition.width);

      onUpdate({ position: newPosition });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element.position, containerWidth, onUpdate]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}%`,
    top: element.position.y,
    width: `${element.position.width}%`,
    height: element.position.height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging || isSelected ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const fontSize = KITCHEN_FONT_SIZE_MAP[element.style.fontSize];

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            className={cn(
              'w-full h-full flex items-center px-1 overflow-hidden',
              element.style.inverted && 'bg-black text-white',
              element.style.color === 'gray' && !element.style.inverted && 'text-gray-500'
            )}
            style={{
              fontSize,
              fontWeight: element.style.fontWeight,
              textAlign: element.style.textAlign,
              textTransform: element.style.uppercase ? 'uppercase' : 'none',
              letterSpacing: element.style.letterSpacing,
              lineHeight: element.style.lineHeight,
              justifyContent: element.style.textAlign === 'center' ? 'center' : 
                             element.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {element.content || 'Texto'}
          </div>
        );

      case 'dynamic-field': {
        const field = KITCHEN_DYNAMIC_FIELDS.find(f => f.key === element.fieldKey);
        const displayValue = field?.sampleValue || `{${element.fieldKey}}`;
        return (
          <div
            className={cn(
              'w-full h-full flex items-center px-1 overflow-hidden',
              element.style.inverted && 'bg-black text-white',
              element.style.color === 'gray' && !element.style.inverted && 'text-gray-500'
            )}
            style={{
              fontSize,
              fontWeight: element.style.fontWeight,
              textAlign: element.style.textAlign,
              textTransform: element.style.uppercase ? 'uppercase' : 'none',
              letterSpacing: element.style.letterSpacing,
              lineHeight: element.style.lineHeight,
              justifyContent: element.style.textAlign === 'center' ? 'center' : 
                             element.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {displayValue}
          </div>
        );
      }

      case 'line-solid':
        return <div className="w-full h-[1px] bg-black my-auto" />;

      case 'line-dashed':
        return <div className="w-full h-[1px] border-t border-dashed border-black my-auto" />;

      case 'spacer':
        return <div className="w-full h-full bg-transparent" />;

      case 'line-break':
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            ↵
          </div>
        );

      case 'separator-block':
        return (
          <div
            className="w-full h-full flex items-center justify-center font-mono"
            style={{ fontSize: fontSize - 2 }}
          >
            {element.content || '════════════════════'}
          </div>
        );

      case 'section-title':
        return (
          <div
            className={cn(
              'w-full h-full flex items-center px-2',
              element.style.inverted && 'bg-black text-white'
            )}
            style={{
              fontSize,
              fontWeight: element.style.fontWeight,
              textAlign: element.style.textAlign,
              justifyContent: element.style.textAlign === 'center' ? 'center' : 
                             element.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {element.content || 'SEÇÃO'}
          </div>
        );

      default:
        return <div className="w-full h-full bg-gray-100" />;
    }
  };

  const resizeHandles: { handle: ResizeHandle; className: string }[] = [
    { handle: 'n', className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize' },
    { handle: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize' },
    { handle: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize' },
    { handle: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize' },
    { handle: 'ne', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize' },
    { handle: 'nw', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize' },
    { handle: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize' },
    { handle: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize' },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'select-none transition-shadow',
        isSelected && 'ring-2 ring-primary ring-offset-1',
        !isSelected && 'hover:ring-1 hover:ring-gray-300'
      )}
    >
      {renderContent()}
      
      {/* Resize handles - only show when selected */}
      {isSelected && (
        <>
          {resizeHandles.map(({ handle, className }) => (
            <div
              key={handle}
              className={cn(
                'absolute w-2 h-2 bg-primary border border-white rounded-full z-20',
                className
              )}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}
    </div>
  );
}
