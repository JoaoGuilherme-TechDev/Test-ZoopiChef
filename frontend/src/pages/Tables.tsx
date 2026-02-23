import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTables, Table } from '@/hooks/useTables';
import { useTableSessions, TableSession } from '@/hooks/useTableSessions';
import { useTableModuleSettings } from '@/hooks/useTableModuleSettings';
import { useCompanyTableSettings } from '@/hooks/useCompanyTableSettings';
import { useAllSessionItems, useTableCommands } from '@/hooks/useTableCommands';
import { useCompany } from '@/hooks/useCompany';
import { useTodayTableReservations } from '@/hooks/useTableReservations';
import { useReservations } from '@/hooks/useReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableMapCard } from '@/components/tables/TableMapCard';
import { TableFullDialog } from '@/components/tables/TableFullDialog';
import { TablePaymentDialog } from '@/components/tables/TablePaymentDialog';
import { TableQRCodeDialog } from '@/components/tables/TableQRCodeDialog';
import { TableQRBatchDialog } from '@/components/tables/TableQRBatchDialog';
import { TableOpenDialog } from '@/components/tables/TableOpenDialog';
import { TableReservationDialog } from '@/components/tables/TableReservationDialog';
import { printTableBillDirect, TableBillData, TableBillCommand } from '@/lib/print/tableBill';
import { WaitlistPanel } from '@/components/waiter/WaitlistPanel';
import { toast } from 'sonner';
import { 
  Plus, 
  Settings, 
  LayoutGrid,
  Loader2,
  Search,
  UtensilsCrossed,
  RefreshCw,
  QrCode,
  CalendarCheck,
  Users
} from 'lucide-react';

type StatusFilter = 'all' | 'available' | 'occupied' | 'idle_warning' | 'bill_requested' | 'reserved';

export default function Tables() {
  const { data: company } = useCompany();
  const { tables, activeTables, isLoading } = useTables();
  const { sessions, openTable, requestBill, updateSessionStatus } = useTableSessions();
  const { settings, isLoading: settingsLoading } = useTableModuleSettings();
  const { data: tableSettings } = useCompanyTableSettings();
  const { getActiveReservation, hasReservation, reservations: todayReservations } = useTodayTableReservations();
  const { confirmReservation, cancelReservation } = useReservations();

  // Fetch command counts for all sessions
  const { data: commandCounts = {} } = useQuery({
    queryKey: ['table-command-counts', company?.id],
    queryFn: async () => {
      if (!company?.id) return {};
      
      const { data, error } = await supabase
        .from('table_commands')
        .select('session_id')
        .eq('company_id', company.id)
        .eq('status', 'open');

      if (error) throw error;
      
      // Count commands per session
      const counts: Record<string, number> = {};
      data?.forEach(cmd => {
        counts[cmd.session_id] = (counts[cmd.session_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  // Table management states
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [fullDialogOpen, setFullDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [qrBatchDialogOpen, setQrBatchDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedReservationTableId, setSelectedReservationTableId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Get session items for the selected session
  const { totalCents } = useAllSessionItems(selectedSession?.id);

  const getSessionForTable = (tableId: string): TableSession | undefined => {
    return sessions.find(s => s.table_id === tableId);
  };

  const getTableStatus = (table: Table): StatusFilter => {
    const session = getSessionForTable(table.id);
    if (!session) {
      // Check for reservation
      if (hasReservation(table.id)) return 'reserved';
      return 'available';
    }

    // Se a mesa foi aberta mas NÃO tem lançamentos, não considerar "ocupada"
    const sessionCommandCount = commandCounts[session.id] || 0;
    const hasConsumption = session.total_amount_cents > 0 || sessionCommandCount > 0;
    if (session.status === 'open' && !hasConsumption) {
      return 'available';
    }

    if (session.status === 'bill_requested') return 'bill_requested';
    if (session.status === 'idle_warning') return 'idle_warning';
    return 'occupied';
  };

  const filteredTables = activeTables.filter(table => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesNumber = table.number.toString().includes(searchTerm);
      const matchesName = table.name?.toLowerCase().includes(searchLower);
      if (!matchesNumber && !matchesName) return false;
    }

    if (statusFilter !== 'all') {
      const status = getTableStatus(table);
      if (status !== statusFilter) return false;
    }

    return true;
  });

  const stats = {
    total: activeTables.length,
    available: activeTables.filter(t => !getSessionForTable(t.id) && !hasReservation(t.id)).length,
    occupied: activeTables.filter(t => {
      const s = getSessionForTable(t.id);
      if (!s) return false;
      const cnt = commandCounts[s.id] || 0;
      const hasConsumption = s.total_amount_cents > 0 || cnt > 0;
      return s.status === 'open' && hasConsumption;
    }).length,
    idleWarning: activeTables.filter(t => {
      const s = getSessionForTable(t.id);
      return s && s.status === 'idle_warning';
    }).length,
    billRequested: activeTables.filter(t => {
      const s = getSessionForTable(t.id);
      return s && s.status === 'bill_requested';
    }).length,
    reserved: activeTables.filter(t => !getSessionForTable(t.id) && hasReservation(t.id)).length,
  };

  const handleTableClick = async (table: Table) => {
    const session = getSessionForTable(table.id);
    
    if (!session) {
      // Check if we need to show the open dialog
      const needsDialog = tableSettings?.require_customer_identification || 
                          tableSettings?.request_people_count === 'on_open';
      
      if (needsDialog) {
        setPendingTable(table);
        setOpenDialogOpen(true);
      } else {
        // Open directly without dialog
        try {
          const newSession = await openTable.mutateAsync({ tableId: table.id });
          setSelectedTable(table);
          setSelectedSession(newSession as TableSession);
          setFullDialogOpen(true);
          toast.success(`Mesa ${table.number} aberta!`);
        } catch (error: any) {
          toast.error(error.message || 'Erro ao abrir mesa');
        }
      }
    } else {
      setSelectedTable(table);
      setSelectedSession(session);
      setFullDialogOpen(true);
    }
  };

  const handleOpenTableConfirm = async (data: {
    customerName?: string;
    customerPhone?: string;
    peopleCount?: number;
  }) => {
    if (!pendingTable) return;
    
    try {
      const newSession = await openTable.mutateAsync({ 
        tableId: pendingTable.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        peopleCount: data.peopleCount,
      });
      setSelectedTable(pendingTable);
      setSelectedSession(newSession as TableSession);
      setOpenDialogOpen(false);
      setPendingTable(null);
      setFullDialogOpen(true);
      toast.success(`Mesa ${pendingTable.number} aberta!`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao abrir mesa');
    }
  };

  const handleRequestBill = async (table: Table) => {
    const session = getSessionForTable(table.id);
    if (!session) {
      toast.error('Essa mesa não tem sessão aberta');
      return;
    }

    try {
      // 1) Atualizar status para 'bill_requested'
      await requestBill.mutateAsync(session.id);

      // 2) Imprimir pré-conta automaticamente (sempre via fila, sem abrir diálogo do browser)
      await printBillForSession(session, table);

      toast.success(`Conta pedida e impressa para mesa ${table.number}`);
    } catch (error: any) {
      console.error('Error requesting bill:', error);
      toast.error(error?.message || 'Erro ao pedir conta');
    }
  };

  // Função auxiliar para imprimir a conta de uma sessão
  const printBillForSession = async (session: TableSession, table: Table) => {
    if (!company) throw new Error('Empresa não carregada ainda');

    // Buscar comandas e itens da sessão
    const { data: commandsData } = await supabase
      .from('table_commands')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    const { data: itemsData } = await supabase
      .from('table_command_items')
      .select('*')
      .eq('session_id', session.id)
      .neq('status', 'cancelled');

    const commands = commandsData || [];
    const items = itemsData || [];

    // Agrupar itens por comanda
    const billCommands: TableBillCommand[] = commands
      .filter((cmd: any) => cmd.status === 'open')
      .map((cmd: any) => {
        const cmdItems = items.filter((i: any) => i.command_id === cmd.id);
        return {
          id: cmd.id,
          name: cmd.name,
          number: cmd.number,
          items: cmdItems.map((item: any) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            total_price_cents: item.total_price_cents,
            notes: item.notes,
            command_name: cmd.name,
            command_number: cmd.number,
          })),
          total_cents: cmdItems.reduce((sum: number, i: any) => sum + i.total_price_cents, 0),
        };
      })
      .filter((cmd: TableBillCommand) => cmd.items.length > 0);

    const totalCents = items.reduce((sum: number, i: any) => sum + i.total_price_cents, 0);

    // Gerar URL de rastreio para QR Code
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/acompanhar/mesa/${session.id}`;

    const billData: TableBillData = {
      tableNumber: table.number,
      tableName: table.name,
      companyName: company.name,
      openedAt: session.opened_at,
      commands: billCommands,
      subtotalCents: totalCents,
      totalCents: totalCents,
      trackingUrl,
      tableSessionId: session.id,
    };

    // Buscar setor CAIXA para impressão
    let printerConfig: { printMode?: string; printerName?: string; printerHost?: string; printerPort?: number } | null = null;
    
    const { data: caixaSector } = await supabase
      .from('print_sectors')
      .select('print_mode, printer_name, printer_host, printer_port')
      .eq('company_id', company.id)
      .ilike('name', '%caixa%')
      .eq('active', true)
      .limit(1)
      .single();
    
    if (caixaSector) {
      printerConfig = {
        printMode: caixaSector.print_mode,
        printerName: caixaSector.printer_name || undefined,
        printerHost: caixaSector.printer_host || undefined,
        printerPort: caixaSector.printer_port,
      };
    }

    // Sempre usa printTableBillDirect que prioriza fila de impressão
    const result = await printTableBillDirect(billData, (company as any).default_printer, company?.id, printerConfig);
    if (!result.success) {
      throw new Error(result.error || 'Erro ao imprimir');
    }
  };

  const handleCloseTable = async () => {
    if (!selectedSession) return;
    
    try {
      await updateSessionStatus.mutateAsync({ 
        sessionId: selectedSession.id, 
        status: 'closed' 
      });
      toast.success('Mesa fechada!');
      setPaymentDialogOpen(false);
      setFullDialogOpen(false);
      setSelectedTable(null);
      setSelectedSession(null);
    } catch (error) {
      toast.error('Erro ao fechar mesa');
    }
  };

  if (isLoading || settingsLoading) {
    return (
      <DashboardLayout title="Mesas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mapa de Mesas">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mapa de Mesas</h1>
              <p className="text-muted-foreground text-sm">
                {stats.total} mesas • {stats.occupied} ocupadas • {stats.available} livres
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <WaitlistPanel />
            <Button variant="outline" onClick={() => setQrBatchDialogOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Codes
            </Button>
            <Link to="/tables/register">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Mesas
              </Button>
            </Link>
            <Link to="/settings/tables">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {activeTables.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma mesa cadastrada</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Para usar o mapa de mesas, primeiro cadastre suas mesas
              </p>
              <Link to="/tables/register">
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Cadastrar Mesas
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'available' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => setStatusFilter('available')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                      <p className="text-xs text-muted-foreground">Livres</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'occupied' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setStatusFilter('occupied')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.occupied}</p>
                      <p className="text-xs text-muted-foreground">Ocupadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'idle_warning' ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => setStatusFilter('idle_warning')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.idleWarning}</p>
                      <p className="text-xs text-muted-foreground">Sem consumo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'bill_requested' ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => setStatusFilter('bill_requested')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.billRequested}</p>
                      <p className="text-xs text-muted-foreground">Conta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'reserved' ? 'ring-2 ring-orange-500' : ''}`}
                onClick={() => setStatusFilter('reserved')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{stats.reserved}</p>
                      <p className="text-xs text-muted-foreground">Reservadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar mesa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as mesas</SelectItem>
                  <SelectItem value="available">Livres</SelectItem>
                  <SelectItem value="occupied">Ocupadas</SelectItem>
                  <SelectItem value="idle_warning">Sem consumo</SelectItem>
                  <SelectItem value="bill_requested">Conta pedida</SelectItem>
                  <SelectItem value="reserved">Reservadas</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Tables Map */}
            {filteredTables.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma mesa corresponde aos filtros</p>
                  <Button variant="link" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {filteredTables
                  .sort((a, b) => a.number - b.number)
                  .map((table) => {
                    const session = getSessionForTable(table.id);
                    const reservation = !session ? getActiveReservation(table.id) : null;
                    const cmdCount = session ? (commandCounts[session.id] || 0) : 0;
                    return (
                      <TableMapCard
                        key={table.id}
                        table={table}
                        session={session}
                        reservation={reservation}
                        commandCount={cmdCount}
                        idleWarningMinutes={tableSettings?.no_consumption_minutes || settings.idle_warning_minutes}
                        onClick={() => handleTableClick(table)}
                        onRequestBill={() => handleRequestBill(table)}
                        onReservationClick={() => {
                          setSelectedReservationTableId(table.id);
                          setReservationDialogOpen(true);
                        }}
                      />
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <TableQRBatchDialog
        open={qrBatchDialogOpen}
        onOpenChange={setQrBatchDialogOpen}
      />

      {selectedTable && (
        <TableQRCodeDialog
          open={qrCodeDialogOpen}
          onOpenChange={setQrCodeDialogOpen}
          table={selectedTable}
        />
      )}

      {selectedTable && selectedSession && (
        <>
          <TableFullDialog
            open={fullDialogOpen}
            onOpenChange={setFullDialogOpen}
            sessionId={selectedSession.id}
            tableId={selectedTable.id}
            tableNumber={selectedTable.number}
            tableName={selectedTable.name}
            onCloseTable={handleCloseTable}
            onPayment={() => {
              setFullDialogOpen(false);
              setPaymentDialogOpen(true);
            }}
            onBackToMap={() => {
              setFullDialogOpen(false);
              setSelectedTable(null);
              setSelectedSession(null);
            }}
          />

          <TablePaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            sessionId={selectedSession.id}
            tableId={selectedTable.id}
            tableNumber={selectedTable.number}
            totalAmountCents={totalCents}
            onClose={handleCloseTable}
          />
        </>
      )}

      {/* Table Open Dialog */}
      {pendingTable && (
        <TableOpenDialog
          open={openDialogOpen}
          onOpenChange={(open) => {
            setOpenDialogOpen(open);
            if (!open) setPendingTable(null);
          }}
          tableNumber={pendingTable.number}
          tableName={pendingTable.name}
          requireCustomerIdentification={tableSettings?.require_customer_identification || false}
          requestPeopleCount={tableSettings?.request_people_count || 'none'}
          onConfirm={handleOpenTableConfirm}
          isLoading={openTable.isPending}
        />
      )}

      {/* Reservation Dialog */}
      <TableReservationDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        reservation={selectedReservationTableId ? getActiveReservation(selectedReservationTableId) : null}
        tableNumber={activeTables.find(t => t.id === selectedReservationTableId)?.number || 0}
        canManage={true}
        onConfirm={() => {
          const res = selectedReservationTableId ? getActiveReservation(selectedReservationTableId) : null;
          if (res) {
            confirmReservation.mutate(res.id);
            setReservationDialogOpen(false);
          }
        }}
        onCancel={() => {
          const res = selectedReservationTableId ? getActiveReservation(selectedReservationTableId) : null;
          if (res) {
            cancelReservation.mutate({ id: res.id, reason: 'Cancelado pelo operador' });
            setReservationDialogOpen(false);
          }
        }}
      />
    </DashboardLayout>
  );
}
