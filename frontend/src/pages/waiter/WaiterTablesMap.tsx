import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTables } from '@/hooks/useTables';
import { useTableSessions } from '@/hooks/useTableSessions';
import { useTableModuleSettings } from '@/hooks/useTableModuleSettings';
import { useCompanyTableSettings } from '@/hooks/useCompanyTableSettings';
import { useCompany } from '@/hooks/useCompany';
import { useTodayTableReservations } from '@/hooks/useTableReservations';
import { TableReservationDialog } from '@/components/tables/TableReservationDialog';
import { WaitlistPanel } from '@/components/waiter/WaitlistPanel';
import { ArrowLeft, Search, Loader2, Clock, Users, Plus, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TableStatus = 'available' | 'occupied' | 'idle_warning' | 'bill_requested' | 'reserved';

const statusConfig: Record<TableStatus, { bg: string; border: string; label: string; color: string }> = {
  available: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', label: 'Livre', color: 'text-emerald-600' },
  occupied: { bg: 'bg-blue-500/10', border: 'border-blue-500', label: 'Ocupada', color: 'text-blue-600' },
  idle_warning: { bg: 'bg-amber-500/10', border: 'border-amber-500', label: 'Inativa', color: 'text-amber-600' },
  bill_requested: { bg: 'bg-purple-500/10', border: 'border-purple-500', label: 'Pediu Conta', color: 'text-purple-600' },
  reserved: { bg: 'bg-orange-500/10', border: 'border-orange-500', label: 'Reservada', color: 'text-orange-600' },
};

export default function WaiterTablesMap() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const { data: company, isLoading: companyLoading } = useCompany();
  const { tables, isLoading: tablesLoading } = useTables();
  const { sessions, openTable, isLoading: sessionsLoading } = useTableSessions();
  const { settings } = useTableModuleSettings();
  const { data: tableSettings } = useCompanyTableSettings();
  const { getActiveReservation, hasReservation } = useTodayTableReservations();

  const isLoading = companyLoading || tablesLoading || sessionsLoading;

  // Filter by active only and search
  const filteredTables = tables
    .filter(t => t.active)
    .filter(t => {
      if (!search) return true;
      return t.number.toString().includes(search) || 
             t.name?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => a.number - b.number);

  const getTableStatus = (tableId: string): TableStatus => {
    const session = sessions.find(s => s.table_id === tableId);
    if (!session) {
      if (hasReservation(tableId)) return 'reserved';
      return 'available';
    }
    
    const status = session.status;
    if (status === 'bill_requested') return 'bill_requested';
    if (status === 'idle_warning') return 'idle_warning';
    
    const idleMinutes = tableSettings?.no_consumption_minutes || settings.idle_warning_minutes;
    const lastActivity = new Date(session.last_activity_at).getTime();
    const now = Date.now();
    const minutesIdle = (now - lastActivity) / (1000 * 60);
    if (minutesIdle >= idleMinutes) return 'idle_warning';
    
    return 'occupied';
  };

  const getSession = (tableId: string) => {
    return sessions.find(s => s.table_id === tableId);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleTableClick = async (tableId: string, tableNumber: number) => {
    const session = getSession(tableId);
    const status = getTableStatus(tableId);
    
    // If reserved, show reservation info (waiter cannot open)
    if (status === 'reserved') {
      setSelectedTableId(tableId);
      setReservationDialogOpen(true);
      return;
    }
    
    if (session) {
      navigate(`/waiter/table/${tableId}`, { 
        state: { session, tableNumber } 
      });
    } else {
      try {
        const newSession = await openTable.mutateAsync({ tableId });
        toast.success(`Mesa ${tableNumber} aberta!`);
        navigate(`/waiter/table/${tableId}`, { 
          state: { session: newSession, tableNumber } 
        });
      } catch (error: any) {
        toast.error(error.message || 'Erro ao abrir mesa');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando mesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/waiter')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mesas</h1>
          <div className="flex items-center gap-2 ml-auto">
            <WaitlistPanel />
            <Badge variant="secondary">
              {filteredTables.length} mesas
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mesa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-2 p-4 border-b">
        {Object.entries(statusConfig).map(([key, config]) => (
          <Badge key={key} variant="outline" className={`${config.color} ${config.border}`}>
            {key === 'reserved' && <CalendarCheck className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {filteredTables.map((table) => {
          const status = getTableStatus(table.id);
          const session = getSession(table.id);
          const reservation = !session ? getActiveReservation(table.id) : null;
          const config = statusConfig[status] ?? statusConfig.available;

          return (
            <Card
              key={table.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border-2 ${config.border} ${config.bg}`}
              onClick={() => handleTableClick(table.id, table.number)}
            >
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{table.number}</div>
                
                {table.name && (
                  <p className="text-xs text-muted-foreground truncate mb-2">{table.name}</p>
                )}

                <Badge variant="outline" className={`${config.color} mb-2`}>
                  {status === 'reserved' && <CalendarCheck className="h-3 w-3 mr-1" />}
                  {config.label}
                </Badge>

                {session && (
                  <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(session.opened_at), {
                          addSuffix: false,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                    {session.total_amount_cents > 0 && (
                      <div className="font-semibold text-foreground">
                        {formatCurrency(session.total_amount_cents)}
                      </div>
                    )}
                  </div>
                )}

                {reservation && (
                  <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{reservation.reservation_time.slice(0, 5)}</span>
                    </div>
                    <div className="font-medium text-foreground truncate">
                      {reservation.customer_name}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{reservation.party_size} pessoas</span>
                    </div>
                  </div>
                )}

                {!session && !reservation && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-emerald-600">
                    <Plus className="h-3 w-3" />
                    <span>Abrir</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma mesa encontrada</h3>
          <p className="text-muted-foreground">
            {search ? 'Tente outro termo de busca' : 'Nenhuma mesa cadastrada'}
          </p>
        </div>
      )}

      {/* Reservation Dialog - read only for waiter */}
      <TableReservationDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        reservation={selectedTableId ? getActiveReservation(selectedTableId) : null}
        tableNumber={tables.find(t => t.id === selectedTableId)?.number || 0}
        canManage={false}
      />
    </div>
  );
}
