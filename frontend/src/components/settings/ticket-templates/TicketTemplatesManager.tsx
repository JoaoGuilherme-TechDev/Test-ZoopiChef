import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTicketTemplates, TicketTemplate, TicketTemplateType } from '@/hooks/useTicketTemplates';
import { Plus, Star, Copy, Trash2, Pencil, FileText, ChefHat, Check, Loader2 } from 'lucide-react';
import { TemplatePreview } from './TemplatePreview';
import { VisualTemplateEditor } from './VisualTemplateEditor';
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

export function TicketTemplatesManager() {
  const { 
    mainTemplates, 
    productionTemplates, 
    isLoading,
    setAsDefault,
    duplicateTemplate,
    deleteTemplate,
  } = useTicketTemplates();

  const [activeTab, setActiveTab] = useState<TicketTemplateType>('main');
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TicketTemplate | null>(null);

  const templates = activeTab === 'main' ? mainTemplates : productionTemplates;

  const handleSetDefault = async (template: TicketTemplate) => {
    await setAsDefault.mutateAsync({ 
      id: template.id, 
      templateType: template.template_type 
    });
  };

  const handleDuplicate = async (template: TicketTemplate) => {
    await duplicateTemplate.mutateAsync(template.id);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteTemplate.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  if (editingTemplate || isCreating) {
    return (
      <VisualTemplateEditor
        template={editingTemplate}
        templateType={activeTab}
        onClose={() => {
          setEditingTemplate(null);
          setIsCreating(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates de Tickets</h2>
          <p className="text-muted-foreground">
            Personalize os layouts dos cupons gerenciais e de produção
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TicketTemplateType)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="main" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Gerencial
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Produção
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum template encontrado</p>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro template personalizado
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`relative transition-all hover:shadow-md ${
                    template.is_default ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {template.is_default && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Padrão
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {template.description || 'Sem descrição'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{template.paper_width}mm</Badge>
                    </div>
                    {template.is_system && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        Template do Sistema
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Mini Preview */}
                    <div className="bg-muted rounded-lg p-2 mb-4 max-h-32 overflow-hidden">
                      <TemplatePreview 
                        template={template} 
                        compact 
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!template.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                          disabled={setAsDefault.isPending}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Usar
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                        disabled={duplicateTemplate.isPending}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Duplicar
                      </Button>

                      {!template.is_system && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(template)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{deleteConfirm?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
