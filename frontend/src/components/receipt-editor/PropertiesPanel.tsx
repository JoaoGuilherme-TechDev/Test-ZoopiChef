import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold,
  Type,
  Trash2,
  Copy,
  MoveVertical,
  MoveHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ReceiptElement, FontSize, DYNAMIC_FIELDS, FONT_SIZE_MAP } from './types';
import { ImageUpload } from '@/components/ui/image-upload';

interface PropertiesPanelProps {
  element: ReceiptElement | null;
  onUpdate: (updates: Partial<ReceiptElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function PropertiesPanel({ element, onUpdate, onDelete, onDuplicate }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="h-full flex flex-col border-l border-border bg-muted/30">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Propriedades</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um elemento para editar suas propriedades
          </p>
        </div>
      </div>
    );
  }

  const updateStyle = (key: string, value: unknown) => {
    onUpdate({ style: { ...element.style, [key]: value } });
  };

  const updatePosition = (key: string, value: number) => {
    onUpdate({ position: { ...element.position, [key]: value } });
  };

  const isTextElement = element.type === 'text' || element.type === 'dynamic-field';
  const isLineElement = element.type === 'line-solid' || element.type === 'line-dashed';
  const isCodeElement = element.type === 'barcode' || element.type === 'qrcode';
  const isLogoElement = element.type === 'logo';

  return (
    <div className="h-full flex flex-col border-l border-border bg-muted/30 w-64">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Propriedades</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Content for text elements */}
          {element.type === 'text' && (
            <div className="space-y-2">
              <Label className="text-xs">Texto</Label>
              <Textarea
                value={element.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                className="min-h-[60px] text-xs"
                placeholder="Digite o texto..."
              />
            </div>
          )}

          {/* Field selector for dynamic fields */}
          {element.type === 'dynamic-field' && (
            <div className="space-y-2">
              <Label className="text-xs">Campo</Label>
              <Select
                value={element.fieldKey}
                onValueChange={(value) => onUpdate({ fieldKey: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DYNAMIC_FIELDS.map((field) => (
                    <SelectItem key={field.key} value={field.key} className="text-xs">
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Logo upload */}
          {isLogoElement && (
            <div className="space-y-2">
              <Label className="text-xs">Imagem</Label>
              <ImageUpload
                value={element.imageUrl}
                onChange={(url) => onUpdate({ imageUrl: url || '' })}
                aspectRatio="square"
                label="Logo"
              />
            </div>
          )}

          {/* Code content */}
          {isCodeElement && (
            <div className="space-y-2">
              <Label className="text-xs">Conteúdo do Código</Label>
              <Select
                value={element.content}
                onValueChange={(value) => onUpdate({ content: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_number" className="text-xs">Número do Pedido</SelectItem>
                  <SelectItem value="order_url" className="text-xs">URL do Pedido</SelectItem>
                  <SelectItem value="company_url" className="text-xs">URL da Empresa</SelectItem>
                  <SelectItem value="custom" className="text-xs">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {element.content === 'custom' && (
                <Input
                  value={element.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Valor do código..."
                />
              )}
              {element.type === 'barcode' && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={element.showTextBelow !== false}
                    onCheckedChange={(checked) => onUpdate({ showTextBelow: checked })}
                    id="show-text"
                  />
                  <Label htmlFor="show-text" className="text-xs">Exibir texto abaixo</Label>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Position */}
          <div className="space-y-3">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <MoveHorizontal className="w-3.5 h-3.5" />
              Posição
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={element.position.x}
                  onChange={(e) => updatePosition('x', Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y (px)</Label>
                <Input
                  type="number"
                  min={0}
                  value={element.position.y}
                  onChange={(e) => updatePosition('y', Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="space-y-3">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <MoveVertical className="w-3.5 h-3.5" />
              Tamanho
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Largura (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={element.position.width}
                  onChange={(e) => updatePosition('width', Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Altura (px)</Label>
                <Input
                  type="number"
                  min={1}
                  value={element.position.height}
                  onChange={(e) => updatePosition('height', Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Text styling */}
          {isTextElement && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  Estilo do Texto
                </Label>

                {/* Font size */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Tamanho da Fonte</Label>
                  <Select
                    value={element.style.fontSize}
                    onValueChange={(value) => updateStyle('fontSize', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xs" className="text-xs">Extra Pequeno ({FONT_SIZE_MAP.xs}px)</SelectItem>
                      <SelectItem value="sm" className="text-xs">Pequeno ({FONT_SIZE_MAP.sm}px)</SelectItem>
                      <SelectItem value="md" className="text-xs">Médio ({FONT_SIZE_MAP.md}px)</SelectItem>
                      <SelectItem value="lg" className="text-xs">Grande ({FONT_SIZE_MAP.lg}px)</SelectItem>
                      <SelectItem value="xl" className="text-xs">Extra Grande ({FONT_SIZE_MAP.xl}px)</SelectItem>
                      <SelectItem value="2xl" className="text-xs">Enorme ({FONT_SIZE_MAP['2xl']}px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Alignment */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Alinhamento</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={element.style.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateStyle('textAlign', 'left')}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={element.style.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateStyle('textAlign', 'center')}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={element.style.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateStyle('textAlign', 'right')}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Bold */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Bold className="w-3.5 h-3.5" />
                    Negrito
                  </Label>
                  <Switch
                    checked={element.style.fontWeight === 'bold'}
                    onCheckedChange={(checked) => updateStyle('fontWeight', checked ? 'bold' : 'normal')}
                  />
                </div>

                {/* Inverted */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Invertido (branco/preto)</Label>
                  <Switch
                    checked={element.style.inverted}
                    onCheckedChange={(checked) => updateStyle('inverted', checked)}
                  />
                </div>

                {/* Uppercase */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">MAIÚSCULAS</Label>
                  <Switch
                    checked={element.style.uppercase}
                    onCheckedChange={(checked) => updateStyle('uppercase', checked)}
                  />
                </div>

                {/* Color */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Cor</Label>
                  <Select
                    value={element.style.color}
                    onValueChange={(value) => updateStyle('color', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="black" className="text-xs">Preto</SelectItem>
                      <SelectItem value="gray" className="text-xs">Cinza</SelectItem>
                      <SelectItem value="light-gray" className="text-xs">Cinza Claro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Letter spacing */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Espaçamento entre letras: {element.style.letterSpacing}px
                  </Label>
                  <Slider
                    value={[element.style.letterSpacing]}
                    min={-2}
                    max={10}
                    step={0.5}
                    onValueChange={([value]) => updateStyle('letterSpacing', value)}
                  />
                </div>

                {/* Line height */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Altura da linha: {element.style.lineHeight}
                  </Label>
                  <Slider
                    value={[element.style.lineHeight]}
                    min={0.8}
                    max={2.5}
                    step={0.1}
                    onValueChange={([value]) => updateStyle('lineHeight', value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Spacer height */}
          {element.type === 'spacer' && (
            <div className="space-y-2">
              <Label className="text-xs">Altura do Espaço: {element.position.height}px</Label>
              <Slider
                value={[element.position.height]}
                min={4}
                max={60}
                step={2}
                onValueChange={([value]) => updatePosition('height', value)}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
