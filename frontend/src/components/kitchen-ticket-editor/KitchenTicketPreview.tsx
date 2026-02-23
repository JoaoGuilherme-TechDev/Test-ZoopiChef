import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  KitchenTicketElement, 
  KITCHEN_DYNAMIC_FIELDS, 
  KITCHEN_FONT_SIZE_MAP 
} from './types';

interface KitchenTicketPreviewProps {
  elements: KitchenTicketElement[];
  paperWidth: 58 | 80;
  className?: string;
}

// ESC/POS standard widths in pixels
const ESCPOS_WIDTHS = {
  58: 384,
  80: 576,
};

export const KitchenTicketPreview = forwardRef<HTMLDivElement, KitchenTicketPreviewProps>(
  ({ elements, paperWidth, className }, ref) => {
    const containerWidth = ESCPOS_WIDTHS[paperWidth];
    
    // Scale factor to match editor preview to ESC/POS output
    const editorWidth = paperWidth === 58 ? 230 : 320;
    const scale = containerWidth / editorWidth;

    const renderElement = (element: KitchenTicketElement) => {
      const fontSize = KITCHEN_FONT_SIZE_MAP[element.style.fontSize] * scale;

      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${element.position.x}%`,
        top: element.position.y * scale,
        width: `${element.position.width}%`,
        height: element.position.height * scale,
      };

      switch (element.type) {
        case 'text':
          return (
            <div
              key={element.id}
              style={baseStyle}
              className={cn(
                'flex items-center px-1 overflow-hidden',
                element.style.inverted && 'bg-black text-white',
                element.style.color === 'gray' && !element.style.inverted && 'text-gray-500'
              )}
            >
              <span
                style={{
                  fontSize,
                  fontWeight: element.style.fontWeight,
                  textAlign: element.style.textAlign,
                  textTransform: element.style.uppercase ? 'uppercase' : 'none',
                  letterSpacing: element.style.letterSpacing * scale,
                  lineHeight: element.style.lineHeight,
                  width: '100%',
                  display: 'block',
                }}
              >
                {element.content}
              </span>
            </div>
          );

        case 'dynamic-field': {
          const field = KITCHEN_DYNAMIC_FIELDS.find(f => f.key === element.fieldKey);
          const displayValue = field?.sampleValue || `{${element.fieldKey}}`;
          return (
            <div
              key={element.id}
              style={baseStyle}
              className={cn(
                'flex items-center px-1 overflow-hidden',
                element.style.inverted && 'bg-black text-white',
                element.style.color === 'gray' && !element.style.inverted && 'text-gray-500'
              )}
            >
              <span
                style={{
                  fontSize,
                  fontWeight: element.style.fontWeight,
                  textAlign: element.style.textAlign,
                  textTransform: element.style.uppercase ? 'uppercase' : 'none',
                  letterSpacing: element.style.letterSpacing * scale,
                  lineHeight: element.style.lineHeight,
                  width: '100%',
                  display: 'block',
                }}
              >
                {displayValue}
              </span>
            </div>
          );
        }

        case 'line-solid':
          return (
            <div key={element.id} style={baseStyle} className="flex items-center">
              <div className="w-full h-[1px] bg-black" />
            </div>
          );

        case 'line-dashed':
          return (
            <div key={element.id} style={baseStyle} className="flex items-center">
              <div className="w-full h-[1px] border-t border-dashed border-black" />
            </div>
          );

        case 'spacer':
          return <div key={element.id} style={baseStyle} />;

        case 'line-break':
          return <div key={element.id} style={baseStyle} />;

        case 'separator-block':
          return (
            <div
              key={element.id}
              style={baseStyle}
              className="flex items-center justify-center font-mono"
            >
              <span style={{ fontSize: fontSize - 2 }}>
                {element.content}
              </span>
            </div>
          );

        case 'section-title':
          return (
            <div
              key={element.id}
              style={baseStyle}
              className={cn(
                'flex items-center px-2',
                element.style.inverted && 'bg-black text-white'
              )}
            >
              <span
                style={{
                  fontSize,
                  fontWeight: element.style.fontWeight,
                  textAlign: element.style.textAlign,
                  width: '100%',
                  display: 'block',
                }}
              >
                {element.content}
              </span>
            </div>
          );

        default:
          return null;
      }
    };

    // Calculate total height
    const maxY = elements.reduce((max, el) => 
      Math.max(max, (el.position.y + el.position.height) * scale), 200
    );

    return (
      <div
        ref={ref}
        className={cn('bg-white relative', className)}
        style={{
          width: containerWidth,
          minHeight: Math.max(300, maxY + 50),
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        {elements.map(renderElement)}
      </div>
    );
  }
);

KitchenTicketPreview.displayName = 'KitchenTicketPreview';
