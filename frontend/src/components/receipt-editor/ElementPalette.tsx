import { 
  Type, 
  Hash, 
  Minus, 
  MoreHorizontal, 
  Space, 
  QrCode, 
  Barcode, 
  Image,
  User,
  Building2,
  Package,
  ShoppingCart,
  CreditCard,
  CornerDownLeft,
  SeparatorHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ElementType, DYNAMIC_FIELDS, DynamicField } from './types';

interface ElementPaletteProps {
  onAddElement: (type: ElementType, fieldKey?: string) => void;
}

const ELEMENT_TYPES: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Texto Livre', icon: <Type className="w-4 h-4" /> },
  { type: 'line-solid', label: 'Linha Contínua', icon: <Minus className="w-4 h-4" /> },
  { type: 'line-dashed', label: 'Linha Tracejada', icon: <MoreHorizontal className="w-4 h-4" /> },
  { type: 'spacer', label: 'Espaço Ajustável', icon: <Space className="w-4 h-4" /> },
  { type: 'line-break', label: 'Quebra de Linha', icon: <CornerDownLeft className="w-4 h-4" /> },
  { type: 'separator-block', label: 'Bloco Separador', icon: <SeparatorHorizontal className="w-4 h-4" /> },
  { type: 'barcode', label: 'Código de Barras', icon: <Barcode className="w-4 h-4" /> },
  { type: 'qrcode', label: 'QR Code', icon: <QrCode className="w-4 h-4" /> },
  { type: 'logo', label: 'Logo/Imagem', icon: <Image className="w-4 h-4" /> },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  customer: <User className="w-4 h-4" />,
  company: <Building2 className="w-4 h-4" />,
  product: <Package className="w-4 h-4" />,
  order: <ShoppingCart className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  customer: 'Cliente',
  company: 'Empresa',
  product: 'Produto',
  order: 'Pedido',
  payment: 'Pagamento',
};

export function ElementPalette({ onAddElement }: ElementPaletteProps) {
  const groupedFields = DYNAMIC_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, DynamicField[]>);

  return (
    <div className="h-full flex flex-col border-r border-border bg-muted/30">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Elementos</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Arraste para o cupom</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Basic Elements */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 px-1 font-medium">Básicos</p>
            <div className="grid grid-cols-2 gap-1">
              {ELEMENT_TYPES.map(({ type, label, icon }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs hover:bg-primary/10 hover:border-primary"
                  onClick={() => onAddElement(type)}
                >
                  {icon}
                  <span className="text-[10px] text-center leading-tight">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Dynamic Fields */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 px-1 font-medium">Campos Dinâmicos</p>
            <Accordion type="multiple" className="w-full" defaultValue={['customer', 'order', 'payment']}>
              {Object.entries(groupedFields).map(([category, fields]) => (
                <AccordionItem key={category} value={category} className="border-none">
                  <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-muted/50 rounded text-xs">
                    <span className="flex items-center gap-2">
                      {CATEGORY_ICONS[category]}
                      {CATEGORY_LABELS[category]}
                      <span className="text-[10px] text-muted-foreground">({fields.length})</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1">
                    <div className="space-y-0.5 pl-2">
                      {fields.map((field) => (
                        <Button
                          key={field.key}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-7 text-xs px-2 hover:bg-primary/10"
                          onClick={() => onAddElement('dynamic-field', field.key)}
                        >
                          <Hash className="w-3 h-3 mr-1.5 text-primary" />
                          {field.label}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
