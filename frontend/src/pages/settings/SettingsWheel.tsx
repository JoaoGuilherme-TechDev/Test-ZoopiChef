import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWheelSettings } from '@/hooks/useWheelSettings';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Gift, Settings2, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export default function SettingsWheel() {
  const { settings, isLoading, upsert, isPending } = useWheelSettings();

  const [isActive, setIsActive] = useState(false);
  const [minOrdersFirstSpin, setMinOrdersFirstSpin] = useState(2);
  const [minValueToSpinAgain, setMinValueToSpinAgain] = useState(150);
  const [prizeValidityDays, setPrizeValidityDays] = useState(7);
  const [maxPendingRewards, setMaxPendingRewards] = useState(1);
  const [maxDiscountValue, setMaxDiscountValue] = useState(30);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['percentage', 'fixed_value', 'free_item']);
  const [initialized, setInitialized] = useState(false);

  // Initialize form with settings or defaults
  useEffect(() => {
    if (!isLoading && !initialized) {
      if (settings) {
        setIsActive(settings.is_active);
        setMinOrdersFirstSpin(settings.min_orders_first_spin);
        setMinValueToSpinAgain(settings.min_value_to_spin_again / 100);
        setPrizeValidityDays(settings.prize_validity_days);
        setMaxPendingRewards(settings.max_pending_rewards);
        setMaxDiscountValue(settings.max_discount_cents / 100);
        setAllowedTypes(settings.allowed_prize_types || []);
      }
      setInitialized(true);
    }
  }, [settings, isLoading, initialized]);

  const handleSave = async () => {
    try {
      await upsert({
        is_active: isActive,
        min_orders_first_spin: minOrdersFirstSpin,
        min_value_to_spin_again: Math.round(minValueToSpinAgain * 100),
        prize_validity_days: prizeValidityDays,
        max_pending_rewards: maxPendingRewards,
        max_discount_cents: Math.round(maxDiscountValue * 100),
        allowed_prize_types: allowedTypes,
      });
      toast.success('Configurações da roleta salvas!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const toggleType = (type: string) => {
    setAllowedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações da Roleta">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações da Roleta">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roleta de Prêmios</h2>
          <p className="text-muted-foreground">
            Configure as regras da roleta para seus clientes
          </p>
        </div>

        {!settings && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600">Configuração não encontrada</p>
              <p className="text-sm text-muted-foreground">
                Clique em "Salvar Configurações" para criar a configuração inicial da roleta.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Prêmios da Roleta</CardTitle>
                  <CardDescription>
                    Configure os prêmios (porcentagem, valor fixo ou item grátis) na tela de Prêmios.
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/prizes">Gerenciar prêmios</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Status da Roleta</CardTitle>
                  <CardDescription>Ativar ou desativar a roleta</CardDescription>
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardHeader>
        </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Regras de Elegibilidade</CardTitle>
              <CardDescription>Defina quando o cliente pode girar a roleta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minOrders">Mínimo de pedidos para o primeiro giro</Label>
              <Input
                id="minOrders"
                type="number"
                min={1}
                value={minOrdersFirstSpin}
                onChange={(e) => setMinOrdersFirstSpin(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Cliente precisa ter este número de pedidos concluídos para girar pela primeira vez
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minValue">Valor mínimo acumulado para giros seguintes (R$)</Label>
              <Input
                id="minValue"
                type="number"
                min={0}
                step={10}
                value={minValueToSpinAgain}
                onChange={(e) => setMinValueToSpinAgain(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Após o primeiro giro, cliente precisa acumular este valor em pedidos para girar novamente
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPending">Limite de prêmios pendentes por cliente</Label>
            <Input
              id="maxPending"
              type="number"
              min={1}
              max={5}
              value={maxPendingRewards}
              onChange={(e) => setMaxPendingRewards(parseInt(e.target.value) || 1)}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Cliente não pode girar se já tiver este número de prêmios pendentes
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configurações de Prêmio</CardTitle>
              <CardDescription>Defina validade e limites dos prêmios</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validity">Validade do prêmio (dias)</Label>
              <Input
                id="validity"
                type="number"
                min={1}
                max={90}
                value={prizeValidityDays}
                onChange={(e) => setPrizeValidityDays(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                Após este período, o prêmio expira automaticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDiscount">Limite máximo de desconto (R$)</Label>
              <Input
                id="maxDiscount"
                type="number"
                min={0}
                step={5}
                value={maxDiscountValue}
                onChange={(e) => setMaxDiscountValue(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Valor máximo de desconto que pode ser aplicado
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tipos de prêmio permitidos</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allowedTypes.includes('percentage')}
                  onCheckedChange={() => toggleType('percentage')}
                />
                <span>% de desconto</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allowedTypes.includes('fixed_value')}
                  onCheckedChange={() => toggleType('fixed_value')}
                />
                <span>Valor fixo (R$)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allowedTypes.includes('free_item')}
                  onCheckedChange={() => toggleType('free_item')}
                />
                <span>Item grátis</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending} size="lg">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {settings ? 'Salvar Configurações' : 'Criar Configurações'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
