import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Phone, User, AlertTriangle, Bike, MessageCircle, ArrowRight, Timer, X, Edit3, Printer, Expand, Globe, PhoneCall, Store, Package, UtensilsCrossed } from 'lucide-react';
import { Order, OrderStatus } from '@/hooks/useOrders';
import { Deliverer } from '@/hooks/useDeliverers';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectorPrintMenu } from './SectorPrintMenu';
import { OrderReprintButtons } from './OrderReprintButtons';
import { cn } from '@/lib/utils';
import { OrderCancelDialog } from './OrderCancelDialog';
import { OrderEditDialog } from './OrderEditDialog';
import { OrderExpandDialog } from './OrderExpandDialog';
import { buildItemChildLines, truncateEllipsis } from '@/lib/receiptFormatting';
import { getOrderTypeLabel } from '@/lib/orderTypeLabel';

interface OrderCardProps {
  order: Order;
  onDragStart: (e: React.DragEvent, orderId: string) => void;
  onPrint?: (order: Order) => void;
  deliverers?: Deliverer[];
  onAssignDeliverer?: (orderId: string, delivererId: string | null) => void;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  warnMinutes?: number;
  dangerMinutes?: number;
  className?: string;
}

// Ícones para tipos de pedido
const orderTypeIcons = {
  globe: Globe,
  phone: PhoneCall,
  store: Store,
  package: Package,
  utensils: UtensilsCrossed,
};

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'preparo', label: 'Preparo' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'em_rota', label: 'Em Rota' },
  { value: 'entregue', label: 'Entregue' },
];

export function OrderCard({ order, onDragStart, onPrint, deliverers, onAssignDeliverer, onStatusChange, warnMinutes = 10, dangerMinutes = 20, className }: OrderCardProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandDialogOpen, setExpandDialogOpen] = useState(false);
  
  const showDelivererSelect = (order.status === 'pronto' || order.status === 'em_rota') && deliverers && onAssignDeliverer;
  const activeDeliverers = deliverers?.filter(d => d.active) || [];
  const canSendWhatsApp = order.deliverer?.whatsapp && (order.status === 'pronto' || order.status === 'em_rota');
  
  // Permissions
  const canCancel = order.status !== 'entregue' && (order.status as string) !== 'cancelado';
  const canEdit = ['novo', 'preparo', 'pronto', 'em_rota'].includes(order.status);

  // Time calculations
  const now = new Date();
  const created = parseISO(order.created_at);

  const parseMaybe = (iso?: string | null) => (iso ? parseISO(iso) : null);
  const acceptedAt = parseMaybe((order as any).accepted_at);
  const readyAt = parseMaybe((order as any).ready_at);
  const dispatchedAt = parseMaybe((order as any).dispatched_at);
  const deliveredAt = parseMaybe((order as any).delivered_at);

  const formatTime = (d: Date | null) => (d ? format(d, 'HH:mm') : null);

  // Total time from creation to delivery (or now if not delivered)
  const endTime = order.status === 'entregue' && deliveredAt ? deliveredAt : now;
  const totalMinutes = differenceInMinutes(endTime, created);

  // Get stage start time based on current status
  const getStageStartTime = () => {
    if (order.status === 'em_rota' && dispatchedAt) return dispatchedAt;
    if (order.status === 'pronto' && readyAt) return readyAt;
    if (order.status === 'preparo' && acceptedAt) return acceptedAt;
    return created;
  };
  const stageMinutes = differenceInMinutes(now, getStageStartTime());

  // Alert states - only show for active orders (not delivered)
  const isActiveOrder = order.status !== 'entregue';
  const isWarning = isActiveOrder && stageMinutes >= warnMinutes && stageMinutes < dangerMinutes;
  const isDanger = isActiveOrder && stageMinutes >= dangerMinutes;

  const formatWhatsAppNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const generateGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const sendWhatsApp = () => {
    if (!order.deliverer?.whatsapp) return;

    const items = order.items?.map(item => `${item.quantity}x ${item.product_name}`).join('\n') || '';
    const mapsLink = order.customer_address ? generateGoogleMapsLink(order.customer_address) : '';

    const orderDisplayNumber = (order as any).order_number ? String((order as any).order_number).padStart(3, '0') : order.id.slice(0, 8);
    const message = `🛵 *NOVO PEDIDO*

📋 *Pedido:* #${orderDisplayNumber}

👤 *Cliente:* ${order.customer_name || 'Não informado'}
📞 *Telefone:* ${order.customer_phone || 'Não informado'}
📍 *Endereço:* ${order.customer_address || 'Não informado'}

🛒 *Itens:*
${items}

💰 *Total:* R$ ${Number(order.total).toFixed(2)}

${order.notes ? `📝 *Obs:* ${order.notes}` : ''}

${mapsLink ? `🗺️ *Link do Maps:*\n${mapsLink}` : ''}`;

    const phone = formatWhatsAppNumber(order.deliverer.whatsapp);
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Status-based card background colors (high contrast versions)
  const getStatusBackground = () => {
    switch (order.status) {
      case 'novo': return 'bg-blue-800 text-white font-semibold';
      case 'preparo': return 'bg-orange-600 text-white font-semibold';
      case 'pronto': return 'bg-green-700 text-white font-semibold';
      case 'em_rota': return 'bg-purple-800 text-white font-semibold';
      case 'entregue': return 'bg-gray-700 text-white font-semibold';
      default: return 'bg-card';
    }
  };

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-0",
        getStatusBackground(),
        isWarning && "ring-2 ring-warning",
        isDanger && "ring-2 ring-destructive",
        className
      )}
    >
      <CardHeader className="p-3 pb-2">
        {/* TIPO DO PEDIDO - Badge destacado no topo - PISCA apenas esta tag quando atrasado */}
        {(() => {
          const typeInfo = getOrderTypeLabel(order.order_type, (order as any).source, (order as any).eat_here);
          const TypeIcon = orderTypeIcons[typeInfo.icon];
          return (
            <div 
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-md mb-2 font-black text-base tracking-wide",
                typeInfo.color,
                typeInfo.textColor === '#000' ? 'text-black' : 'text-white',
                isDanger && "animate-pulse"
              )}
            >
              <TypeIcon className="h-5 w-5" />
              <span>{typeInfo.label}</span>
            </div>
          );
        })()}
        
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-white font-bold">
            #{(order as any).order_number ? String((order as any).order_number).padStart(3, '0') : order.id.slice(0, 8)}
          </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Settled badge - Acerto já feito */}
          {(order as any).settled_at && (
            <Badge className="text-xs bg-green-600 text-white font-bold">
              ✓ ACERTADO
            </Badge>
          )}
          {/* Edited badge */}
          {((order as any).edit_version > 0 || order.items?.some((i: any) => i.edit_status)) && (
            <Badge className="text-xs bg-amber-500 text-black font-bold">
              EDITADO
            </Badge>
          )}
          {isDanger && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              ATRASADO
            </Badge>
          )}
          <SectorPrintMenu
            order={order} 
            onPrintAll={onPrint ? () => onPrint(order) : undefined} 
            variant="icon" 
          />
        </div>
        </div>
        {/* Time chips */}
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-2.5 w-2.5 mr-1" />
            {format(created, 'HH:mm')}
          </Badge>

          {acceptedAt && (
            <Badge variant="outline" className="text-xs">
              Preparo: {formatTime(acceptedAt)}
            </Badge>
          )}
          {readyAt && (
            <Badge variant="outline" className="text-xs">
              Pronto: {formatTime(readyAt)}
            </Badge>
          )}
          {dispatchedAt && (
            <Badge variant="outline" className="text-xs">
              Saiu: {formatTime(dispatchedAt)}
            </Badge>
          )}
          {deliveredAt && (
            <Badge variant="outline" className="text-xs">
              Entregue: {formatTime(deliveredAt)}
            </Badge>
          )}

          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isWarning && "bg-warning/20 border-warning text-warning",
              isDanger && "bg-destructive/20 border-destructive text-destructive"
            )}
          >
            <Timer className="h-2.5 w-2.5 mr-1" />
            Total: {totalMinutes}min
          </Badge>
          {order.status !== 'novo' && (
            <Badge variant="outline" className="text-xs">
              Etapa: {stageMinutes}min
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {order.customer?.alerts && (
          <Alert variant="destructive" className="py-2 px-3">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs ml-2">
              {order.customer.alerts}
            </AlertDescription>
          </Alert>
        )}

        {order.customer_name && (
          <div className="flex items-start gap-2 text-sm text-white">
            <User className="h-3 w-3 text-white/70 flex-shrink-0 mt-0.5" />
            <span className="break-words font-medium">{order.customer_name}</span>
          </div>
        )}
        
        {order.customer_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3 text-white/70" />
            <button
              className="text-green-300 hover:text-green-200 hover:underline font-medium flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                const phone = formatWhatsAppNumber(order.customer_phone!);
                window.open(`https://wa.me/55${phone}`, '_blank');
              }}
            >
              <MessageCircle className="h-3 w-3" />
              {order.customer_phone}
            </button>
          </div>
        )}

        {order.customer_address && (
          <div className="flex items-start gap-2 text-sm text-white/90">
            <MapPin className="h-3 w-3 text-white/70 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="break-words">{order.customer_address}</span>
              {order.address_notes && (
                <span className="block text-xs text-yellow-300 font-medium mt-0.5">
                  📍 {order.address_notes}
                </span>
              )}
            </div>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div className="text-xs text-white border-t border-white/20 pt-2 mt-2 space-y-1">
            {order.items.map((item: any) => {
              const isNew = item.edit_status === 'new';
              const isModified = item.edit_status === 'modified';
              const isRemoved = item.edit_status === 'removed';

              const priceText = `R$ ${(item.quantity * item.unit_price).toFixed(2)}`;
              const childLines = buildItemChildLines({
                selectedOptionsJson: item.selected_options_json,
                notes: item.notes,
                childMaxLen: 38,
              });

              return (
                  <div
                    key={item.id}
                    className={cn(
                      "text-white",
                      isRemoved && "opacity-50 line-through",
                      isNew && "text-green-300 font-semibold",
                      isModified && "text-amber-300 font-semibold"
                    )}
                  >
                  <div className="flex justify-between items-center gap-2">
                    <span className="min-w-0 flex items-center gap-1">
                      {isNew && <span className="text-[10px] bg-green-500 text-white px-1 rounded">[NOVO]</span>}
                      {isModified && <span className="text-[10px] bg-amber-500 text-black px-1 rounded">[ALTER]</span>}
                      {isRemoved && <span className="text-[10px] bg-red-500 text-white px-1 rounded">[REM]</span>}
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.quantity}x {truncateEllipsis(item.product_name, 26)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap">{priceText}</span>
                  </div>

                  {childLines.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {childLines.map((line, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "pl-4 whitespace-nowrap overflow-hidden text-ellipsis text-white/80",
                            isModified && "text-amber-300",
                            isNew && "text-green-300"
                          )}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  )}

                  {isModified && item.previous_quantity && item.previous_quantity !== item.quantity && (
                    <div className="text-amber-300 text-[10px] pl-4">
                      Qtd: {item.previous_quantity}x → {item.quantity}x
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {order.deliverer && (
          <div className="flex items-center justify-between gap-2 text-sm text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Bike className="h-3 w-3 flex-shrink-0 text-white/70" />
              <span className="break-words font-medium">{order.deliverer.name}</span>
            </div>
            {canSendWhatsApp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  sendWhatsApp();
                }}
                title="Enviar pedido via WhatsApp"
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {showDelivererSelect && (
          <div className="pt-2 border-t border-white/20">
            <Select
              value={order.deliverer_id || 'none'}
              onValueChange={(value) => {
                onAssignDeliverer(order.id, value === 'none' ? null : value);
              }}
            >
              <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                <SelectValue placeholder="Atribuir entregador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem entregador</SelectItem>
                {activeDeliverers.map((deliverer) => (
                  <SelectItem key={deliverer.id} value={deliverer.id}>
                    {deliverer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Change */}
        {onStatusChange && (
          <div className="pt-2 border-t border-white/20">
            <Select
              value={order.status}
              onValueChange={(value) => {
                onStatusChange(order.id, value as OrderStatus);
              }}
            >
              <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                <ArrowRight className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action buttons: Edit, Expand, Reprint & Cancel */}
        <div className="flex items-center gap-1 pt-2 border-t border-white/20 flex-wrap overflow-visible">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-white hover:text-white hover:bg-white/20 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          )}
          
          {/* Botão Expandir */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-white hover:text-white hover:bg-white/20 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpandDialogOpen(true);
            }}
          >
            <Expand className="h-3 w-3 mr-1" />
            Expandir
          </Button>
          
          {/* Botão Imprimir Completo (via cliente) */}
          {onPrint && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-white hover:text-white hover:bg-white/20 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onPrint(order);
              }}
            >
              <Printer className="h-3 w-3 mr-1" />
              Imprimir
            </Button>
          )}
          
          {/* Botões de Reimpressão: Produção e Completo */}
          <OrderReprintButtons order={order as any} variant="ghost" size="sm" showLabels={false} className="text-white hover:text-white hover:bg-white/20" />
          
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setCancelDialogOpen(true);
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/20">
          <div className="flex items-center gap-1 text-xs text-white/80">
            <Clock className="h-3 w-3" />
            {format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}
          </div>
          <span className="font-bold text-sm text-white">
            R$ {Number(order.total).toFixed(2)}
          </span>
        </div>
      </CardContent>
      
      {/* Cancel Dialog */}
      <OrderCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        orderId={order.id}
        orderNumber={(order as any).order_number ? String((order as any).order_number).padStart(3, '0') : order.id.slice(0, 8)}
        orderStatus={order.status}
      />
      
      {/* Edit Dialog */}
      <OrderEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={order}
      />
      
      {/* Expand Dialog */}
      <OrderExpandDialog
        open={expandDialogOpen}
        onOpenChange={setExpandDialogOpen}
        order={order}
      />
    </Card>
  );
}
