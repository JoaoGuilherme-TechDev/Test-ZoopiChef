import { useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ElementPalette } from '@/components/receipt-editor/ElementPalette';
import { ReceiptCanvas } from '@/components/receipt-editor/ReceiptCanvas';
import { PropertiesPanel } from '@/components/receipt-editor/PropertiesPanel';
import { ReceiptPreview, ReceiptPreviewHandle } from '@/components/receipt-editor/ReceiptPreview';
import { ReceiptElement, ElementType, createDefaultElement } from '@/components/receipt-editor/types';
import { useReceiptTemplates } from '@/hooks/useReceiptTemplates';
import { downloadReceiptPreview } from '@/lib/print/receiptBitmapPrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Save, 
  Plus, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Copy, 
  Star,
  Loader2,
  RotateCcw,
  Eye,
  Download,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReceiptLayoutEditor() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useReceiptTemplates();
  
  // Editor state
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [elements, setElements] = useState<ReceiptElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('Novo Modelo');
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [isDefault, setIsDefault] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Dialogs
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTemplatesSheet, setShowTemplatesSheet] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Preview ref
  const previewRef = useRef<ReceiptPreviewHandle>(null);

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;

  // Load template
  const loadTemplate = useCallback((template: typeof templates[0]) => {
    setCurrentTemplateId(template.id);
    setElements(template.elements);
    setTemplateName(template.name);
    setPaperWidth(template.paper_width as 58 | 80);
    setIsDefault(template.is_default);
    setSelectedElementId(null);
    setHasUnsavedChanges(false);
    setShowTemplatesSheet(false);
  }, []);

  // New template
  const handleNewTemplate = useCallback(() => {
    setCurrentTemplateId(null);
    setElements([]);
    setTemplateName('Novo Modelo');
    setPaperWidth(80);
    setIsDefault(false);
    setSelectedElementId(null);
    setHasUnsavedChanges(false);
    setShowNewDialog(false);
  }, []);

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
    const templateData = {
      name: templateName,
      paper_width: paperWidth,
      elements,
      is_default: isDefault,
    };

    if (currentTemplateId) {
      await updateTemplate.mutateAsync({ id: currentTemplateId, ...templateData });
    } else {
      const result = await createTemplate.mutateAsync(templateData);
      setCurrentTemplateId(result.id);
    }
    setHasUnsavedChanges(false);
  }, [currentTemplateId, templateName, paperWidth, elements, isDefault, updateTemplate, createTemplate]);

  // Reset changes
  const handleReset = useCallback(() => {
    if (currentTemplateId) {
      const template = templates.find(t => t.id === currentTemplateId);
      if (template) loadTemplate(template);
    } else {
      handleNewTemplate();
    }
  }, [currentTemplateId, templates, loadTemplate, handleNewTemplate]);

  // Generate preview image
  const handleGeneratePreview = useCallback(async () => {
    setIsGeneratingPreview(true);
    try {
      // Wait a tick for the hidden preview to render
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
      downloadReceiptPreview(previewImage, `${templateName || 'cupom'}-preview.png`);
      toast.success('Imagem salva!');
    }
  }, [previewImage, templateName]);

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-background px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h1 className="font-semibold text-lg">Editor de Cupom</h1>
            </div>
            
            {/* Template name */}
            <Input
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-48 h-8"
              placeholder="Nome do modelo"
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

            {/* Default toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={isDefault}
                onCheckedChange={(checked) => {
                  setIsDefault(checked);
                  setHasUnsavedChanges(true);
                }}
                id="default-template"
              />
              <Label htmlFor="default-template" className="text-xs flex items-center gap-1">
                <Star className="w-3 h-3" />
                Padrão
              </Label>
            </div>
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

            {/* Templates list */}
            <Sheet open={showTemplatesSheet} onOpenChange={setShowTemplatesSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-1" />
                  Modelos ({templates.length})
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Modelos Salvos</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          currentTemplateId === template.id && "ring-2 ring-primary"
                        )}
                        onClick={() => loadTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1">
                              {template.name}
                              {template.is_default && (
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {template.paper_width}mm • {template.elements.length} elementos
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTemplate.mutate(template.id);
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Excluir este modelo?')) {
                                  deleteTemplate.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {templates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum modelo salvo ainda
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* New template */}
            <Button variant="outline" size="sm" onClick={handleNewTemplate}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>

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
              disabled={createTemplate.isPending || updateTemplate.isPending}
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
          <div className="w-52 shrink-0">
            <ElementPalette onAddElement={handleAddElement} />
          </div>

          {/* Canvas */}
          <ReceiptCanvas
            elements={elements}
            selectedId={selectedElementId}
            onSelect={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            paperWidth={paperWidth}
            zoom={zoom}
          />

          {/* Right properties panel */}
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
    </DashboardLayout>
  );
}
