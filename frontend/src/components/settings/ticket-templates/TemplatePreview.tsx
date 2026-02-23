import { TicketTemplate } from '@/hooks/useTicketTemplates';

interface TemplatePreviewProps {
  template: TicketTemplate;
  compact?: boolean;
}

/**
 * Preview visual de um template de ticket
 */
export function TemplatePreview({ template, compact }: TemplatePreviewProps) {
  const config = template.template_config;
  const sections = config?.sections || [];
  const styles = config?.styles || {};

  const fontSize = compact ? 'text-[6px]' : 'text-[10px]';
  const lineHeight = compact ? 'leading-tight' : 'leading-snug';

  // Render section based on type
  const renderSection = (section: any, index: number) => {
    const key = `${section.type}-${index}`;

    switch (section.type) {
      case 'header':
        return (
          <div key={key} className={`text-center ${fontSize} font-bold uppercase`}>
            {section.show_company && <div>NOME DA EMPRESA</div>}
          </div>
        );

      case 'origin':
        const originStyle = section.style === 'inverted' 
          ? 'bg-foreground text-background' 
          : '';
        return (
          <div key={key} className={`text-center ${fontSize} font-bold py-0.5 ${originStyle}`}>
            {section.show_stars && '★★★ '}DELIVERY{section.show_stars && ' ★★★'}
          </div>
        );

      case 'order_info':
      case 'order_number':
        const orderStyle = section.style?.includes('inverted') || styles.order_number_inverted
          ? 'bg-foreground text-background'
          : 'border border-foreground';
        const orderSize = section.style?.includes('large') ? 'text-lg' : fontSize;
        return (
          <div key={key} className={`text-center ${orderSize} font-bold py-1 ${orderStyle}`}>
            PEDIDO #123
            {section.show_table && <span className="ml-1">MESA 5</span>}
          </div>
        );

      case 'table_number':
        return (
          <div key={key} className={`text-center text-lg font-bold py-1 bg-foreground text-background`}>
            ★★★ MESA 5 ★★★
          </div>
        );

      case 'comanda':
        return (
          <div key={key} className={`text-center ${fontSize} font-bold py-0.5 bg-foreground text-background`}>
            🏷️ COMANDA #1 - CARLOS
          </div>
        );

      case 'customer':
        return (
          <div key={key} className={`${fontSize} ${lineHeight}`}>
            {section.show_name && <div>👤 João Silva</div>}
            {section.show_phone && <div>📞 (11) 99999-9999</div>}
            {section.show_address && <div>📍 Rua Example, 123</div>}
          </div>
        );

      case 'timing':
        return (
          <div key={key} className={`${fontSize} flex justify-between`}>
            {section.show_date && <span>Data: 26/01/2026</span>}
            {section.show_time && <span>Hora: 14:30</span>}
          </div>
        );

      case 'items':
        return (
          <div key={key} className={`${fontSize} ${lineHeight} border-t border-b border-dashed py-1 my-1`}>
            <div className={section.uppercase ? 'uppercase' : ''}>
              {section.show_quantity && <span>2x </span>}
              PIZZA MARGHERITA
              {section.show_price && <span className="float-right">R$ 45,00</span>}
            </div>
            {section.show_notes && (
              <div className="pl-2 text-muted-foreground">OBS: SEM CEBOLA</div>
            )}
            {section.show_addons && (
              <div className="pl-2">+ Borda recheada</div>
            )}
          </div>
        );

      case 'notes':
        const notesStyle = section.style === 'highlighted' || styles.notes_inverted
          ? 'bg-foreground text-background'
          : 'border border-dashed';
        return (
          <div key={key} className={`${fontSize} p-1 ${notesStyle}`}>
            ⚠️ OBSERVAÇÃO: Entregar rápido
          </div>
        );

      case 'consume_mode':
        return (
          <div key={key} className={`text-center ${fontSize} font-bold py-1 ${
            section.style === 'inverted' ? 'bg-foreground text-background' : 'border-2 border-dashed'
          }`}>
            COMER AQUI
          </div>
        );

      case 'totals':
        return (
          <div key={key} className={`${fontSize} ${lineHeight}`}>
            {section.show_subtotal && (
              <div className="flex justify-between">
                <span>Subtotal:</span><span>R$ 90,00</span>
              </div>
            )}
            {section.show_discount && (
              <div className="flex justify-between text-green-600">
                <span>Desconto:</span><span>-R$ 5,00</span>
              </div>
            )}
            {section.show_delivery && (
              <div className="flex justify-between">
                <span>Entrega:</span><span>R$ 8,00</span>
              </div>
            )}
            {section.show_total && (
              <div className={`flex justify-between font-bold ${styles.total_bold ? 'text-sm' : ''}`}>
                <span>TOTAL:</span><span>R$ 93,00</span>
              </div>
            )}
          </div>
        );

      case 'payment':
        return (
          <div key={key} className={`${fontSize} font-bold`}>
            {section.show_method && <div>PAGAMENTO: PIX</div>}
            {section.show_change && <div className="bg-foreground text-background px-1">TROCO: R$ 7,00</div>}
          </div>
        );

      case 'barcode':
        if (!section.enabled) return null;
        return (
          <div key={key} className="text-center py-1">
            <div className="bg-foreground h-4 mx-auto w-3/4 mb-0.5" />
            <div className={`${fontSize}`}>PEDIDO:abc123</div>
          </div>
        );

      case 'waiter':
        return section.show_name ? (
          <div key={key} className={`${fontSize}`}>
            Atendente: Carlos
          </div>
        ) : null;

      case 'footer':
        return (
          <div key={key} className={`text-center ${fontSize} text-muted-foreground`}>
            {section.show_count && <div>Qtd itens: 2</div>}
            {section.show_sector && <div>COZINHA</div>}
            {section.show_datetime && <div>26/01/2026 14:32</div>}
            {section.show_website && <div>www.zoopi.app.br</div>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`bg-background text-foreground font-mono ${lineHeight} overflow-hidden`}
      style={{ 
        width: compact ? '100%' : template.paper_width === 80 ? '280px' : '200px',
        transform: compact ? 'scale(0.9)' : 'none',
        transformOrigin: 'top left',
      }}
    >
      <div className="space-y-1 p-1">
        {sections.map((section, index) => renderSection(section, index))}
        
        {sections.length === 0 && (
          <div className={`${fontSize} text-center text-muted-foreground py-4`}>
            Template vazio
          </div>
        )}
      </div>
    </div>
  );
}
