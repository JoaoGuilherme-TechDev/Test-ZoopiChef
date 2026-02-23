import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectionDaily } from '../hooks/useSalesProjection';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface DailyTrackingTableProps {
  dailyData: ProjectionDaily[];
}

export function DailyTrackingTable({ dailyData }: DailyTrackingTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (day: ProjectionDaily) => {
    const dateStr = day.date;
    const date = parseISO(dateStr);
    
    if (isFuture(date)) {
      return <Badge variant="outline">Pendente</Badge>;
    }
    
    if (isToday(date)) {
      return <Badge variant="secondary">Hoje</Badge>;
    }

    switch (day.status) {
      case 'above':
        return <Badge className="bg-green-600 hover:bg-green-700">Acima</Badge>;
      case 'on_track':
        return <Badge variant="secondary">No Alvo</Badge>;
      case 'below':
        return <Badge variant="destructive">Abaixo</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getDifferenceDisplay = (diff: number, date: string) => {
    if (isFuture(parseISO(date))) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    if (diff === 0) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-3 w-3" />
          0%
        </span>
      );
    }
    
    if (diff > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
          +{diff.toFixed(1)}%
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-3 w-3" />
        {diff.toFixed(1)}%
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Acompanhamento Diário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyData.map((day) => {
                const date = parseISO(day.date);
                const isCurrentDay = isToday(date);
                
                return (
                  <TableRow 
                    key={day.id}
                    className={isCurrentDay ? 'bg-primary/5' : ''}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {format(date, "EEE, dd/MM", { locale: ptBR })}
                        {isCurrentDay && (
                          <Badge variant="outline" className="text-xs">Hoje</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(day.expected_revenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {isFuture(date) ? '-' : formatCurrency(day.actual_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isFuture(date) ? '-' : day.orders_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {getDifferenceDisplay(day.difference_percent, day.date)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(day)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
