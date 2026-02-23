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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useActiveRodizioTypes, useActivateRodizio, RodizioType } from '@/hooks/useRodizio';
import { Loader2, Users, UtensilsCrossed } from 'lucide-react';

interface RodizioActivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableSessionId: string;
  onSuccess?: (session: any) => void;
}

export function RodizioActivateDialog({
  open,
  onOpenChange,
  tableSessionId,
  onSuccess,
}: RodizioActivateDialogProps) {
  const { data: rodizioTypes = [], isLoading } = useActiveRodizioTypes();
  const activateRodizio = useActivateRodizio();
  
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [peopleCount, setPeopleCount] = useState<number>(1);

  const selectedType = rodizioTypes.find(t => t.id === selectedTypeId);
  const totalPrice = selectedType ? (selectedType.price_cents * peopleCount) / 100 : 0;

  const handleActivate = async () => {
    if (!selectedTypeId) return;
    
    const result = await activateRodizio.mutateAsync({
      rodizio_type_id: selectedTypeId,
      table_session_id: tableSessionId,
      people_count: peopleCount,
    });
    
    onOpenChange(false);
    onSuccess?.(result);
    
    // Reset
    setSelectedTypeId('');
    setPeopleCount(1);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Ativar Rodízio
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rodizioTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum tipo de rodízio cadastrado.</p>
            <p className="text-sm mt-2">Acesse Cardápio → Rodízio para configurar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seleção de tipo */}
            <div className="space-y-3">
              <Label>Tipo de Rodízio</Label>
              <RadioGroup value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2 pr-2">
                    {rodizioTypes.map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${selectedTypeId === type.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                          }`}
                      >
                        <RadioGroupItem value={type.id} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{type.name}</p>
                          {type.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {type.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {formatCurrency(type.price_cents)}/pessoa
                        </Badge>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </RadioGroup>
            </div>

            {/* Quantidade de pessoas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Quantidade de Pessoas
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                  disabled={peopleCount <= 1}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center text-lg font-semibold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPeopleCount(peopleCount + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Total */}
            {selectedType && (
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedType.price_cents * peopleCount)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{selectedType.name}</p>
                    <p>{peopleCount} {peopleCount === 1 ? 'pessoa' : 'pessoas'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleActivate} 
            disabled={!selectedTypeId || activateRodizio.isPending}
          >
            {activateRodizio.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ativar Rodízio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
