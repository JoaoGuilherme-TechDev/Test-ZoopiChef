import React from 'react';
import { 
  Type, 
  Minus, 
  MoreHorizontal, 
  Space, 
  CornerDownLeft,
  Columns,
  Hash,
  User,
  Clock,
  MapPin,
  UtensilsCrossed
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  KitchenElementType, 
  KITCHEN_DYNAMIC_FIELDS, 
  KitchenDynamicField,
  KITCHEN_CATEGORY_LABELS 
} from './types';

interface KitchenTicketPaletteProps {
  onAddElement: (type: KitchenElementType, fieldKey?: string) => void;
}

const ELEMENT_TYPES: { type: KitchenElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Texto Livre', icon: <Type className="w-4 h-4" /> },
  { type: 'section-title', label: 'Título de Seção', icon: <Columns className="w-4 h-4" /> },
  { type: 'line-solid', label: 'Linha Contínua', icon: <Minus className="w-4 h-4" /> },
  { type: 'line-dashed', label: 'Linha Tracejada', icon: <MoreHorizontal className="w-4 h-4" /> },
  { type: 'spacer', label: 'Espaço', icon: <Space className="w-4 h-4" /> },
  { type: 'separator-block', label: 'Bloco Separador', icon: <Columns className="w-4 h-4" /> },
  { type: 'line-break', label: 'Quebra de Linha', icon: <CornerDownLeft className="w-4 h-4" /> },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  order: <Hash className="w-4 h-4" />,
  customer: <User className="w-4 h-4" />,
  items: <UtensilsCrossed className="w-4 h-4" />,
  timing: <Clock className="w-4 h-4" />,
  sector: <MapPin className="w-4 h-4" />,
};

export function KitchenTicketPalette({ onAddElement }: KitchenTicketPaletteProps) {
  // Group fields by category
  const fieldsByCategory = KITCHEN_DYNAMIC_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, KitchenDynamicField[]>);

  return (
    <div className="w-64 border-l bg-background flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Elementos</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Basic elements */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Básicos</h4>
            <div className="space-y-1">
              {ELEMENT_TYPES.map(({ type, label, icon }) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => onAddElement(type)}
                >
                  {icon}
                  <span className="ml-2">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Dynamic fields by category */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Campos Dinâmicos</h4>
            <Accordion type="multiple" className="w-full">
              {Object.entries(fieldsByCategory).map(([category, fields]) => (
                <AccordionItem key={category} value={category} className="border-none">
                  <AccordionTrigger className="py-2 text-xs hover:no-underline">
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICONS[category]}
                      <span>{KITCHEN_CATEGORY_LABELS[category]}</span>
                      <span className="text-muted-foreground">({fields.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 pl-2">
                      {fields.map((field) => (
                        <Button
                          key={field.key}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7 font-normal"
                          onClick={() => onAddElement('dynamic-field', field.key)}
                        >
                          <span className="truncate">{field.label}</span>
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
