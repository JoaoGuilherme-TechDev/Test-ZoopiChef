// Types for the Visual Receipt Editor

export type ElementType = 
  | 'text'
  | 'dynamic-field'
  | 'line-solid'
  | 'line-dashed'
  | 'spacer'
  | 'line-break'  // Manual line break
  | 'separator-block' // Visual separator block
  | 'barcode'
  | 'qrcode'
  | 'logo';

export type TextAlign = 'left' | 'center' | 'right';
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type FontWeight = 'normal' | 'bold';

export interface ElementStyle {
  fontSize: FontSize;
  fontWeight: FontWeight;
  textAlign: TextAlign;
  inverted: boolean; // White text on black background
  uppercase: boolean;
  letterSpacing: number; // px
  lineHeight: number; // multiplier
  color: 'black' | 'gray' | 'light-gray';
}

export interface ElementPosition {
  x: number; // percentage 0-100
  y: number; // pixels from top
  width: number; // percentage 0-100
  height: number; // pixels
}

export interface ReceiptElement {
  id: string;
  type: ElementType;
  position: ElementPosition;
  style: ElementStyle;
  content: string; // For text elements, the actual text or field key
  fieldKey?: string; // For dynamic fields
  showTextBelow?: boolean; // For barcodes/qrcodes
  imageUrl?: string; // For logo
  aspectRatio?: number; // For logo
}

export interface ReceiptTemplate {
  id: string;
  company_id: string;
  name: string;
  paper_width: 58 | 80; // mm
  elements: ReceiptElement[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Dynamic field definitions
export interface DynamicField {
  key: string;
  label: string;
  category: 'customer' | 'company' | 'product' | 'order' | 'payment' | 'layout';
  sampleValue: string;
}

export const DYNAMIC_FIELDS: DynamicField[] = [
  // Customer
  { key: 'customer_name', label: 'Nome do Cliente', category: 'customer', sampleValue: 'João Silva' },
  { key: 'customer_phone', label: 'Telefone', category: 'customer', sampleValue: '(11) 99999-9999' },
  { key: 'customer_cpf', label: 'CPF', category: 'customer', sampleValue: '123.456.789-00' },
  { key: 'customer_address', label: 'Endereço Completo', category: 'customer', sampleValue: 'Rua das Flores, 123' },
  { key: 'customer_street', label: 'Rua', category: 'customer', sampleValue: 'Rua das Flores' },
  { key: 'customer_number', label: 'Número', category: 'customer', sampleValue: '123' },
  { key: 'customer_complement', label: 'Complemento', category: 'customer', sampleValue: 'Apto 45' },
  { key: 'customer_neighborhood', label: 'Bairro', category: 'customer', sampleValue: 'Centro' },
  { key: 'customer_city', label: 'Cidade', category: 'customer', sampleValue: 'São Paulo' },
  { key: 'customer_state', label: 'Estado', category: 'customer', sampleValue: 'SP' },
  { key: 'customer_zipcode', label: 'CEP', category: 'customer', sampleValue: '01234-567' },
  { key: 'customer_reference', label: 'Referência', category: 'customer', sampleValue: 'Próximo ao mercado' },
  
  // Company
  { key: 'company_name', label: 'Nome da Empresa', category: 'company', sampleValue: 'Restaurante ABC' },
  { key: 'company_cnpj', label: 'CNPJ', category: 'company', sampleValue: '12.345.678/0001-90' },
  { key: 'company_ie', label: 'Inscrição Estadual', category: 'company', sampleValue: '123.456.789.012' },
  { key: 'company_address', label: 'Endereço da Empresa', category: 'company', sampleValue: 'Av. Principal, 456' },
  { key: 'company_phone', label: 'Telefone da Empresa', category: 'company', sampleValue: '(11) 3333-4444' },
  { key: 'company_email', label: 'E-mail da Empresa', category: 'company', sampleValue: 'contato@empresa.com' },
  { key: 'company_website', label: 'Website', category: 'company', sampleValue: 'www.empresa.com' },
  
  // Product
  { key: 'product_code', label: 'Código do Produto', category: 'product', sampleValue: 'PRD001' },
  { key: 'product_sku', label: 'SKU', category: 'product', sampleValue: 'SKU-12345' },
  { key: 'product_name', label: 'Nome do Produto', category: 'product', sampleValue: 'Pizza Margherita' },
  { key: 'product_description', label: 'Descrição do Produto', category: 'product', sampleValue: 'Molho, mussarela, tomate e manjericão' },
  { key: 'product_category', label: 'Categoria', category: 'product', sampleValue: 'Pizzas' },
  { key: 'product_subcategory', label: 'Subcategoria', category: 'product', sampleValue: 'Tradicionais' },
  { key: 'product_quantity', label: 'Quantidade', category: 'product', sampleValue: '2' },
  { key: 'product_unit_price', label: 'Valor Unitário', category: 'product', sampleValue: 'R$ 45,00' },
  { key: 'product_total', label: 'Valor Total Item', category: 'product', sampleValue: 'R$ 90,00' },
  { key: 'product_notes', label: 'Observações do Item', category: 'product', sampleValue: 'Sem cebola' },
  
  // Order
  { key: 'order_number', label: 'Número do Pedido', category: 'order', sampleValue: '#1234' },
  { key: 'order_sequence', label: 'Sequência Diária', category: 'order', sampleValue: '001' },
  { key: 'order_date', label: 'Data', category: 'order', sampleValue: '22/01/2026' },
  { key: 'order_time', label: 'Hora', category: 'order', sampleValue: '14:30' },
  { key: 'order_datetime', label: 'Data e Hora', category: 'order', sampleValue: '22/01/2026 14:30' },
  { key: 'ticket_title', label: 'Título do Ticket', category: 'order', sampleValue: 'PEDIDO' },
  { key: 'order_type', label: 'Tipo do Pedido', category: 'order', sampleValue: 'Delivery' },
  { key: 'table_number', label: 'Número da Mesa', category: 'order', sampleValue: 'Mesa 05' },
  { key: 'waiter_name', label: 'Nome do Atendente', category: 'order', sampleValue: 'Carlos' },
  { key: 'order_notes', label: 'Observações do Pedido', category: 'order', sampleValue: 'Entregar no portão' },
  
  // Payment
  { key: 'subtotal', label: 'Subtotal', category: 'payment', sampleValue: 'R$ 90,00' },
  { key: 'discount', label: 'Desconto', category: 'payment', sampleValue: 'R$ 10,00' },
  { key: 'discount_percent', label: 'Desconto (%)', category: 'payment', sampleValue: '10%' },
  { key: 'service_fee', label: 'Taxa de Serviço', category: 'payment', sampleValue: 'R$ 9,00' },
  { key: 'delivery_fee', label: 'Taxa de Entrega', category: 'payment', sampleValue: 'R$ 5,00' },
  { key: 'total', label: 'Total', category: 'payment', sampleValue: 'R$ 85,00' },
  { key: 'payment_method', label: 'Forma de Pagamento', category: 'payment', sampleValue: 'Cartão Crédito' },
  { key: 'payment_status', label: 'Status do Pagamento', category: 'payment', sampleValue: 'Pago' },
  { key: 'amount_paid', label: 'Valor Pago', category: 'payment', sampleValue: 'R$ 100,00' },
  { key: 'change', label: 'Troco', category: 'payment', sampleValue: 'R$ 15,00' },
  { key: 'installments', label: 'Parcelas', category: 'payment', sampleValue: '3x R$ 28,33' },
];

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  fontSize: 'md',
  fontWeight: 'normal',
  textAlign: 'left',
  inverted: false,
  uppercase: false,
  letterSpacing: 0,
  lineHeight: 1.2,
  color: 'black',
};

export const FONT_SIZE_MAP: Record<FontSize, number> = {
  'xs': 8,
  'sm': 10,
  'md': 12,
  'lg': 14,
  'xl': 16,
  '2xl': 20,
};

export function createDefaultElement(type: ElementType, yPosition: number): ReceiptElement {
  const id = crypto.randomUUID();
  
  const baseElement: ReceiptElement = {
    id,
    type,
    position: {
      x: 0,
      y: yPosition,
      width: 100,
      height: 24,
    },
    style: { ...DEFAULT_ELEMENT_STYLE },
    content: '',
  };

  switch (type) {
    case 'text':
      return { ...baseElement, content: 'Texto aqui' };
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
        content: '═══════════════════',
        style: { ...baseElement.style, textAlign: 'center' },
      };
    case 'barcode':
      return { 
        ...baseElement, 
        position: { ...baseElement.position, height: 48 },
        content: 'order_number',
        showTextBelow: true,
      };
    case 'qrcode':
      return { 
        ...baseElement, 
        position: { ...baseElement.position, height: 80, width: 40, x: 30 },
        content: 'order_url',
      };
    case 'logo':
      return { 
        ...baseElement, 
        position: { ...baseElement.position, height: 60, width: 50, x: 25 },
        imageUrl: '',
        aspectRatio: 1,
      };
    default:
      return baseElement;
  }
}
