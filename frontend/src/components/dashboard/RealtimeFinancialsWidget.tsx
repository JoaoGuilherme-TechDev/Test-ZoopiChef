import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, TrendingDown, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface RealtimeFinancialsWidgetProps {
  data: DashboardRealtimeData['financials'];
}

export function RealtimeFinancialsWidget({ data }: RealtimeFinancialsWidgetProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const hasOverdue = data.overduePayablesCount > 0;
  const hasPayablesToday = data.payablesTodayCount > 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Contas do Dia
          </CardTitle>
          {hasOverdue && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {data.overduePayablesCount} vencidas
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Contas a Pagar Hoje */}
        <div 
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${hasPayablesToday ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
          onClick={() => navigate('/accounts-payable')}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingDown className={`w-4 h-4 ${hasPayablesToday ? 'text-red-600' : 'text-gray-500'}`} />
              <span className={`text-sm font-medium ${hasPayablesToday ? 'text-red-700' : 'text-gray-600'}`}>
                A Pagar Hoje
              </span>
            </div>
            <Badge variant="outline" className={hasPayablesToday ? 'border-red-300 text-red-700' : ''}>
              {data.payablesTodayCount} contas
            </Badge>
          </div>
          <p className={`text-xl font-bold ${hasPayablesToday ? 'text-red-700' : 'text-gray-600'}`}>
            {formatCurrency(data.payablesToday)}
          </p>
        </div>

        {/* Contas Vencidas */}
        {hasOverdue && (
          <div 
            className="p-3 rounded-lg bg-red-100 border border-red-300 cursor-pointer hover:bg-red-200 transition-colors animate-pulse"
            onClick={() => navigate('/accounts-payable')}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span className="text-sm font-medium text-red-800">Vencidas</span>
              </div>
              <Badge variant="destructive">
                {data.overduePayablesCount} contas
              </Badge>
            </div>
            <p className="text-xl font-bold text-red-800">
              {formatCurrency(data.overduePayables)}
            </p>
          </div>
        )}

        {/* Contas a Receber */}
        <div 
          className="p-3 rounded-lg bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => navigate('/finance')}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">A Receber Hoje</span>
            </div>
            <Badge variant="outline" className="border-green-300 text-green-700">
              {data.receivablesTodayCount} contas
            </Badge>
          </div>
          <p className="text-xl font-bold text-green-700">
            {formatCurrency(data.receivablesToday)}
          </p>
        </div>

        {/* Balanço */}
        <div className="pt-2 border-t text-sm sm:text-base">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balanço do Dia:</span>
            <span className={`font-bold ${data.receivablesToday - data.payablesToday >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.receivablesToday - data.payablesToday)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
