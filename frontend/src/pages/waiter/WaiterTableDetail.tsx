import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTableSessions, TableSession } from '@/hooks/useTableSessions';
import { useTableCommands, useTableCommandItems, useAllSessionItems } from '@/hooks/useTableCommands';
import { useWaiterPermissions } from '@/hooks/useWaiterPermissions';
import { useTables } from '@/hooks/useTables';
import {
  ArrowLeft,
  Loader2,
  Clock,
  Plus,
  Receipt,
  CreditCard,
  Users,
  Trash2,
  ArrowRightLeft,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WaiterProductSelector } from '@/components/waiter/WaiterProductSelector';
import { WaiterPaymentDialog } from '@/components/waiter/WaiterPaymentDialog';
import { WaiterTableCommandCreateDialog } from '@/components/waiter/WaiterTableCommandCreateDialog';
import { TableCloseDialog } from '@/components/tables/TableCloseDialog';

export default function WaiterTableDetail() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const location = useLocation();

  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [createCommandDialogOpen, setCreateCommandDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [newCommandName, setNewCommandName] = useState('');
  const [newCommandNumber, setNewCommandNumber] = useState('');
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);

  const { permissions } = useWaiterPermissions();
  const { tables, isLoading: tablesLoading } = useTables();
  const { sessions, requestBill, updateSessionStatus, isLoading: sessionsLoading } = useTableSessions();

  const stateSession = (location.state as any)?.session as TableSession | undefined;
  const stateTableNumber = (location.state as any)?.tableNumber as number | undefined;

  const table = tables.find(t => t.id === tableId);
  const session = sessions.find(s => s.table_id === tableId) ?? stateSession;

  const { commands, createCommand, isLoading: commandsLoading } = useTableCommands(session?.id);
  const { activeItems, totalCents, isLoading: itemsLoading } = useAllSessionItems(session?.id);

  const isLoading = tablesLoading || sessionsLoading || commandsLoading || itemsLoading;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleAddProducts = (commandId?: string) => {
    setSelectedCommandId(commandId || null);
    setProductSelectorOpen(true);
  };

  const openCreateCommandDialog = () => {
    setNewCommandName('');
    setNewCommandNumber('');
    setCreateCommandDialogOpen(true);
  };

  const handleRequestBill = async () => {
    if (!session) return;
    try {
      await requestBill.mutateAsync(session.id);
      toast.success('Pré-conta solicitada!');
      // TODO: trigger print
    } catch (error) {
      toast.error('Erro ao solicitar pré-conta');
    }
  };

  const handleCloseTable = async (peopleCount: number) => {
    if (!session) return;
    if (totalCents > 0 && !permissions.can_close_table_or_comanda) {
      toast.error('Sem permissão para fechar mesa com saldo');
      return;
    }
    try {
      await updateSessionStatus.mutateAsync({
        sessionId: session.id,
        status: 'closed',
        peopleCount
      });
      toast.success('Mesa fechada!');
      navigate('/waiter/tables');
    } catch (error) {
      toast.error('Erro ao fechar mesa');
    }
  };

  const handleCreateCommand = async (name?: string, explicitNumber?: number) => {
    if (!session) return;
    try {
      const existingNumbers = commands.filter(c => c.number).map(c => c.number as number);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const chosenNumber = explicitNumber ?? nextNumber;
      if (existingNumbers.includes(chosenNumber)) {
        toast.error(`Já existe comanda ${chosenNumber} nessa mesa`);
        return;
      }

      const newCommand = await createCommand.mutateAsync({
        sessionId: session.id,
        tableId: tableId!,
        number: chosenNumber,
        name: name || undefined,
      });

      toast.success(`Comanda ${chosenNumber} criada!`);
      handleAddProducts(newCommand.id);
    } catch (error) {
      toast.error('Erro ao criar comanda');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando mesa...</p>
        </div>
      </div>
    );
  }

  if (!tableId || !session || (!table && !stateTableNumber)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-foreground">Mesa não encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Essa mesa pode ter sido fechada, removida ou você não tem acesso.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate('/waiter/tables')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tableNumber = table?.number ?? stateTableNumber!;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/waiter/tables')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Mesa {tableNumber}</h1>
            {table?.name && <p className="text-sm text-muted-foreground">{table.name}</p>}
          </div>
          <Badge variant={session.status === 'bill_requested' ? 'destructive' : 'secondary'}>
            {session.status === 'bill_requested' ? 'Pediu Conta' : 'Aberta'}
          </Badge>
        </div>

        {/* Session Info */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(session.opened_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{commands.length} comanda{commands.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Total Card */}
      <div className="p-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total da Mesa</span>
            <span className="text-2xl font-bold">{formatCurrency(totalCents)}</span>
          </div>
        </Card>
      </div>

      {/* Commands */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Comandas</h2>
          {permissions.can_add_items && (
            <Button size="sm" variant="outline" onClick={openCreateCommandDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          )}
        </div>

        {commands.length === 0 ? (
          <Card className="p-6 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">Nenhuma comanda aberta</p>
            {permissions.can_add_items && (
              <Button onClick={openCreateCommandDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Comanda
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {commands.filter(c => c.status === 'open').map((command) => {
              const commandItems = activeItems.filter(item => item.command_id === command.id);
              const commandTotal = commandItems.reduce((sum, item) => 
                sum + (item.unit_price_cents * item.quantity), 0
              );

              return (
                <Card key={command.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold">
                        Comanda {command.number}
                      </span>
                      {command.name && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          — {command.name}
                        </span>
                      )}
                    </div>
                    <span className="font-bold">{formatCurrency(commandTotal)}</span>
                  </div>

                  {/* Items */}
                  {commandItems.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {commandItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(item.unit_price_cents * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">Sem itens</p>
                  )}

                  {/* Actions */}
                  {permissions.can_add_items && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleAddProducts(command.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Produtos
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {permissions.can_request_prebill && (
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleRequestBill}
              disabled={requestBill.isPending}
            >
              <Receipt className="h-4 w-4" />
              Pré-Conta
            </Button>
          )}
          
          {permissions.can_receive_payment && (
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <CreditCard className="h-4 w-4" />
              Pagamento
            </Button>
          )}
        </div>

        {permissions.can_close_table_or_comanda && totalCents === 0 && (
          <Button 
            variant="destructive" 
            className="w-full gap-2"
            onClick={() => setCloseDialogOpen(true)}
          >
            Fechar Mesa
          </Button>
        )}
      </div>

      {/* Create Command Dialog */}
      <WaiterTableCommandCreateDialog
        open={createCommandDialogOpen}
        onOpenChange={setCreateCommandDialogOpen}
        name={newCommandName}
        onNameChange={setNewCommandName}
        number={newCommandNumber}
        onNumberChange={setNewCommandNumber}
        isLoading={createCommand.isPending}
        onConfirm={async () => {
          const n = parseInt(newCommandNumber, 10);
          await handleCreateCommand(newCommandName.trim() || undefined, Number.isFinite(n) ? n : undefined);
          setCreateCommandDialogOpen(false);
        }}
      />

      {/* Product Selector */}
      <WaiterProductSelector
        open={productSelectorOpen}
        onOpenChange={setProductSelectorOpen}
        sessionId={session.id}
        tableId={tableId!}
        tableNumber={tableNumber}
        commandId={selectedCommandId}
        commands={commands}
        onCreateCommand={handleCreateCommand}
        onOrderComplete={() => navigate('/waiter/tables')}
      />

      {/* Payment Dialog */}
      <WaiterPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        sessionId={session.id}
        tableId={tableId!}
        tableNumber={tableNumber}
        total={totalCents}
        commands={commands}
      />

      {/* Close Table Dialog */}
      <TableCloseDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onConfirm={handleCloseTable}
        isPending={updateSessionStatus.isPending}
        tableNumber={tableNumber}
        totalAmount={totalCents}
      />
    </div>
  );
}
