import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Bell, Receipt, HelpCircle, Check, Clock, ArrowLeft } from 'lucide-react';
import { useTableServiceCalls, useUpdateServiceCall, TableServiceCall } from '@/hooks/useTableServiceCalls';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ServiceCallsMonitor() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  
  const { data: allCalls = [], isLoading } = useTableServiceCalls();
  const updateCall = useUpdateServiceCall();

  const pendingCalls = allCalls.filter(c => c.status === 'pending');
  const acknowledgedCalls = allCalls.filter(c => c.status === 'acknowledged');
  const resolvedCalls = allCalls.filter(c => c.status === 'resolved');

  const getCallIcon = (type: string) => {
    switch (type) {
      case 'waiter': return <Bell className="h-4 w-4" />;
      case 'bill': return <Receipt className="h-4 w-4" />;
      case 'help': return <HelpCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getCallLabel = (type: string) => {
    switch (type) {
      case 'waiter': return 'Chamar Garçom';
      case 'bill': return 'Pedir Conta';
      case 'help': return 'Ajuda';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pendente</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary">Em Atendimento</Badge>;
      case 'resolved':
        return <Badge variant="default">Resolvido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAcknowledge = async (call: TableServiceCall) => {
    try {
      await updateCall.mutateAsync({ id: call.id, status: 'acknowledged' });
      toast.success(`Mesa ${call.table_number} - Chamado recebido`);
    } catch {
      toast.error('Erro ao atualizar chamado');
    }
  };

  const handleResolve = async (call: TableServiceCall) => {
    try {
      await updateCall.mutateAsync({ id: call.id, status: 'resolved' });
      toast.success(`Mesa ${call.table_number} - Chamado resolvido`);
    } catch {
      toast.error('Erro ao resolver chamado');
    }
  };

  const renderCallsTable = (calls: TableServiceCall[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mesa</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Tempo</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {calls.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 5 : 4} className="text-center py-8 text-muted-foreground">
              Nenhum chamado
            </TableCell>
          </TableRow>
        ) : (
          calls.map((call) => (
            <TableRow key={call.id} className={call.status === 'pending' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
              <TableCell className="font-bold text-lg">
                Mesa {call.table_number}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getCallIcon(call.call_type)}
                  {getCallLabel(call.call_type)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(call.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(call.status)}</TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {call.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleAcknowledge(call)}
                        disabled={updateCall.isPending}
                      >
                        Atender
                      </Button>
                    )}
                    {(call.status === 'pending' || call.status === 'acknowledged') && (
                      <Button 
                        size="sm"
                        onClick={() => handleResolve(call)}
                        disabled={updateCall.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout title="Chamados do Salão">
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chamados do Salão</h1>
            <p className="text-muted-foreground">
              Monitore chamadas de garçom e pedidos de conta
            </p>
          </div>
          {pendingCalls.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-lg px-3 py-1">
              {pendingCalls.length} pendente{pendingCalls.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="relative">
                Pendentes
                {pendingCalls.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCalls.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="acknowledged">
                Em Atendimento
                {acknowledgedCalls.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {acknowledgedCalls.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-red-500" />
                    Chamados Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderCallsTable(pendingCalls, true)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="acknowledged">
              <Card>
                <CardHeader>
                  <CardTitle>Em Atendimento</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderCallsTable(acknowledgedCalls, true)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resolved">
              <Card>
                <CardHeader>
                  <CardTitle>Resolvidos Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderCallsTable(resolvedCalls.slice(0, 50), false)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
