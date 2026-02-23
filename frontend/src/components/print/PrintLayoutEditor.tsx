import { useState, useCallback } from 'react';
import { usePrintLayoutConfig, PrintLayoutElement, PrintLayoutElements } from '@/hooks/usePrintLayoutConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  GripVertical, 
  Bold, 
  Type, 
  Eye, 
  EyeOff, 
  Save, 
  RotateCcw,
  FileText,
  User,
  ShoppingCart,
  Receipt,
  ArrowUp,
  ArrowDown,
  Contrast,
} from 'lucide-react';
import { toast } from 'sonner';

const ELEMENT_INFO = {
  header: {
    label: 'Cabeçalho',
    description: 'Logo, nome da empresa, data/hora, número do pedido',
    icon: FileText,
    fields: [
      { key: 'show_logo', label: 'Mostrar logo' },
      { key: 'show_company_name', label: 'Mostrar nome da empresa' },
      { key: 'show_datetime', label: 'Mostrar data/hora' },
      { key: 'show_order_number', label: 'Mostrar número do pedido' },
    ],
  },
  customer: {
    label: 'Cliente',
    description: 'Nome, telefone, endereço do cliente',
    icon: User,
    fields: [
      { key: 'show_name', label: 'Mostrar nome' },
      { key: 'show_phone', label: 'Mostrar telefone' },
      { key: 'show_address', label: 'Mostrar endereço' },
    ],
  },
  items: {
    label: 'Itens',
    description: 'Lista de produtos, quantidades, observações',
    icon: ShoppingCart,
    fields: [
      { key: 'show_quantity', label: 'Mostrar quantidade' },
      { key: 'show_price', label: 'Mostrar preço' },
      { key: 'show_notes', label: 'Mostrar observações' },
      { key: 'show_addons', label: 'Mostrar adicionais' },
    ],
  },
  footer: {
    label: 'Rodapé',
    description: 'Totais, pagamento, troco',
    icon: Receipt,
    fields: [
      { key: 'show_subtotal', label: 'Mostrar subtotal' },
      { key: 'show_discount', label: 'Mostrar desconto' },
      { key: 'show_delivery_fee', label: 'Mostrar taxa de entrega' },
      { key: 'show_total', label: 'Mostrar total' },
      { key: 'show_payment_method', label: 'Mostrar forma de pagamento' },
      { key: 'show_change', label: 'Mostrar troco' },
    ],
  },
} as const;

const FONT_SIZES = [
  { value: 'small', label: 'Pequeno' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Extra Grande' },
];

type ElementKey = keyof PrintLayoutElements;

export function PrintLayoutEditor() {
  const { config, elements, isLoading, saveConfig, DEFAULT_LAYOUT } = usePrintLayoutConfig();
  const [localElements, setLocalElements] = useState<PrintLayoutElements | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Use local state if we have changes, otherwise use from hook
  const currentElements = localElements || elements;

  // Get sorted element keys by order
  const sortedKeys = Object.keys(currentElements).sort(
    (a, b) => currentElements[a as ElementKey].order - currentElements[b as ElementKey].order
  ) as ElementKey[];

  const handleElementChange = useCallback((key: ElementKey, updates: Partial<PrintLayoutElement>) => {
    const newElements = {
      ...(localElements || elements),
      [key]: { ...(localElements || elements)[key], ...updates },
    };
    setLocalElements(newElements);
    setHasChanges(true);
  }, [localElements, elements]);

  const handleMoveUp = useCallback((key: ElementKey) => {
    const currentOrder = (localElements || elements)[key].order;
    if (currentOrder <= 1) return;

    const newElements = { ...(localElements || elements) };
    
    // Find element with order - 1 and swap
    const otherKey = sortedKeys.find(k => (localElements || elements)[k].order === currentOrder - 1);
    if (otherKey) {
      newElements[otherKey] = { ...newElements[otherKey], order: currentOrder };
      newElements[key] = { ...newElements[key], order: currentOrder - 1 };
    }

    setLocalElements(newElements);
    setHasChanges(true);
  }, [localElements, elements, sortedKeys]);

  const handleMoveDown = useCallback((key: ElementKey) => {
    const currentOrder = (localElements || elements)[key].order;
    if (currentOrder >= 4) return;

    const newElements = { ...(localElements || elements) };
    
    // Find element with order + 1 and swap
    const otherKey = sortedKeys.find(k => (localElements || elements)[k].order === currentOrder + 1);
    if (otherKey) {
      newElements[otherKey] = { ...newElements[otherKey], order: currentOrder };
      newElements[key] = { ...newElements[key], order: currentOrder + 1 };
    }

    setLocalElements(newElements);
    setHasChanges(true);
  }, [localElements, elements, sortedKeys]);

  const handleSave = async () => {
    if (!localElements) return;
    
    try {
      await saveConfig.mutateAsync({ elements_config: localElements });
      setHasChanges(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    setLocalElements(DEFAULT_LAYOUT);
    setHasChanges(true);
    toast.info('Layout resetado para padrão. Clique em Salvar para confirmar.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Personalizar Layout</h3>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar, configure fontes e campos visíveis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!hasChanges || saveConfig.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
          Alterações não salvas
        </Badge>
      )}

      {/* Element Cards */}
      <div className="space-y-3">
        {sortedKeys.map((key, index) => {
          const element = currentElements[key];
          const info = ELEMENT_INFO[key];
          const Icon = info.icon;

          return (
            <Card 
              key={key} 
              className={`transition-all ${!element.enabled ? 'opacity-50' : ''}`}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {/* Drag Handle & Order Controls */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(key)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <div className="flex items-center justify-center">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(key)}
                      disabled={index === sortedKeys.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">{info.label}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          Posição {element.order}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">{info.description}</CardDescription>
                    </div>
                  </div>

                  {/* Quick Controls */}
                  <div className="flex items-center gap-4">
                    {/* Font Size */}
                    <Select
                      value={element.font_size}
                      onValueChange={(value) => handleElementChange(key, { font_size: value as PrintLayoutElement['font_size'] })}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <Type className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Bold */}
                    <Button
                      variant={element.bold ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleElementChange(key, { bold: !element.bold })}
                      title="Negrito"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>

                    {/* Inverted */}
                    <Button
                      variant={element.inverted ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleElementChange(key, { inverted: !element.inverted })}
                      title="Cores invertidas"
                    >
                      <Contrast className="h-4 w-4" />
                    </Button>

                    {/* Enable/Disable */}
                    <Button
                      variant={element.enabled ? 'outline' : 'secondary'}
                      size="sm"
                      className="h-8"
                      onClick={() => handleElementChange(key, { enabled: !element.enabled })}
                    >
                      {element.enabled ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Visível
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Oculto
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expandable Fields */}
              {element.enabled && (
                <CardContent className="pt-0 pb-3 px-4">
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {info.fields.map((field) => {
                      const fieldValue = element[field.key as keyof PrintLayoutElement];
                      return (
                        <div key={field.key} className="flex items-center gap-2">
                          <Switch
                            id={`${key}-${field.key}`}
                            checked={fieldValue as boolean}
                            onCheckedChange={(checked) => 
                              handleElementChange(key, { [field.key]: checked } as Partial<PrintLayoutElement>)
                            }
                          />
                          <Label 
                            htmlFor={`${key}-${field.key}`}
                            className="text-xs cursor-pointer"
                          >
                            {field.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Configurações Globais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Largura do papel (mm)</Label>
              <Select
                value={String(config?.paper_width_mm || 80)}
                onValueChange={(value) => {
                  saveConfig.mutateAsync({ paper_width_mm: parseInt(value) });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58mm (térmico pequeno)</SelectItem>
                  <SelectItem value="80">80mm (térmico padrão)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Caractere separador</Label>
              <Input
                value={config?.line_separator_char || '-'}
                maxLength={1}
                onChange={(e) => {
                  const char = e.target.value.slice(-1) || '-';
                  saveConfig.mutateAsync({ line_separator_char: char });
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem no rodapé (opcional)</Label>
            <Input
              value={config?.footer_message || ''}
              placeholder="Ex: Obrigado pela preferência!"
              onChange={(e) => {
                saveConfig.mutateAsync({ footer_message: e.target.value || null });
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-qr"
              checked={config?.show_qr_code || false}
              onCheckedChange={(checked) => {
                saveConfig.mutateAsync({ show_qr_code: checked });
              }}
            />
            <Label htmlFor="show-qr">Mostrar QR Code no ticket</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
