import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  useCRMAutomations, 
  useCreateCRMAutomation, 
  useUpdateCRMAutomation, 
  useDeleteCRMAutomation,
  AUTOMATION_TRIGGERS,
  AUTOMATION_ACTIONS,
  CRMAutomation
} from '@/hooks/useCRMAdvanced';
import { ArrowLeft, Plus, Zap, Play, Pause, Trash2, Edit, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FormData {
  name: string;
  description: string;
  trigger_type: 'lead_created' | 'lead_status_changed' | 'customer_inactive' | 'birthday' | 'order_completed' | 'review_received' | 'manual';
  action_type: 'send_whatsapp' | 'send_email' | 'create_task' | 'update_lead_status' | 'assign_to_user' | 'add_tag' | 'webhook';
  action_config: Record<string, unknown>;
  is_active: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  trigger_type: 'lead_created',
  action_type: 'send_whatsapp',
  action_config: {},
  is_active: true,
};

export function CRMAutomationsPage() {
  const { data: automations, isLoading } = useCRMAutomations();
  const createAutomation = useCreateCRMAutomation();
  const updateAutomation = useUpdateCRMAutomation();
  const deleteAutomation = useDeleteCRMAutomation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleEdit = (automation: CRMAutomation) => {
    setEditingId(automation.id);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      trigger_type: automation.trigger_type,
      action_type: automation.action_type,
      action_config: automation.action_config,
      is_active: automation.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;
    
    if (editingId) {
      await updateAutomation.mutateAsync({ id: editingId, ...formData });
    } else {
      await createAutomation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleToggleActive = async (automation: CRMAutomation) => {
    await updateAutomation.mutateAsync({ id: automation.id, is_active: !automation.is_active });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta automação?')) {
      await deleteAutomation.mutateAsync(id);
    }
  };

  const getTriggerInfo = (type: string) => AUTOMATION_TRIGGERS.find(t => t.value === type);
  const getActionInfo = (type: string) => AUTOMATION_ACTIONS.find(a => a.value === type);

  if (isLoading) {
    return (
      <DashboardLayout title="CRM - Automações">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM - Automações">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/crm">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Automações de CRM</h1>
              <p className="text-muted-foreground">Configure fluxos automáticos para seus leads e clientes</p>
            </div>
          </div>
          <Button onClick={() => { setEditingId(null); setFormData(initialFormData); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Automação
          </Button>
        </div>

        {/* Automations List */}
        {automations && automations.length > 0 ? (
          <div className="grid gap-4">
            {automations.map((automation) => {
              const trigger = getTriggerInfo(automation.trigger_type);
              const action = getActionInfo(automation.action_type);
              
              return (
                <Card key={automation.id} className={`transition-all ${automation.is_active ? 'border-green-500/30' : 'opacity-60'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${automation.is_active ? 'bg-green-500/20' : 'bg-muted'}`}>
                          <Zap className={`w-6 h-6 ${automation.is_active ? 'text-green-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{automation.name}</h3>
                            {automation.is_active ? (
                              <Badge className="bg-green-500/20 text-green-400 border-0">Ativo</Badge>
                            ) : (
                              <Badge variant="outline">Inativo</Badge>
                            )}
                          </div>
                          {automation.description && (
                            <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Badge variant="outline" className="gap-1">
                              {trigger?.icon} {trigger?.label}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="outline" className="gap-1">
                              {action?.icon} {action?.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Executada {automation.run_count}x</div>
                          {automation.last_run_at && (
                            <div>Última: {format(new Date(automation.last_run_at), "dd/MM HH:mm", { locale: ptBR })}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleToggleActive(automation)}>
                            {automation.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(automation)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-400" onClick={() => handleDelete(automation.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Nenhuma automação configurada</h3>
              <p className="text-muted-foreground mb-4">Crie automações para engajar seus leads automaticamente</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Automação
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Templates de Automação</CardTitle>
            <CardDescription>Modelos prontos para você começar rapidamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => {
                setFormData({
                  name: 'Boas-vindas Novo Lead',
                  description: 'Envia mensagem de boas-vindas quando um novo lead é captado',
                  trigger_type: 'lead_created',
                  action_type: 'send_whatsapp',
                  action_config: { message: 'Olá! Obrigado pelo interesse. Como posso ajudar?' },
                  is_active: true,
                });
                setIsDialogOpen(true);
              }}>
                <CardContent className="pt-6">
                  <div className="text-2xl mb-2">👋</div>
                  <h4 className="font-medium">Boas-vindas</h4>
                  <p className="text-sm text-muted-foreground">Mensagem automática para novos leads</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => {
                setFormData({
                  name: 'Reativação de Cliente',
                  description: 'Envia oferta especial para clientes inativos há 30 dias',
                  trigger_type: 'customer_inactive',
                  action_type: 'send_whatsapp',
                  action_config: { message: 'Sentimos sua falta! Aqui está um cupom especial para você.', days_inactive: 30 },
                  is_active: true,
                });
                setIsDialogOpen(true);
              }}>
                <CardContent className="pt-6">
                  <div className="text-2xl mb-2">🔄</div>
                  <h4 className="font-medium">Reativação</h4>
                  <p className="text-sm text-muted-foreground">Recuperar clientes inativos</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => {
                setFormData({
                  name: 'Parabéns Aniversário',
                  description: 'Envia mensagem de aniversário com cupom especial',
                  trigger_type: 'birthday',
                  action_type: 'send_whatsapp',
                  action_config: { message: 'Feliz aniversário! 🎂 Presente especial para você!' },
                  is_active: true,
                });
                setIsDialogOpen(true);
              }}>
                <CardContent className="pt-6">
                  <div className="text-2xl mb-2">🎂</div>
                  <h4 className="font-medium">Aniversário</h4>
                  <p className="text-sm text-muted-foreground">Parabenizar e presentear</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nova'} Automação</DialogTitle>
              <DialogDescription>Configure o gatilho e a ação da automação</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Automação</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Boas-vindas novo lead" />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descreva o objetivo desta automação" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quando (Gatilho)</Label>
                  <Select value={formData.trigger_type} onValueChange={(v: FormData['trigger_type']) => setFormData({ ...formData, trigger_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_TRIGGERS.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fazer (Ação)</Label>
                  <Select value={formData.action_type} onValueChange={(v: FormData['action_type']) => setFormData({ ...formData, action_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_ACTIONS.map(a => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.icon} {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.action_type === 'send_whatsapp' && (
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea 
                    value={formData.action_config.message as string || ''} 
                    onChange={(e) => setFormData({ ...formData, action_config: { ...formData.action_config, message: e.target.value } })} 
                    placeholder="Mensagem a ser enviada..." 
                    rows={3} 
                  />
                  <p className="text-xs text-muted-foreground">Use {"{{nome}}"} para inserir o nome do cliente</p>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Ativar Automação</p>
                  <p className="text-sm text-muted-foreground">Começar a executar automaticamente</p>
                </div>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!formData.name || createAutomation.isPending || updateAutomation.isPending}>
                {(createAutomation.isPending || updateAutomation.isPending) ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
