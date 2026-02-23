/**
 * VisualTemplateEditor - Editor visual com manipulação direta no cupom
 * 
 * Permite arrastar, posicionar e redimensionar elementos diretamente na visualização do ticket.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ElementPalette } from '@/components/receipt-editor/ElementPalette';
import { ReceiptCanvas } from '@/components/receipt-editor/ReceiptCanvas';
import { PropertiesPanel } from '@/components/receipt-editor/PropertiesPanel';
import { ReceiptPreview, ReceiptPreviewHandle } from '@/components/receipt-editor/ReceiptPreview';
import { ReceiptElement, ElementType, createDefaultElement, DEFAULT_ELEMENT_STYLE } from '@/components/receipt-editor/types';
import { downloadReceiptPreview } from '@/lib/print/receiptBitmapPrint';
import { 
  useTicketTemplates, 
  TicketTemplate, 
  TicketTemplateType,
  TemplateSection,
} from '@/hooks/useTicketTemplates';
import { 
  ArrowLeft, 
  Save, 
  ZoomIn,
  ZoomOut,
  Eye,
  Download,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface VisualTemplateEditorProps {
  template: TicketTemplate | null;
  templateType: TicketTemplateType;
  onClose: () => void;
}

/**
 * Converte seções do formato antigo (template_config.sections) para elementos visuais
 */
function convertSectionsToElements(sections: TemplateSection[], templateType: TicketTemplateType): ReceiptElement[] {
  const elements: ReceiptElement[] = [];
  let yPosition = 10;

  for (const section of sections) {
    const baseElement = (type: ElementType, content: string, height: number = 24): ReceiptElement => ({
      id: crypto.randomUUID(),
      type,
      position: { x: 0, y: yPosition, width: 100, height },
      style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center' },
      content,
    });

    switch (section.type) {
      case 'header':
        if (section.show_company) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'company_name', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: 'lg' } });
          yPosition += 28;
        }
        break;

      case 'order_info':
      case 'order_number':
        elements.push({ 
          ...baseElement('dynamic-field', ''), 
          fieldKey: 'order_number',
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: 'xl', inverted: section.style?.includes('inverted') || false }
        });
        yPosition += 32;
        break;

      case 'origin':
        elements.push({ 
          ...baseElement('dynamic-field', ''), 
          fieldKey: 'order_type',
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', inverted: section.style === 'inverted' }
        });
        yPosition += 28;
        break;

      case 'table_number':
        elements.push({ 
          ...baseElement('dynamic-field', ''), 
          fieldKey: 'table_number',
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: '2xl', inverted: true }
        });
        yPosition += 36;
        break;

      case 'customer':
        if (section.show_name) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'customer_name', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } });
          yPosition += 24;
        }
        if (section.show_phone) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'customer_phone', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } });
          yPosition += 24;
        }
        if (section.show_address) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'customer_address', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } });
          yPosition += 24;
        }
        break;

      case 'timing':
        if (section.show_date || section.show_time) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'order_datetime', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } });
          yPosition += 24;
        }
        break;

      case 'items':
        // Adicionar linha separadora antes dos itens
        elements.push({ ...baseElement('line-dashed', ''), position: { x: 0, y: yPosition, width: 100, height: 2 } });
        yPosition += 8;
        // Placeholder para itens (campo dinâmico especial)
        elements.push({ 
          ...baseElement('text', 'ITENS DO PEDIDO'), 
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', uppercase: section.uppercase || false }
        });
        yPosition += 28;
        elements.push({ ...baseElement('line-dashed', ''), position: { x: 0, y: yPosition, width: 100, height: 2 } });
        yPosition += 8;
        break;

      case 'notes':
        elements.push({ 
          ...baseElement('dynamic-field', ''), 
          fieldKey: 'order_notes',
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left', inverted: section.style === 'highlighted' || section.style === 'inverted' }
        });
        yPosition += 28;
        break;

      case 'totals':
        if (section.show_subtotal) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'subtotal', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'right' } });
          yPosition += 24;
        }
        if (section.show_discount) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'discount', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'right' } });
          yPosition += 24;
        }
        if (section.show_delivery) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'delivery_fee', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'right' } });
          yPosition += 24;
        }
        if (section.show_total) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'total', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'right', fontWeight: 'bold', fontSize: 'lg' } });
          yPosition += 28;
        }
        break;

      case 'payment':
        if (section.show_method) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'payment_method', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left', fontWeight: 'bold' } });
          yPosition += 24;
        }
        if (section.show_change) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'change', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left', inverted: true } });
          yPosition += 28;
        }
        break;

      case 'barcode':
        if (section.enabled !== false) {
          elements.push({ 
            ...baseElement('barcode', 'order_number'),
            position: { x: 10, y: yPosition, width: 80, height: 48 },
            showTextBelow: true,
          });
          yPosition += 56;
        }
        break;

      case 'footer':
        if (section.show_datetime) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'order_datetime', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontSize: 'sm', color: 'gray' } });
          yPosition += 20;
        }
        if (section.show_website) {
          elements.push({ ...baseElement('text', 'www.zoopi.app.br'), style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontSize: 'xs', color: 'gray' } });
          yPosition += 18;
        }
        break;

      case 'consume_mode':
        elements.push({ 
          ...baseElement('dynamic-field', ''), 
          fieldKey: 'order_type',
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', inverted: section.style === 'inverted' }
        });
        yPosition += 28;
        break;

      case 'waiter':
        if (section.show_name) {
          elements.push({ ...baseElement('dynamic-field', ''), fieldKey: 'waiter_name', style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } });
          yPosition += 24;
        }
        break;

      case 'comanda':
        elements.push({ 
          ...baseElement('text', '🏷️ COMANDA #1'),
          style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', inverted: true }
        });
        yPosition += 28;
        break;
    }
  }

  return elements;
}

/**
 * Gera elementos padrão para um novo template
 */
function generateDefaultElements(templateType: TicketTemplateType): ReceiptElement[] {
  if (templateType === 'main') {
    return [
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'company_name', content: '', position: { x: 0, y: 10, width: 100, height: 28 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: 'lg' } },
      { id: crypto.randomUUID(), type: 'line-solid', content: '', position: { x: 0, y: 42, width: 100, height: 2 }, style: DEFAULT_ELEMENT_STYLE },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'order_number', content: '', position: { x: 0, y: 50, width: 100, height: 32 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: 'xl', inverted: true } },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'order_datetime', content: '', position: { x: 0, y: 88, width: 100, height: 20 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontSize: 'sm' } },
      { id: crypto.randomUUID(), type: 'line-dashed', content: '', position: { x: 0, y: 114, width: 100, height: 2 }, style: DEFAULT_ELEMENT_STYLE },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'customer_name', content: '', position: { x: 0, y: 122, width: 100, height: 24 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'customer_phone', content: '', position: { x: 0, y: 148, width: 100, height: 24 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left' } },
      { id: crypto.randomUUID(), type: 'line-dashed', content: '', position: { x: 0, y: 178, width: 100, height: 2 }, style: DEFAULT_ELEMENT_STYLE },
      { id: crypto.randomUUID(), type: 'text', content: 'ITENS DO PEDIDO', position: { x: 0, y: 186, width: 100, height: 24 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold' } },
      { id: crypto.randomUUID(), type: 'line-dashed', content: '', position: { x: 0, y: 216, width: 100, height: 2 }, style: DEFAULT_ELEMENT_STYLE },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'total', content: '', position: { x: 0, y: 226, width: 100, height: 28 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'right', fontWeight: 'bold', fontSize: 'lg' } },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'payment_method', content: '', position: { x: 0, y: 258, width: 100, height: 24 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left', fontWeight: 'bold' } },
      { id: crypto.randomUUID(), type: 'barcode', content: 'order_number', position: { x: 10, y: 290, width: 80, height: 48 }, style: DEFAULT_ELEMENT_STYLE, showTextBelow: true },
    ];
  } else {
    // Production template
    return [
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'order_type', content: '', position: { x: 0, y: 10, width: 100, height: 28 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', inverted: true } },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'order_number', content: '', position: { x: 0, y: 44, width: 100, height: 36 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: '2xl', inverted: true } },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'table_number', content: '', position: { x: 0, y: 86, width: 100, height: 28 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', fontSize: 'lg' } },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'order_datetime', content: '', position: { x: 0, y: 120, width: 100, height: 20 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left', fontSize: 'sm' } },
      { id: crypto.randomUUID(), type: 'line-dashed', content: '', position: { x: 0, y: 146, width: 100, height: 2 }, style: DEFAULT_ELEMENT_STYLE },
      { id: crypto.randomUUID(), type: 'text', content: 'ITENS PARA PRODUÇÃO', position: { x: 0, y: 154, width: 100, height: 24 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'center', fontWeight: 'bold', uppercase: true } },
      { id: crypto.randomUUID(), type: 'line-dashed', content: '', position: { x: 0, y: 184, width: 100, height: 2 }, style: DEFAULT_ELEMENT_STYLE },
      { id: crypto.randomUUID(), type: 'dynamic-field', fieldKey: 'order_notes', content: '', position: { x: 0, y: 194, width: 100, height: 28 }, style: { ...DEFAULT_ELEMENT_STYLE, textAlign: 'left', inverted: true } },
    ];
  }
}

export function VisualTemplateEditor({ template, templateType, onClose }: VisualTemplateEditorProps) {
  const { createTemplate, updateTemplate } = useTicketTemplates();
  const isNew = !template;

  // Template info
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [paperWidth, setPaperWidth] = useState<58 | 80>(template?.paper_width || 80);

  // Converter elementos do template existente ou gerar padrão
  const initialElements = useMemo(() => {
    if (template?.elements && template.elements.length > 0) {
      // Já tem elementos no formato visual
      return template.elements;
    }
    if (template?.template_config?.sections && template.template_config.sections.length > 0) {
      // Converter do formato antigo de seções
      return convertSectionsToElements(template.template_config.sections, templateType);
    }
    // Novo template - gerar elementos padrão
    return isNew ? generateDefaultElements(templateType) : [];
  }, [template, templateType, isNew]);

  // Visual elements
  const [elements, setElements] = useState<ReceiptElement[]>(initialElements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // UI state
  const [zoom, setZoom] = useState(100);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Preview ref
  const previewRef = useRef<ReceiptPreviewHandle>(null);

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;

  // Add element
  const handleAddElement = useCallback((type: ElementType, fieldKey?: string) => {
    const lastY = elements.length > 0 
      ? Math.max(...elements.map(el => el.position.y + el.position.height))
      : 10;
    
    const newElement = createDefaultElement(type, lastY + 8);
    if (fieldKey) {
      newElement.fieldKey = fieldKey;
    }
    
    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setHasUnsavedChanges(true);
  }, [elements]);

  // Update element
  const handleUpdateElement = useCallback((id: string, updates: Partial<ReceiptElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
    setHasUnsavedChanges(true);
  }, []);

  // Delete element
  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId) return;
    setElements(prev => prev.filter(el => el.id !== selectedElementId));
    setSelectedElementId(null);
    setHasUnsavedChanges(true);
  }, [selectedElementId]);

  // Duplicate element
  const handleDuplicateElement = useCallback(() => {
    if (!selectedElement) return;
    const newElement: ReceiptElement = {
      ...selectedElement,
      id: crypto.randomUUID(),
      position: {
        ...selectedElement.position,
        y: selectedElement.position.y + selectedElement.position.height + 8,
      },
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setHasUnsavedChanges(true);
  }, [selectedElement]);

  // Save template
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Informe um nome para o template');
      return;
    }

    try {
      if (isNew) {
        await createTemplate.mutateAsync({
          template_type: templateType,
          name,
          description,
          paper_width: paperWidth,
          template_config: { sections: [], styles: {} }, // Legacy format fallback
          elements,
          is_default: false,
          is_system: false,
          is_active: true,
        });
      } else {
        await updateTemplate.mutateAsync({
          id: template.id,
          name,
          description,
          paper_width: paperWidth,
          elements,
        });
      }
      setHasUnsavedChanges(false);
      onClose();
    } catch {
      // Error handled by hook
    }
  }, [isNew, name, description, paperWidth, elements, templateType, template, createTemplate, updateTemplate, onClose]);

  // Reset changes
  const handleReset = useCallback(() => {
    setElements(initialElements);
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setPaperWidth(template.paper_width || 80);
    } else {
      setName('');
      setDescription('');
      setPaperWidth(80);
    }
    setSelectedElementId(null);
    setHasUnsavedChanges(false);
    toast.info('Alterações descartadas');
  }, [template, initialElements]);

  // Generate preview image
  const handleGeneratePreview = useCallback(async () => {
    setIsGeneratingPreview(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (previewRef.current) {
        const imageUrl = await previewRef.current.captureAsImage();
        if (imageUrl) {
          setPreviewImage(imageUrl);
          setShowPreviewDialog(true);
        } else {
          toast.error('Falha ao gerar preview');
        }
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      toast.error('Erro ao gerar preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, []);

  // Download preview as PNG
  const handleDownloadPreview = useCallback(() => {
    if (previewImage) {
      downloadReceiptPreview(previewImage, `${name || 'cupom'}-preview.png`);
      toast.success('Imagem salva!');
    }
  }, [previewImage, name]);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      {/* Header */}
      <div className="border-b border-border bg-background px-4 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <h2 className="text-lg font-semibold">
              {isNew ? 'Novo Template' : `Editar: ${template.name}`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {templateType === 'main' ? 'Ticket Gerencial' : 'Ticket de Produção'}
            </p>
          </div>

          {/* Template name */}
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="w-48 h-8"
            placeholder="Nome do template"
          />

          {/* Paper width */}
          <Select
            value={String(paperWidth)}
            onValueChange={(val) => {
              setPaperWidth(Number(val) as 58 | 80);
              setHasUnsavedChanges(true);
            }}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="58">58mm</SelectItem>
              <SelectItem value="80">80mm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs w-12 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setZoom(Math.min(150, zoom + 10))}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Preview */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGeneratePreview}
            disabled={isGeneratingPreview || elements.length === 0}
          >
            {isGeneratingPreview ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-1" />
            )}
            Preview
          </Button>

          {/* Reset */}
          {hasUnsavedChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Desfazer
            </Button>
          )}

          {/* Save */}
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={createTemplate.isPending || updateTemplate.isPending || !name.trim()}
          >
            {(createTemplate.isPending || updateTemplate.isPending) ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left palette */}
        <div className="w-52 shrink-0 border-r">
          <ElementPalette onAddElement={handleAddElement} />
        </div>

        {/* Canvas - Direct manipulation area */}
        <ReceiptCanvas
          elements={elements}
          selectedId={selectedElementId}
          onSelect={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          paperWidth={paperWidth}
          zoom={zoom}
        />

        {/* Right properties panel */}
        <div className="w-64 shrink-0 border-l">
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => {
              if (selectedElementId) {
                handleUpdateElement(selectedElementId, updates);
              }
            }}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicateElement}
          />
        </div>
      </div>

      {/* Hidden preview renderer for bitmap capture */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <ReceiptPreview
          ref={previewRef}
          elements={elements}
          paperWidth={paperWidth}
        />
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview do Cupom</DialogTitle>
            <DialogDescription>
              Esta é a imagem exata que será impressa (1:1)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center bg-muted/50 p-4 rounded-lg max-h-[60vh] overflow-auto">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Receipt preview" 
                className="shadow-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPreview}>
              <Download className="w-4 h-4 mr-1" />
              Baixar PNG
            </Button>
            <Button onClick={() => setShowPreviewDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
