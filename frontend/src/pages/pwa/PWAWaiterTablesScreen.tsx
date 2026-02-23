/**
 * PWAWaiterTablesScreen - Tables map for Waiter PWA
 * 
 * Uses WaiterPWALayout for session management (no need for individual WaiterSessionProvider).
 * Route: /:slug/garcom/mesas
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWaiterLayoutSession } from '@/layouts/WaiterPWALayout';
import { 
  usePWAWaiterTablesWithCompany, 
  usePWAWaiterTableSessionsWithCompany,
  usePWATableReservationsWithCompany,
  PWATableReservation 
} from '@/hooks/usePWAWaiterHooks';
import { ArrowLeft, Search, Loader2, Clock, Plus, RefreshCw, CalendarCheck, User, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TableStatus = 'available' | 'occupied' | 'bill_requested' | 'reserved';

const statusConfig: Record<TableStatus, { bg: string; border: string; label: string; color: string }> = {
  available: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', label: 'Livre', color: 'text-emerald-600' },
  reserved: { bg: 'bg-amber-500/10', border: 'border-amber-500', label: 'Reservada', color: 'text-amber-600' },
  occupied: { bg: 'bg-blue-500/10', border: 'border-blue-500', label: 'Ocupada', color: 'text-blue-600' },
  bill_requested: { bg: 'bg-purple-500/10', border: 'border-purple-500', label: 'Pediu Conta', color: 'text-purple-600' },
};

// Format CPF for display (xxx.xxx.xxx-xx)
function formatCPF(cpf: string | null): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

// Format phone for display
function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export default function PWAWaiterTablesScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Use layout session - already validated, no re-validation on mount
  const { companyId, refresh } = useWaiterLayoutSession();
  
  // Use explicit companyId hooks
  const { tables, isLoading: tablesLoading } = usePWAWaiterTablesWithCompany(companyId);
  const { sessions, openTable, isLoading: sessionsLoading } = usePWAWaiterTableSessionsWithCompany(companyId);
  const { getActiveReservation, hasReservation, isLoading: reservationsLoading } = usePWATableReservationsWithCompany(companyId);

  const isLoading = tablesLoading || sessionsLoading || reservationsLoading;

  // Loading
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

  // Filter tables
  const filteredTables = tables
    .filter(t => t.active)
    .filter(t => {
      if (!search) return true;
      return t.number.toString().includes(search) || 
             t.name?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => a.number - b.number);

  // Priority: Reserved > Occupied > Available
  const getTableStatus = (tableId: string): TableStatus => {
    const session = sessions.find(s => s.table_id === tableId);
    
    // If occupied, show occupied status (takes priority when there's an active session)
    if (session) {
      if (session.status === 'bill_requested') return 'bill_requested';
      return 'occupied';
    }
    
    // If has reservation (and not occupied), show reserved
    if (hasReservation(tableId)) {
      return 'reserved';
    }
    
    return 'available';
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

  const handleTableClick = async (tableId: string, tableNumber: number, status: TableStatus) => {
    const session = getSession(tableId);
    const reservation = getActiveReservation(tableId);
    
    // Block actions on reserved tables - they are reserved for specific customers
    if (status === 'reserved' && reservation) {
      toast.info(
        `Mesa ${tableNumber} reservada para ${reservation.customer_name} às ${reservation.reservation_time.slice(0, 5)}. Confirme a identidade do cliente antes de abrir.`,
        { duration: 5000 }
      );
      return;
    }
    
    if (session) {
      // Navigate to table detail within PWA routes
      navigate(`/${slug}/garcom/mesa/${tableId}`, { 
        state: { session, tableNumber } 
      });
    } else {
      try {
        const newSession = await openTable.mutateAsync({ tableId });
        toast.success(`Mesa ${tableNumber} aberta!`);
        navigate(`/${slug}/garcom/mesa/${tableId}`, { 
          state: { session: newSession, tableNumber } 
        });
      } catch (error: any) {
        toast.error(error.message || 'Erro ao abrir mesa');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/${slug}/garcom/app`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mesas</h1>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" onClick={() => refresh()}>
              <RefreshCw className="h-5 w-5" />
            </Button>
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
            {config.label}
          </Badge>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {filteredTables.map((table) => {
          const status = getTableStatus(table.id);
          const session = getSession(table.id);
          const reservation = getActiveReservation(table.id);
          const config = statusConfig[status];

          return (
            <Card
              key={table.id}
              className={`p-4 transition-all border-2 ${config.border} ${config.bg} ${
                status === 'reserved' 
                  ? 'cursor-not-allowed opacity-90' 
                  : 'cursor-pointer hover:shadow-md active:scale-[0.98]'
              }`}
              onClick={() => handleTableClick(table.id, table.number, status)}
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

                {/* Occupied session info */}
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

                {/* Reserved table info - show customer details */}
                {status === 'reserved' && reservation && (
                  <ReservationInfoCard reservation={reservation} />
                )}

                {/* Available table - show open action */}
                {status === 'available' && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-success">
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
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma mesa encontrada</h3>
          <p className="text-muted-foreground">
            {search ? 'Tente outro termo de busca' : 'Nenhuma mesa cadastrada'}
          </p>
        </div>
      )}
    </div>
  );
}

// Reservation info card component
function ReservationInfoCard({ reservation }: { reservation: PWATableReservation }) {
  return (
    <div className="mt-2 p-2 bg-accent/50 rounded-lg text-left space-y-1">
      {/* Customer Name */}
      <div className="flex items-center gap-1 text-xs">
        <User className="h-3 w-3 text-warning flex-shrink-0" />
        <span className="font-medium text-foreground truncate">
          {reservation.customer_name}
        </span>
      </div>
      
      {/* Phone */}
      {reservation.customer_phone && (
        <div className="flex items-center gap-1 text-xs">
          <Phone className="h-3 w-3 text-warning flex-shrink-0" />
          <span className="text-muted-foreground truncate">
            {formatPhone(reservation.customer_phone)}
          </span>
        </div>
      )}
      
      {/* CPF */}
      {reservation.customer_cpf && (
        <div className="flex items-center gap-1 text-xs">
          <CreditCard className="h-3 w-3 text-warning flex-shrink-0" />
          <span className="text-muted-foreground font-mono text-[10px]">
            {formatCPF(reservation.customer_cpf)}
          </span>
        </div>
      )}
      
      {/* Reservation time */}
      <div className="flex items-center gap-1 text-xs">
        <Clock className="h-3 w-3 text-warning flex-shrink-0" />
        <span className="text-muted-foreground">
          {reservation.reservation_time.slice(0, 5)} • {reservation.party_size} pessoa{reservation.party_size > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
