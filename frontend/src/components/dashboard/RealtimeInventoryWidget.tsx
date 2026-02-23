import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, XCircle, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface RealtimeInventoryWidgetProps {
  data: DashboardRealtimeData['inventory'];
}

export function RealtimeInventoryWidget({ data }: RealtimeInventoryWidgetProps) {
  const navigate = useNavigate();

  const hasAlerts = data.lowStockProducts.length > 0 || data.inactiveProducts > 0 || data.noSalesProducts.length > 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Estoque & Produtos
          </CardTitle>
          {hasAlerts && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Atenção
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estoque Mínimo */}
        {data.lowStockProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">Estoque Baixo</span>
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {data.lowStockProducts.length} itens
              </Badge>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {data.lowStockProducts.slice(0, 5).map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 rounded bg-orange-50 border border-orange-100 text-sm"
                  >
                    <span className="truncate flex-1">{product.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="font-bold text-orange-700">{product.currentStock}</span>
                      <span className="text-orange-500">/</span>
                      <span className="text-orange-600">{product.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {data.lowStockProducts.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-orange-600"
                onClick={() => navigate('/erp/stock')}
              >
                Ver todos ({data.lowStockProducts.length}) <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Produtos Inativos */}
        {data.inactiveProducts > 0 && (
          <div 
            className="p-3 rounded-lg bg-gray-100 border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => navigate('/products')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Produtos Inativos</span>
              </div>
              <Badge variant="secondary">
                {data.inactiveProducts}
              </Badge>
            </div>
          </div>
        )}

        {/* Sem Vendas Recentes */}
        {data.noSalesProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Sem Vendas (+7 dias)</span>
              </div>
              <Badge variant="outline" className="border-red-300 text-red-700">
                {data.noSalesProducts.length}
              </Badge>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {data.noSalesProducts.slice(0, 5).map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-100 text-sm"
                  >
                    <span className="truncate flex-1">{product.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-red-600 text-xs">
                        {product.daysSinceLastSale === 999 ? 'Nunca vendeu' : `${product.daysSinceLastSale}d`}
                      </span>
                      {product.currentStock > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {product.currentStock} un
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {data.noSalesProducts.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-red-600"
                onClick={() => navigate('/products')}
              >
                Ver todos ({data.noSalesProducts.length}) <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Sem alertas */}
        {!hasAlerts && (
          <div className="text-center py-4 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Estoque OK - Nenhum alerta</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
