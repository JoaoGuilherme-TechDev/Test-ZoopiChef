import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCompanyTableSettings, CompanyTableSettings } from '@/hooks/useCompanyTableSettings';
import { GeoSecuritySettings } from '@/components/geo/GeoSecuritySettings';
import { Loader2, Save, MapPin, Clock, Users, Smartphone, Cloud, Mail, Eye, EyeOff } from 'lucide-react';

export default function SettingsTable() {
  const { data: settings, isLoading, upsert, isPending } = useCompanyTableSettings();
  const [formData, setFormData] = useState<Partial<CompanyTableSettings>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert(formData);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Mesa">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Mesa">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações de Mesa</h1>
            <p className="text-muted-foreground">Gerencie as configurações do módulo de mesas</p>
          </div>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Tempo e Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tempo e Atendimento
              </CardTitle>
              <CardDescription>Configure tempos e regras de atendimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="no_consumption_minutes">Tempo para mesa sem consumo (min)</Label>
                <Input
                  id="no_consumption_minutes"
                  type="number"
                  min={1}
                  value={formData.no_consumption_minutes || 30}
                  onChange={(e) => setFormData({ ...formData, no_consumption_minutes: parseInt(e.target.value) || 30 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Solicitar número da mesa</Label>
                  <p className="text-sm text-muted-foreground">
                    Define se deve solicitar o número da mesa ao finalizar uma comanda
                  </p>
                </div>
                <Switch
                  checked={formData.request_table_number || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, request_table_number: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pessoas e Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pessoas e Identificação
              </CardTitle>
              <CardDescription>Configure identificação de clientes e contagem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Solicitar número de pessoas na mesa</Label>
                <Select
                  value={formData.request_people_count || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, request_people_count: value as 'none' | 'on_open' | 'on_close' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não solicitar</SelectItem>
                    <SelectItem value="on_open">Solicitar na abertura</SelectItem>
                    <SelectItem value="on_close">Solicitar no fechamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Identificar cliente na mesa/comanda</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir identificação do cliente ao abrir mesa/comanda
                  </p>
                </div>
                <Switch
                  checked={formData.require_customer_identification || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_customer_identification: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Celular/Tablet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Celular/Tablet
              </CardTitle>
              <CardDescription>Configurações para dispositivos móveis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir exclusão de itens já impressos</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite cancelar itens impressos no módulo de atendimento do garçom
                  </p>
                </div>
                <Switch
                  checked={formData.allow_mobile_delete_printed_items || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_mobile_delete_printed_items: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Caixa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Caixa
              </CardTitle>
              <CardDescription>Configure o comportamento do fechamento de caixa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modo do Caixa</Label>
                <Select
                  value={formData.cash_register_mode || 'open'}
                  onValueChange={(value) => setFormData({ ...formData, cash_register_mode: value as 'blind' | 'open' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Caixa Aberto (vê faturamento)</SelectItem>
                    <SelectItem value="blind">Caixa Cego (obriga contar gaveta)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {formData.cash_register_mode === 'blind' 
                    ? 'O operador não vê o faturamento e é obrigado a contar a gaveta'
                    : 'O operador pode ver todo o faturamento'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Adicionar status do clima no fechamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Campo para justificar baixas ou altas baseado no clima
                  </p>
                </div>
                <Switch
                  checked={formData.show_weather_on_closing || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_weather_on_closing: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_report_email">Email para relatório de encerramento</Label>
                <Input
                  id="shift_report_email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.shift_report_email || ''}
                  onChange={(e) => setFormData({ ...formData, shift_report_email: e.target.value || null })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </CardTitle>
              <CardDescription>
                Configure a localização do estabelecimento para validação do QR Code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location_latitude">Latitude</Label>
                  <Input
                    id="location_latitude"
                    type="number"
                    step="0.00000001"
                    placeholder="-23.5505199"
                    value={formData.location_latitude || ''}
                    onChange={(e) => setFormData({ ...formData, location_latitude: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_longitude">Longitude</Label>
                  <Input
                    id="location_longitude"
                    type="number"
                    step="0.00000001"
                    placeholder="-46.6333094"
                    value={formData.location_longitude || ''}
                    onChange={(e) => setFormData({ ...formData, location_longitude: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Serve para o QR Code não abrir fora do estabelecimento
              </p>
            </CardContent>
          </Card>

          {/* Configurações SMTP */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configurações de Email (SMTP)
              </CardTitle>
              <CardDescription>
                Configure o servidor SMTP para envio de emails de relatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Habilitar envio de email</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativa o envio de relatórios por email
                  </p>
                </div>
                <Switch
                  checked={formData.smtp_enabled || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, smtp_enabled: checked })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Servidor SMTP</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host || ''}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Porta</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={formData.smtp_port || 587}
                    onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Usuário</Label>
                  <Input
                    id="smtp_user"
                    placeholder="seu-email@gmail.com"
                    value={formData.smtp_user || ''}
                    onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.smtp_password || ''}
                      onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value || null })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">Email de envio</Label>
                  <Input
                    id="smtp_from_email"
                    type="email"
                    placeholder="noreply@suaempresa.com"
                    value={formData.smtp_from_email || ''}
                    onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">Nome do remetente</Label>
                  <Input
                    id="smtp_from_name"
                    placeholder="Minha Empresa"
                    value={formData.smtp_from_name || ''}
                    onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value || null })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Para Gmail, use uma senha de app. Para outros provedores, consulte a documentação.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Geo Security Settings - Full Width */}
        <GeoSecuritySettings />
      </div>
    </DashboardLayout>
  );
}
