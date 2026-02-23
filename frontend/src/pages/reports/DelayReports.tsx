import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrders, OrderStatus } from '@/hooks/useOrders';
import { useDeliverers } from '@/hooks/useDeliverers';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import { format, differenceInMinutes, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle, TrendingUp, Package, User, Filter, Loader2 } from 'lucide-react';

interface OrderWithTiming {
  id: string;
  created_at: string;
  status: OrderStatus;
  customer_name: string | null;
  total: number;
  deliverer?: { name: string } | null;
  accepted_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  items?: { product_name: string; quantity: number }[];
  totalMinutes: number;
  waitMinutes: number;
  prepMinutes: number;
  readyMinutes: number;
  deliveryMinutes: number;
  isDelayed: boolean;
}

export default function DelayReports() {
  const { orders, isLoading } = useOrders();
  const { deliverers } = useDeliverers();
  const { settings } = useKDSSettings();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [delivererFilter, setDelivererFilter] = useState<string>('all');
  const [onlyDelayed, setOnlyDelayed] = useState(false);

  const ordersWithTiming = useMemo(() => {
    const now = new Date();
    const dangerThreshold = settings?.danger_after_minutes || 20;

    return orders
      .filter((order) => {
        const orderDate = parseISO(order.created_at);
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        if (!isWithinInterval(orderDate, { start, end })) return false;
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;
        if (delivererFilter !== 'all' && order.deliverer_id !== delivererFilter) return false;
        
        return true;
      })
      .map((order): OrderWithTiming => {
        const created = parseISO(order.created_at);
        const accepted = order.accepted_at ? parseISO(order.accepted_at) : null;
        const ready = order.ready_at ? parseISO(order.ready_at) : null;
        const dispatched = order.dispatched_at ? parseISO(order.dispatched_at) : null;
        const delivered = order.delivered_at ? parseISO(order.delivered_at) : null;

        const totalMinutes = differenceInMinutes(delivered || now, created);
        const waitMinutes = accepted ? differenceInMinutes(accepted, created) : 0;
        const prepMinutes = ready && accepted ? differenceInMinutes(ready, accepted) : 0;
        const readyMinutes = dispatched && ready ? differenceInMinutes(dispatched, ready) : 0;
        const deliveryMinutes = delivered && dispatched ? differenceInMinutes(delivered, dispatched) : 0;

        const isDelayed = totalMinutes > dangerThreshold;

        return {
          ...order,
          totalMinutes,
          waitMinutes,
          prepMinutes,
          readyMinutes,
          deliveryMinutes,
          isDelayed,
        };
      })
      .filter((order) => !onlyDelayed || order.isDelayed)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [orders, startDate, endDate, statusFilter, delivererFilter, onlyDelayed, settings]);

  const stats = useMemo(() => {
    if (ordersWithTiming.length === 0) {
      return { avgTotal: 0, avgWait: 0, avgPrep: 0, avgReady: 0, avgDelivery: 0, delayedCount: 0 };
    }

    const sum = ordersWithTiming.reduce(
      (acc, o) => ({
        total: acc.total + o.totalMinutes,
        wait: acc.wait + o.waitMinutes,
        prep: acc.prep + o.prepMinutes,
        ready: acc.ready + o.readyMinutes,
        delivery: acc.delivery + o.deliveryMinutes,
        delayed: acc.delayed + (o.isDelayed ? 1 : 0),
      }),
      { total: 0, wait: 0, prep: 0, ready: 0, delivery: 0, delayed: 0 }
    );

    const count = ordersWithTiming.length;
    return {
      avgTotal: Math.round(sum.total / count),
      avgWait: Math.round(sum.wait / count),
      avgPrep: Math.round(sum.prep / count),
      avgReady: Math.round(sum.ready / count),
      avgDelivery: Math.round(sum.delivery / count),
      delayedCount: sum.delayed,
    };
  }, [ordersWithTiming]);

  const topDelayedProducts = useMemo(() => {
    const productCounts: Record<string, { name: string; count: number }> = {};

    ordersWithTiming
      .filter((o) => o.isDelayed)
      .forEach((order) => {
        order.items?.forEach((item) => {
          if (!productCounts[item.product_name]) {
            productCounts[item.product_name] = { name: item.product_name, count: 0 };
          }
          productCounts[item.product_name].count += item.quantity;
        });
      });

    return Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [ordersWithTiming]);

  // Rankings por etapa
  const rankings = useMemo(() => {
    // Top 5 maior tempo de aceite
    const topAcceptTime = [...ordersWithTiming]
      .filter(o => o.waitMinutes > 0)
      .sort((a, b) => b.waitMinutes - a.waitMinutes)
      .slice(0, 5);

    // Top 5 maior tempo de preparo
    const topPrepTime = [...ordersWithTiming]
      .filter(o => o.prepMinutes > 0)
      .sort((a, b) => b.prepMinutes - a.prepMinutes)
      .slice(0, 5);

    // Top 5 maior tempo de expedição
    const topReadyTime = [...ordersWithTiming]
      .filter(o => o.readyMinutes > 0)
      .sort((a, b) => b.readyMinutes - a.readyMinutes)
      .slice(0, 5);

    // Ranking por entregador (tempo médio de entrega)
    const delivererStats: Record<string, { name: string; totalTime: number; count: number }> = {};
    ordersWithTiming
      .filter(o => o.deliveryMinutes > 0 && o.deliverer?.name)
      .forEach(o => {
        const name = o.deliverer!.name;
        if (!delivererStats[name]) {
          delivererStats[name] = { name, totalTime: 0, count: 0 };
        }
        delivererStats[name].totalTime += o.deliveryMinutes;
        delivererStats[name].count += 1;
      });

    const topDeliverers = Object.values(delivererStats)
      .map(d => ({ name: d.name, avgTime: Math.round(d.totalTime / d.count), count: d.count }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    return { topAcceptTime, topPrepTime, topReadyTime, topDeliverers };
  }, [ordersWithTiming]);

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
        <div>
          <h1 className="text-2xl font-bold">Relatório de Atrasos</h1>
          <p className="text-muted-foreground">
            Análise de tempo por etapa e pedidos atrasados
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="preparo">Preparo</SelectItem>
                    <SelectItem value="pronto">Pronto</SelectItem>
                    <SelectItem value="em_rota">Em Rota</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entregador</Label>
                <Select value={delivererFilter} onValueChange={setDelivererFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {deliverers?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Checkbox
                  id="only-delayed"
                  checked={onlyDelayed}
                  onCheckedChange={(checked) => setOnlyDelayed(checked === true)}
                />
                <Label htmlFor="only-delayed" className="cursor-pointer">
                  Apenas atrasados
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Tempo Médio por Etapa */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgTotal}min</p>
                  <p className="text-sm text-muted-foreground">Tempo Médio Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgWait}min</p>
                  <p className="text-sm text-muted-foreground">Média Aceite</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgPrep}min</p>
                  <p className="text-sm text-muted-foreground">Média Preparo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgReady}min</p>
                  <p className="text-sm text-muted-foreground">Média Expedição</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgDelivery}min</p>
                  <p className="text-sm text-muted-foreground">Média Entrega</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.delayedCount}/{ordersWithTiming.length}</p>
                  <p className="text-sm text-muted-foreground">Atrasados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings por Etapa */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Maior Tempo de Aceite
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankings.topAcceptTime.length > 0 ? (
                <div className="space-y-2">
                  {rankings.topAcceptTime.map((o, i) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">
                        {i + 1}. #{o.id.slice(0, 6)}
                      </span>
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                        {o.waitMinutes}min
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Maior Tempo de Preparo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankings.topPrepTime.length > 0 ? (
                <div className="space-y-2">
                  {rankings.topPrepTime.map((o, i) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">
                        {i + 1}. #{o.id.slice(0, 6)}
                      </span>
                      <Badge variant="outline" className="text-orange-500 border-orange-500">
                        {o.prepMinutes}min
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                Maior Tempo Expedição
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankings.topReadyTime.length > 0 ? (
                <div className="space-y-2">
                  {rankings.topReadyTime.map((o, i) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">
                        {i + 1}. #{o.id.slice(0, 6)}
                      </span>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        {o.readyMinutes}min
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                Entregadores (Média)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankings.topDeliverers.length > 0 ? (
                <div className="space-y-2">
                  {rankings.topDeliverers.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">
                        {i + 1}. {d.name}
                      </span>
                      <Badge variant="outline" className="text-blue-500 border-blue-500">
                        {d.avgTime}min ({d.count})
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Orders Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
              <CardDescription>
                {ordersWithTiming.length} pedidos encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Espera</TableHead>
                      <TableHead>Preparo</TableHead>
                      <TableHead>Pronto</TableHead>
                      <TableHead>Entrega</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersWithTiming.slice(0, 50).map((order) => (
                      <TableRow key={order.id} className={order.isDelayed ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            #{order.id.slice(0, 8)}
                            {order.isDelayed && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {format(parseISO(order.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {order.customer_name || '-'}
                          </div>
                          {order.deliverer && (
                            <span className="text-xs text-muted-foreground">
                              🛵 {order.deliverer.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell className={order.isDelayed ? 'text-destructive font-bold' : ''}>
                          {order.totalMinutes}min
                        </TableCell>
                        <TableCell>{order.waitMinutes}min</TableCell>
                        <TableCell>{order.prepMinutes}min</TableCell>
                        <TableCell>{order.readyMinutes}min</TableCell>
                        <TableCell>{order.deliveryMinutes}min</TableCell>
                      </TableRow>
                    ))}
                    {ordersWithTiming.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhum pedido encontrado com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top Delayed Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Produtos em Atrasos</CardTitle>
              <CardDescription>
                Produtos mais frequentes em pedidos atrasados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topDelayedProducts.length > 0 ? (
                <div className="space-y-3">
                  {topDelayedProducts.map((product, idx) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-5">
                          {idx + 1}.
                        </span>
                        <span className="text-sm truncate">{product.name}</span>
                      </div>
                      <Badge variant="secondary">{product.count}x</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum atraso registrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
