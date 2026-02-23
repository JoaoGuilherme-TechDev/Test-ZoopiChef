import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toPng } from 'html-to-image';
import { ReceiptElement, DYNAMIC_FIELDS, FONT_SIZE_MAP } from './types';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

interface ReceiptPreviewProps {
  elements: ReceiptElement[];
  paperWidth: 58 | 80;
  previewData?: Record<string, string>;
}

export interface ReceiptPreviewHandle {
  captureAsImage: () => Promise<string | null>;
  captureAsBlob: () => Promise<Blob | null>;
}

// Pixel width based on paper size (thermal printer DPI ~203)
// 58mm = ~164 dots, 80mm = ~227 dots at 203 DPI
const PAPER_WIDTHS_PX = {
  58: 384, // Standard ESC/POS 58mm width
  80: 576, // Standard ESC/POS 80mm width
};

export const ReceiptPreview = forwardRef<ReceiptPreviewHandle, ReceiptPreviewProps>(
  ({ elements, paperWidth, previewData }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const pixelWidth = PAPER_WIDTHS_PX[paperWidth];

    const captureAsImage = useCallback(async (): Promise<string | null> => {
      if (!containerRef.current) return null;
      try {
        const dataUrl = await toPng(containerRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 1,
          width: pixelWidth,
          cacheBust: true,
        });
        return dataUrl;
      } catch (error) {
        console.error('Failed to capture receipt as image:', error);
        return null;
      }
    }, [pixelWidth]);

    const captureAsBlob = useCallback(async (): Promise<Blob | null> => {
      const dataUrl = await captureAsImage();
      if (!dataUrl) return null;
      
      const response = await fetch(dataUrl);
      return response.blob();
    }, [captureAsImage]);

    useImperativeHandle(ref, () => ({
      captureAsImage,
      captureAsBlob,
    }));

    const getFieldValue = (fieldKey: string): string => {
      if (previewData && previewData[fieldKey]) {
        return previewData[fieldKey];
      }
      const field = DYNAMIC_FIELDS.find(f => f.key === fieldKey);
      return field?.sampleValue || `{${fieldKey}}`;
    };

    const canvasHeight = Math.max(
      200,
      elements.length > 0
        ? Math.max(...elements.map(el => el.position.y + el.position.height)) + 20
        : 200
    );

    const renderElement = (element: ReceiptElement) => {
      const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.position.x}%`,
        top: element.position.y,
        width: `${element.position.width}%`,
        height: element.position.height,
      };

      const textStyle: React.CSSProperties = {
        fontSize: FONT_SIZE_MAP[element.style.fontSize],
        fontWeight: element.style.fontWeight,
        textAlign: element.style.textAlign,
        letterSpacing: element.style.letterSpacing,
        lineHeight: element.style.lineHeight,
        textTransform: element.style.uppercase ? 'uppercase' : 'none',
        color: element.style.color === 'black' ? '#000' :
               element.style.color === 'gray' ? '#666' : '#999',
        backgroundColor: element.style.inverted ? '#000' : 'transparent',
        padding: element.style.inverted ? '2px 4px' : 0,
        fontFamily: 'monospace',
      };

      if (element.style.inverted) {
        textStyle.color = '#fff';
      }

      const getContent = () => {
        if (element.type === 'dynamic-field' && element.fieldKey) {
          return getFieldValue(element.fieldKey);
        }
        return element.content;
      };

      switch (element.type) {
        case 'text':
        case 'dynamic-field':
          return (
            <div key={element.id} style={style}>
              <div
                style={{
                  ...textStyle,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <span style={{ width: '100%', textAlign: element.style.textAlign }}>
                  {getContent()}
                </span>
              </div>
            </div>
          );

        case 'line-solid':
          return (
            <div key={element.id} style={style}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid #000' }} />
              </div>
            </div>
          );

        case 'line-dashed':
          return (
            <div key={element.id} style={style}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px dashed #000' }} />
              </div>
            </div>
          );

        case 'spacer':
          return <div key={element.id} style={style} />;

        case 'line-break':
          return <div key={element.id} style={style} />;

        case 'separator-block':
          return (
            <div key={element.id} style={style}>
              <div
                style={{
                  ...textStyle,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: 2,
                }}
              >
                <span>{element.content || '═══════════════════'}</span>
              </div>
            </div>
          );

        case 'barcode':
          return (
            <div key={element.id} style={style}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Barcode
                  value={getFieldValue(element.content || 'order_number')}
                  width={1}
                  height={Math.max(20, element.position.height - 20)}
                  displayValue={element.showTextBelow !== false}
                  fontSize={10}
                  margin={0}
                  font="monospace"
                />
              </div>
            </div>
          );

        case 'qrcode':
          return (
            <div key={element.id} style={style}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QRCodeSVG
                  value={getFieldValue(element.content || 'order_url') || 'https://example.com'}
                  size={Math.min(element.position.height, (element.position.width / 100) * pixelWidth)}
                />
              </div>
            </div>
          );

        case 'logo':
          return (
            <div key={element.id} style={style}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {element.imageUrl ? (
                  <img
                    src={element.imageUrl}
                    alt="Logo"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    border: '1px dashed #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: 10,
                  }}>
                    Logo
                  </div>
                )}
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div
        ref={containerRef}
        style={{
          width: pixelWidth,
          minHeight: canvasHeight,
          backgroundColor: '#ffffff',
          position: 'relative',
          fontFamily: 'monospace',
        }}
      >
        {elements.map(renderElement)}
      </div>
    );
  }
);

ReceiptPreview.displayName = 'ReceiptPreview';
