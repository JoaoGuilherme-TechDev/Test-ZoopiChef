import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { useERPStock } from '../hooks/useERPStock';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MOVEMENT_TYPE_LABELS } from '../types';
import type { ERPMovementType } from '../types';

export default function ERPMovementsPage() {
  const { movements, isLoading } = useERPStock();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getMovementBadgeVariant = (type: ERPMovementType) => {
    switch (type) {
      case 'purchase_in':
      case 'adjust_in':
        return 'default';
      case 'sale_out':
      case 'adjust_out':
      case 'waste_out':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Movimentações">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Movimentações">
      <Card>
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground">
            Histórico de todas as movimentações de estoque (últimos 500 registros).
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Custo Unit.</TableHead>
              <TableHead className="text-right">Saldo Após</TableHead>
              <TableHead>Motivo/Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="text-sm">
                  {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </TableCell>
                <TableCell className="font-medium">{movement.erp_item?.name}</TableCell>
                <TableCell>
                  <Badge variant={getMovementBadgeVariant(movement.movement_type)}>
                    {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {movement.movement_type.includes('in') ? '+' : '-'}
                  {movement.qty}
                  {movement.unit?.symbol && ` ${movement.unit.symbol}`}
                </TableCell>
                <TableCell className="text-right">
                  {movement.unit_cost_snapshot != null
                    ? formatCurrency(movement.unit_cost_snapshot)
                    : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {movement.balance_after != null ? movement.balance_after : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {movement.reason || movement.source_table || '-'}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação registrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </ERPInventoryLayout>
  );
}
