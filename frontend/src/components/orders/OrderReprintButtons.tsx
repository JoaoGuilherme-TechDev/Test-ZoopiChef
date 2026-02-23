import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Printer, ChefHat, Receipt, Loader2 } from 'lucide-react';
import { Order } from '@/hooks/useOrders';
import { usePrintSectors, useProductPrintSectors } from '@/hooks/usePrintSectors';
import { useCompany } from '@/hooks/useCompany';
import { usePrintJobQueue } from '@/hooks/usePrintJobQueue';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface OrderReprintButtonsProps {
  order: Order & { 
    edit_version?: number;
    order_number?: number;
    eta_minutes?: number;
    items?: Array<{
      id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      notes: string | null;
      edit_status?: 'new' | 'modified' | 'removed' | null;
      previous_quantity?: number | null;
      previous_notes?: string | null;
    }>;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  showLabels?: boolean;
  className?: string;
}

/**
 * OrderReprintButtons
 * 
 * Componente com dois botões de reimpressão:
 * 1. REIMPRIMIR PRODUÇÃO (Cozinha) - Apenas itens, sem valores
 * 2. REIMPRIMIR TICKET COMPLETO (Cliente) - Com todos os dados
 * 
 * Ambos registram log de reimpressão no banco.
 */
export function OrderReprintButtons({ 
  order, 
  variant = 'outline', 
  size = 'sm',
  showLabels = true,
  className = ''
}: OrderReprintButtonsProps) {
  const [isPrintingProduction, setIsPrintingProduction] = useState(false);
  const [isPrintingFull, setIsPrintingFull] = useState(false);
  
  const { data: company } = useCompany();
  const { sectors, activeSectors } = usePrintSectors();
  const { mappings } = useProductPrintSectors();
  const { createPrintJob } = usePrintJobQueue();
  const { user } = useAuth();

  // Build product-sector map
  const productSectorMap = new Map<string, typeof sectors>();
  mappings.forEach((m: any) => {
    const sectorId = m.sector_id || m.sector?.id;
    const sector = sectors.find((s) => s.id === sectorId);
    if (sector) {
      if (!productSectorMap.has(m.product_id)) {
        productSectorMap.set(m.product_id, []);
      }
      productSectorMap.get(m.product_id)!.push(sector);
    }
  });

  /**
   * Registrar log de reimpressão no banco
   */
  const logReprint = async (type: 'production' | 'full', sectorId?: string) => {
    if (!company?.id) return;
    
    try {
      await supabase.from('reprint_logs').insert({
        company_id: company.id,
        order_id: order.id,
        type,
        source: 'reprint',
        user_id: user?.id || null,
        print_sector_id: sectorId || null,
      });
    } catch (error) {
      console.error('Erro ao registrar log de reimpressão:', error);
    }
  };

  /**
   * REIMPRIMIR PRODUÇÃO (COZINHA)
   * - Apenas itens e observações
   * - Respeita setores de impressão
   * - Sem valores financeiros
   * - Identificado como "REIMPRESSÃO - PRODUÇÃO"
   */
  const handlePrintProduction = async (sectorId?: string, event?: React.MouseEvent) => {
    // Stop propagation to prevent card drag/click interference
    event?.stopPropagation();
    event?.preventDefault();
    
    console.log('[OrderReprintButtons] handlePrintProduction called:', {
      orderId: order.id,
      sectorId,
      companyId: company?.id,
    });

    if (!company?.id) {
      toast.error('Empresa não encontrada');
      return;
    }

    setIsPrintingProduction(true);
    try {
      // Envia para a fila do agente com ticketType: 'production' explícito
      await createPrintJob.mutateAsync({
        orderId: order.id,
        printSectorId: sectorId || null,
        companyId: company.id,
        source: 'manual',
        ticketType: 'production', // Explícito para garantir tipo correto
      });

      await logReprint('production', sectorId);

      const label = sectorId
        ? `setor ${(sectors.find((s) => s.id === sectorId)?.name || '').toUpperCase()}`
        : activeSectors.length > 0
          ? 'todos os itens'
          : 'produção';

      toast.success(`✅ Enviado para impressão (${label})`);
      console.log('[OrderReprintButtons] Print job created successfully');
    } catch (error) {
      console.error('[OrderReprintButtons] Print job failed:', error);
      toast.error('Erro ao enviar para impressão');
    } finally {
      setIsPrintingProduction(false);
    }
  };

  /**
   * REIMPRIMIR TICKET COMPLETO (CLIENTE)
   * - Envia para a fila de impressão (agente desktop)
   * - Identificado como "REIMPRESSÃO - VIA CLIENTE"
   */
  const handlePrintFull = async () => {
    if (!company?.id) {
      toast.error('Empresa não encontrada');
      return;
    }

    setIsPrintingFull(true);
    try {
      // Envia para a fila de impressão com tipo 'full' para ticket completo
      await createPrintJob.mutateAsync({
        orderId: order.id,
        printSectorId: null,
        companyId: company.id,
        source: 'manual',
        ticketType: 'full', // Indica ticket completo (com valores)
      });

      await logReprint('full');
      toast.success('✅ Enviado para impressão (Via Cliente)');
    } catch (error) {
      toast.error('Erro ao reimprimir ticket completo');
    } finally {
      setIsPrintingFull(false);
    }
  };

  // Se não há setores ativos, mostrar botões simples
  if (activeSectors.length === 0) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {/* Botão Reimprimir Produção */}
        <Button
          variant={variant}
          size={size}
          onClick={(e) => handlePrintProduction(undefined, e)}
          disabled={isPrintingProduction}
          className={className || "text-orange-600 hover:text-orange-700 hover:bg-orange-100"}
        >
          {isPrintingProduction ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ChefHat className="h-4 w-4" />
              {showLabels && <span className="ml-1">Produção</span>}
            </>
          )}
        </Button>

        {/* Botão Reimprimir Completo */}
        <Button
          variant={variant}
          size={size}
          onClick={handlePrintFull}
          disabled={isPrintingFull}
          className={className || "text-blue-600 hover:text-blue-700 hover:bg-blue-100"}
        >
          {isPrintingFull ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Receipt className="h-4 w-4" />
              {showLabels && <span className="ml-1">Completo</span>}
            </>
          )}
        </Button>
      </div>
    );
  }

  // Se há setores, mostrar dropdown para produção
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Dropdown Reimprimir Produção */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button 
            variant={variant} 
            size={size} 
            disabled={isPrintingProduction}
            className={className || "text-orange-600 hover:text-orange-700 hover:bg-orange-100"}
            onClick={(e) => e.stopPropagation()}
          >
            {isPrintingProduction ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ChefHat className="h-4 w-4" />
                {showLabels && <span className="ml-1">Produção</span>}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuLabel className="text-orange-600 font-bold">
            REIMPRIMIR PRODUÇÃO
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={(e) => handlePrintProduction(undefined, e)}>
            <Printer className="h-4 w-4 mr-2" />
            Todos os Setores
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {activeSectors.map((sector) => (
            <DropdownMenuItem 
              key={sector.id} 
              onClick={(e) => handlePrintProduction(sector.id, e)}
            >
              <div
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: sector.color || '#6b7280' }}
              />
              {sector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Botão Reimprimir Completo */}
      <Button
        variant={variant}
        size={size}
        onClick={handlePrintFull}
        disabled={isPrintingFull}
        className={className || "text-blue-600 hover:text-blue-700 hover:bg-blue-100"}
      >
        {isPrintingFull ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Receipt className="h-4 w-4" />
            {showLabels && <span className="ml-1">Completo</span>}
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Gera e imprime ticket de produção (cozinha)
 * - Sem valores financeiros
 * - Com identificação de REIMPRESSÃO
 */
function printProductionTicket(
  order: any,
  companyName?: string,
  sector?: any,
  items?: any[]
) {
  const orderNumber = order.order_number 
    ? String(order.order_number).padStart(3, '0')
    : order.id.slice(0, 8).toUpperCase();
  
  const orderTime = new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  // Calcular hora prevista
  let estimatedTime: string | null = null;
  if (order.eta_minutes) {
    const etaDate = new Date(order.created_at);
    etaDate.setMinutes(etaDate.getMinutes() + order.eta_minutes);
    estimatedTime = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const receiptTypeLabels: Record<string, string> = {
    delivery: 'DELIVERY',
    entrega: 'DELIVERY',
    retirada: 'RETIRADA',
    pickup: 'RETIRADA',
    local: 'CONSUMO LOCAL',
    dine_in: 'CONSUMO LOCAL',
    table: 'MESA',
  };
  const receiptType = receiptTypeLabels[order.receipt_type || ''] || order.receipt_type?.toUpperCase() || 'DELIVERY';

  const orderItems = items || order.items || [];
  
  // Gerar HTML dos itens
  const itemsHtml = orderItems.map((item: any) => {
    const editClass = item.edit_status ? `item-${item.edit_status}` : '';
    let statusLabel = '';

    if (item.edit_status === 'new') {
      statusLabel = '<div class="status-badge status-new">★★★ NOVO ★★★</div>';
    } else if (item.edit_status === 'modified') {
      statusLabel = '<div class="status-badge status-modified">▶▶▶ ALTERADO ◀◀◀</div>';
    } else if (item.edit_status === 'removed') {
      statusLabel = '<div class="status-badge status-removed">✖✖✖ REMOVIDO ✖✖✖</div>';
    }

    return `
      <div class="item-row ${editClass}">
        ${statusLabel}
        <div class="item-main">
          <span class="item-qty">${item.quantity}x</span>
          <span class="item-name">${item.product_name.toUpperCase()}</span>
        </div>
        ${item.notes && item.edit_status !== 'removed' ? `<div class="item-obs">📝 ${item.notes.toUpperCase()}</div>` : ''}
      </div>`;
  }).join('');

  const sectorBadge = sector 
    ? `<div class="sector-badge" style="background: ${sector.color || '#3b82f6'};">${sector.name.toUpperCase()}</div>` 
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>REIMPRESSÃO PRODUÇÃO - #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 76mm;
      padding: 4px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .reprint-header {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 12px 8px;
      margin: -4px -4px 8px -4px;
      border: 4px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .reprint-title { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
    .reprint-sub { font-size: 14px; margin-top: 4px; }
    
    .company { font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center; margin-bottom: 8px; }
    
    .sector-badge {
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      padding: 10px;
      margin: 8px 0;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-number {
      background: #000;
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin: 8px 0;
      letter-spacing: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-type {
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      margin: 6px 0;
      padding: 6px;
      border: 2px solid #000;
    }
    
    .times {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: bold;
      margin: 8px 0;
      padding: 4px;
      background: #eee;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .separator { border-top: 1px dashed #000; margin: 8px 0; }
    .separator-bold { border-top: 2px solid #000; margin: 8px 0; }
    
    .customer-section { margin: 8px 0; }
    .customer-line { font-size: 14px; font-weight: bold; margin: 4px 0; word-wrap: break-word; }
    .address-obs {
      background: #000;
      color: #fff;
      padding: 6px;
      font-weight: bold;
      margin: 4px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .obs-section { margin: 8px 0; }
    .obs-title {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 6px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .obs-content {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      padding: 8px;
      margin-top: 2px;
      word-wrap: break-word;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .items-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
    
    .item-row { margin: 8px 0; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .item-main { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
    .item-qty { font-size: 18px; font-weight: bold; min-width: 40px; }
    .item-name { font-size: 16px; font-weight: bold; flex: 1; }
    .item-obs { font-size: 14px; font-weight: bold; font-style: italic; padding-left: 40px; margin-top: 4px; }
    
    /* Edit status styles - High contrast for thermal printing */
    .item-new { background: #000; color: #fff; padding: 8px; margin: 6px -4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item-modified { background: #000; color: #fff; padding: 8px; margin: 6px -4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item-removed { background: #000; color: #fff; padding: 8px; margin: 6px -4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    .status-badge { font-size: 14px; font-weight: bold; padding: 4px 8px; border: 2px solid #000; }
    .status-new { background: #fff; color: #000; border: 3px solid #000; }
    .status-modified { background: #fff; color: #000; border: 3px solid #000; }
    .status-removed { background: #fff; color: #000; border: 3px solid #000; }
    
    .footer { text-align: center; font-size: 11px; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; }
    
    @media print { body { width: 100%; max-width: 76mm; } }
  </style>
</head>
<body>
  <div class="reprint-header">
    <div class="reprint-title">⟳ REIMPRESSÃO</div>
    <div class="reprint-sub">TICKET PRODUÇÃO / COZINHA</div>
  </div>
  
  <div class="company">${companyName || 'COZINHA'}</div>
  
  ${sectorBadge}
  
  <div class="order-number">PEDIDO #${orderNumber}</div>
  
  <div class="order-type">${receiptType}</div>
  
  <div class="times">
    <span>HORA: ${orderTime}</span>
    <span>PREV: ${estimatedTime || '--:--'}</span>
  </div>
  
  <div class="separator"></div>
  
  ${order.customer_name || order.customer_phone ? `
  <div class="customer-section">
    ${order.customer_name ? `<div class="customer-line">👤 ${order.customer_name.toUpperCase()}</div>` : ''}
    ${order.customer_phone ? `<div class="customer-line">📞 ${order.customer_phone}</div>` : ''}
    ${order.customer_address ? `<div class="customer-line">📍 ${order.customer_address.toUpperCase()}</div>` : ''}
    ${order.address_notes ? `<div class="address-obs">⚠️ ${order.address_notes.toUpperCase()}</div>` : ''}
  </div>
  <div class="separator"></div>
  ` : ''}
  
  ${order.notes ? `
  <div class="obs-section">
    <div class="obs-title">⚠️ OBSERVAÇÕES DO PEDIDO</div>
    <div class="obs-content">${order.notes.toUpperCase()}</div>
  </div>
  <div class="separator-bold"></div>
  ` : ''}
  
  <div class="items-title">ITENS DO PEDIDO:</div>
  <div class="items-section">
    ${itemsHtml || '<div>Nenhum item</div>'}
  </div>
  
  <div class="footer">
    <div>⟳ REIMPRESSÃO PRODUÇÃO</div>
    <div>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Gera e imprime ticket completo do cliente
 * - Com todos os dados financeiros
 * - Com identificação de REIMPRESSÃO - VIA CLIENTE
 */
function printFullCustomerTicket(
  order: any,
  companyName?: string,
  companyInfo?: { cnpj?: string; address?: string; phone?: string }
) {
  const orderNumber = order.order_number 
    ? String(order.order_number).padStart(3, '0')
    : order.id.slice(0, 8).toUpperCase();
  
  const orderTime = new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  // Calcular hora prevista
  let estimatedTime: string | null = null;
  if (order.eta_minutes) {
    const etaDate = new Date(order.created_at);
    etaDate.setMinutes(etaDate.getMinutes() + order.eta_minutes);
    estimatedTime = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const receiptTypeLabels: Record<string, string> = {
    entrega: 'DELIVERY',
    delivery: 'DELIVERY',
    retirada: 'RETIRADA',
    pickup: 'RETIRADA',
    local: 'CONSUMO NO LOCAL',
  };
  const receiptType = order.receipt_type ? receiptTypeLabels[order.receipt_type] || order.receipt_type.toUpperCase() : 'DELIVERY';

  const paymentMethodLabels: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'DINHEIRO',
    cartao_credito: 'CARTÃO CRÉDITO',
    cartao_debito: 'CARTÃO DÉBITO',
  };
  const paymentMethod = order.payment_method ? paymentMethodLabels[order.payment_method] || order.payment_method.toUpperCase() : '';

  // Build items HTML
  const itemsHtml = order.items?.map((item: any) => {
    const itemTotal = (item.quantity * item.unit_price).toFixed(2);
    let html = `
      <div class="item-row">
        <span class="item-qty">${item.quantity}x</span>
        <span class="item-name">${item.product_name}</span>
        <span class="item-price">R$ ${itemTotal}</span>
      </div>`;
    if (item.notes) {
      html += `<div class="item-obs">   * ${item.notes}</div>`;
    }
    return html;
  }).join('') || '<div class="item-row">Nenhum item</div>';

  // Troco
  const changeFor = order.change_for;
  const needsChange = order.payment_method === 'dinheiro' && changeFor && changeFor > order.total;
  const changeAmount = needsChange ? (changeFor - order.total).toFixed(2) : null;

  // Valores
  const deliveryFee = order.delivery_fee || 0;
  const subtotal = order.total - deliveryFee;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>REIMPRESSÃO VIA CLIENTE - #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', 'Lucida Console', Consolas, monospace; 
      font-size: 12px; 
      width: 76mm;
      max-width: 76mm;
      padding: 4px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .reprint-header {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 12px 8px;
      margin: -4px -4px 8px -4px;
      border: 4px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .reprint-title { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
    .reprint-sub { font-size: 14px; margin-top: 4px; }
    
    .company-header { text-align: center; margin-bottom: 8px; }
    .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    .company-cnpj, .company-address { font-size: 11px; }
    .company-phone { font-size: 14px; font-weight: bold; }
    
    .separator { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .separator-double { border: none; border-top: 2px solid #000; margin: 8px 0; }
    
    .order-number {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 8px 0;
      letter-spacing: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .order-type { font-size: 18px; font-weight: bold; text-align: center; margin: 6px 0; }
    .order-times { font-size: 16px; font-weight: bold; margin: 4px 0; }
    
    .customer-section { margin: 8px 0; }
    .customer-line { font-size: 16px; font-weight: bold; margin: 4px 0; word-wrap: break-word; }
    
    .obs-section { margin: 8px 0; }
    .obs-title {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 6px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .obs-content {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 16px;
      font-weight: bold;
      padding: 8px;
      margin-top: 2px;
      word-wrap: break-word;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .items-title { font-size: 14px; font-weight: bold; margin-bottom: 6px; text-decoration: underline; }
    .item-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 6px 0; font-size: 14px; }
    .item-qty { font-weight: bold; min-width: 35px; }
    .item-name { flex: 1; padding: 0 8px; }
    .item-price { text-align: right; font-weight: bold; min-width: 70px; }
    .item-obs { font-size: 12px; font-weight: bold; padding-left: 35px; margin-bottom: 4px; font-style: italic; }
    
    .totals-section { margin: 8px 0; }
    .total-line { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 4px 0; }
    .total-final {
      background-color: #000 !important;
      color: #fff !important;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      padding: 10px 8px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .payment-section { margin: 8px 0; text-align: center; }
    .payment-method { font-size: 16px; font-weight: bold; margin: 4px 0; }
    .change-section {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .footer { text-align: center; font-size: 11px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000; }
    
    @media print { body { width: 100%; max-width: 76mm; } }
  </style>
</head>
<body>
  
  <div class="reprint-header">
    <div class="reprint-title">⟳ REIMPRESSÃO</div>
    <div class="reprint-sub">VIA CLIENTE</div>
  </div>

  <div class="company-header">
    <div class="company-name">${companyName || 'ESTABELECIMENTO'}</div>
    ${companyInfo?.cnpj ? `<div class="company-cnpj">CNPJ: ${companyInfo.cnpj}</div>` : ''}
    ${companyInfo?.address ? `<div class="company-address">${companyInfo.address}</div>` : ''}
    ${companyInfo?.phone ? `<div class="company-phone">Tel: ${companyInfo.phone}</div>` : ''}
  </div>
  
  <hr class="separator-double" />
  
  <div class="order-number">PEDIDO #${orderNumber}</div>
  
  <div class="order-type">TIPO: ${receiptType}</div>
  
  <div class="order-times">HORA PEDIDO: ${orderTime}</div>
  <div class="order-times">PREVISÃO: ${estimatedTime || 'A DEFINIR'}</div>
  
  <hr class="separator" />
  
  <div class="customer-section">
    ${order.customer_name ? `<div class="customer-line">CLIENTE: ${order.customer_name.toUpperCase()}</div>` : ''}
    ${order.customer_phone ? `<div class="customer-line">TEL: ${order.customer_phone}</div>` : ''}
    ${order.customer_address ? `<div class="customer-line">END: ${order.customer_address.toUpperCase()}</div>` : ''}
    ${order.address_notes ? `<div class="customer-line" style="background:#000;color:#fff;padding:4px;margin-top:4px;">📍 ${order.address_notes.toUpperCase()}</div>` : ''}
  </div>
  
  ${order.notes ? `
  <div class="obs-section">
    <div class="obs-title">████ OBSERVAÇÕES ████</div>
    <div class="obs-content">${order.notes.toUpperCase()}</div>
  </div>
  ` : ''}
  
  <hr class="separator-double" />
  
  <div class="items-title">ITENS:</div>
  <div class="items-section">
    ${itemsHtml}
  </div>
  
  <hr class="separator" />
  
  <div class="totals-section">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>R$ ${subtotal.toFixed(2)}</span>
    </div>
    ${deliveryFee > 0 ? `
    <div class="total-line">
      <span>Taxa Entrega:</span>
      <span>R$ ${deliveryFee.toFixed(2)}</span>
    </div>
    ` : ''}
  </div>
  
  <div class="total-final">
    <span>TOTAL:</span>
    <span>R$ ${Number(order.total).toFixed(2)}</span>
  </div>
  
  <hr class="separator" />
  
  <div class="payment-section">
    ${paymentMethod ? `<div class="payment-method">Pagamento: ${paymentMethod}</div>` : ''}
  </div>
  
  ${needsChange ? `
  <div class="change-section">
    <div>TROCO PARA: R$ ${changeFor?.toFixed(2)}</div>
    <div style="font-size: 20px; margin-top: 4px;">LEVAR TROCO: R$ ${changeAmount}</div>
  </div>
  ` : ''}
  
  <!-- QR CODE ACOMPANHAMENTO -->
  <div class="qr-section" style="text-align: center; margin: 12px 0; padding: 8px; border: 1px dashed #000;">
    <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">📱 ACOMPANHE SEU PEDIDO</div>
    <div style="display: flex; justify-content: center; margin-bottom: 4px;">
      <img 
        src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://tenant-base-forge.lovable.app'}/acompanhar/${order.id}`)}" 
        alt="QR Code" 
        style="width: 80px; height: 80px;"
        onerror="this.parentElement.parentElement.style.display='none'"
      />
    </div>
    <div style="font-size: 9px; color: #666;">Escaneie para ver o status em tempo real</div>
  </div>

  <div class="footer">
    <div>⟳ REIMPRESSÃO - VIA CLIENTE</div>
    <div>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
    <div>Obrigado pela preferência!</div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}