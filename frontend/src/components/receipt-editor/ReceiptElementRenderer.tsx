import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, useCallback } from 'react';
import { ReceiptElement, DYNAMIC_FIELDS, FONT_SIZE_MAP } from './types';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

interface ReceiptElementRendererProps {
  element: ReceiptElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateElement: (updates: Partial<ReceiptElement>) => void;
  zoom: number;
  paperWidth: number;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function ReceiptElementRenderer({
  element,
  isSelected,
  onSelect,
  onUpdateElement,
  zoom,
  paperWidth,
}: ReceiptElementRendererProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: element.id,
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number; startPosX: number; startPosY: number; direction: ResizeDirection } | null>(null);

  const scaleFactor = zoom / 100;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}%`,
    top: element.position.y * scaleFactor,
    width: `${element.position.width}%`,
    height: element.position.height * scaleFactor,
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 100 : isSelected ? 50 : 1,
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: element.position.width,
      startHeight: element.position.height,
      startPosX: element.position.x,
      startPosY: element.position.y,
      direction,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      
      const deltaX = moveEvent.clientX - resizeRef.current.startX;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;
      
      // Convert pixel delta to percentage for width
      const deltaWidthPercent = (deltaX / scaleFactor) / paperWidth * 100;
      const deltaHeightPx = deltaY / scaleFactor;
      
      let newWidth = resizeRef.current.startWidth;
      let newHeight = resizeRef.current.startHeight;
      let newX = resizeRef.current.startPosX;
      let newY = resizeRef.current.startPosY;
      
      const dir = resizeRef.current.direction;
      
      // Handle width changes
      if (dir.includes('e')) {
        newWidth = Math.max(5, Math.min(100 - newX, resizeRef.current.startWidth + deltaWidthPercent));
      }
      if (dir.includes('w')) {
        const widthChange = Math.min(deltaWidthPercent, resizeRef.current.startWidth - 5);
        newX = Math.max(0, resizeRef.current.startPosX + widthChange);
        newWidth = Math.max(5, resizeRef.current.startWidth - widthChange);
      }
      
      // Handle height changes
      if (dir.includes('s')) {
        newHeight = Math.max(4, resizeRef.current.startHeight + deltaHeightPx);
      }
      if (dir.includes('n')) {
        const heightChange = Math.min(deltaHeightPx, resizeRef.current.startHeight - 4);
        newY = Math.max(0, resizeRef.current.startPosY + heightChange);
        newHeight = Math.max(4, resizeRef.current.startHeight - heightChange);
      }
      
      onUpdateElement({
        position: {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY),
          width: Math.round(newWidth * 10) / 10,
          height: Math.round(newHeight),
        },
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element.position, onUpdateElement, scaleFactor, paperWidth]);

  const getDisplayContent = () => {
    if (element.type === 'dynamic-field' && element.fieldKey) {
      const field = DYNAMIC_FIELDS.find(f => f.key === element.fieldKey);
      return field?.sampleValue || `{${element.fieldKey}}`;
    }
    return element.content;
  };

  const textStyle: React.CSSProperties = {
    fontSize: FONT_SIZE_MAP[element.style.fontSize] * scaleFactor,
    fontWeight: element.style.fontWeight,
    textAlign: element.style.textAlign,
    letterSpacing: element.style.letterSpacing,
    lineHeight: element.style.lineHeight,
    textTransform: element.style.uppercase ? 'uppercase' : 'none',
    color: element.style.color === 'black' ? '#000' : 
           element.style.color === 'gray' ? '#666' : '#999',
    backgroundColor: element.style.inverted ? '#000' : 'transparent',
    padding: element.style.inverted ? '2px 4px' : 0,
  };

  if (element.style.inverted) {
    textStyle.color = '#fff';
  }

  const renderContent = () => {
    switch (element.type) {
      case 'text':
      case 'dynamic-field':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden"
            style={textStyle}
          >
            <span className="w-full" style={{ textAlign: element.style.textAlign }}>
              {getDisplayContent()}
            </span>
          </div>
        );

      case 'line-solid':
        return (
          <div className="w-full h-full flex items-center">
            <div className="w-full border-t border-black" style={{ borderTopWidth: 1 }} />
          </div>
        );

      case 'line-dashed':
        return (
          <div className="w-full h-full flex items-center">
            <div 
              className="w-full border-t border-dashed border-black" 
              style={{ borderTopWidth: 1 }}
            />
          </div>
        );

      case 'spacer':
        return (
          <div className="w-full h-full bg-muted/30 border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <span className="text-[8px] text-muted-foreground/50">ESPAÇO</span>
          </div>
        );

      case 'line-break':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/20 border border-dashed border-muted-foreground/20">
            <span className="text-[10px] text-muted-foreground">↵</span>
          </div>
        );

      case 'separator-block':
        return (
          <div 
            className="w-full h-full flex items-center justify-center overflow-hidden"
            style={{ 
              fontSize: FONT_SIZE_MAP[element.style.fontSize] * scaleFactor,
              letterSpacing: 2,
            }}
          >
            <span className="text-foreground/80">{element.content || '═══════════════════'}</span>
          </div>
        );

      case 'barcode':
        return (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <Barcode
              value="123456789"
              width={1}
              height={Math.max(20, element.position.height * scaleFactor - 20)}
              displayValue={element.showTextBelow !== false}
              fontSize={10}
              margin={0}
            />
          </div>
        );

      case 'qrcode':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <QRCodeSVG
              value="https://example.com/order/1234"
              size={Math.min(element.position.height, (element.position.width / 100) * paperWidth) * scaleFactor}
            />
          </div>
        );

      case 'logo':
        return (
          <div className="w-full h-full flex items-center justify-center">
            {element.imageUrl ? (
              <img
                src={element.imageUrl}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-full h-full border border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-gray-400 text-xs">Logo</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Resize handle component
  const ResizeHandle = ({ direction, className }: { direction: ResizeDirection; className: string }) => (
    <div
      className={cn(
        'absolute bg-primary hover:bg-primary/80 transition-colors',
        className
      )}
      onMouseDown={(e) => handleResizeStart(e, direction)}
      style={{ zIndex: 200 }}
    />
  );

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
        'transition-shadow',
        isSelected && 'ring-2 ring-primary ring-offset-1',
        isDragging && 'opacity-50'
      )}
    >
      {renderContent()}
      
      {/* Functional resize handles */}
      {isSelected && !isDragging && (
        <>
          {/* Corner handles */}
          <ResizeHandle direction="nw" className="w-2.5 h-2.5 -top-1 -left-1 cursor-nwse-resize rounded-sm" />
          <ResizeHandle direction="ne" className="w-2.5 h-2.5 -top-1 -right-1 cursor-nesw-resize rounded-sm" />
          <ResizeHandle direction="sw" className="w-2.5 h-2.5 -bottom-1 -left-1 cursor-nesw-resize rounded-sm" />
          <ResizeHandle direction="se" className="w-2.5 h-2.5 -bottom-1 -right-1 cursor-nwse-resize rounded-sm" />
          
          {/* Edge handles */}
          <ResizeHandle direction="n" className="h-1.5 left-1/2 -translate-x-1/2 -top-0.5 w-8 cursor-ns-resize rounded-full" />
          <ResizeHandle direction="s" className="h-1.5 left-1/2 -translate-x-1/2 -bottom-0.5 w-8 cursor-ns-resize rounded-full" />
          <ResizeHandle direction="w" className="w-1.5 top-1/2 -translate-y-1/2 -left-0.5 h-8 cursor-ew-resize rounded-full" />
          <ResizeHandle direction="e" className="w-1.5 top-1/2 -translate-y-1/2 -right-0.5 h-8 cursor-ew-resize rounded-full" />
        </>
      )}
    </div>
  );
}
