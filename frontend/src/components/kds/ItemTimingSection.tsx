import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useItemTimingAnalytics } from '@/hooks/useItemTimingAnalytics';
import { formatDurationFromMinutes, formatMinutesShort } from '@/lib/timeFormat';
import { ChefHat, Timer, CheckCircle2, Play, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ItemTimingSectionProps {
  filters: {
    startDate: Date;
    endDate: Date;
  };
}

export function ItemTimingSection({ filters }: ItemTimingSectionProps) {
  const { analytics, isLoading } = useItemTimingAnalytics(filters.startDate, filters.endDate);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado de itens disponível para o período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              Tempo Médio Preparo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDurationFromMinutes(analytics.avgPrepTime)}</p>
            <p className="text-xs text-muted-foreground">por item</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="w-4 h-4 text-orange-500" />
              Itens Iniciados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.totalItemsStarted}</p>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Itens Finalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.totalItemsFinished}</p>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-blue-500" />
              Em Preparo Agora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.itemsInProgress.length}</p>
            <p className="text-xs text-muted-foreground">itens ativos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Items in Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              Itens em Preparo (Tempo Real)
            </CardTitle>
            <CardDescription>Cronômetro ativo para cada item</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.itemsInProgress.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead className="text-right">Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.itemsInProgress.map(item => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          #{item.orderNumber || item.orderId.slice(0, 6)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500 animate-pulse">
                          {formatDurationFromMinutes(item.prepTimeMinutes)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item em preparo no momento
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Itens Finalizados Recentes
            </CardTitle>
            <CardDescription>Últimos itens concluídos</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentCompleted.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead className="text-right">Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.recentCompleted.slice(0, 10).map(item => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          #{item.orderNumber || item.orderId.slice(0, 6)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {formatDurationFromMinutes(item.prepTimeMinutes)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item finalizado recentemente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Product */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tempo Médio por Produto (Nível Item)
          </CardTitle>
          <CardDescription>Baseado no tempo individual de cada item</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.byProduct.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Tempo Médio</TableHead>
                  <TableHead className="text-right">Qtd Itens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.byProduct.map((product, idx) => (
                  <TableRow key={product.productName}>
                    <TableCell className="font-medium">
                      {idx + 1}. {product.productName}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={product.avgPrepTime > 15 ? 'text-destructive font-medium' : ''}>
                        {formatMinutesShort(product.avgPrepTime)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{product.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de produto disponível
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
