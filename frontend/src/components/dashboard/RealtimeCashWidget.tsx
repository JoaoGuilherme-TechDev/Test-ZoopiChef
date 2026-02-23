import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, CreditCard, Banknote, QrCode, Wallet, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface RealtimeCashWidgetProps {
  cashRegister: DashboardRealtimeData['cashRegister'];
  deletions: DashboardRealtimeData['deletions'];
}

export function RealtimeCashWidget({ cashRegister, deletions }: RealtimeCashWidgetProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'pix': return QrCode;
      case 'dinheiro': case 'cash': return Banknote;
      case 'credito': case 'credit': return CreditCard;
      case 'debito': case 'debit': return CreditCard;
      default: return Wallet;
    }
  };

  const paymentMethods = Object.entries(cashRegister.paymentBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate('/cashier')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Caixa
          </CardTitle>
          <Badge variant={cashRegister.isOpen ? 'default' : 'secondary'}>
            {cashRegister.isOpen ? 'Aberto' : 'Fechado'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo Principal */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Vendas</span>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(cashRegister.totalSales)}</p>
            <p className="text-xs text-green-600">{cashRegister.totalDelivered} pedidos</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">Saldo</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(cashRegister.currentBalance)}</p>
            <p className="text-xs text-blue-600">Abertura: {formatCurrency(cashRegister.openingBalance)}</p>
          </div>
        </div>

        {/* Breakdown por forma de pagamento */}
        {paymentMethods.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Por Forma de Pagamento:</p>
            <div className="space-y-1">
              {paymentMethods.map(([method, amount]) => {
                const Icon = getPaymentIcon(method);
                return (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{method}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelamentos */}
        {(deletions.cancelledOrders > 0 || deletions.cancelledAmount > 0) && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-600" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-xs text-red-600">Cancelamentos</span>
                  <span className="text-sm font-bold text-red-700">{deletions.cancelledOrders} pedidos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-red-600">Valor Cancelado</span>
                  <span className="text-sm font-bold text-red-700">{formatCurrency(deletions.cancelledAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
