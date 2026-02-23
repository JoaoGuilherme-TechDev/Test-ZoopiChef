import { useState } from 'react';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { useSubscriptions, useSaasCompanies, usePlans, useCreateSubscription, useUpdateSubscription } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SaasSubscriptions() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: companies = [] } = useSaasCompanies();
  const { data: plans = [] } = usePlans();
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<typeof subscriptions[0] | null>(null);
  const [newSub, setNewSub] = useState({ company_id: '', plan_id: '', status: 'trial' });

  const companiesWithoutSub = companies.filter(
    (c) => !subscriptions.some((s) => s.company_id === c.id)
  );

  const handleCreate = () => {
    createSubscription.mutate(newSub, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewSub({ company_id: '', plan_id: '', status: 'trial' });
      },
    });
  };

  const handleUpdate = (status: string) => {
    if (selectedSubscription) {
      updateSubscription.mutate(
        { id: selectedSubscription.id, status },
        { onSuccess: () => setEditDialogOpen(false) }
      );
    }
  };

  const statusColors: Record<string, string> = {
    active: 'border-emerald-500/50 text-emerald-400',
    trial: 'border-blue-500/50 text-blue-400',
    past_due: 'border-amber-500/50 text-amber-400',
    canceled: 'border-red-500/50 text-red-400',
  };

  return (
    <SaasLayout title="Assinaturas">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Assinaturas</CardTitle>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={companiesWithoutSub.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Assinatura
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Empresa</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Plano</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Provider</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Próximo Pagamento</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-white">{sub.company?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-400">{sub.plan?.name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={statusColors[sub.status] || ''}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{sub.provider || '-'}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {sub.current_period_end
                          ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedSubscription(sub);
                            setEditDialogOpen(true);
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {subscriptions.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhuma assinatura</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Empresa</Label>
              <Select
                value={newSub.company_id}
                onValueChange={(v) => setNewSub({ ...newSub, company_id: v })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {companiesWithoutSub.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-white">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Plano</Label>
              <Select
                value={newSub.plan_id}
                onValueChange={(v) => setNewSub({ ...newSub, plan_id: v })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {plans.filter(p => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name} - R$ {(p.price_cents / 100).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Status Inicial</Label>
              <Select
                value={newSub.status}
                onValueChange={(v) => setNewSub({ ...newSub, status: v })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="trial" className="text-white">Trial</SelectItem>
                  <SelectItem value="active" className="text-white">Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createSubscription.isPending || !newSub.company_id || !newSub.plan_id}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createSubscription.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 mb-4">
              Empresa: <strong className="text-white">{selectedSubscription?.company?.name}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['trial', 'active', 'past_due', 'canceled'].map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  onClick={() => handleUpdate(status)}
                  disabled={updateSubscription.isPending}
                  className={`border-slate-700 ${
                    selectedSubscription?.status === status
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-slate-400">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
