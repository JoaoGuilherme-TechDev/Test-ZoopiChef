import { useState } from 'react';
import { useCheckMovement, useLaunchEmergencyCampaign } from '@/hooks/useLowMovementDetector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingDown, 
  Rocket, 
  Users, 
  DollarSign, 
  RefreshCw,
  CheckCircle2,
  Clock
} from 'lucide-react';

export function LowMovementAlert() {
  const { data: movement, isLoading, refetch, isFetching } = useCheckMovement();
  const launchCampaign = useLaunchEmergencyCampaign();
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Analisando movimento...</span>
        </CardContent>
      </Card>
    );
  }

  if (!movement || movement.status === 'no_data') {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Coletando dados</p>
              <p className="text-sm text-muted-foreground">
                O sistema precisa de mais dados históricos para análise
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLowMovement = movement.status === 'low_movement_detected' || movement.status === 'alert_exists';
  const variationAbs = Math.abs(movement.variation_percent || 0);

  if (movement.status === 'normal') {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success">Movimento Normal</p>
                <p className="text-sm text-muted-foreground">
                  Vendas dentro do esperado para este horário
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                R$ {(movement.current_revenue || 0).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {movement.current_orders || 0} pedidos (2h)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive flex items-center gap-2">
                Baixo Movimento Detectado
                <Badge variant="destructive" className="animate-pulse">
                  -{variationAbs.toFixed(0)}%
                </Badge>
              </CardTitle>
              <CardDescription>
                Ação imediata recomendada para aumentar as vendas
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <TrendingDown className="w-4 h-4 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Atual (2h)</p>
            <p className="font-semibold text-lg">
              R$ {(movement.current_revenue || 0).toFixed(0)}
            </p>
          </div>
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <DollarSign className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Esperado</p>
            <p className="font-semibold text-lg">
              R$ {(movement.expected_revenue || 0).toFixed(0)}
            </p>
          </div>
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <Users className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Clientes</p>
            <p className="font-semibold text-lg">
              {movement.available_customers || 0}
            </p>
          </div>
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <AlertTriangle className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Variação</p>
            <p className="font-semibold text-lg text-destructive">
              -{variationAbs.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Barra de progresso visual */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Desempenho atual vs esperado</span>
            <span>{(100 - variationAbs).toFixed(0)}%</span>
          </div>
          <Progress 
            value={Math.max(0, 100 - variationAbs)} 
            className="h-2"
          />
        </div>

        {/* Alerta */}
        <Alert variant="destructive" className="border-destructive/30">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Ação Recomendada</AlertTitle>
          <AlertDescription>
            Lance uma campanha de emergência no WhatsApp para alcançar todos os{' '}
            <strong>{movement.available_customers || 0} clientes</strong> cadastrados 
            e recuperar as vendas perdidas.
          </AlertDescription>
        </Alert>

        {/* Botão de ação */}
        <Button
          className="w-full h-12 text-lg font-semibold gap-2"
          variant="destructive"
          onClick={() => launchCampaign.mutate()}
          disabled={launchCampaign.isPending}
        >
          {launchCampaign.isPending ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Lançando Campanha...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              🚀 Lançar Campanha de Emergência
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Isso enviará uma mensagem promocional para todos os clientes via WhatsApp
        </p>
      </CardContent>
    </Card>
  );
}
