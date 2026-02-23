import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataItem {
  name: string;
  value: number;
  count?: number;
  customerCount?: number;
  percentage?: number;
}

interface PerformanceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: DataItem[];
  valueLabel?: string;
  showCount?: boolean;
  showPercentage?: boolean;
}

export function PerformanceDetailModal({
  open,
  onOpenChange,
  title,
  data,
  valueLabel = 'Valor',
  showCount = false,
  showPercentage = false,
}: PerformanceDetailModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">{valueLabel}</TableHead>
                {showPercentage && <TableHead className="text-right">%</TableHead>}
                {showCount && <TableHead className="text-right">Qtd</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                  {showPercentage && (
                    <TableCell className="text-right">
                      {((item.value / total) * 100).toFixed(1)}%
                    </TableCell>
                  )}
                  {showCount && (
                    <TableCell className="text-right">{item.count || item.customerCount || 0}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
