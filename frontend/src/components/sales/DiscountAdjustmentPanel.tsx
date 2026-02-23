import { useState } from 'react';
import { Percent, Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DiscountAdjustmentPanelProps {
  totalCents: number;
  discountCents: number;
  discountPercent: number;
  additionCents: number;
  serviceFeeEnabled: boolean;
  serviceFeePercent: number;
  onDiscountChange: (cents: number, percent: number) => void;
  onAdditionChange: (cents: number) => void;
  onServiceFeeToggle: (enabled: boolean) => void;
}

export function DiscountAdjustmentPanel({
  totalCents,
  discountCents,
  discountPercent,
  additionCents,
  serviceFeeEnabled,
  serviceFeePercent,
  onDiscountChange,
  onAdditionChange,
  onServiceFeeToggle,
}: DiscountAdjustmentPanelProps) {
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [additionDialogOpen, setAdditionDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'value'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [additionInput, setAdditionInput] = useState('');

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(discountInput) || 0;
    if (discountType === 'percent') {
      const discountInCents = Math.round((totalCents * value) / 100);
      onDiscountChange(discountInCents, value);
    } else {
      const valueInCents = Math.round(value * 100);
      const percent = totalCents > 0 ? (valueInCents / totalCents) * 100 : 0;
      onDiscountChange(valueInCents, percent);
    }
    setDiscountDialogOpen(false);
    setDiscountInput('');
  };

  const handleApplyAddition = () => {
    const value = parseFloat(additionInput) || 0;
    const valueInCents = Math.round(value * 100);
    onAdditionChange(valueInCents);
    setAdditionDialogOpen(false);
    setAdditionInput('');
  };

  const handleClearDiscount = () => {
    onDiscountChange(0, 0);
  };

  const handleClearAddition = () => {
    onAdditionChange(0);
  };

  const serviceFeeValue = serviceFeeEnabled 
    ? Math.round((totalCents * serviceFeePercent) / 100) 
    : 0;

  const finalTotal = totalCents - discountCents + additionCents + serviceFeeValue;

  return (
    <div className="space-y-3">
      {/* Service Fee Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Taxa de Serviço ({serviceFeePercent}%)</span>
        </div>
        <div className="flex items-center gap-2">
          {serviceFeeEnabled && (
            <span className="text-sm text-green-600">
              +{formatCurrency(serviceFeeValue)}
            </span>
          )}
          <Switch
            checked={serviceFeeEnabled}
            onCheckedChange={onServiceFeeToggle}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Discount Button */}
        <Button
          variant="outline"
          className="h-12 flex flex-col gap-0.5"
          onClick={() => setDiscountDialogOpen(true)}
        >
          <Minus className="h-4 w-4 text-red-500" />
          <span className="text-xs">Desconto</span>
        </Button>

        {/* Addition Button */}
        <Button
          variant="outline"
          className="h-12 flex flex-col gap-0.5"
          onClick={() => setAdditionDialogOpen(true)}
        >
          <Plus className="h-4 w-4 text-green-500" />
          <span className="text-xs">Acréscimo</span>
        </Button>
      </div>

      {/* Applied Adjustments */}
      {(discountCents > 0 || additionCents > 0) && (
        <div className="space-y-2">
          {discountCents > 0 && (
            <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  -{discountPercent.toFixed(1)}%
                </Badge>
                <span className="text-sm text-red-600">Desconto</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-600">
                  -{formatCurrency(discountCents)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleClearDiscount}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {additionCents > 0 && (
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <span className="text-sm text-green-600">Acréscimo</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-600">
                  +{formatCurrency(additionCents)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleClearAddition}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-red-500" />
              Aplicar Desconto
            </DialogTitle>
          </DialogHeader>

          <Tabs value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'value')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="percent">Porcentagem</TabsTrigger>
              <TabsTrigger value="value">Valor</TabsTrigger>
            </TabsList>

            <TabsContent value="percent" className="mt-4">
              <div className="space-y-3">
                <Label>Desconto em %</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="0"
                    className="h-12 text-lg text-center"
                    autoFocus
                  />
                  <span className="flex items-center text-2xl text-muted-foreground">%</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 15, 20].map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountInput(p.toString())}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="value" className="mt-4">
              <div className="space-y-3">
                <Label>Desconto em R$</Label>
                <div className="flex gap-2">
                  <span className="flex items-center text-lg text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="0,00"
                    className="h-12 text-lg text-center"
                    autoFocus
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyDiscount}>
              Aplicar Desconto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Addition Dialog */}
      <Dialog open={additionDialogOpen} onOpenChange={setAdditionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Aplicar Acréscimo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Valor do Acréscimo</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-lg text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionInput}
                  onChange={(e) => setAdditionInput(e.target.value)}
                  placeholder="0,00"
                  className="h-12 text-lg text-center"
                  autoFocus
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdditionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyAddition}>
              Aplicar Acréscimo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
