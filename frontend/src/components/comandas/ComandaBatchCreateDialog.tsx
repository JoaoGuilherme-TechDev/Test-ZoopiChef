import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Layers, Percent, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useComandaSettings } from '@/hooks/useComandas';
import { useComandaBatchCreate, BatchCreateResult } from '@/hooks/useComandaBatchCreate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

interface ComandaBatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComandaBatchCreateDialog({ open, onOpenChange }: ComandaBatchCreateDialogProps) {
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('10');
  const [applyServiceFee, setApplyServiceFee] = useState(false);
  const [serviceFeePercent, setServiceFeePercent] = useState('');
  const [existingCount, setExistingCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const { settings } = useComandaSettings();
  const defaultPercent = settings?.default_service_fee_percent ?? 10;

  const { batchCreateComandas, checkExistingComandas } = useComandaBatchCreate();
  const queryClient = useQueryClient();

  const start = parseInt(startNumber) || 0;
  const end = parseInt(endNumber) || 0;
  const totalInRange = Math.max(0, end - start + 1);
  const toCreate = Math.max(0, totalInRange - existingCount);

  // Check existing comandas when range changes
  useEffect(() => {
    if (!open) return;
    
    const checkExisting = async () => {
      if (start > 0 && end >= start && end - start <= 200) {
        setIsChecking(true);
        try {
          const existing = await checkExistingComandas(start, end);
          setExistingCount(existing.size);
        } catch {
          setExistingCount(0);
        } finally {
          setIsChecking(false);
        }
      } else {
        setExistingCount(0);
      }
    };

    const debounce = setTimeout(checkExisting, 300);
    return () => clearTimeout(debounce);
  }, [start, end, open, checkExistingComandas]);

  const handleServiceFeeToggle = (checked: boolean) => {
    setApplyServiceFee(checked);
    if (checked && !serviceFeePercent) {
      setServiceFeePercent(defaultPercent.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(start) || isNaN(end)) {
      toast.error('Números inválidos');
      return;
    }

    if (start > end) {
      toast.error('Número inicial deve ser menor ou igual ao final');
      return;
    }

    if (end - start > 200) {
      toast.error('Máximo de 200 comandas por vez');
      return;
    }

    const percent = applyServiceFee ? (parseFloat(serviceFeePercent) || defaultPercent) : 0;

    try {
      const result: BatchCreateResult = await batchCreateComandas.mutateAsync({
        startNumber: start,
        endNumber: end,
        applyServiceFee,
        serviceFeePercent: percent,
      });

      // Force invalidate ALL comanda caches to refresh the map
      await queryClient.invalidateQueries({ queryKey: ['comandas'] });

      // Show detailed result
      if (result.totalCreated > 0 && result.totalSkipped > 0) {
        toast.success(
          `Criadas ${result.totalCreated} comandas. Ignoradas ${result.totalSkipped} (já existiam).`,
          { duration: 5000 }
        );
      } else if (result.totalCreated > 0) {
        toast.success(`${result.totalCreated} comandas criadas com sucesso!`);
      } else if (result.totalSkipped > 0) {
        toast.info(`Todas as ${result.totalSkipped} comandas já existiam. Nenhuma nova criada.`);
      }

      if (result.totalFailed > 0) {
        toast.error(`${result.totalFailed} comandas falharam ao criar.`);
      }

      onOpenChange(false);
      setStartNumber('1');
      setEndNumber('10');
      setApplyServiceFee(false);
      setServiceFeePercent('');
      setExistingCount(0);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar comandas');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setExistingCount(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Criar Comandas em Lote
          </DialogTitle>
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

          {/* Info about existing comandas */}
          {totalInRange > 0 && (
            <Alert variant={existingCount > 0 ? 'default' : undefined}>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verificando comandas existentes...
                  </span>
                ) : existingCount > 0 ? (
                  <>
                    <span className="font-medium">
                      {toCreate} serão criadas
                    </span>
                    {' · '}
                    <span className="text-muted-foreground">
                      {existingCount} já existem (serão ignoradas)
                    </span>
                  </>
                ) : (
                  <span>
                    Serão criadas <span className="font-medium">{totalInRange}</span> comandas
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="service-fee" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Taxa de serviço
                </Label>
                <p className="text-xs text-muted-foreground">Aplicar porcentagem em todas as comandas</p>
              </div>
              <Switch
                id="service-fee"
                checked={applyServiceFee}
                onCheckedChange={handleServiceFeeToggle}
              />
            </div>

            {applyServiceFee && (
              <div className="space-y-2">
                <Label htmlFor="service-fee-percent">Porcentagem (%)</Label>
                <Input
                  id="service-fee-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={serviceFeePercent}
                  onChange={(e) => setServiceFeePercent(e.target.value)}
                  placeholder={defaultPercent.toString()}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={batchCreateComandas.isPending || toCreate === 0 && existingCount === 0}
            >
              {batchCreateComandas.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {toCreate > 0 ? `Criar ${toCreate} Comandas` : 'Criar Comandas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
