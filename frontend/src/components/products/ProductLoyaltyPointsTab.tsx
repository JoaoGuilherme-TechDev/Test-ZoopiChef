import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Gift, Star, Loader2 } from 'lucide-react';
import { useLoyaltyProductPoints } from '@/hooks/useLoyaltyProductPoints';
import { toast } from 'sonner';

interface ProductLoyaltyPointsTabProps {
  productId: string;
  productName: string;
}

export function ProductLoyaltyPointsTab({ productId, productName }: ProductLoyaltyPointsTabProps) {
  const { data: productPoints, isLoading, upsert } = useLoyaltyProductPoints();
  const [bonusPoints, setBonusPoints] = useState<string>('0');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Find existing config for this product
  const existingConfig = productPoints?.find(pp => pp.product_id === productId);

  useEffect(() => {
    if (existingConfig) {
      setBonusPoints(String(existingConfig.bonus_points || 0));
      setIsActive(existingConfig.active ?? true);
    } else {
      setBonusPoints('0');
      setIsActive(false);
    }
  }, [existingConfig]);

  const handleSave = async () => {
    const points = parseInt(bonusPoints, 10);
    if (isNaN(points) || points < 0) {
      toast.error('Pontos inválidos');
      return;
    }

    setSaving(true);
    try {
      await upsert.mutateAsync({
        product_id: productId,
        bonus_points: points,
        active: isActive,
      });
      toast.success('Pontos de fidelidade salvos!');
    } catch (error) {
      toast.error('Erro ao salvar pontos');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Gift className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium">Pontos de Fidelidade</h4>
            <p className="text-sm text-muted-foreground">
              Configure pontos bônus para este produto
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Ativar pontos bônus</span>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => {
                setIsActive(checked);
                if (!checked) setBonusPoints('0');
              }}
            />
          </div>

          {isActive && (
            <div className="space-y-2">
              <Label htmlFor="bonusPoints">Pontos Bônus por Unidade</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="bonusPoints"
                  type="number"
                  min="0"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                  placeholder="Ex: 10"
                  className="max-w-[150px]"
                />
                <span className="text-sm text-muted-foreground">pontos extras</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Estes pontos são ADICIONAIS aos pontos calculados pelo valor da compra.
                Por exemplo: se o cliente compra 2 unidades e você configurou 5 pontos bônus,
                ele ganhará 10 pontos extras além dos pontos normais.
              </p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Salvar Configuração de Pontos
              </>
            )}
          </Button>
        </div>
      </div>

      {existingConfig && (
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <p className="text-muted-foreground">
            <strong>{productName}</strong> está configurado para dar{' '}
            <span className="text-primary font-medium">{existingConfig.bonus_points || 0} pontos bônus</span>{' '}
            por unidade vendida.
            {!existingConfig.active && <span className="text-destructive"> (Desativado)</span>}
          </p>
        </div>
      )}
    </div>
  );
}
