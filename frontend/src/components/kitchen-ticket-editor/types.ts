// Types for the Kitchen/Production Ticket Visual Editor
// COMPLETELY ISOLATED from receipt-editor types

export type KitchenElementType = 
  | 'text'
  | 'dynamic-field'
  | 'line-solid'
  | 'line-dashed'
  | 'spacer'
  | 'line-break'
  | 'separator-block'
  | 'section-title';

export type TextAlign = 'left' | 'center' | 'right';
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type FontWeight = 'normal' | 'bold';

export interface KitchenElementStyle {
  fontSize: FontSize;
  fontWeight: FontWeight;
  textAlign: TextAlign;
  inverted: boolean; // White text on black background
  uppercase: boolean;
  letterSpacing: number; // px
  lineHeight: number; // multiplier
  color: 'black' | 'gray';
}

export interface KitchenElementPosition {
  x: number; // percentage 0-100
  y: number; // pixels from top
  width: number; // percentage 0-100
  height: number; // pixels
}

export interface KitchenTicketElement {
  id: string;
  type: KitchenElementType;
  position: KitchenElementPosition;
  style: KitchenElementStyle;
  content: string;
  fieldKey?: string;
}

export interface KitchenTicketTemplate {
  id: string;
  company_id: string;
  name: string;
  paper_width: 58 | 80;
  elements: KitchenTicketElement[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Kitchen-specific dynamic fields
export interface KitchenDynamicField {
  key: string;
  label: string;
  category: 'order' | 'customer' | 'items' | 'timing' | 'sector';
  sampleValue: string;
}

export const KITCHEN_DYNAMIC_FIELDS: KitchenDynamicField[] = [
  // Order Info (DESTAQUE PRINCIPAL)
  { key: 'order_number', label: 'Número do Pedido', category: 'order', sampleValue: '#1234' },
  { key: 'order_sequence', label: 'Sequência Diária', category: 'order', sampleValue: '001' },
  { key: 'order_type', label: 'Tipo do Pedido', category: 'order', sampleValue: 'DELIVERY' },
  { key: 'table_number', label: 'Número da Mesa', category: 'order', sampleValue: 'MESA 05' },
  { key: 'table_name', label: 'Nome da Mesa', category: 'order', sampleValue: 'Varanda 2' },
  { key: 'priority', label: 'Prioridade', category: 'order', sampleValue: 'URGENTE' },
  { key: 'order_notes', label: 'Observações do Pedido', category: 'order', sampleValue: 'Cliente VIP' },
  
  // Customer
  { key: 'customer_name', label: 'Nome do Cliente', category: 'customer', sampleValue: 'João Silva' },
  { key: 'customer_phone', label: 'Telefone', category: 'customer', sampleValue: '(11) 99999-9999' },
  
  // Items (FOCO TOTAL)
  { key: 'items_list', label: 'Lista de Itens', category: 'items', sampleValue: '2x Pizza Margherita\n1x Coca-Cola 2L' },
  { key: 'item_name', label: 'Nome do Produto', category: 'items', sampleValue: 'PIZZA MARGHERITA' },
  { key: 'item_quantity', label: 'Quantidade', category: 'items', sampleValue: '2x' },
  { key: 'item_notes', label: 'Observações do Item', category: 'items', sampleValue: 'SEM CEBOLA' },
  { key: 'item_addons', label: 'Adicionais', category: 'items', sampleValue: '+ Bacon, + Queijo' },
  { key: 'combo_items', label: 'Itens do Combo', category: 'items', sampleValue: 'Hambúrguer + Batata + Refri' },
  { key: 'all_notes', label: 'Todas Observações', category: 'items', sampleValue: 'Sem cebola, bem passado' },
  
  // Timing
  { key: 'order_time', label: 'Horário do Pedido', category: 'timing', sampleValue: '14:30' },
  { key: 'print_time', label: 'Horário de Impressão', category: 'timing', sampleValue: '14:32' },
  { key: 'elapsed_time', label: 'Tempo Decorrido', category: 'timing', sampleValue: '5 min' },
  { key: 'order_date', label: 'Data do Pedido', category: 'timing', sampleValue: '23/01/2026' },
  { key: 'order_datetime', label: 'Data e Hora', category: 'timing', sampleValue: '23/01/2026 14:30' },
  
  // Sector
  { key: 'sector_name', label: 'Setor', category: 'sector', sampleValue: 'COZINHA' },
  { key: 'production_location', label: 'Local de Produção', category: 'sector', sampleValue: 'CHAPA' },
  { key: 'printer_name', label: 'Impressora', category: 'sector', sampleValue: 'Cozinha Principal' },
  { key: 'waiter_name', label: 'Atendente', category: 'sector', sampleValue: 'Carlos' },
];

export const KITCHEN_CATEGORY_LABELS: Record<string, string> = {
  order: 'Pedido',
  customer: 'Cliente',
  items: 'Itens',
  timing: 'Horários',
  sector: 'Setor/Local',
};

export const DEFAULT_KITCHEN_ELEMENT_STYLE: KitchenElementStyle = {
  fontSize: 'md',
  fontWeight: 'normal',
  textAlign: 'left',
  inverted: false,
  uppercase: false,
  letterSpacing: 0,
  lineHeight: 1.2,
  color: 'black',
};

export const KITCHEN_FONT_SIZE_MAP: Record<FontSize, number> = {
  'xs': 8,
  'sm': 10,
  'md': 12,
  'lg': 14,
  'xl': 16,
  '2xl': 20,
  '3xl': 24,
};

export function createDefaultKitchenElement(type: KitchenElementType, yPosition: number): KitchenTicketElement {
  const id = crypto.randomUUID();
  
  const baseElement: KitchenTicketElement = {
    id,
    type,
    position: {
      x: 0,
      y: yPosition,
      width: 100,
      height: 24,
    },
    style: { ...DEFAULT_KITCHEN_ELEMENT_STYLE },
    content: '',
  };

  switch (type) {
    case 'text':
      return { ...baseElement, content: 'Texto' };
    case 'dynamic-field':
      return { ...baseElement, content: '', fieldKey: 'order_number' };
    case 'line-solid':
      return { ...baseElement, position: { ...baseElement.position, height: 2 } };
    case 'line-dashed':
      return { ...baseElement, position: { ...baseElement.position, height: 2 } };
    case 'spacer':
      return { ...baseElement, position: { ...baseElement.position, height: 16 } };
    case 'line-break':
      return { ...baseElement, position: { ...baseElement.position, height: 8 }, content: '↵' };
    case 'separator-block':
      return { 
        ...baseElement, 
        position: { ...baseElement.position, height: 12 },
        content: '════════════════════',
        style: { ...baseElement.style, textAlign: 'center' },
      };
    case 'section-title':
      return {
        ...baseElement,
        position: { ...baseElement.position, height: 28 },
        content: 'ITENS',
        style: { ...baseElement.style, fontWeight: 'bold', fontSize: 'lg', textAlign: 'center', inverted: true },
      };
    default:
      return baseElement;
  }
}
