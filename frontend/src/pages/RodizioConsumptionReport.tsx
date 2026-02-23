import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileSpreadsheet, Download, RefreshCw, UtensilsCrossed, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RodizioSessionWithDetails {
  id: string;
  rodizio_type_id: string;
  table_session_id: string | null;
  comanda_id: string | null;
  people_count: number;
  status: string;
  activated_at: string;
  closed_at: string | null;
  total_price_cents: number;
  rodizio_types: {
    name: string;
    price_cents: number;
  };
  table_sessions?: {
    tables?: {
      number: number;
    };
  };
  items: {
    id: string;
    quantity: number;
    ordered_at: string;
    rodizio_menu_items: {
      name: string;
      max_quantity_per_session: number | null;
    };
  }[];
}

interface ItemConsumption {
  item_name: string;
  total_quantity: number;
  sessions_count: number;
  avg_per_session: number;
  max_limit: number | null;
  waste_potential: boolean;
}

export default function RodizioConsumptionReport() {
  const { data: company } = useCompany();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('sessions');

  // Fetch rodizio types
  const { data: rodizioTypes = [] } = useQuery({
    queryKey: ['rodizio-types-report', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('rodizio_types')
        .select('id, name')
        .eq('company_id', company.id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Fetch sessions with consumption data
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['rodizio-consumption-report', company?.id, dateFrom, dateTo, selectedType],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('rodizio_sessions')
        .select(`
          *,
          rodizio_types(name, price_cents),
          table_sessions(tables(number)),
          items:rodizio_item_orders(
            id,
            quantity,
            ordered_at,
            rodizio_menu_items(name, max_quantity_per_session)
          )
        `)
        .eq('company_id', company.id)
        .gte('activated_at', startOfDay(new Date(dateFrom)).toISOString())
        .lte('activated_at', endOfDay(new Date(dateTo)).toISOString())
        .order('activated_at', { ascending: false });

      if (selectedType !== 'all') {
        query = query.eq('rodizio_type_id', selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as RodizioSessionWithDetails[];
    },
    enabled: !!company?.id,
  });

  // Calculate item consumption stats
  const itemConsumption: ItemConsumption[] = (() => {
    const itemMap = new Map<string, {
      total: number;
      sessions: Set<string>;
      max_limit: number | null;
    }>();

    sessions.forEach(session => {
      session.items?.forEach(item => {
        const name = item.rodizio_menu_items?.name || 'Desconhecido';
        const existing = itemMap.get(name) || { total: 0, sessions: new Set(), max_limit: null };
        existing.total += item.quantity;
        existing.sessions.add(session.id);
        existing.max_limit = item.rodizio_menu_items?.max_quantity_per_session || null;
        itemMap.set(name, existing);
      });
    });

    return Array.from(itemMap.entries())
      .map(([name, data]) => ({
        item_name: name,
        total_quantity: data.total,
        sessions_count: data.sessions.size,
        avg_per_session: data.sessions.size > 0 ? data.total / data.sessions.size : 0,
        max_limit: data.max_limit,
        waste_potential: data.max_limit !== null && (data.total / data.sessions.size) > data.max_limit * 0.8,
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity);
  })();

  // Summary stats
  const totalSessions = sessions.length;
  const totalPeople = sessions.reduce((sum, s) => sum + s.people_count, 0);
  const totalRevenue = sessions.reduce((sum, s) => sum + s.total_price_cents, 0);
  const totalItems = sessions.reduce((sum, s) => sum + (s.items?.reduce((is, i) => is + i.quantity, 0) || 0), 0);
  const avgItemsPerPerson = totalPeople > 0 ? totalItems / totalPeople : 0;

  const handleExportCSV = () => {
    const headers = ['Data', 'Mesa', 'Tipo', 'Pessoas', 'Itens', 'Valor', 'Status'];
    const rows = sessions.map(s => [
      format(new Date(s.activated_at), 'dd/MM/yyyy HH:mm'),
      s.table_sessions?.tables?.number || '-',
      s.rodizio_types?.name || '-',
      s.people_count,
      s.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
      (s.total_price_cents / 100).toFixed(2),
      s.status === 'active' ? 'Ativo' : s.status === 'closed' ? 'Encerrado' : 'Cancelado',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rodizio-consumo-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6" />
              Relatório de Consumo - Rodízio
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o consumo de itens por sessão e mesa
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Rodízio</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {rodizioTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sessões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalSessions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Pessoas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalPeople}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Itens Consumidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Média/Pessoa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{avgItemsPerPerson.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                R$ {(totalRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sessions">Por Sessão</TabsTrigger>
            <TabsTrigger value="items">Por Item</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sessões de Rodízio</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma sessão encontrada no período
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Mesa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-center">Pessoas</TableHead>
                          <TableHead className="text-center">Itens</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map(session => {
                          const itemCount = session.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                          return (
                            <TableRow key={session.id}>
                              <TableCell>
                                {format(new Date(session.activated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                {session.table_sessions?.tables?.number || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {session.rodizio_types?.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {session.people_count}
                              </TableCell>
                              <TableCell className="text-center">
                                {itemCount}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R$ {(session.total_price_cents / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  session.status === 'active' ? 'default' :
                                  session.status === 'closed' ? 'secondary' : 'destructive'
                                }>
                                  {session.status === 'active' ? 'Ativo' :
                                   session.status === 'closed' ? 'Encerrado' : 'Cancelado'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consumo por Item</CardTitle>
              </CardHeader>
              <CardContent>
                {itemConsumption.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum item consumido no período
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Total Pedido</TableHead>
                          <TableHead className="text-center">Sessões</TableHead>
                          <TableHead className="text-center">Média/Sessão</TableHead>
                          <TableHead className="text-center">Limite</TableHead>
                          <TableHead>Alerta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemConsumption.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {item.item_name}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.total_quantity}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.sessions_count}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.avg_per_session.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.max_limit !== null ? item.max_limit : '-'}
                            </TableCell>
                            <TableCell>
                              {item.waste_potential && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Alto consumo
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
