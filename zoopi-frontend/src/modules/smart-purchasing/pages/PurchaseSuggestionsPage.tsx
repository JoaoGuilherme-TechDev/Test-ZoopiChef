import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePurchaseSuggestions } from '../hooks/usePurchaseSuggestions';
import { STATUS_LABELS, PRIORITY_LABELS, REASON_LABELS } from '../types';
import { 
  ShoppingCart, 
  Plus, 
  AlertTriangle,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-500', icon: Clock },
  approved: { color: 'bg-blue-500', icon: CheckCircle },
  ordered: { color: 'bg-green-500', icon: ShoppingCart },
  dismissed: { color: 'bg-red-500', icon: XCircle },
};

export function PurchaseSuggestionsPage() {
  const { suggestions, isLoading, approveSuggestion, dismissSuggestion, markAsOrdered, generateSuggestions } = usePurchaseSuggestions();

  const formatCurrency = (cents: number | null) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const approvedSuggestions = suggestions.filter(s => s.status === 'approved');
  const urgentSuggestions = suggestions.filter(s => s.priority === 'critical' && s.status === 'pending');

  const totalPendingValue = pendingSuggestions.reduce((sum, s) => sum + (s.best_price ? s.best_price * s.suggested_qty * 100 : 0), 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Compras Inteligentes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Compras Inteligentes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sugestões de Compra</h1>
          <Button onClick={() => generateSuggestions.mutate()} disabled={generateSuggestions.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {generateSuggestions.isPending ? 'Gerando...' : 'Gerar Sugestões'}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={urgentSuggestions.length > 0 ? 'border-red-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{urgentSuggestions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSuggestions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{approvedSuggestions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPendingValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Alert */}
        {urgentSuggestions.length > 0 && (
          <Card className="border-red-500 bg-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Compras Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {urgentSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="font-medium">{suggestion.erp_item?.name || 'Item'}</p>
                      <p className="text-sm text-muted-foreground">
                        Qtd sugerida: {suggestion.suggested_qty} • 
                        Estoque atual: {suggestion.erp_item?.current_stock || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => dismissSuggestion.mutate(suggestion.id)}
                      >
                        Descartar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => approveSuggestion.mutate(suggestion.id)}
                      >
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions List */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Sugestões</CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sugestão de compra
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => {
                  const status = suggestion.status;
                  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig?.icon || Clock;
                  
                  return (
                    <div key={suggestion.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{suggestion.erp_item?.name || 'Item'}</p>
                            <Badge variant="outline">
                              {PRIORITY_LABELS[suggestion.priority]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.reason ? REASON_LABELS[suggestion.reason] : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Estoque Atual</p>
                          <p className="font-medium">{suggestion.erp_item?.current_stock || 0}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Qtd Sugerida</p>
                          <p className="font-medium">{suggestion.suggested_qty}</p>
                        </div>
                        <div className="text-right text-sm min-w-[100px]">
                          <p className="text-muted-foreground">Custo Est.</p>
                          <p className="font-medium">{formatCurrency(suggestion.best_price ? suggestion.best_price * suggestion.suggested_qty * 100 : null)}</p>
                        </div>
                        <Badge className={statusConfig?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_LABELS[status]}
                        </Badge>
                        
                        <div className="flex gap-2">
                          {status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => dismissSuggestion.mutate(suggestion.id)}
                              >
                                Descartar
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => approveSuggestion.mutate(suggestion.id)}
                              >
                                Aprovar
                              </Button>
                            </>
                          )}
                          {status === 'approved' && (
                            <Button 
                              size="sm"
                              onClick={() => markAsOrdered.mutate(suggestion.id)}
                            >
                              Marcar Pedido
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
