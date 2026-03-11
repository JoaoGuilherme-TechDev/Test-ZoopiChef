import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Building, Users, Receipt, Target } from 'lucide-react';
import { useOverheadConfig, type OverheadConfig } from '../hooks/useOverheadConfig';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OverheadConfigDialog({ open, onOpenChange }: Props) {
  const { config, isLoading, upsertConfig, calculateFromExpenses, defaultConfig } = useOverheadConfig();
  
  const [formData, setFormData] = useState<Partial<OverheadConfig>>({});

  useEffect(() => {
    if (config) {
      setFormData(config);
    } else {
      setFormData(defaultConfig);
    }
  }, [config, open]);

  const handleChange = (field: keyof OverheadConfig, value: number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await upsertConfig.mutateAsync(formData);
    onOpenChange(false);
  };

  const handleAutoCalculate = async () => {
    await calculateFromExpenses.mutateAsync();
  };

  const totalFixed = (formData.rent_percent || 0) + 
    (formData.utilities_percent || 0) + 
    (formData.insurance_percent || 0) + 
    (formData.depreciation_percent || 0);

  const totalOps = (formData.labor_percent || 0) + 
    (formData.administrative_percent || 0) + 
    (formData.marketing_percent || 0) + 
    (formData.maintenance_percent || 0);

  const totalTaxes = (formData.taxes_percent || 0) + 
    (formData.card_fees_percent || 0) + 
    (formData.delivery_fees_percent || 0);

  const totalOverhead = totalFixed + totalOps + totalTaxes;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configuração de Custos Operacionais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botão IA */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Calcular Automaticamente
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Analisa suas despesas e faturamento para sugerir percentuais
                  </p>
                </div>
                <Button 
                  onClick={handleAutoCalculate}
                  disabled={calculateFromExpenses.isPending}
                  variant="secondary"
                >
                  {calculateFromExpenses.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Calcular com IA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Despesas Fixas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="h-4 w-4" />
                Despesas Fixas
                <Badge variant="outline">{totalFixed.toFixed(1)}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Aluguel (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.rent_percent || 0}
                  onChange={e => handleChange('rent_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Água/Luz/Gás (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.utilities_percent || 0}
                  onChange={e => handleChange('utilities_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Seguros (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.insurance_percent || 0}
                  onChange={e => handleChange('insurance_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Depreciação (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.depreciation_percent || 0}
                  onChange={e => handleChange('depreciation_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Despesas Operacionais */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Despesas Operacionais
                <Badge variant="outline">{totalOps.toFixed(1)}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Mão de Obra (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.labor_percent || 0}
                  onChange={e => handleChange('labor_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Administrativo (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.administrative_percent || 0}
                  onChange={e => handleChange('administrative_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Marketing (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.marketing_percent || 0}
                  onChange={e => handleChange('marketing_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Manutenção (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.maintenance_percent || 0}
                  onChange={e => handleChange('maintenance_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Impostos e Taxas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Impostos e Taxas
                <Badge variant="outline">{totalTaxes.toFixed(1)}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Impostos (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.taxes_percent || 0}
                  onChange={e => handleChange('taxes_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Taxa Cartão (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.card_fees_percent || 0}
                  onChange={e => handleChange('card_fees_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Taxa Delivery (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.delivery_fees_percent || 0}
                  onChange={e => handleChange('delivery_fees_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Margem de Lucro */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Lucro Líquido Desejado (%)</Label>
                  <p className="text-xs text-muted-foreground">Meta de lucro após todas as despesas</p>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  className="w-24"
                  value={formData.target_profit_percent || 15}
                  onChange={e => handleChange('target_profit_percent', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Resumo */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overhead Total</span>
              <Badge variant={totalOverhead > 70 ? 'destructive' : 'secondary'} className="text-lg px-3 py-1">
                {totalOverhead.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              CMV + {totalOverhead.toFixed(1)}% overhead + {formData.target_profit_percent || 15}% lucro = 100% do preço
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertConfig.isPending}>
              {upsertConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Configuração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
