import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, Loader2, ShieldAlert, Database } from 'lucide-react';

interface CompanyResetActionsProps {
  companyId: string;
  companyName: string;
}

export function CompanyResetActions({ companyId, companyName }: CompanyResetActionsProps) {
  const [salesDialog, setSalesDialog] = useState(false);
  const [allDataDialog, setAllDataDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async (resetType: 'sales' | 'all_data') => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-company-reset', {
        body: { companyId, resetType },
      });

      if (error) throw error;

      toast.success(data.message || 'Reset concluído com sucesso!');
      setSalesDialog(false);
      setAllDataDialog(false);
      setConfirmText('');
    } catch (error: any) {
      toast.error('Erro ao executar reset: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900/50 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Ações Destrutivas
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ações irreversíveis para reset de dados da empresa. Apenas Super Admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-white">Excluir Todas as Vendas</p>
                <p className="text-xs text-slate-500">
                  Remove pedidos, pagamentos, caixa, histórico. Mantém estrutura intacta.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setSalesDialog(true)}
            >
              Executar
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-white">Excluir Todos os Dados</p>
                <p className="text-xs text-slate-500">
                  Remove produtos, categorias, usuários, mesas, configurações. Mantém apenas o registro da empresa.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setAllDataDialog(true)}
            >
              Executar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Sales Dialog */}
      <Dialog open={salesDialog} onOpenChange={setSalesDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Excluir Todas as Vendas
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta ação é IRREVERSÍVEL. Todos os dados de vendas serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-300 text-sm">
                <strong>Dados que serão excluídos:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Todos os pedidos e itens de pedido</li>
                  <li>Comandas e pagamentos</li>
                  <li>Sessões de caixa e transações</li>
                  <li>Pontos de fidelidade dos clientes</li>
                  <li>Avaliações e notificações</li>
                  <li>Relatórios e histórico</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Digite <strong className="text-white">EXCLUIR VENDAS</strong> para confirmar:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR VENDAS"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setSalesDialog(false); setConfirmText(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleReset('sales')}
              disabled={confirmText !== 'EXCLUIR VENDAS' || isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Data Dialog */}
      <Dialog open={allDataDialog} onOpenChange={setAllDataDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Excluir TODOS os Dados
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta ação é IRREVERSÍVEL. Todos os dados da empresa serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-300 text-sm">
                <strong>Dados que serão excluídos:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Todos os produtos, categorias e subcategorias</li>
                  <li>Todos os clientes e preferências</li>
                  <li>Mesas, comandas e sessões</li>
                  <li>Usuários e permissões</li>
                  <li>Todas as configurações e integrações</li>
                  <li>Todo o histórico de vendas e relatórios</li>
                </ul>
                <p className="mt-2 font-medium">O registro da empresa será mantido.</p>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Digite <strong className="text-white">EXCLUIR TUDO</strong> para confirmar:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR TUDO"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAllDataDialog(false); setConfirmText(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleReset('all_data')}
              disabled={confirmText !== 'EXCLUIR TUDO' || isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão Total
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
