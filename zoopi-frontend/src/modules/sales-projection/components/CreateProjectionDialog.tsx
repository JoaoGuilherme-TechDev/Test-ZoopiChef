import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateProjection } from '../hooks/useSalesProjection';

interface CreateProjectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectionDialog({ open, onOpenChange }: CreateProjectionDialogProps) {
  const [name, setName] = useState('');
  const [basePeriodType, setBasePeriodType] = useState<string>('month');
  const [marginPercent, setMarginPercent] = useState('20');

  const createProjection = useCreateProjection();

  const handleSubmit = async () => {
    await createProjection.mutateAsync({
      name: name || `Projeção ${basePeriodType === 'week' ? 'Semanal' : basePeriodType === 'month' ? 'Mensal' : 'Anual'}`,
      basePeriodType,
      marginPercent: parseFloat(marginPercent) || 20,
    });
    onOpenChange(false);
    setName('');
    setBasePeriodType('month');
    setMarginPercent('20');
  };

  const getPeriodDescription = () => {
    switch (basePeriodType) {
      case 'week':
        return 'Compara com a semana anterior e projeta para a próxima semana';
      case 'month':
        return 'Compara com o mês anterior e projeta para o mês atual';
      case 'year':
        return 'Compara com o ano anterior e projeta para o ano atual';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Projeção de Vendas</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Projeção (opcional)</Label>
            <Input
              id="name"
              placeholder="Ex: Meta Janeiro 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Período Base</Label>
            <Select value={basePeriodType} onValueChange={setBasePeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana Anterior</SelectItem>
                <SelectItem value="month">Mês Anterior</SelectItem>
                <SelectItem value="year">Ano Anterior</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{getPeriodDescription()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin">Meta de Crescimento (%)</Label>
            <Input
              id="margin"
              type="number"
              min="0"
              max="100"
              step="5"
              value={marginPercent}
              onChange={(e) => setMarginPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Percentual de aumento sobre o faturamento do período base
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createProjection.isPending}>
            {createProjection.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Projeção'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
