import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLoyaltyPaymentMethodPoints, PAYMENT_METHODS } from '@/hooks/useLoyaltyPaymentMethodPoints';
import { CreditCard, Star, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function LoyaltyPaymentMethodPoints() {
  const { data: paymentMethodPoints, isLoading, upsert } = useLoyaltyPaymentMethodPoints();
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [editBonus, setEditBonus] = useState('0');
  const [editMultiplier, setEditMultiplier] = useState('1.0');

  const handleSave = async (paymentMethod: string) => {
    const bonus = parseInt(editBonus, 10);
    const multiplier = parseFloat(editMultiplier);

    if (isNaN(bonus) || bonus < 0) {
      toast.error('Pontos inválidos');
      return;
    }
    if (isNaN(multiplier) || multiplier < 0) {
      toast.error('Multiplicador inválido');
      return;
    }

    await upsert.mutateAsync({
      payment_method: paymentMethod,
      bonus_points: bonus,
      multiplier,
    });

    setEditingMethod(null);
    setEditBonus('0');
    setEditMultiplier('1.0');
  };

  const handleToggle = async (paymentMethod: string, currentPoints: number, currentMultiplier: number, active: boolean) => {
    await upsert.mutateAsync({
      payment_method: paymentMethod,
      bonus_points: currentPoints,
      multiplier: currentMultiplier,
      active: !active,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const methodsWithConfig = PAYMENT_METHODS.map((pm) => {
    const config = paymentMethodPoints.find((pmp) => pmp.payment_method === pm.value);
    return {
      ...pm,
      config,
      bonus_points: config?.bonus_points || 0,
      multiplier: config?.multiplier || 1.0,
      active: config?.active ?? true,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Pontos por Método de Pagamento
        </CardTitle>
        <CardDescription>
          Configure pontos bônus e multiplicadores para cada método de pagamento.
          O multiplicador é aplicado sobre os pontos base da compra.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {methodsWithConfig.map((pm) => {
            const isEditing = editingMethod === pm.value;

            return (
              <div
                key={pm.value}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-lg">
                    {pm.icon}
                  </div>
                  <div>
                    <p className="font-medium">{pm.label}</p>
                    <div className="flex gap-2 mt-1">
                      {pm.bonus_points > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          +{pm.bonus_points} pontos
                        </Badge>
                      )}
                      {pm.multiplier !== 1.0 && (
                        <Badge variant="outline" className="text-xs">
                          x{pm.multiplier} multiplicador
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min="0"
                          value={editBonus}
                          onChange={(e) => setEditBonus(e.target.value)}
                          className="w-20 h-8 text-sm"
                          placeholder="Pontos"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={editMultiplier}
                          onChange={(e) => setEditMultiplier(e.target.value)}
                          className="w-20 h-8 text-sm"
                          placeholder="Mult."
                        />
                      </div>
                      <Button size="sm" onClick={() => handleSave(pm.value)} disabled={upsert.isPending}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingMethod(null)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMethod(pm.value);
                          setEditBonus(pm.bonus_points.toString());
                          setEditMultiplier(pm.multiplier.toString());
                        }}
                      >
                        Editar
                      </Button>
                      {pm.config && (
                        <Switch
                          checked={pm.active}
                          onCheckedChange={() => handleToggle(pm.value, pm.bonus_points, pm.multiplier, pm.active)}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">ℹ️ Como funciona:</p>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Pontos Bônus:</strong> pontos adicionais por usar este método</li>
            <li>• <strong>Multiplicador:</strong> multiplica os pontos base (ex: 1.5 = 50% a mais)</li>
            <li>• Exemplo: Compra R$100 × 1 pt/R$ = 100pts base. Com PIX (mult 1.5, +10 bônus) = 160pts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
