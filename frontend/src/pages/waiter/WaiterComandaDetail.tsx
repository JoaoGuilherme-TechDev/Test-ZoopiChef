import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useComandas, useComandaMutations } from '@/hooks/useComandas';
import { useComandaItems } from '@/hooks/useComandaItems';
import { useWaiterPermissions } from '@/hooks/useWaiterPermissions';
import { useCompany } from '@/hooks/useCompany';
import { 
  ArrowLeft, Loader2, Clock, Plus, Receipt, 
  CreditCard, Tag, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WaiterComandaProductSelector } from '@/components/waiter/WaiterComandaProductSelector';
import { WaiterComandaPaymentDialog } from '@/components/waiter/WaiterComandaPaymentDialog';
import { ComandaRodizioActivateDialog } from '@/components/comandas/ComandaRodizioActivateDialog';
import { useActiveRodizioSession } from '@/hooks/useRodizio';
import { WaiterComandaRodizioMenuDialog } from '@/components/waiter/WaiterComandaRodizioMenuDialog';

export default function WaiterComandaDetail() {
  const navigate = useNavigate();
  const { comandaId } = useParams<{ comandaId: string }>();

  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [rodizioActivateOpen, setRodizioActivateOpen] = useState(false);
  const [rodizioMenuOpen, setRodizioMenuOpen] = useState(false);

  const { permissions } = useWaiterPermissions();
  const { data: company } = useCompany();
  const { comandas, isLoading: comandasLoading } = useComandas();
  const comanda = comandas.find(c => c.id === comandaId);

  const { data: activeRodizioSession } = useActiveRodizioSession(undefined, comandaId);

  const { items, isLoading: itemsLoading } = useComandaItems(comandaId || null);
  const { requestBill, closeComanda } = useComandaMutations();

  const isLoading = comandasLoading || itemsLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando comanda...</p>
        </div>
      </div>
    );
  }

  if (!comanda) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-foreground">Comanda não encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Essa comanda pode ter sido fechada, removida ou você não tem acesso.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate('/waiter/comandas')}>
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

  // Calculate remaining balance
  const remainingBalance = comanda.total_amount - (comanda.paid_amount || 0);

  const handleRequestBill = async () => {
    try {
      await requestBill.mutateAsync(comanda.id);
      toast.success('Pré-conta solicitada!');
    } catch (error) {
      toast.error('Erro ao solicitar pré-conta');
    }
  };

  const handleCloseComanda = async () => {
    if (remainingBalance > 0 && !permissions.can_close_table_or_comanda) {
      toast.error('Sem permissão para fechar comanda com saldo');
      return;
    }
    try {
      await closeComanda.mutateAsync({ comandaId: comanda.id });
      toast.success('Comanda fechada!');
      navigate('/waiter/comandas');
    } catch (error) {
      toast.error('Erro ao fechar comanda');
    }
  };

  // Filter active items (not cancelled)
  const activeItems = items.filter(item => !item.canceled_at);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/waiter/comandas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-bold">Comanda #{comanda.command_number}</h1>
            </div>
            {comanda.name && (
              <p className="text-sm text-muted-foreground">{comanda.name}</p>
            )}
          </div>
          <Badge variant={comanda.status === 'requested_bill' ? 'destructive' : 'secondary'}>
            {comanda.status === 'requested_bill' ? 'Pediu Conta' : 'Aberta'}
          </Badge>
        </div>

        {/* Session Info */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(comanda.opened_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
          </div>
          {comanda.apply_service_fee && (
            <Badge variant="outline" className="text-xs">
              +{comanda.service_fee_percent}% taxa
            </Badge>
          )}
        </div>
      </div>

      {/* Total Card */}
      <div className="p-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{formatCurrency(comanda.total_amount)}</span>
            </div>
            {(comanda.paid_amount || 0) > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">Pago</span>
                  <span className="text-green-600">{formatCurrency(comanda.paid_amount || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Restante</span>
                  <span>{formatCurrency(remainingBalance)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Items */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Itens ({activeItems.length})</h2>
          {permissions.can_add_items && comanda.status !== 'closed' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (activeRodizioSession) setRodizioMenuOpen(true);
                  else setRodizioActivateOpen(true);
                }}
              >
                <Receipt className="h-4 w-4 mr-1" />
                Rodízio
              </Button>

              <Button size="sm" onClick={() => setProductSelectorOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          )}
        </div>

        {activeItems.length === 0 ? (
          <Card className="p-6 text-center">
            <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">Nenhum item na comanda</p>
            {permissions.can_add_items && (
              <Button onClick={() => setProductSelectorOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produtos
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{item.qty}x {item.product_name_snapshot}</div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(item.unit_price_snapshot * item.qty)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {permissions.can_request_prebill && comanda.status !== 'requested_bill' && (
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

        {permissions.can_close_table_or_comanda && remainingBalance <= 0 && (
          <Button 
            variant="destructive" 
            className="w-full gap-2"
            onClick={handleCloseComanda}
            disabled={closeComanda.isPending}
          >
            Fechar Comanda
          </Button>
        )}
      </div>

      {/* Product Selector */}
      <WaiterComandaProductSelector
        open={productSelectorOpen}
        onOpenChange={setProductSelectorOpen}
        comandaId={comandaId!}
        comandaNumber={comanda.command_number}
        comandaName={comanda.name}
        onSuccess={() => navigate('/waiter/comandas')}
      />

      {/* Rodízio (ativar) */}
      <ComandaRodizioActivateDialog
        open={rodizioActivateOpen}
        onOpenChange={setRodizioActivateOpen}
        comandaId={comandaId!}
        onSuccess={() => {
          // Depois de ativar, abre o menu de itens do rodízio
          setRodizioMenuOpen(true);
        }}
      />

      {/* Rodízio (lançar itens) */}
      {company?.id && activeRodizioSession && (
        <WaiterComandaRodizioMenuDialog
          open={rodizioMenuOpen}
          onOpenChange={setRodizioMenuOpen}
          companyId={company.id}
          comandaId={comandaId!}
          comandaNumber={comanda.command_number}
          comandaName={comanda.name}
          rodizioSession={activeRodizioSession as any}
        />
      )}

      {/* Payment Dialog */}
      <WaiterComandaPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        comandaId={comandaId!}
        comandaNumber={comanda.command_number}
        total={comanda.total_amount}
        paidAmount={comanda.paid_amount || 0}
      />
    </div>
  );
}

