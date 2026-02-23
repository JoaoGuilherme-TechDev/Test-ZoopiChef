import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLoyalty } from '@/hooks/useLoyalty';
import { Gift, Plus, Trash2, Star, Loader2, Award } from 'lucide-react';
import { toast } from 'sonner';

interface NewRewardForm {
  name: string;
  description: string;
  points_cost: number;
  reward_type: string;
  reward_value: number;
}

const REWARD_TYPES = [
  { value: 'discount_percent', label: 'Desconto (%)' },
  { value: 'discount_fixed', label: 'Desconto (R$)' },
  { value: 'free_item', label: 'Item Grátis' },
  { value: 'free_delivery', label: 'Entrega Grátis' },
  { value: 'cashback', label: 'Cashback' },
];

export function LoyaltyRewards() {
  const { rewards, isLoading, createReward, deleteReward } = useLoyalty();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newReward, setNewReward] = useState<NewRewardForm>({
    name: '',
    description: '',
    points_cost: 100,
    reward_type: 'discount_percent',
    reward_value: 10,
  });

  const handleCreate = async () => {
    if (!newReward.name) {
      toast.error('Digite o nome da recompensa');
      return;
    }

    try {
      await createReward.mutateAsync({
        name: newReward.name,
        description: newReward.description || null,
        points_cost: newReward.points_cost,
        reward_type: newReward.reward_type,
        reward_value: newReward.reward_value,
        active: true,
      } as any);
      setNewReward({
        name: '',
        description: '',
        points_cost: 100,
        reward_type: 'discount_percent',
        reward_value: 10,
      });
      setDialogOpen(false);
      toast.success('Recompensa criada!');
    } catch (error) {
      toast.error('Erro ao criar recompensa');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReward.mutateAsync(id);
      toast.success('Recompensa removida!');
    } catch (error) {
      toast.error('Erro ao remover recompensa');
    }
  };

  const getRewardTypeLabel = (type: string) => {
    return REWARD_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatRewardValue = (type: string, value: number | null) => {
    if (value === null) return '';
    switch (type) {
      case 'discount_percent':
        return `${value}% de desconto`;
      case 'discount_fixed':
        return `R$ ${value.toFixed(2)} de desconto`;
      case 'cashback':
        return `R$ ${value.toFixed(2)} cashback`;
      case 'free_item':
        return 'Item grátis';
      case 'free_delivery':
        return 'Entrega grátis';
      default:
        return value.toString();
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
            <Gift className="w-5 h-5" />
            Recompensas
          </CardTitle>
          <CardDescription>
            Prêmios que os clientes podem resgatar com pontos
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Recompensa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Recompensa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newReward.name}
                  onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                  placeholder="Ex: 10% de Desconto"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={newReward.description}
                  onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                  placeholder="Descrição da recompensa"
                />
              </div>

              <div className="space-y-2">
                <Label>Custo em Pontos</Label>
                <Input
                  type="number"
                  value={newReward.points_cost}
                  onChange={(e) => setNewReward({ ...newReward, points_cost: parseInt(e.target.value) })}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Recompensa</Label>
                  <Select
                    value={newReward.reward_type}
                    onValueChange={(value) => setNewReward({ ...newReward, reward_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newReward.reward_value}
                    onChange={(e) => setNewReward({ ...newReward, reward_value: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!newReward.name || createReward.isPending}
              >
                {createReward.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Criar Recompensa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {rewards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma recompensa cadastrada</p>
            <p className="text-sm">Crie prêmios para motivar seus clientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{reward.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatRewardValue(reward.reward_type, reward.reward_value)}
                      </span>
                      {reward.description && (
                        <span className="text-sm text-muted-foreground">
                          • {reward.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    <Star className="w-3 h-3 mr-1" />
                    {reward.points_cost} pts
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(reward.id)}
                    disabled={deleteReward.isPending}
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
