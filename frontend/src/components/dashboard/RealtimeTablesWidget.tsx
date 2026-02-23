import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Users, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface RealtimeTablesWidgetProps {
  tables: DashboardRealtimeData['tables'];
  comandas: DashboardRealtimeData['comandas'];
}

export function RealtimeTablesWidget({ tables, comandas }: RealtimeTablesWidgetProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Mesas */}
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate('/tables-register')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              Mesas
            </CardTitle>
            <Badge variant="outline">{tables.total} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-700">{tables.free}</p>
                <p className="text-xs text-green-600">Livres</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200">
              <Users className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-lg font-bold text-orange-700">{tables.occupied}</p>
                <p className="text-xs text-orange-600">Ocupadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
              <CreditCard className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-lg font-bold text-yellow-700">{tables.awaiting_payment}</p>
                <p className="text-xs text-yellow-600">Aguard. Pgto</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-lg font-bold text-blue-700">{tables.reserved}</p>
                <p className="text-xs text-blue-600">Reservadas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comandas */}
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate('/comandas')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Comandas
            </CardTitle>
            <Badge variant="outline">{comandas.total} abertas</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <Users className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-blue-700">{comandas.open}</p>
                  <p className="text-xs text-blue-600">Abertas</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg border ${comandas.awaiting_payment > 0 ? 'bg-yellow-50 border-yellow-200 animate-pulse' : 'bg-gray-50 border-gray-200'}`}>
                <CreditCard className={`w-4 h-4 ${comandas.awaiting_payment > 0 ? 'text-yellow-600' : 'text-gray-500'}`} />
                <div>
                  <p className={`text-lg font-bold ${comandas.awaiting_payment > 0 ? 'text-yellow-700' : 'text-gray-600'}`}>{comandas.awaiting_payment}</p>
                  <p className={`text-xs ${comandas.awaiting_payment > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>Aguard. Pgto</p>
                </div>
              </div>
            </div>
            
            {/* Totais */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Consumo:</span>
                <span className="font-bold">{formatCurrency(comandas.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Já Pago:</span>
                <span className="font-bold text-green-600">{formatCurrency(comandas.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">A Receber:</span>
                <span className="font-bold text-orange-600">{formatCurrency(comandas.totalAmount - comandas.paidAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
