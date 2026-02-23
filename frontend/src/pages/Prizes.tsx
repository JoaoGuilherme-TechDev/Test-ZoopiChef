import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePrizes, Prize } from '@/hooks/usePrizes';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Gift, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#E74C3C',
];

export default function Prizes() {
  const { prizes, wins, createPrize, updatePrize, deletePrize, redeemWin, isLoading } = usePrizes();
  const { data: company } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [copied, setCopied] = useState(false);
  
const [form, setForm] = useState({
    name: '',
    description: '',
    probability: 10,
    color: COLORS[0],
    active: true,
    prize_type: 'percentage' as 'percentage' | 'fixed_value' | 'free_item',
    prize_value: 10,
  });

  const prizeWheelUrl = company?.slug 
    ? `${window.location.origin}/roleta/${company.slug}` 
    : '';

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(prizeWheelUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openDialog = (prize?: Prize) => {
    if (prize) {
      setEditingPrize(prize);
      setForm({
        name: prize.name,
        description: prize.description || '',
        probability: Number(prize.probability),
        color: prize.color,
        active: prize.active,
        prize_type: (prize as any).prize_type || 'percentage',
        prize_value: (prize as any).prize_value || 10,
      });
    } else {
      setEditingPrize(null);
      setForm({
        name: '',
        description: '',
        probability: 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        active: true,
        prize_type: 'percentage',
        prize_value: 10,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingPrize) {
        await updatePrize.mutateAsync({
          id: editingPrize.id,
          name: form.name,
          description: form.description || null,
          probability: form.probability,
          color: form.color,
          active: form.active,
          prize_type: form.prize_type,
          prize_value: form.prize_value,
        } as any);
        toast.success('Prêmio atualizado!');
      } else {
        await createPrize.mutateAsync({
          name: form.name,
          description: form.description || null,
          probability: form.probability,
          color: form.color,
          active: form.active,
          prize_type: form.prize_type,
          prize_value: form.prize_value,
        } as any);
        toast.success('Prêmio criado!');
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar prêmio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este prêmio?')) return;
    try {
      await deletePrize.mutateAsync(id);
      toast.success('Prêmio excluído!');
    } catch {
      toast.error('Erro ao excluir prêmio');
    }
  };

  const handleRedeem = async (winId: string) => {
    try {
      await redeemWin.mutateAsync(winId);
      toast.success('Prêmio resgatado!');
    } catch {
      toast.error('Erro ao resgatar prêmio');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Roleta de Prêmios</h1>
            <p className="text-muted-foreground">Gerencie os prêmios da roleta</p>
          </div>
          <div className="flex gap-2">
            {prizeWheelUrl && (
              <Button variant="outline" onClick={handleCopyUrl}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copiar Link
              </Button>
            )}
            {prizeWheelUrl && (
              <Button variant="outline" asChild>
                <a href={prizeWheelUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Roleta
                </a>
              </Button>
            )}
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Prêmio
            </Button>
          </div>
        </div>

        {/* Prizes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Prêmios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Probabilidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizes.map((prize) => {
                  const prizeType = (prize as any).prize_type || 'percentage';
                  const prizeValue = (prize as any).prize_value || 10;
                  const typeLabel = prizeType === 'percentage' ? '% desconto' : 
                                    prizeType === 'fixed_value' ? 'R$ fixo' : 'Item grátis';
                  const valueLabel = prizeType === 'percentage' ? `${prizeValue}%` : 
                                     prizeType === 'fixed_value' ? `R$ ${prizeValue}` : `${prizeValue}x`;
                  
                  return (
                    <TableRow key={prize.id}>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: prize.color }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{prize.name}</p>
                          {prize.description && (
                            <p className="text-sm text-muted-foreground">{prize.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{valueLabel}</span>
                      </TableCell>
                      <TableCell>{prize.probability}%</TableCell>
                      <TableCell>
                        <Badge variant={prize.active ? 'default' : 'secondary'}>
                          {prize.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(prize)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(prize.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {prizes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum prêmio cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Wins */}
        <Card>
          <CardHeader>
            <CardTitle>Prêmios Ganhos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wins.map((win) => (
                  <TableRow key={win.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{win.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{win.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{win.prize?.name}</TableCell>
                    <TableCell>
                      {format(new Date(win.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={win.redeemed ? 'secondary' : 'default'}>
                        {win.redeemed ? 'Resgatado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!win.redeemed && (
                        <Button size="sm" onClick={() => handleRedeem(win.id)}>
                          Resgatar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {wins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum prêmio ganho ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Prize Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrize ? 'Editar Prêmio' : 'Novo Prêmio'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: 10% de desconto"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição do prêmio..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Probabilidade (%)</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-2">Tipo de Prêmio</label>
                <select
                  value={form.prize_type}
                  onChange={(e) => setForm({ ...form, prize_type: e.target.value as any })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">% de desconto</option>
                  <option value="fixed_value">Valor fixo (R$)</option>
                  <option value="free_item">Item grátis</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">
                  {form.prize_type === 'percentage' ? 'Porcentagem (%)' : 
                   form.prize_type === 'fixed_value' ? 'Valor (R$)' : 'Quantidade'}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={form.prize_type === 'percentage' ? 100 : 9999}
                  value={form.prize_value}
                  onChange={(e) => setForm({ ...form, prize_value: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      form.color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ativo</label>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingPrize ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
