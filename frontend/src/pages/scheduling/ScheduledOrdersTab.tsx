import { ScheduledOrdersList } from '@/components/scheduling/ScheduledOrdersList';
import { Calendar } from 'lucide-react';

export default function ScheduledOrdersTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
          <Calendar className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Pedidos Agendados</h1>
          <p className="text-muted-foreground">
            Gerencie pedidos programados para datas e horários específicos
          </p>
        </div>
      </div>

      <ScheduledOrdersList />
    </div>
  );
}
