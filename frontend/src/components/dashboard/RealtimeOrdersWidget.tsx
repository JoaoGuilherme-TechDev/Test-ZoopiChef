import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Clock, ChefHat, CheckCircle2, Truck, Package, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface RealtimeOrdersWidgetProps {
  data: DashboardRealtimeData['orders'];
}

export function RealtimeOrdersWidget({ data }: RealtimeOrdersWidgetProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statusItems = [
    { 
      label: 'Novos', 
      count: data.novo, 
      icon: Clock, 
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      pulse: data.novo > 0,
    },
    { 
      label: 'Preparo', 
      count: data.preparo, 
      icon: ChefHat, 
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      pulse: false,
    },
    { 
      label: 'Prontos', 
      count: data.pronto, 
      icon: CheckCircle2, 
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      pulse: data.pronto > 0,
    },
    { 
      label: 'Em Rota', 
      count: data.em_rota, 
      icon: Truck, 
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      pulse: false,
    },
    { 
      label: 'Entregues', 
      count: data.entregue, 
      icon: Package, 
      color: 'bg-green-100 text-green-700 border-green-200',
      pulse: false,
    },
  ];

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate('/orders')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Pedidos em Tempo Real
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg font-bold">
              {data.total}
            </Badge>
            {data.cancelled > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {data.cancelled}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm ${item.color} ${item.pulse ? 'animate-pulse' : ''}`}
            >
              <item.icon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium">{item.count}</span>
              <span className="opacity-75 hidden xs:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(data.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-xl font-bold">{formatCurrency(data.avgTicket)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
