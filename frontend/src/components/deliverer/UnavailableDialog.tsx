import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Pause, Coffee, Wrench, UserX } from 'lucide-react';

interface UnavailableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

const UNAVAILABLE_REASONS = [
  { value: 'pausa', label: 'Pausa/Descanso', icon: Coffee },
  { value: 'problema_veiculo', label: 'Problema no veículo', icon: Wrench },
  { value: 'emergencia_pessoal', label: 'Emergência pessoal', icon: UserX },
  { value: 'outro', label: 'Outro motivo', icon: Pause },
];

export function UnavailableDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: UnavailableDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;
    
    const finalReason = selectedReason === 'outro' && customReason.trim()
      ? customReason.trim()
      : UNAVAILABLE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    
    onConfirm(finalReason);
    setSelectedReason('');
    setCustomReason('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedReason('');
    setCustomReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Ficar Indisponível
          </DialogTitle>
          <DialogDescription>
            Selecione o motivo pelo qual você está indisponível. Essa informação será visível para o operador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {UNAVAILABLE_REASONS.map((reason) => {
              const Icon = reason.icon;
              return (
                <div
                  key={reason.value}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedReason(reason.value)}
                >
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor={reason.value} className="cursor-pointer flex-1">
                    {reason.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {selectedReason === 'outro' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Descreva o motivo</Label>
              <Textarea
                id="custom-reason"
                placeholder="Ex: Pneu furado, preciso trocar..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === 'outro' && !customReason.trim()) || isPending}
          >
            {isPending ? 'Aguarde...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
