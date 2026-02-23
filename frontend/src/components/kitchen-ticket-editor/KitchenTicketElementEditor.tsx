import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Trash2,
  Type
} from 'lucide-react';
import { 
  KitchenTicketElement, 
  FontSize, 
  KITCHEN_DYNAMIC_FIELDS,
  KITCHEN_CATEGORY_LABELS
} from './types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KitchenTicketElementEditorProps {
  element: KitchenTicketElement;
  onUpdate: (updates: Partial<KitchenTicketElement>) => void;
  onDelete: () => void;
}

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'xs', label: 'Extra Pequeno (8px)' },
  { value: 'sm', label: 'Pequeno (10px)' },
  { value: 'md', label: 'Médio (12px)' },
  { value: 'lg', label: 'Grande (14px)' },
  { value: 'xl', label: 'Extra Grande (16px)' },
  { value: '2xl', label: 'Enorme (20px)' },
  { value: '3xl', label: 'Gigante (24px)' },
];

export function KitchenTicketElementEditor({
  element,
  onUpdate,
  onDelete,
}: KitchenTicketElementEditorProps) {
  const updateStyle = (updates: Partial<typeof element.style>) => {
    onUpdate({ style: { ...element.style, ...updates } });
  };

  const updatePosition = (updates: Partial<typeof element.position>) => {
    onUpdate({ position: { ...element.position, ...updates } });
  };

  const showTextControls = ['text', 'dynamic-field', 'section-title'].includes(element.type);
  const showContentEditor = ['text', 'section-title', 'separator-block'].includes(element.type);

  // Group fields by category for the selector
  const fieldsByCategory = KITCHEN_DYNAMIC_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof KITCHEN_DYNAMIC_FIELDS>);

  return (
    <div className="w-72 border-l bg-background flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Propriedades</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Content editor */}
          {showContentEditor && (
            <div className="space-y-2">
              <Label className="text-xs">Conteúdo</Label>
              <Input
                value={element.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Digite o texto..."
              />
            </div>
          )}

          {/* Dynamic field selector */}
          {element.type === 'dynamic-field' && (
            <div className="space-y-2">
              <Label className="text-xs">Campo Dinâmico</Label>
              <Select
                value={element.fieldKey}
                onValueChange={(value) => onUpdate({ fieldKey: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o campo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fieldsByCategory).map(([category, fields]) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {KITCHEN_CATEGORY_LABELS[category]}
                      </div>
                      {fields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Text styling controls */}
          {showTextControls && (
            <>
              {/* Font size */}
              <div className="space-y-2">
                <Label className="text-xs">Tamanho da Fonte</Label>
                <Select
                  value={element.style.fontSize}
                  onValueChange={(value: FontSize) => updateStyle({ fontSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alignment */}
              <div className="space-y-2">
                <Label className="text-xs">Alinhamento</Label>
                <div className="flex gap-1">
                  <Button
                    variant={element.style.textAlign === 'left' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateStyle({ textAlign: 'left' })}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={element.style.textAlign === 'center' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateStyle({ textAlign: 'center' })}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={element.style.textAlign === 'right' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateStyle({ textAlign: 'right' })}
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bold toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Negrito</Label>
                <Button
                  variant={element.style.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateStyle({ 
                    fontWeight: element.style.fontWeight === 'bold' ? 'normal' : 'bold' 
                  })}
                >
                  <Bold className="w-4 h-4" />
                </Button>
              </div>

              {/* Inverted (white on black) */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Texto Invertido</Label>
                <Switch
                  checked={element.style.inverted}
                  onCheckedChange={(checked) => updateStyle({ inverted: checked })}
                />
              </div>

              {/* Uppercase */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Maiúsculas</Label>
                <Switch
                  checked={element.style.uppercase}
                  onCheckedChange={(checked) => updateStyle({ uppercase: checked })}
                />
              </div>

              {/* Line height */}
              <div className="space-y-2">
                <Label className="text-xs">Espaçamento entre Linhas: {element.style.lineHeight.toFixed(1)}</Label>
                <Slider
                  value={[element.style.lineHeight]}
                  min={0.8}
                  max={2.5}
                  step={0.1}
                  onValueChange={([value]) => updateStyle({ lineHeight: value })}
                />
              </div>

              {/* Letter spacing */}
              <div className="space-y-2">
                <Label className="text-xs">Espaçamento entre Letras: {element.style.letterSpacing}px</Label>
                <Slider
                  value={[element.style.letterSpacing]}
                  min={-2}
                  max={10}
                  step={0.5}
                  onValueChange={([value]) => updateStyle({ letterSpacing: value })}
                />
              </div>
            </>
          )}

          {/* Position controls */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium">Posição e Tamanho</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">X (%)</Label>
                <Input
                  type="number"
                  value={Math.round(element.position.x)}
                  onChange={(e) => updatePosition({ x: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Y (px)</Label>
                <Input
                  type="number"
                  value={Math.round(element.position.y)}
                  onChange={(e) => updatePosition({ y: parseFloat(e.target.value) || 0 })}
                  min={0}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Largura (%)</Label>
                <Input
                  type="number"
                  value={Math.round(element.position.width)}
                  onChange={(e) => updatePosition({ width: parseFloat(e.target.value) || 10 })}
                  min={10}
                  max={100}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Altura (px)</Label>
                <Input
                  type="number"
                  value={Math.round(element.position.height)}
                  onChange={(e) => updatePosition({ height: parseFloat(e.target.value) || 8 })}
                  min={8}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
