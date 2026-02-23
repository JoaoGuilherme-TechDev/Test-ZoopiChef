import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLoyaltyReceiptTypePoints } from '@/hooks/useLoyaltyReceiptTypePoints';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase-shim';
import { Star, Truck, Store, UtensilsCrossed, LayoutGrid, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck: Truck,
  Store: Store,
  UtensilsCrossed: UtensilsCrossed,
  LayoutGrid: LayoutGrid,
};

export function LoyaltyReceiptTypePoints() {
  const { data: company } = useCompany();
  const { data: receiptTypePoints, isLoading, upsert } = useLoyaltyReceiptTypePoints();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editMultiplier, setEditMultiplier] = useState('1.0');

  // Fetch receipt types
  const { data: receiptTypes } = useQuery({
    queryKey: ['order_receipt_types', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('order_receipt_types')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const handleSave = async (receiptTypeId: string) => {
    if (!editValue) {
      toast.error('Informe os pontos');
      return;
    }

    await upsert.mutateAsync({
      receipt_type_id: receiptTypeId,
      bonus_points: parseInt(editValue, 10),
      multiplier: parseFloat(editMultiplier) || 1.0,
    });

    setEditingId(null);
    setEditValue('');
    setEditMultiplier('1.0');
  };

  const handleToggle = async (receiptTypeId: string, currentPoints: number, currentMultiplier: number, active: boolean) => {
    await upsert.mutateAsync({
      receipt_type_id: receiptTypeId,
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

  // Mapear tipos de recebimento com seus pontos configurados
  const typesWithPoints = (receiptTypes || []).map((rt) => {
    const config = receiptTypePoints.find((rtp) => rtp.receipt_type_id === rt.id);
    return {
      ...rt,
      config,
      bonus_points: config?.bonus_points || 0,
      multiplier: (config as any)?.multiplier || 1.0,
      active: config?.active ?? true,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Pontos por Tipo de Pedido
        </CardTitle>
        <CardDescription>
          Configure pontos extras e multiplicadores para cada tipo de pedido (Delivery, Retirada, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {typesWithPoints.map((rt) => {
            const IconComponent = ICON_MAP[rt.icon] || Truck;
            const isEditing = editingId === rt.id;

            return (
              <div
                key={rt.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{rt.name}</p>
                    {rt.bonus_points > 0 && (
                      <Badge variant="secondary" className="mt-1">
                        <Star className="w-3 h-3 mr-1" />
                        +{rt.bonus_points} pontos
                      </Badge>
                    )}
                    {rt.multiplier !== 1.0 && (
                      <Badge variant="outline" className="mt-1 ml-1">
                        x{rt.multiplier} mult.
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20"
                        placeholder="Pts"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={editMultiplier}
                        onChange={(e) => setEditMultiplier(e.target.value)}
                        className="w-20"
                        placeholder="Mult."
                      />
                      <Button size="sm" onClick={() => handleSave(rt.id)} disabled={upsert.isPending}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(rt.id);
                          setEditValue(rt.bonus_points.toString());
                          setEditMultiplier(rt.multiplier.toString());
                        }}
                      >
                        Editar
                      </Button>
                      {rt.config && (
                        <Switch
                          checked={rt.active}
                          onCheckedChange={() => handleToggle(rt.id, rt.bonus_points, rt.multiplier, rt.active)}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
