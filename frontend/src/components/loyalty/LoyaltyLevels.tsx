import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLoyalty } from '@/hooks/useLoyalty';
import { Crown, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewLevelForm {
  name: string;
  min_points: number;
  color: string;
  points_multiplier: number;
  benefits: string;
}

const DEFAULT_COLORS = [
  '#CD7F32', // Bronze
  '#C0C0C0', // Silver
  '#FFD700', // Gold
  '#B9F2FF', // Diamond
  '#E6E6FA', // Platinum
];

export function LoyaltyLevels() {
  const { levels, isLoading, createLevel, deleteLevel } = useLoyalty();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLevel, setNewLevel] = useState<NewLevelForm>({
    name: '',
    min_points: 0,
    color: DEFAULT_COLORS[0],
    points_multiplier: 1,
    benefits: '',
  });

  const handleCreate = async () => {
    if (!newLevel.name) {
      toast.error('Digite o nome do nível');
      return;
    }

    try {
      await createLevel.mutateAsync({
        name: newLevel.name,
        min_points: newLevel.min_points,
        color: newLevel.color,
        icon: 'crown',
        points_multiplier: newLevel.points_multiplier,
        benefits: newLevel.benefits.split(',').map(b => b.trim()).filter(Boolean),
        sort_order: levels.length,
      } as any);
      setNewLevel({
        name: '',
        min_points: 0,
        color: DEFAULT_COLORS[0],
        points_multiplier: 1,
        benefits: '',
      });
      setDialogOpen(false);
      toast.success('Nível criado!');
    } catch (error) {
      toast.error('Erro ao criar nível');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLevel.mutateAsync(id);
      toast.success('Nível removido!');
    } catch (error) {
      toast.error('Erro ao remover nível');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Níveis de Fidelidade
          </CardTitle>
          <CardDescription>
            Crie níveis com multiplicadores de pontos e benefícios exclusivos
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Nível
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Nível de Fidelidade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Nível</Label>
                <Input
                  value={newLevel.name}
                  onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })}
                  placeholder="Ex: Diamante"
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Pontos Mínimos</Label>
                  <Input
                    type="number"
                    value={newLevel.min_points}
                    onChange={(e) => setNewLevel({ ...newLevel, min_points: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multiplicador</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newLevel.points_multiplier}
                    onChange={(e) => setNewLevel({ ...newLevel, points_multiplier: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${newLevel.color === color ? 'border-primary' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewLevel({ ...newLevel, color })}
                    />
                  ))}
                  <Input
                    type="color"
                    value={newLevel.color}
                    onChange={(e) => setNewLevel({ ...newLevel, color: e.target.value })}
                    className="w-8 h-8 p-0 border-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Benefícios (separados por vírgula)</Label>
                <Input
                  value={newLevel.benefits}
                  onChange={(e) => setNewLevel({ ...newLevel, benefits: e.target.value })}
                  placeholder="Ex: Frete grátis, 10% desconto, Atendimento VIP"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!newLevel.name || createLevel.isPending}
              >
                {createLevel.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Criar Nível
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {levels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum nível configurado</p>
            <p className="text-sm">Crie níveis para recompensar clientes fiéis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {levels.map((level) => (
              <div
                key={level.id}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ borderColor: level.color + '40', backgroundColor: level.color + '10' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: level.color }}
                  >
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{level.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {level.min_points}+ pts
                      </span>
                      <span>×{level.points_multiplier} multiplicador</span>
                    </div>
                    {level.benefits && level.benefits.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {level.benefits.map((benefit, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: level.color + '30' }}
                          >
                            {benefit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(level.id)}
                  disabled={deleteLevel.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
