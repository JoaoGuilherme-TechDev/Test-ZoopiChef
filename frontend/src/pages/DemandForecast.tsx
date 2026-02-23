import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDemandForecast } from '@/hooks/useDemandForecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Clock, ShoppingBag, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DemandForecast() {
  const { forecasts, todayForecast, isLoading, generateForecast, isGenerating } = useDemandForecast();

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Previsão de Demanda</h1>
              <p className="text-muted-foreground">Análise preditiva baseada em IA</p>
            </div>
          </div>
          <Button onClick={() => generateForecast()} disabled={isGenerating}>
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? 'Gerando...' : 'Gerar Previsão'}
          </Button>
        </div>

        {/* Today's Forecast */}
        {todayForecast && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Previsão para Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Pedidos Previstos</p>
                  <p className="text-4xl font-bold">{todayForecast.predicted_orders}</p>
                  <Badge className="mt-2">
                    Confiança: {todayForecast.confidence_score?.toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Receita Prevista</p>
                  <p className="text-4xl font-bold text-green-600">
                    R$ {todayForecast.predicted_revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Horários de Pico</p>
                  <div className="flex flex-wrap gap-2">
                    {todayForecast.peak_hours?.slice(0, 5).map((ph, i) => (
                      <Badge key={i} variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {ph.hour}h - {ph.predicted_orders} pedidos
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {todayForecast.recommendations && todayForecast.recommendations.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Recomendações
                  </h4>
                  <div className="space-y-2">
                    {todayForecast.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge className={`${getPriorityColor(rec.priority)} shrink-0`}>
                          {rec.priority}
                        </Badge>
                        <span>{rec.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Week Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : forecasts.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma previsão gerada ainda.
                </p>
                <Button onClick={() => generateForecast()} disabled={isGenerating}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Primeira Previsão
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, i) => {
                  const date = addDays(new Date(), i);
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const forecast = forecasts.find(f => f.forecast_date === dateStr);
                  const dayOfWeek = date.getDay();

                  return (
                    <div 
                      key={i} 
                      className={`p-4 rounded-lg border text-center ${
                        i === 0 ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <p className="font-medium">{dayNames[dayOfWeek]}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(date, 'dd/MM', { locale: ptBR })}
                      </p>
                      {forecast ? (
                        <>
                          <p className="text-2xl font-bold mt-2">
                            {forecast.predicted_orders}
                          </p>
                          <p className="text-xs text-muted-foreground">pedidos</p>
                          <p className="text-sm text-green-600 mt-1">
                            R$ {forecast.predicted_revenue?.toFixed(0)}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground mt-2">-</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Forecast */}
        {todayForecast?.top_products && todayForecast.top_products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Produtos Mais Vendidos (Previsão)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {todayForecast.top_products.map((product, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-2xl font-bold text-primary">
                      {product.predicted_qty}
                    </p>
                    <p className="text-xs text-muted-foreground">unidades previstas</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
