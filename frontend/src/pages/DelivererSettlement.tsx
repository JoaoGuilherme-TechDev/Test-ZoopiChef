import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDelivererSettlement, DelivererSettlementData } from '@/hooks/useDelivererSettlement';
import { useDeliverers } from '@/hooks/useDeliverers';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Bike, Package, DollarSign, Banknote, 
  CheckCircle, AlertCircle, ArrowRight, Loader2, RefreshCw, Users, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { printSettlementTicket } from '@/lib/print/settlementTicket';

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Crédito' },
  { value: 'cartao_debito', label: 'Débito' },
];

// Normaliza os diferentes valores de payment_method do banco para valores padronizados
const normalizePaymentMethod = (method: string | null): string => {
  if (!method) return '';
  const normalized = method.toLowerCase().trim();
  
  // Mapeia variações para valores padrão
  const mapping: Record<string, string> = {
    'dinheiro': 'dinheiro',
    'money': 'dinheiro',
    'cash': 'dinheiro',
    'pix': 'pix',
    'cartao_credito': 'cartao_credito',
    'cartao_debito': 'cartao_debito',
    'credit': 'cartao_credito',
    'credito': 'cartao_credito',
    'crédito': 'cartao_credito',
    'debit': 'cartao_debito',
    'debito': 'cartao_debito',
    'débito': 'cartao_debito',
    'card': 'cartao_credito',
    'cartao': 'cartao_credito',
    'cashier_qr': 'pix',
    'qr': 'pix',
  };
  
  return mapping[normalized] || normalized;
};

// Retorna o label para exibição do método de pagamento
const getPaymentMethodLabel = (method: string | null): string => {
  const normalized = normalizePaymentMethod(method);
  const found = paymentMethods.find(m => m.value === normalized);
  return found?.label || (method ? method : 'Não definido');
};

export default function DelivererSettlement() {
  const { settlements, isLoading, confirmSettlement, refetch } = useDelivererSettlement();
  const { deliverers } = useDeliverers();
  const { assignDeliverer, updatePaymentMethod } = useOrders();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<DelivererSettlementData | null>(null);
  const [selectedDelivererId, setSelectedDelivererId] = useState<string>('all');

  // Filtrar settlements pelo entregador selecionado
  const filteredSettlements = useMemo(() => {
    if (selectedDelivererId === 'all') {
      return settlements;
    }
    return settlements.filter(s => s.delivererId === selectedDelivererId);
  }, [settlements, selectedDelivererId]);

  // Calcular totais filtrados
  const totals = useMemo(() => {
    const data = filteredSettlements;
    const totalCash = data.reduce((sum, s) => sum + s.cashAmount, 0);
    const totalFees = data.reduce((sum, s) => sum + s.totalDeliveryFees, 0);
    return {
      orders: data.reduce((sum, s) => sum + s.orders.length, 0),
      amount: data.reduce((sum, s) => sum + s.totalAmount, 0),
      cash: totalCash,
      fees: totalFees,
      net: totalCash - totalFees, // Valor líquido correto
    };
  }, [filteredSettlements]);

  const handleChangeDeliverer = async (orderId: string, delivererId: string) => {
    try {
      await assignDeliverer.mutateAsync({ 
        orderId, 
        delivererId: delivererId === 'none' ? null : delivererId 
      });
      toast.success('Entregador alterado!');
    } catch {
      toast.error('Erro ao alterar entregador');
    }
  };

  const handleChangePaymentMethod = async (orderId: string, paymentMethod: string) => {
    try {
      await updatePaymentMethod.mutateAsync({ orderId, paymentMethod });
      toast.success('Forma de pagamento alterada!');
    } catch {
      toast.error('Erro ao alterar forma de pagamento');
    }
  };

  const handleOpenConfirmDialog = (settlement: DelivererSettlementData) => {
    setSelectedSettlement(settlement);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSettlement = async () => {
    if (!selectedSettlement) return;

    try {
      await confirmSettlement.mutateAsync({
        delivererId: selectedSettlement.delivererId,
        orderIds: selectedSettlement.orders.map(o => o.id),
      });

      // Imprimir ticket de acerto para assinatura
      printSettlementTicket({
        delivererName: selectedSettlement.delivererName,
        ordersCount: selectedSettlement.orders.length,
        totalAmount: selectedSettlement.totalAmount,
        cashAmount: selectedSettlement.cashAmount,
        changeGiven: selectedSettlement.changeGiven,
        totalDeliveryFees: selectedSettlement.totalDeliveryFees,
        netAmount: selectedSettlement.netAmount,
        orders: selectedSettlement.orders.map(o => ({
          order_number: o.order_number,
          total: o.total,
          payment_method: o.payment_method,
          delivery_fee: o.delivery_fee,
          created_at: o.created_at,
          customer_name: o.customer_name,
        })),
      });

      toast.success('Acerto confirmado! Ticket impresso para assinatura.');
    } catch (error) {
      console.error('Erro no acerto:', error);
    }

    setConfirmDialogOpen(false);
    setSelectedSettlement(null);
  };

  const handleRefresh = () => {
    refetch();
    toast.info('Dados atualizados!');
  };

  // Lista de entregadores com pedidos pendentes
  const deliverersWithOrders = useMemo(() => {
    return settlements.map(s => ({
      id: s.delivererId,
      name: s.delivererName,
      orderCount: s.orders.length,
    }));
  }, [settlements]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Acerto de Entregadores</h1>
            <p className="text-muted-foreground">
              Confira e acerte os pedidos entregues por cada entregador
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Seletor de Entregador */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="deliverer-filter" className="text-sm font-medium">
                  Filtrar por Entregador:
                </Label>
              </div>
              <Select value={selectedDelivererId} onValueChange={setSelectedDelivererId}>
                <SelectTrigger id="deliverer-filter" className="w-64">
                  <SelectValue placeholder="Selecione um entregador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos os entregadores ({settlements.reduce((sum, s) => sum + s.orders.length, 0)} pedidos)
                  </SelectItem>
                  {deliverersWithOrders.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.orderCount} pedidos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {settlements.length === 0 && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Nenhum pedido pendente
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.orders}</div>
              <p className="text-xs text-muted-foreground">aguardando acerto</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totals.amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">em entregas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dinheiro Recebido</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ {totals.cash.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">recolhido em espécie</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Entrega</CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">R$ {totals.fees.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">a pagar ao entregador</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {totals.net >= 0 ? 'Entregador Devolve' : 'Empresa Paga'}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {Math.abs(totals.net).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">valor líquido</p>
            </CardContent>
          </Card>
        </div>

        {filteredSettlements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">
                {selectedDelivererId === 'all' 
                  ? 'Todos os pedidos foram acertados!' 
                  : 'Nenhum pedido pendente para este entregador.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Não há pedidos pendentes de acerto.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSettlements.map((settlement) => (
            <Card key={settlement.delivererId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bike className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{settlement.delivererName}</CardTitle>
                      <CardDescription>
                        {settlement.orders.length} pedidos pendentes
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => handleOpenConfirmDialog(settlement)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Acerto
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Resumo do entregador */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pedidos</p>
                    <p className="text-lg font-bold">R$ {settlement.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dinheiro</p>
                    <p className="text-lg font-bold text-green-600">R$ {settlement.cashAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Troco Levado</p>
                    <p className="text-lg font-bold text-orange-600">R$ {settlement.changeGiven.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa Entrega</p>
                    <p className="text-lg font-bold text-blue-600">R$ {settlement.totalDeliveryFees.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {settlement.netAmount >= 0 ? 'Entregador Devolve' : 'Empresa Paga'}
                    </p>
                    <p className={`text-lg font-bold ${settlement.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {Math.abs(settlement.netAmount).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Lista de pedidos */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Troco</TableHead>
                      <TableHead>Taxa Entrega</TableHead>
                      <TableHead>Entregador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlement.orders.map((order) => {
                      const changeFor = Number(order.change_for) || 0;
                      const total = Number(order.total) || 0;
                      const normalizedMethod = normalizePaymentMethod(order.payment_method);
                      const changeAmount = normalizedMethod === 'dinheiro' && changeFor > total
                        ? changeFor - total
                        : 0;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            #{order.order_number || order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.customer_name || '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            R$ {total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={normalizedMethod || 'dinheiro'}
                              onValueChange={(value) => handleChangePaymentMethod(order.id, value)}
                            >
                              <SelectTrigger className={`h-8 w-28 text-xs ${!normalizedMethod ? 'border-orange-500 bg-orange-50' : ''}`}>
                                <SelectValue>
                                  {normalizedMethod ? getPaymentMethodLabel(order.payment_method) : 'Não definido'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map(method => (
                                  <SelectItem key={method.value} value={method.value}>
                                    {method.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {normalizedMethod === 'dinheiro' ? (
                              <span className="text-orange-600 font-medium">
                                R$ {changeAmount.toFixed(2)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-blue-600">
                              R$ {(Number(order.delivery_fee) || 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.deliverer_id || 'none'}
                              onValueChange={(value) => handleChangeDeliverer(order.id, value)}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem entregador</SelectItem>
                                {deliverers.filter(d => d.active).map(deliverer => (
                                  <SelectItem key={deliverer.id} value={deliverer.id}>
                                    {deliverer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Acerto</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Você está prestes a confirmar o acerto de{' '}
                  <strong>{selectedSettlement?.orders.length} pedidos</strong> do entregador{' '}
                  <strong>{selectedSettlement?.delivererName}</strong>.
                </p>
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total dos pedidos:</span>
                    <strong>R$ {selectedSettlement?.totalAmount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Dinheiro recebido:</span>
                    <strong className="text-green-600">R$ {selectedSettlement?.cashAmount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Troco levado:</span>
                    <strong className="text-orange-600">R$ {selectedSettlement?.changeGiven.toFixed(2)}</strong>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span>
                      {(selectedSettlement?.netAmount || 0) >= 0 
                        ? 'Entregador devolve:' 
                        : 'Empresa paga ao entregador:'}
                    </span>
                    <strong className={(selectedSettlement?.netAmount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      R$ {Math.abs(selectedSettlement?.netAmount || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Printer className="h-4 w-4" />
                  <span>O ticket de acerto será impresso automaticamente para assinatura do entregador.</span>
                </div>

                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Ao confirmar, todos os pedidos serão marcados como acertados e uma conta a pagar 
                    será criada automaticamente para as taxas de entrega.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSettlement}>
              Confirmar Acerto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
