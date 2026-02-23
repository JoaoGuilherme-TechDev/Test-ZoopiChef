import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Eye, Download, Copy, Star, Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useKitchenTicketTemplates } from '@/hooks/useKitchenTicketTemplates';
import { KitchenTicketCanvas } from '@/components/kitchen-ticket-editor/KitchenTicketCanvas';
import { KitchenTicketPalette } from '@/components/kitchen-ticket-editor/KitchenTicketPalette';
import { KitchenTicketElementEditor } from '@/components/kitchen-ticket-editor/KitchenTicketElementEditor';
import { KitchenTicketPreview } from '@/components/kitchen-ticket-editor/KitchenTicketPreview';
import {
  KitchenTicketElement,
  KitchenTicketTemplate,
  KitchenElementType,
  createDefaultKitchenElement,
} from '@/components/kitchen-ticket-editor/types';
import { createKitchenTicketBitmap, downloadKitchenTicketPreview } from '@/lib/print/kitchenTicketBitmapPrint';

export default function KitchenTicketEditor() {
  const navigate = useNavigate();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useKitchenTicketTemplates();
  
  // Editor state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('Novo Modelo Cozinha');
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [elements, setElements] = useState<KitchenTicketElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Dialogs
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Refs
  const previewRef = useRef<HTMLDivElement>(null);

  // Get selected element
  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Load template
  const loadTemplate = useCallback((template: KitchenTicketTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateName(template.name);
    setPaperWidth(template.paper_width);
    setElements(template.elements);
    setSelectedElementId(null);
    setHasUnsavedChanges(false);
  }, []);

  // Create new template
  const handleNewTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateName('Novo Modelo Cozinha');
    setPaperWidth(80);
    setElements([]);
    setSelectedElementId(null);
    setHasUnsavedChanges(false);
  };

  // Add element
  const handleAddElement = (type: KitchenElementType, fieldKey?: string) => {
    const maxY = elements.reduce((max, el) => Math.max(max, el.position.y + el.position.height), 0);
    const newElement = createDefaultKitchenElement(type, maxY + 8);
    
    if (fieldKey) {
      newElement.fieldKey = fieldKey;
    }
    
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
    setHasUnsavedChanges(true);
  };

  // Update element
  const handleUpdateElement = (id: string, updates: Partial<KitchenTicketElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
    setHasUnsavedChanges(true);
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    setHasUnsavedChanges(true);
  };

  // Save template
  const handleSave = async () => {
    try {
      if (selectedTemplateId) {
        await updateTemplate.mutateAsync({
          id: selectedTemplateId,
          name: templateName,
          paper_width: paperWidth,
          elements,
        });
        toast.success('Modelo atualizado');
      } else {
        const result = await createTemplate.mutateAsync({
          name: templateName,
          paper_width: paperWidth,
          elements,
          is_default: templates.length === 0,
        });
        setSelectedTemplateId(result.id);
        toast.success('Modelo criado');
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  // Set as default
  const handleSetDefault = async () => {
    if (!selectedTemplateId) return;
    try {
      await updateTemplate.mutateAsync({
        id: selectedTemplateId,
        is_default: true,
      });
      toast.success('Definido como padrão');
    } catch (error) {
      toast.error('Erro ao definir padrão');
    }
  };

  // Duplicate template
  const handleDuplicate = async () => {
    if (!selectedTemplateId) return;
    try {
      const result = await duplicateTemplate.mutateAsync(selectedTemplateId);
      loadTemplate(result);
      toast.success('Modelo duplicado');
    } catch (error) {
      toast.error('Erro ao duplicar');
    }
  };

  // Delete template
  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplate.mutateAsync(selectedTemplateId);
      handleNewTemplate();
      toast.success('Modelo excluído');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
    setShowDeleteConfirm(false);
  };

  // Generate preview
  const handlePreview = async () => {
    if (!previewRef.current) return;
    
    try {
      const result = await createKitchenTicketBitmap(previewRef.current, paperWidth);
      setPreviewImageUrl(result.imageDataUrl);
      setShowPreview(true);
    } catch (error) {
      toast.error('Erro ao gerar preview');
    }
  };

  // Download preview
  const handleDownloadPreview = async () => {
    if (!previewRef.current) return;
    
    try {
      await downloadKitchenTicketPreview(previewRef.current, `${templateName}.png`);
      toast.success('Preview baixado');
    } catch (error) {
      toast.error('Erro ao baixar');
    }
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplateId);
  const isDefault = currentTemplate?.is_default || false;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold">Editor de Cupom de Cozinha</h1>
            <p className="text-xs text-muted-foreground">Layout visual para produção</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border rounded-md px-2 py-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
              <ZoomOut className="w-3 h-3" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
              <ZoomIn className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(1)}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleDownloadPreview}>
            <Download className="w-4 h-4 mr-1" />
            PNG
          </Button>
          
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={createTemplate.isPending || updateTemplate.isPending}
          >
            <Save className="w-4 h-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Template list */}
        <div className="w-56 border-r flex flex-col">
          <div className="p-3 border-b">
            <Button size="sm" className="w-full" onClick={handleNewTemplate}>
              <Plus className="w-4 h-4 mr-1" />
              Novo Modelo
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedTemplateId === template.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => loadTemplate(template)}
                >
                  <div className="flex items-center gap-2">
                    {template.is_default && <Star className="w-3 h-3 fill-current" />}
                    <span className="text-sm truncate">{template.name}</span>
                  </div>
                  <span className="text-xs opacity-70">{template.paper_width}mm</span>
                </div>
              ))}
              
              {templates.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum modelo criado
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Template settings bar */}
        <div className="w-64 border-r p-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Nome do Modelo</Label>
            <Input
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Nome do modelo"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Largura do Papel</Label>
            <Select
              value={String(paperWidth)}
              onValueChange={(value) => {
                setPaperWidth(Number(value) as 58 | 80);
                setHasUnsavedChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58mm (Compacto)</SelectItem>
                <SelectItem value="80">80mm (Padrão)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateId && (
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSetDefault}
                disabled={isDefault}
              >
                <Star className={`w-4 h-4 mr-1 ${isDefault ? 'fill-current' : ''}`} />
                {isDefault ? 'Modelo Padrão' : 'Definir como Padrão'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDuplicate}
              >
                <Copy className="w-4 h-4 mr-1" />
                Duplicar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <KitchenTicketCanvas
            elements={elements}
            selectedId={selectedElementId}
            onSelect={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            paperWidth={paperWidth}
            zoom={zoom}
          />
        </div>

        {/* Right sidebar - Element palette or editor */}
        {selectedElement ? (
          <KitchenTicketElementEditor
            element={selectedElement}
            onUpdate={(updates) => handleUpdateElement(selectedElement.id, updates)}
            onDelete={() => handleDeleteElement(selectedElement.id)}
          />
        ) : (
          <KitchenTicketPalette onAddElement={handleAddElement} />
        )}
      </div>

      {/* Hidden preview for bitmap generation */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <KitchenTicketPreview
          ref={previewRef}
          elements={elements}
          paperWidth={paperWidth}
        />
      </div>

      {/* Preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview do Cupom de Cozinha</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center bg-muted p-4 rounded">
            {previewImageUrl && (
              <img 
                src={previewImageUrl} 
                alt="Preview" 
                className="max-w-full shadow-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Esta imagem representa exatamente o que será impresso (bitmap 1:1)
          </p>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O modelo "{templateName}" será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
