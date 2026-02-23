import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLoyaltyProductPoints } from '@/hooks/useLoyaltyProductPoints';
import { useProducts } from '@/hooks/useProducts';
import { Plus, Star, Trash2, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LoyaltyProductPoints() {
  const { data: productPoints, isLoading, upsert, remove } = useLoyaltyProductPoints();
  const { data: products } = useProducts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');

  // Filtrar produtos que ainda não têm configuração
  const availableProducts = (products || []).filter(
    (p) => !productPoints.find((pp) => pp.product_id === p.id)
  );

  const handleAdd = async () => {
    if (!selectedProductId || !bonusPoints) {
      toast.error('Selecione um produto e informe os pontos');
      return;
    }

    await upsert.mutateAsync({
      product_id: selectedProductId,
      bonus_points: parseInt(bonusPoints, 10),
    });

    setSelectedProductId('');
    setBonusPoints('');
    setIsDialogOpen(false);
  };

  const handleToggle = async (id: string, productId: string, currentPoints: number, active: boolean) => {
    await upsert.mutateAsync({
      product_id: productId,
      bonus_points: currentPoints,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pontos por Produto
          </CardTitle>
          <CardDescription>
            Configure pontos extras para produtos específicos
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Pontos por Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Produto</label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pontos Bônus</label>
                <Input
                  type="number"
                  min="0"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground">
                  Pontos extras que o cliente ganha ao comprar este produto
                </p>
              </div>
              <Button onClick={handleAdd} disabled={upsert.isPending} className="w-full">
                {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {productPoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Nenhum produto configurado</p>
            <p className="text-sm">Adicione produtos que dão pontos extras aos clientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {productPoints.map((pp) => (
              <div
                key={pp.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{pp.product?.name || 'Produto'}</p>
                    <Badge variant="secondary" className="mt-1">
                      <Star className="w-3 h-3 mr-1" />
                      +{pp.bonus_points} pontos
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={pp.active}
                    onCheckedChange={() => handleToggle(pp.id, pp.product_id, pp.bonus_points, pp.active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(pp.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
