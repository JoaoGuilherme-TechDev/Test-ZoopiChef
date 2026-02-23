import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  useTicketTemplates, 
  TicketTemplate, 
  TicketTemplateType,
  TemplateSection,
  TemplateConfig,
} from '@/hooks/useTicketTemplates';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Eye,
  Settings2,
} from 'lucide-react';
import { TemplatePreview } from './TemplatePreview';

interface TemplateEditorProps {
  template: TicketTemplate | null;
  templateType: TicketTemplateType;
  onClose: () => void;
}

// Seções disponíveis por tipo de template
const AVAILABLE_SECTIONS: Record<TicketTemplateType, Array<{ type: string; label: string }>> = {
  main: [
    { type: 'header', label: 'Cabeçalho (Empresa)' },
    { type: 'order_info', label: 'Info do Pedido' },
    { type: 'customer', label: 'Cliente' },
    { type: 'items', label: 'Itens' },
    { type: 'totals', label: 'Totais' },
    { type: 'payment', label: 'Pagamento' },
    { type: 'barcode', label: 'Código de Barras' },
    { type: 'footer', label: 'Rodapé' },
  ],
  production: [
    { type: 'header', label: 'Cabeçalho (Empresa)' },
    { type: 'origin', label: 'Origem do Pedido' },
    { type: 'order_number', label: 'Número do Pedido' },
    { type: 'table_number', label: 'Número da Mesa' },
    { type: 'comanda', label: 'Comanda' },
    { type: 'customer', label: 'Cliente' },
    { type: 'timing', label: 'Data/Hora' },
    { type: 'items', label: 'Itens' },
    { type: 'notes', label: 'Observações' },
    { type: 'consume_mode', label: 'Modo de Consumo' },
    { type: 'waiter', label: 'Atendente' },
    { type: 'footer', label: 'Rodapé' },
  ],
};

// Configurações padrão para cada tipo de seção
const DEFAULT_SECTION_CONFIG: Record<string, any> = {
  header: { show_company: true, show_logo: false },
  origin: { style: 'inverted', show_stars: true },
  order_info: { show_number: true, show_table: true, show_comanda: true },
  order_number: { style: 'large_inverted' },
  table_number: { style: 'extra_large' },
  comanda: { show_name: true },
  customer: { show_name: true, show_phone: true, show_address: true },
  timing: { show_date: true, show_time: true },
  items: { show_quantity: true, show_price: true, show_notes: true, show_addons: true, uppercase: true },
  notes: { style: 'highlighted' },
  consume_mode: { style: 'inverted' },
  totals: { show_subtotal: true, show_discount: true, show_delivery: true, show_total: true },
  payment: { show_method: true, show_change: true },
  barcode: { enabled: true, type: 'CODE128' },
  waiter: { show_name: true },
  footer: { show_datetime: true, show_website: true, show_count: true, show_sector: true },
};

export function TemplateEditor({ template, templateType, onClose }: TemplateEditorProps) {
  const { createTemplate, updateTemplate } = useTicketTemplates();
  const isNew = !template;

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [paperWidth, setPaperWidth] = useState<58 | 80>(template?.paper_width || 80);
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.template_config?.sections || []
  );
  const [styles, setStyles] = useState<Record<string, any>>(
    template?.template_config?.styles || {}
  );
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  // Preview template object
  const previewTemplate: TicketTemplate = {
    id: template?.id || 'preview',
    company_id: template?.company_id || '',
    template_type: templateType,
    name,
    description,
    paper_width: paperWidth,
    template_config: { sections, styles },
    elements: [],
    is_default: false,
    is_system: false,
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  const handleSave = async () => {
    const config: TemplateConfig = { sections, styles };

    if (isNew) {
      await createTemplate.mutateAsync({
        template_type: templateType,
        name,
        description,
        paper_width: paperWidth,
        template_config: config,
        elements: [],
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
        template_config: config,
      });
    }
    onClose();
  };

  const addSection = (type: string) => {
    setSections([...sections, { type, ...DEFAULT_SECTION_CONFIG[type] }]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
    setSelectedSection(null);
  };

  const updateSectionConfig = (index: number, key: string, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [key]: value };
    setSections(updated);
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    const updated = [...sections];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSections(updated);
  };

  const getSectionLabel = (type: string) => {
    return AVAILABLE_SECTIONS[templateType].find(s => s.type === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">
              {isNew ? 'Novo Template' : `Editar: ${template.name}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {templateType === 'main' ? 'Ticket Gerencial' : 'Ticket de Produção'}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!name || createTemplate.isPending || updateTemplate.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do Template</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Meu Template Personalizado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Largura do Papel</Label>
                  <Select
                    value={String(paperWidth)}
                    onValueChange={(v) => setPaperWidth(Number(v) as 58 | 80)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80">80mm (Padrão)</SelectItem>
                      <SelectItem value="58">58mm (Compacto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva quando usar este template..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Seções do Ticket</CardTitle>
                <Select onValueChange={addSection}>
                  <SelectTrigger className="w-48">
                    <Plus className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Adicionar seção" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_SECTIONS[templateType].map((section) => (
                      <SelectItem key={section.type} value={section.type}>
                        {section.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma seção adicionada</p>
                  <p className="text-sm">Use o botão acima para adicionar seções</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <div
                      key={`${section.type}-${index}`}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSection === index 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedSection(index)}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <div className="font-medium">{getSectionLabel(section.type)}</div>
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(section)
                            .filter(([k, v]) => k !== 'type' && v === true)
                            .map(([k]) => k.replace('show_', '').replace('_', ' '))
                            .join(', ') || 'Configurar opções'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); moveSection(index, index - 1); }}
                          >
                            ↑
                          </Button>
                        )}
                        {index < sections.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); moveSection(index, index + 1); }}
                          >
                            ↓
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeSection(index); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section Config Panel */}
              {selectedSection !== null && sections[selectedSection] && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        Configurar: {getSectionLabel(sections[selectedSection].type)}
                      </h4>
                      <Badge variant="outline">{sections[selectedSection].type}</Badge>
                    </div>
                    
                    <SectionConfigPanel
                      section={sections[selectedSection]}
                      templateType={templateType}
                      onChange={(key, value) => updateSectionConfig(selectedSection, key, value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Pré-visualização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="bg-muted p-4 rounded-lg flex justify-center">
                  <div className="bg-background shadow-lg p-2 rounded">
                    <TemplatePreview template={previewTemplate} />
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Panel para configurar cada tipo de seção
function SectionConfigPanel({ 
  section, 
  templateType,
  onChange 
}: { 
  section: TemplateSection;
  templateType: TicketTemplateType;
  onChange: (key: string, value: any) => void;
}) {
  const type = section.type;

  // Opções de configuração por tipo de seção
  const configOptions: Array<{ key: string; label: string; type: 'switch' | 'select'; options?: string[] }> = [];

  switch (type) {
    case 'header':
      configOptions.push(
        { key: 'show_company', label: 'Mostrar nome da empresa', type: 'switch' },
        { key: 'show_logo', label: 'Mostrar logo', type: 'switch' },
      );
      break;
    case 'origin':
      configOptions.push(
        { key: 'show_stars', label: 'Mostrar estrelas (★★★)', type: 'switch' },
        { key: 'style', label: 'Estilo', type: 'select', options: ['inverted', 'simple', 'bordered'] },
      );
      break;
    case 'order_info':
    case 'order_number':
      configOptions.push(
        { key: 'style', label: 'Estilo', type: 'select', options: ['large_inverted', 'medium', 'simple'] },
      );
      if (type === 'order_info') {
        configOptions.push(
          { key: 'show_number', label: 'Mostrar número', type: 'switch' },
          { key: 'show_table', label: 'Mostrar mesa', type: 'switch' },
          { key: 'show_comanda', label: 'Mostrar comanda', type: 'switch' },
        );
      }
      break;
    case 'customer':
      configOptions.push(
        { key: 'show_name', label: 'Mostrar nome', type: 'switch' },
        { key: 'show_phone', label: 'Mostrar telefone', type: 'switch' },
        { key: 'show_address', label: 'Mostrar endereço', type: 'switch' },
      );
      break;
    case 'timing':
      configOptions.push(
        { key: 'show_date', label: 'Mostrar data', type: 'switch' },
        { key: 'show_time', label: 'Mostrar hora', type: 'switch' },
      );
      break;
    case 'items':
      configOptions.push(
        { key: 'show_quantity', label: 'Mostrar quantidade', type: 'switch' },
        { key: 'show_price', label: 'Mostrar preço', type: 'switch' },
        { key: 'show_notes', label: 'Mostrar observações', type: 'switch' },
        { key: 'show_addons', label: 'Mostrar adicionais', type: 'switch' },
        { key: 'uppercase', label: 'Texto em MAIÚSCULAS', type: 'switch' },
      );
      break;
    case 'notes':
    case 'consume_mode':
      configOptions.push(
        { key: 'style', label: 'Estilo', type: 'select', options: ['highlighted', 'inverted', 'simple', 'bordered'] },
      );
      break;
    case 'totals':
      configOptions.push(
        { key: 'show_subtotal', label: 'Mostrar subtotal', type: 'switch' },
        { key: 'show_discount', label: 'Mostrar desconto', type: 'switch' },
        { key: 'show_delivery', label: 'Mostrar taxa de entrega', type: 'switch' },
        { key: 'show_total', label: 'Mostrar total', type: 'switch' },
      );
      break;
    case 'payment':
      configOptions.push(
        { key: 'show_method', label: 'Mostrar método de pagamento', type: 'switch' },
        { key: 'show_change', label: 'Mostrar troco', type: 'switch' },
      );
      break;
    case 'barcode':
      configOptions.push(
        { key: 'enabled', label: 'Ativo', type: 'switch' },
        { key: 'type', label: 'Tipo', type: 'select', options: ['CODE128', 'QR_CODE'] },
      );
      break;
    case 'waiter':
      configOptions.push(
        { key: 'show_name', label: 'Mostrar nome do atendente', type: 'switch' },
      );
      break;
    case 'footer':
      configOptions.push(
        { key: 'show_count', label: 'Mostrar qtd de itens', type: 'switch' },
        { key: 'show_sector', label: 'Mostrar setor', type: 'switch' },
        { key: 'show_datetime', label: 'Mostrar data/hora de impressão', type: 'switch' },
        { key: 'show_website', label: 'Mostrar website', type: 'switch' },
      );
      break;
    case 'table_number':
      configOptions.push(
        { key: 'style', label: 'Estilo', type: 'select', options: ['extra_large', 'large', 'medium'] },
      );
      break;
    case 'comanda':
      configOptions.push(
        { key: 'show_name', label: 'Mostrar nome da comanda', type: 'switch' },
      );
      break;
  }

  if (configOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta seção não possui opções de configuração.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {configOptions.map((option) => (
        <div key={option.key} className="flex items-center justify-between">
          <Label className="text-sm">{option.label}</Label>
          {option.type === 'switch' ? (
            <Switch
              checked={section[option.key] ?? false}
              onCheckedChange={(checked) => onChange(option.key, checked)}
            />
          ) : (
            <Select
              value={section[option.key] || option.options?.[0]}
              onValueChange={(value) => onChange(option.key, value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {option.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}
