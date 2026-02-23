import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Clock, 
  Users, 
  MessageSquare, 
  Bell, 
  Calendar,
  CalendarOff,
  Plus,
  Trash2,
  Loader2,
  Save,
  LayoutGrid,
  Shield,
  CreditCard
} from 'lucide-react';
import { FloorPlanEditor } from '@/components/floor-plan/FloorPlanEditor';
import { useReservationSettings, useReservationBlocks } from '@/hooks/useReservations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SettingsReservations() {
  const { settings, isLoading, upsertSettings } = useReservationSettings();
  const { blocks, addBlock, removeBlock } = useReservationBlocks();

  const [formData, setFormData] = useState({
    enabled: true,
    min_advance_hours: 2,
    max_advance_days: 30,
    default_duration_minutes: 120,
    opening_time: '11:00',
    closing_time: '23:00',
    slot_interval_minutes: 30,
    max_party_size: 20,
    min_party_size: 1,
    auto_confirm: false,
    require_confirmation: true,
    confirmation_deadline_hours: 24,
    send_whatsapp_confirmation: true,
    send_whatsapp_reminder: true,
    reminder_hours_before: 3,
    confirmation_message_template: '',
    reminder_message_template: '',
    // New fields
    require_phone_verification: false,
    require_advance_payment: false,
    advance_payment_amount_cents: 0,
    payment_provider: '',
    require_cpf: true,
    require_email: true,
    show_floor_plan_to_customers: false,
  });

  const [newBlock, setNewBlock] = useState({
    block_date: '',
    start_time: '',
    end_time: '',
    all_day: true,
    reason: '',
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setFormData({
        enabled: settings.enabled,
        min_advance_hours: settings.min_advance_hours,
        max_advance_days: settings.max_advance_days,
        default_duration_minutes: settings.default_duration_minutes,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        slot_interval_minutes: settings.slot_interval_minutes,
        max_party_size: settings.max_party_size,
        min_party_size: settings.min_party_size,
        auto_confirm: settings.auto_confirm,
        require_confirmation: settings.require_confirmation,
        confirmation_deadline_hours: settings.confirmation_deadline_hours,
        send_whatsapp_confirmation: settings.send_whatsapp_confirmation,
        send_whatsapp_reminder: settings.send_whatsapp_reminder,
        reminder_hours_before: settings.reminder_hours_before,
        confirmation_message_template: settings.confirmation_message_template,
        reminder_message_template: settings.reminder_message_template,
        require_phone_verification: (settings as any).require_phone_verification ?? false,
        require_advance_payment: (settings as any).require_advance_payment ?? false,
        advance_payment_amount_cents: (settings as any).advance_payment_amount_cents ?? 0,
        payment_provider: (settings as any).payment_provider ?? '',
        require_cpf: (settings as any).require_cpf ?? true,
        require_email: (settings as any).require_email ?? true,
        show_floor_plan_to_customers: (settings as any).show_floor_plan_to_customers ?? false,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await upsertSettings.mutateAsync(formData);
  };

  const handleAddBlock = async () => {
    if (!newBlock.block_date) {
      toast.error('Selecione uma data');
      return;
    }

    await addBlock.mutateAsync({
      block_date: newBlock.block_date,
      start_time: newBlock.all_day ? null : newBlock.start_time || null,
      end_time: newBlock.all_day ? null : newBlock.end_time || null,
      all_day: newBlock.all_day,
      reason: newBlock.reason || null,
    });

    setNewBlock({
      block_date: '',
      start_time: '',
      end_time: '',
      all_day: true,
      reason: '',
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Reservas">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Reservas">
      <div className="space-y-6">
        {/* Header with Enable Toggle */}
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${formData.enabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                {formData.enabled ? (
                  <Calendar className="h-6 w-6 text-green-500" />
                ) : (
                  <CalendarOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">Módulo de Reservas</h2>
                <p className="text-sm text-muted-foreground">
                  {formData.enabled 
                    ? 'As reservas estão ativas. Clientes podem reservar mesas.'
                    : 'As reservas estão desativadas.'}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </CardContent>
        </Card>

        {formData.enabled && (
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">
                <Settings className="h-4 w-4 mr-2" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Clock className="h-4 w-4 mr-2" />
                Horários
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="blocks">
                <CalendarOff className="h-4 w-4 mr-2" />
                Bloqueios
              </TabsTrigger>
              <TabsTrigger value="layout">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Layout do Salão
              </TabsTrigger>
              <TabsTrigger value="verification">
                <Shield className="h-4 w-4 mr-2" />
                Verificação
              </TabsTrigger>
              <TabsTrigger value="payment">
                <CreditCard className="h-4 w-4 mr-2" />
                Pagamento
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Defina as regras básicas para reservas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Antecedência Mínima (horas)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.min_advance_hours}
                        onChange={(e) => setFormData({ ...formData, min_advance_hours: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo de horas antes para fazer reserva
                      </p>
                    </div>

                    <div>
                      <Label>Antecedência Máxima (dias)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.max_advance_days}
                        onChange={(e) => setFormData({ ...formData, max_advance_days: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo de dias para reservar com antecedência
                      </p>
                    </div>

                    <div>
                      <Label>Duração Padrão (minutos)</Label>
                      <Select
                        value={formData.default_duration_minutes.toString()}
                        onValueChange={(v) => setFormData({ ...formData, default_duration_minutes: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="90">1h 30min</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                          <SelectItem value="150">2h 30min</SelectItem>
                          <SelectItem value="180">3 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Intervalo entre Horários (minutos)</Label>
                      <Select
                        value={formData.slot_interval_minutes.toString()}
                        onValueChange={(v) => setFormData({ ...formData, slot_interval_minutes: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Mínimo de Pessoas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.min_party_size}
                        onChange={(e) => setFormData({ ...formData, min_party_size: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div>
                      <Label>Máximo de Pessoas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.max_party_size}
                        onChange={(e) => setFormData({ ...formData, max_party_size: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Confirmação Automática</Label>
                        <p className="text-xs text-muted-foreground">
                          Confirmar reservas automaticamente sem aprovação manual
                        </p>
                      </div>
                      <Switch
                        checked={formData.auto_confirm}
                        onCheckedChange={(checked) => setFormData({ ...formData, auto_confirm: checked })}
                      />
                    </div>

                    {!formData.auto_confirm && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Exigir Confirmação do Cliente</Label>
                          <p className="text-xs text-muted-foreground">
                            Cliente precisa confirmar a reserva antes da data
                          </p>
                        </div>
                        <Switch
                          checked={formData.require_confirmation}
                          onCheckedChange={(checked) => setFormData({ ...formData, require_confirmation: checked })}
                        />
                      </div>
                    )}

                    {formData.require_confirmation && !formData.auto_confirm && (
                      <div>
                        <Label>Prazo para Confirmação (horas antes)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={formData.confirmation_deadline_hours}
                          onChange={(e) => setFormData({ ...formData, confirmation_deadline_hours: parseInt(e.target.value) || 24 })}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Settings */}
            <TabsContent value="schedule" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Horários de Funcionamento</CardTitle>
                  <CardDescription>
                    Defina os horários disponíveis para reservas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Horário de Abertura</Label>
                      <Input
                        type="time"
                        value={formData.opening_time}
                        onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Horário de Fechamento</Label>
                      <Input
                        type="time"
                        value={formData.closing_time}
                        onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Os horários disponíveis para reserva serão gerados automaticamente 
                    a cada {formData.slot_interval_minutes} minutos dentro deste período.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notificações WhatsApp</CardTitle>
                  <CardDescription>
                    Configure as mensagens automáticas enviadas aos clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enviar Confirmação via WhatsApp</Label>
                        <p className="text-xs text-muted-foreground">
                          Enviar mensagem quando a reserva for confirmada
                        </p>
                      </div>
                      <Switch
                        checked={formData.send_whatsapp_confirmation}
                        onCheckedChange={(checked) => setFormData({ ...formData, send_whatsapp_confirmation: checked })}
                      />
                    </div>

                    {formData.send_whatsapp_confirmation && (
                      <div>
                        <Label>Mensagem de Confirmação</Label>
                        <Textarea
                          value={formData.confirmation_message_template}
                          onChange={(e) => setFormData({ ...formData, confirmation_message_template: e.target.value })}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Variáveis: {'{name}'}, {'{date}'}, {'{time}'}, {'{party_size}'}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enviar Lembrete via WhatsApp</Label>
                        <p className="text-xs text-muted-foreground">
                          Enviar lembrete antes da reserva
                        </p>
                      </div>
                      <Switch
                        checked={formData.send_whatsapp_reminder}
                        onCheckedChange={(checked) => setFormData({ ...formData, send_whatsapp_reminder: checked })}
                      />
                    </div>

                    {formData.send_whatsapp_reminder && (
                      <>
                        <div>
                          <Label>Horas Antes para Lembrete</Label>
                          <Input
                            type="number"
                            min={1}
                            value={formData.reminder_hours_before}
                            onChange={(e) => setFormData({ ...formData, reminder_hours_before: parseInt(e.target.value) || 3 })}
                          />
                        </div>

                        <div>
                          <Label>Mensagem de Lembrete</Label>
                          <Textarea
                            value={formData.reminder_message_template}
                            onChange={(e) => setFormData({ ...formData, reminder_message_template: e.target.value })}
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Variáveis: {'{name}'}, {'{date}'}, {'{time}'}, {'{party_size}'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Blocks */}
            <TabsContent value="blocks" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bloqueios de Horários</CardTitle>
                  <CardDescription>
                    Bloqueie datas ou horários específicos (feriados, eventos, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Block Form */}
                  <div className="grid md:grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={newBlock.block_date}
                        onChange={(e) => setNewBlock({ ...newBlock, block_date: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={newBlock.all_day}
                        onCheckedChange={(checked) => setNewBlock({ ...newBlock, all_day: checked })}
                      />
                      <Label>Dia inteiro</Label>
                    </div>

                    {!newBlock.all_day && (
                      <>
                        <div>
                          <Label>Início</Label>
                          <Input
                            type="time"
                            value={newBlock.start_time}
                            onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Fim</Label>
                          <Input
                            type="time"
                            value={newBlock.end_time}
                            onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <div className={newBlock.all_day ? 'md:col-span-2' : ''}>
                      <Label>Motivo</Label>
                      <Input
                        value={newBlock.reason}
                        onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                        placeholder="Ex: Feriado, Evento privado..."
                      />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={handleAddBlock} disabled={addBlock.isPending}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Existing Blocks */}
                  <div className="space-y-2">
                    {blocks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum bloqueio cadastrado
                      </p>
                    ) : (
                      blocks.map((block) => (
                        <div 
                          key={block.id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">
                              {format(new Date(block.block_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </Badge>
                            {block.all_day ? (
                              <span className="text-sm">Dia inteiro</span>
                            ) : (
                              <span className="text-sm">
                                {block.start_time?.slice(0, 5)} - {block.end_time?.slice(0, 5)}
                              </span>
                            )}
                            {block.reason && (
                              <span className="text-sm text-muted-foreground">
                                {block.reason}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBlock.mutate(block.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Layout Settings */}
            <TabsContent value="layout" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Layout do Salão</CardTitle>
                  <CardDescription>
                    Configure a planta do salão e posição das mesas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label>Exibir Layout para Clientes</Label>
                      <p className="text-xs text-muted-foreground">
                        Permitir que clientes vejam e escolham a mesa no mapa durante a reserva
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_floor_plan_to_customers}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_floor_plan_to_customers: checked })}
                    />
                  </div>

                  <Separator />

                  <FloorPlanEditor />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Verificação de Telefone</CardTitle>
                  <CardDescription>
                    Configure a verificação de telefone para evitar reservas falsas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exigir Verificação de Telefone</Label>
                      <p className="text-xs text-muted-foreground">
                        O cliente precisará confirmar o número via código SMS
                      </p>
                    </div>
                    <Switch
                      checked={formData.require_phone_verification}
                      onCheckedChange={(checked) => setFormData({ ...formData, require_phone_verification: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exigir CPF</Label>
                      <p className="text-xs text-muted-foreground">
                        O cliente deve informar o CPF
                      </p>
                    </div>
                    <Switch
                      checked={formData.require_cpf}
                      onCheckedChange={(checked) => setFormData({ ...formData, require_cpf: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exigir E-mail</Label>
                      <p className="text-xs text-muted-foreground">
                        O cliente deve informar o e-mail
                      </p>
                    </div>
                    <Switch
                      checked={formData.require_email}
                      onCheckedChange={(checked) => setFormData({ ...formData, require_email: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings */}
            <TabsContent value="payment" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pagamento Antecipado</CardTitle>
                  <CardDescription>
                    Configure se deseja cobrar um valor antecipado para confirmar a reserva
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Cobrar Pagamento Antecipado</Label>
                      <p className="text-xs text-muted-foreground">
                        O cliente precisará pagar um valor para confirmar a reserva
                      </p>
                    </div>
                    <Switch
                      checked={formData.require_advance_payment}
                      onCheckedChange={(checked) => setFormData({ ...formData, require_advance_payment: checked })}
                    />
                  </div>

                  {formData.require_advance_payment && (
                    <>
                      <div>
                        <Label>Valor do Pagamento (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={(formData.advance_payment_amount_cents / 100).toFixed(2)}
                          onChange={(e) => setFormData({ ...formData, advance_payment_amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                        />
                      </div>

                      <div>
                        <Label>Provedor de Pagamento</Label>
                        <Select
                          value={formData.payment_provider}
                          onValueChange={(v) => setFormData({ ...formData, payment_provider: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o provedor" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="mercadopago">Mercado Pago (PIX)</SelectItem>
                            <SelectItem value="asaas">ASAAS</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure as credenciais do provedor nas configurações de integração
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={upsertSettings.isPending}>
            {upsertSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
