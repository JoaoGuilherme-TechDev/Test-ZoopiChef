import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface OrderCounterResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderCounterResetDialog({ open, onOpenChange }: OrderCounterResetDialogProps) {
  const { data: company } = useCompany();
  const [startNumber, setStartNumber] = useState('1');
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && company?.id) {
      loadCurrentCounter();
    }
  }, [open, company?.id]);

  const loadCurrentCounter = async () => {
    if (!company?.id) return;

    const { data, error } = await supabase
      .from('company_order_counters')
      .select('current_number, last_reset_date')
      .eq('company_id', company.id)
      .single();

    if (!error && data) {
      setCurrentNumber(data.current_number);
      setStartNumber(data.current_number.toString());
    } else {
      setCurrentNumber(1);
      setStartNumber('1');
    }
  };

  const handleReset = async () => {
    if (!company?.id) return;

    const newNumber = parseInt(startNumber, 10);
    if (isNaN(newNumber) || newNumber < 1) {
      toast.error('Informe um número válido (mínimo 1)');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('company_order_counters')
        .upsert({
          company_id: company.id,
          current_number: newNumber,
          last_reset_date: new Date().toISOString().split('T')[0],
        }, {
          onConflict: 'company_id',
        });

      if (error) throw error;

      toast.success(`Contador reiniciado! Próximo pedido: #${newNumber}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao reiniciar contador:', error);
      toast.error('Erro ao reiniciar contador');
    } finally {
      setLoading(false);
    }
  };

  const handleKeep = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reiniciar Contador de Pedidos
          </DialogTitle>
          <DialogDescription>
            Deseja reiniciar o contador de número de pedidos de DELIVERY?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentNumber !== null && (
            <p className="text-sm text-muted-foreground">
              Número atual: <strong>#{currentNumber}</strong>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="startNumber">Número inicial desejado</Label>
            <Input
              id="startNumber"
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              placeholder="Ex: 1"
            />
            <p className="text-xs text-muted-foreground">
              O próximo pedido terá este número. Os seguintes seguirão a sequência automaticamente.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleKeep} disabled={loading}>
            Manter Sequência
          </Button>
          <Button onClick={handleReset} disabled={loading}>
            {loading ? 'Salvando...' : 'Reiniciar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}