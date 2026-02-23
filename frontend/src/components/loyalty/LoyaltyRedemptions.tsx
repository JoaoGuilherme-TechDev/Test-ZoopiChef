import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyRedemptions } from '@/hooks/useLoyaltyRedemptions';
import { Gift, User, ShoppingBag, CheckCircle, Clock, XCircle, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  confirmed: { label: 'Confirmado', variant: 'default', icon: CheckCircle },
  delivered: { label: 'Entregue', variant: 'outline', icon: Package },
  cancelled: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

export function LoyaltyRedemptions() {
  const { data: redemptions, isLoading, updateStatus } = useLoyaltyRedemptions();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Histórico de Resgates
        </CardTitle>
        <CardDescription>
          Acompanhe todos os resgates de prêmios realizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {redemptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Nenhum resgate realizado</p>
            <p className="text-sm">Os resgates dos clientes aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => {
              const statusConfig = STATUS_CONFIG[redemption.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={redemption.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{redemption.reward?.name || 'Prêmio'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{redemption.customer?.name || 'Cliente'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        Pedido #{redemption.order?.order_number || 'N/A'}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(redemption.redeemed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <div className="font-medium text-primary">
                      -{redemption.points_used} pontos
                    </div>
                    {redemption.complementary_value_cents > 0 && (
                      <div className="text-muted-foreground">
                        + R$ {(redemption.complementary_value_cents / 100).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {redemption.status === 'confirmed' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: redemption.id, status: 'delivered' })}
                        disabled={updateStatus.isPending}
                      >
                        Marcar como Entregue
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus.mutate({
                          id: redemption.id,
                          status: 'cancelled',
                          cancelled_reason: 'Cancelado pelo operador'
                        })}
                        disabled={updateStatus.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {redemption.cancelled_reason && (
                    <p className="text-sm text-destructive">
                      Motivo: {redemption.cancelled_reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
