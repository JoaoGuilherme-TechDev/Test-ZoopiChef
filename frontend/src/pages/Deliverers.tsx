import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDeliverers, Deliverer } from '@/hooks/useDeliverers';
import { useProfile } from '@/hooks/useProfile';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Phone, Bike, Copy, ExternalLink, Key, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Deliverers() {
  const { deliverers, isLoading, createDeliverer, updateDeliverer, deleteDeliverer } = useDeliverers();
  const { data: profile } = useProfile();
  const { company } = useCompanyContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDeliverer, setEditingDeliverer] = useState<Deliverer | null>(null);
  const [formData, setFormData] = useState({ name: '', whatsapp: '', pin: '' });

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Preencha o nome');
      return;
    }

    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      await createDeliverer.mutateAsync({
        name: formData.name,
        whatsapp: formData.whatsapp || undefined,
        company_id: profile.company_id,
      });
      toast.success('Entregador cadastrado com sucesso');
      setFormData({ name: '', whatsapp: '', pin: '' });
      setIsCreateOpen(false);
    } catch {
      toast.error('Erro ao cadastrar entregador');
    }
  };

  const handleUpdatePin = async (deliverer: Deliverer, newPin: string) => {
    if (newPin && (newPin.length < 4 || newPin.length > 6)) {
      toast.error('O PIN deve ter entre 4 e 6 dígitos');
      return;
    }

    try {
      await updateDeliverer.mutateAsync({
        id: deliverer.id,
        pin: newPin || null,
      });
      toast.success(newPin ? 'PIN definido com sucesso!' : 'PIN removido');
    } catch {
      toast.error('Erro ao atualizar PIN');
    }
  };

  const handleUpdate = async () => {
    if (!editingDeliverer) return;

    try {
      await updateDeliverer.mutateAsync({
        id: editingDeliverer.id,
        name: formData.name,
        whatsapp: formData.whatsapp || null,
        pin: formData.pin || null,
      });
      toast.success('Entregador atualizado com sucesso');
      setEditingDeliverer(null);
      setFormData({ name: '', whatsapp: '', pin: '' });
    } catch {
      toast.error('Erro ao atualizar entregador');
    }
  };

  const handleToggleActive = async (deliverer: Deliverer) => {
    try {
      await updateDeliverer.mutateAsync({
        id: deliverer.id,
        active: !deliverer.active,
      });
      toast.success(deliverer.active ? 'Entregador desativado' : 'Entregador ativado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este entregador?')) return;

    try {
      await deleteDeliverer.mutateAsync(id);
      toast.success('Entregador excluído com sucesso');
    } catch {
      toast.error('Erro ao excluir entregador');
    }
  };

  const openEdit = (deliverer: Deliverer) => {
    setEditingDeliverer(deliverer);
    setFormData({ 
      name: deliverer.name, 
      whatsapp: deliverer.whatsapp || '', 
      pin: deliverer.pin || '' 
    });
  };

  // Generate PWA link for the company
  const entregadorPwaUrl = company?.slug 
    ? `${window.location.origin}/entregador/${company.slug}` 
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Entregadores</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Entregador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Entregador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do entregador"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createDeliverer.isPending}>
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Entregador PWA Card */}
        {entregadorPwaUrl && (
          <Card className="border-green-500/30 bg-gradient-to-br from-green-950/30 to-background">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-500">
                <Smartphone className="h-5 w-5" />
                App do Entregador (PWA)
              </CardTitle>
              <CardDescription>
                Compartilhe este link para seus entregadores acessarem o app. Cada um precisará de um PIN para entrar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded truncate">
                  {entregadorPwaUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(entregadorPwaUrl);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(entregadorPwaUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingDeliverer} onOpenChange={(open) => !open && setEditingDeliverer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Entregador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                <Input
                  id="edit-whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-pin">PIN de Acesso (4-6 dígitos)</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="Ex: 1234"
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                      setFormData({ ...formData, pin: randomPin });
                    }}
                    title="Gerar PIN aleatório"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  O entregador usará este PIN para acessar o app.
                </p>
              </div>
              <Button onClick={handleUpdate} className="w-full" disabled={updateDeliverer.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Deliverers List */}
        {isLoading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : deliverers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum entregador cadastrado
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Link Legado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverers.map((deliverer) => (
                  <TableRow key={deliverer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4 text-muted-foreground" />
                        {deliverer.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {deliverer.whatsapp ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {deliverer.whatsapp}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {deliverer.pin ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <Key className="h-3 w-3 mr-1" />
                          {deliverer.pin}
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => openEdit(deliverer)}
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Definir PIN
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {deliverer.access_token && (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate opacity-50" title={`${window.location.origin}/deliverer/${deliverer.access_token}`}>
                            /deliverer/...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 opacity-50"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/deliverer/${deliverer.access_token}`);
                              toast.success('Link legado copiado!');
                            }}
                            title="Link legado (sem PIN)"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={deliverer.active}
                          onCheckedChange={() => handleToggleActive(deliverer)}
                        />
                        <Badge variant={deliverer.active ? 'default' : 'secondary'}>
                          {deliverer.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(deliverer.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(deliverer)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(deliverer.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
