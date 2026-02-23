import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTableBatchCreate } from '@/hooks/useTableBatchCreate';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface TableBatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableBatchCreateDialog({ open, onOpenChange }: TableBatchCreateDialogProps) {
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('10');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const { batchCreateTables } = useTableBatchCreate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);

    if (isNaN(start) || isNaN(end)) {
      toast.error('Números inválidos');
      return;
    }

    if (start > end) {
      toast.error('Número inicial deve ser menor ou igual ao final');
      return;
    }

    if (end - start > 200) {
      toast.error('Máximo de 200 mesas por vez');
      return;
    }

    const commission = parseFloat(commissionPercent) || 0;

    try {
      await batchCreateTables.mutateAsync({ startNumber: start, endNumber: end, commissionPercent: commission });
      toast.success(`Mesas ${start} a ${end} criadas com sucesso!`);
      onOpenChange(false);
      setStartNumber('1');
      setEndNumber('10');
      setCommissionPercent('0');
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Algumas mesas já existem. Verifique a numeração.');
      } else {
        toast.error('Erro ao criar mesas');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Mesas em Lote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startNumber">Número Inicial</Label>
              <Input
                id="startNumber"
                type="number"
                min="1"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endNumber">Número Final</Label>
              <Input
                id="endNumber"
                type="number"
                min="1"
                value={endNumber}
                onChange={(e) => setEndNumber(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="commissionPercent">Comissão (%)</Label>
            <Input
              id="commissionPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              placeholder="0"
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Serão criadas {Math.max(0, parseInt(endNumber || '0') - parseInt(startNumber || '0') + 1)} mesas
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={batchCreateTables.isPending}>
              {batchCreateTables.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Mesas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
