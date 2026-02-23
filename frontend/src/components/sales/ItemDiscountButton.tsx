import { useState } from 'react';
import { Percent, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ItemDiscountButtonProps {
  itemId: string;
  itemName: string;
  originalPriceCents: number;
  discountCents: number;
  discountPercent: number;
  onDiscountChange: (itemId: string, discountCents: number, discountPercent: number) => void;
  size?: 'sm' | 'md';
}

export function ItemDiscountButton({
  itemId,
  itemName,
  originalPriceCents,
  discountCents,
  discountPercent,
  onDiscountChange,
  size = 'sm',
}: ItemDiscountButtonProps) {
  const [open, setOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'value'>('percent');
  const [discountInput, setDiscountInput] = useState('');

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const handleApply = () => {
    const value = parseFloat(discountInput) || 0;
    if (discountType === 'percent') {
      const discountInCents = Math.round((originalPriceCents * value) / 100);
      onDiscountChange(itemId, discountInCents, value);
    } else {
      const valueInCents = Math.round(value * 100);
      const percent = originalPriceCents > 0 ? (valueInCents / originalPriceCents) * 100 : 0;
      onDiscountChange(itemId, valueInCents, percent);
    }
    setOpen(false);
    setDiscountInput('');
  };

  const handleClear = () => {
    onDiscountChange(itemId, 0, 0);
    setOpen(false);
  };

  const hasDiscount = discountCents > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasDiscount ? "default" : "ghost"}
          size={size === 'sm' ? 'icon' : 'sm'}
          className={size === 'sm' ? 'h-7 w-7' : 'h-8 gap-1'}
        >
          <Percent className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
          {hasDiscount && size === 'md' && (
            <span className="text-xs">-{discountPercent.toFixed(0)}%</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Desconto no Item</h4>
            <p className="text-xs text-muted-foreground truncate">{itemName}</p>
            <p className="text-sm">Preço: {formatCurrency(originalPriceCents)}</p>
          </div>

          {hasDiscount && (
            <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded">
              <Badge variant="destructive" className="text-xs">
                -{discountPercent.toFixed(1)}% ({formatCurrency(discountCents)})
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <Tabs value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'value')}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="percent" className="text-xs">%</TabsTrigger>
              <TabsTrigger value="value" className="text-xs">R$</TabsTrigger>
            </TabsList>

            <TabsContent value="percent" className="mt-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0"
                  className="h-9 text-center"
                />
                <span className="flex items-center text-muted-foreground">%</span>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {[5, 10, 15, 20, 50].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setDiscountInput(p.toString())}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="value" className="mt-2">
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0,00"
                  className="h-9 text-center"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={handleApply}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
