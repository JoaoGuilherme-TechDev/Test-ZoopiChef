import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, MapPin, Phone, User, Bike, MessageCircle, Timer, CreditCard, Banknote, QrCode } from 'lucide-react';
import { Order } from '@/hooks/useOrders';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { buildItemChildLines } from '@/lib/receiptFormatting';

interface OrderExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
}

const orderTypeLabels: Record<string, string> = {
  delivery: 'Delivery',
  local: 'Local',
  counter: 'Balcão',
  phone: 'Telefone',
};

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  preparo: 'Em Preparo',
  pronto: 'Pronto',
  em_rota: 'Em Rota',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const paymentMethodLabels: Record<string, { label: string; icon: any }> = {
  dinheiro: { label: 'Dinheiro', icon: Banknote },
  pix: { label: 'PIX', icon: QrCode },
  cartao_credito: { label: 'Cartão Crédito', icon: CreditCard },
  cartao_debito: { label: 'Cartão Débito', icon: CreditCard },
  fiado: { label: 'Fiado', icon: CreditCard },
};

export function OrderExpandDialog({ open, onOpenChange, order }: OrderExpandDialogProps) {
  const now = new Date();
  const created = parseISO(order.created_at);
  const totalMinutes = differenceInMinutes(now, created);

  const formatWhatsAppNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const openCustomerWhatsApp = () => {
    if (!order.customer_phone) return;
    const phone = formatWhatsAppNumber(order.customer_phone);
    const whatsappUrl = `https://wa.me/55${phone}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const PaymentIcon = order.payment_method && paymentMethodLabels[order.payment_method]?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="font-mono text-lg">
              Pedido #{(order as any).order_number ? String((order as any).order_number).padStart(3, '0') : order.id.slice(0, 8)}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {orderTypeLabels[order.order_type] || order.order_type}
              </Badge>
              <Badge variant={order.status === 'entregue' ? 'default' : (order.status as string) === 'cancelado' ? 'destructive' : 'outline'}>
                {statusLabels[order.status] || order.status}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tempo */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Criado: {format(created, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Tempo total: {totalMinutes} minutos</span>
            </div>
          </div>

          <Separator />

          {/* Cliente */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cliente</h3>
            
            {order.customer_name && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
            )}
            
            {order.customer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="link"
                  className="p-0 h-auto text-green-600 hover:text-green-700 font-medium"
                  onClick={openCustomerWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {order.customer_phone}
                </Button>
              </div>
            )}

            {order.customer_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <a 
                    href={generateGoogleMapsLink(order.customer_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {order.customer_address}
                  </a>
                  {order.address_notes && (
                    <p className="text-sm text-warning font-medium">📍 {order.address_notes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Itens do Pedido */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Itens do Pedido</h3>
            
            <div className="space-y-2">
              {order.items?.map((item: any) => {
                const isNew = item.edit_status === 'new';
                const isModified = item.edit_status === 'modified';
                const isRemoved = item.edit_status === 'removed';

                return (
                  <div 
                    key={item.id} 
                    className={cn(
                      "flex justify-between items-start p-3 bg-muted/30 rounded-lg",
                      isRemoved && "opacity-50 line-through",
                      isNew && "border-l-4 border-l-green-500 bg-green-500/10",
                      isModified && "border-l-4 border-l-amber-500 bg-amber-500/10"
                    )}
                  >
                    <div className="space-y-1">
                      {(() => {
                        // Clean product name: remove "(Escolha o sabor...)" suffix if present
                        let cleanName = item.product_name || '';
                        const parenIdx = cleanName.indexOf(' (Escolha');
                        if (parenIdx > 0) {
                          cleanName = cleanName.substring(0, parenIdx);
                        }
                        // Also try to strip "(Esolha" typo variant
                        const parenIdx2 = cleanName.indexOf(' (Esolha');
                        if (parenIdx2 > 0) {
                          cleanName = cleanName.substring(0, parenIdx2);
                        }

                        // Build child lines from selected_options_json OR fallback to notes/product_name
                        let childLines = buildItemChildLines({
                          selectedOptionsJson: item.selected_options_json,
                          notes: item.notes,
                          childMaxLen: 80,
                        });

                        // If no childLines and product_name has embedded details, parse them
                        if (!childLines.length && item.product_name?.includes('|')) {
                          const afterParen = item.product_name.match(/\(([^)]+)\)/);
                          if (afterParen) {
                            childLines = buildItemChildLines({
                              selectedOptionsJson: null,
                              notes: afterParen[1],
                              childMaxLen: 80,
                            });
                          }
                        }

                        return (
                          <>
                            <div className="flex items-center gap-2">
                              {isNew && <Badge className="text-xs bg-green-500">NOVO</Badge>}
                              {isModified && <Badge className="text-xs bg-amber-500 text-black">ALTERADO</Badge>}
                              {isRemoved && <Badge className="text-xs bg-red-500">REMOVIDO</Badge>}
                              <span className="font-medium">{item.quantity}x {cleanName}</span>
                            </div>

                            {childLines.length > 0 && (
                              <div className="pl-4 space-y-0.5 text-sm text-muted-foreground">
                                {childLines.map((line: string, idx: number) => (
                                  <div key={idx}>{line}</div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {isModified && item.previous_quantity && item.previous_quantity !== item.quantity && (
                        <p className="text-xs text-amber-600">
                          Quantidade alterada: {item.previous_quantity}x → {item.quantity}x
                        </p>
                      )}
                      {item.notes && !item.notes.includes('Sabor') && !item.notes.includes('Borda') && (
                        <p className="text-sm text-amber-600">📝 {item.notes}</p>
                      )}
                    </div>
                    <span className="font-semibold">
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Entregador */}
          {order.deliverer && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Entregador</h3>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Bike className="h-5 w-5 text-primary" />
                  <span className="font-medium">{order.deliverer.name}</span>
                  {order.deliverer.whatsapp && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 ml-auto"
                      onClick={() => {
                        const phone = formatWhatsAppNumber(order.deliverer!.whatsapp!);
                        window.open(`https://wa.me/55${phone}`, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Observações */}
          {order.notes && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Observações</h3>
                <p className="p-3 bg-muted/30 rounded-lg">{order.notes}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Totais e Pagamento */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pagamento</h3>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              {order.payment_method && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Forma de Pagamento:</span>
                  <div className="flex items-center gap-2">
                    {PaymentIcon && <PaymentIcon className="h-4 w-4" />}
                    <span className="font-medium">
                      {paymentMethodLabels[order.payment_method]?.label || order.payment_method}
                    </span>
                  </div>
                </div>
              )}
              
              {(order as any).delivery_fee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxa de Entrega:</span>
                  <span>R$ {Number((order as any).delivery_fee).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-primary">R$ {Number(order.total).toFixed(2)}</span>
              </div>

              {order.payment_method === 'dinheiro' && (order as any).change_for > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Troco para:</span>
                  <span>R$ {Number((order as any).change_for).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
