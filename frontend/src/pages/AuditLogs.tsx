import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyAuditLogs, useAuditStats, actionLabels, entityTypeLabels, AuditLogEntry } from '@/hooks/useAuditLog';
import { useCompanyUsers } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, Users, Activity, Clock, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const actionOptions = [
  { value: '', label: 'Todas as ações' },
  { value: 'order_created', label: 'Pedido Criado' },
  { value: 'order_status_changed', label: 'Status do Pedido' },
  { value: 'order_cancelled', label: 'Pedido Cancelado' },
  { value: 'product_created', label: 'Produto Criado' },
  { value: 'product_updated', label: 'Produto Atualizado' },
  { value: 'customer_created', label: 'Cliente Criado' },
  { value: 'cash_session_opened', label: 'Caixa Aberto' },
  { value: 'cash_session_closed', label: 'Caixa Fechado' },
  { value: 'settings_updated', label: 'Configurações' },
  { value: 'user_login', label: 'Login' },
];

const entityOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'order', label: 'Pedidos' },
  { value: 'product', label: 'Produtos' },
  { value: 'category', label: 'Categorias' },
  { value: 'customer', label: 'Clientes' },
  { value: 'cash_session', label: 'Caixa' },
  { value: 'deliverer', label: 'Entregadores' },
  { value: 'user', label: 'Usuários' },
  { value: 'settings', label: 'Configurações' },
];

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Todos' },
];

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('today');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const getPeriodDates = () => {
    const now = new Date();
    switch (periodFilter) {
      case 'today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case '7days':
        return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
      case '30days':
        return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
      default:
        return {};
    }
  };

  const { startDate, endDate } = getPeriodDates();

  const { data: logs = [], isLoading } = useCompanyAuditLogs(500, {
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    userId: userFilter || undefined,
    startDate,
    endDate,
    search: search || undefined,
  });

  const { data: stats } = useAuditStats();
  const { data: users = [] } = useCompanyUsers();

  // Agrupar logs por data
  const groupedLogs = logs.reduce((acc, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLogEntry[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Auditoria do Sistema</h1>
            <p className="text-muted-foreground">
              Rastreie todas as ações realizadas no sistema
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ações Hoje</p>
                  <p className="text-2xl font-bold">{stats?.todayCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                  <p className="text-2xl font-bold">{stats?.uniqueUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registros Exibidos</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search and Toggle */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, detalhes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={showFilters}>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por ação" />
                      </SelectTrigger>
                      <SelectContent>
                        {actionOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {entityOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os usuários</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado</p>
                <p className="text-sm">As ações começarão a ser registradas a partir de agora</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <div className="space-y-2">
                      {dateLogs.map((log) => {
                        const actionInfo = actionLabels[log.action] || {
                          label: log.action,
                          color: 'border-slate-500/50 text-slate-400',
                        };
                        return (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <Badge variant="outline" className={actionInfo.color}>
                                {actionInfo.label}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {log.user_name || 'Usuário'}
                                  </span>
                                  {log.user_role && (
                                    <Badge variant="secondary" className="text-xs">
                                      {log.user_role === 'admin' ? 'Admin' : log.user_role === 'manager' ? 'Gerente' : 'Funcionário'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {entityTypeLabels[log.entity_type] || log.entity_type}
                                  {log.entity_name && `: ${log.entity_name}`}
                                  {log.details && ` - ${log.details}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(log.created_at), 'HH:mm')}
                              </span>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Registro</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Ação</label>
                      <p className="font-medium">
                        {actionLabels[selectedLog.action]?.label || selectedLog.action}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                      <p className="font-medium">
                        {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Usuário</label>
                      <p className="font-medium">{selectedLog.user_name || 'Desconhecido'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Função</label>
                      <p className="font-medium">{selectedLog.user_role || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo de Entidade</label>
                      <p className="font-medium">
                        {entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome da Entidade</label>
                      <p className="font-medium">{selectedLog.entity_name || '-'}</p>
                    </div>
                  </div>

                  {selectedLog.entity_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID da Entidade</label>
                      <p className="font-mono text-sm">{selectedLog.entity_id}</p>
                    </div>
                  )}

                  {selectedLog.details && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Detalhes</label>
                      <p className="mt-1">{selectedLog.details}</p>
                    </div>
                  )}

                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Valores Anteriores</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Novos Valores</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Navegador/Dispositivo</label>
                      <p className="text-sm text-muted-foreground mt-1 break-all">
                        {selectedLog.user_agent}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
