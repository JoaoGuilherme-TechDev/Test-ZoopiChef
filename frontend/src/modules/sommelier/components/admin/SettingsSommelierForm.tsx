import { useState } from 'react';
import { Wine, QrCode, Monitor, ShoppingBag, Save, Loader2, Printer, MapPin, Receipt, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSommelierSettings, useUpdateSommelierSettings } from '../../hooks';
import { SommelierSettings, CheckoutMode } from '../../types';

export function SettingsSommelierForm() {
  const { data: settings, isLoading } = useSommelierSettings();
  const updateSettings = useUpdateSommelierSettings();

  const [formData, setFormData] = useState<Partial<SommelierSettings>>({});

  // Merge with defaults
  const currentSettings: Partial<SommelierSettings> = {
    enabled: false,
    qr_code_enabled: true,
    totem_enabled: false,
    delivery_button_enabled: true,
    welcome_title: 'Enólogo Virtual da Casa',
    welcome_subtitle: 'Escolha seu vinho com ajuda especializada',
    context_question: 'Como você vai consumir o vinho?',
    max_suggestions: 5,
    // Checkout defaults
    checkout_mode: 'suggestion',
    require_customer_phone: true,
    require_customer_name: false,
    print_ticket_enabled: true,
    ticket_header_text: 'Sugestão do Sommelier',
    ...settings,
    ...formData,
  };

  const handleChange = <K extends keyof SommelierSettings>(key: K, value: SommelierSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable Module */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-amber-600">
              <Wine className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Enólogo Virtual</CardTitle>
              <CardDescription>
                Assistente inteligente para escolha de vinhos e harmonizações
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Ativar módulo</Label>
              <p className="text-sm text-muted-foreground">
                Habilita o Enólogo Virtual para seus clientes
              </p>
            </div>
            <Switch
              id="enabled"
              checked={currentSettings.enabled}
              onCheckedChange={(checked) => handleChange('enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Canais de Acesso</CardTitle>
          <CardDescription>
            Escolha onde o Enólogo Virtual estará disponível
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-purple-400" />
              <div>
                <Label htmlFor="qr_code_enabled">QR Code Exclusivo</Label>
                <p className="text-sm text-muted-foreground">
                  URL dedicada: /enologo/{"<token>"}
                </p>
              </div>
            </div>
            <Switch
              id="qr_code_enabled"
              checked={currentSettings.qr_code_enabled}
              onCheckedChange={(checked) => handleChange('qr_code_enabled', checked)}
            />
          </div>

          <Separator />

          {/* Totem */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-amber-400" />
              <div>
                <Label htmlFor="totem_enabled">Totem Exclusivo</Label>
                <p className="text-sm text-muted-foreground">
                  Tela dedicada para autoatendimento
                </p>
              </div>
            </div>
            <Switch
              id="totem_enabled"
              checked={currentSettings.totem_enabled}
              onCheckedChange={(checked) => handleChange('totem_enabled', checked)}
            />
          </div>

          <Separator />

          {/* Delivery Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              <div>
                <Label htmlFor="delivery_button_enabled">Botão no Pedido Online</Label>
                <p className="text-sm text-muted-foreground">
                  Adiciona botão "🍷 Enólogo Virtual" no menu delivery
                </p>
              </div>
            </div>
            <Switch
              id="delivery_button_enabled"
              checked={currentSettings.delivery_button_enabled}
              onCheckedChange={(checked) => handleChange('delivery_button_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checkout Mode */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-400" />
            Modo de Finalização
          </CardTitle>
          <CardDescription>
            Como o cliente finaliza o pedido após escolher vinho e harmonizações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={currentSettings.checkout_mode}
            onValueChange={(value) => handleChange('checkout_mode', value as CheckoutMode)}
            className="space-y-4"
          >
            {/* Suggestion Mode */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="suggestion" id="mode_suggestion" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mode_suggestion" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="w-4 h-4 text-amber-400" />
                  Modo Sugestão (Ticket)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Gera um ticket com as sugestões. O cliente entrega ao garçom para realizar o pedido.
                  Não cobra automaticamente.
                </p>
              </div>
            </div>

            {/* Totem Mode */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="totem" id="mode_totem" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mode_totem" className="flex items-center gap-2 cursor-pointer">
                  <ShoppingBag className="w-4 h-4 text-green-400" />
                  Modo Totem (Pedido Direto)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  O pedido é enviado diretamente para a cozinha/bar. 
                  Cliente finaliza e recebe confirmação na tela.
                </p>
              </div>
            </div>

            {/* QR Code Table Mode */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="qrcode_table" id="mode_qrcode" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mode_qrcode" className="flex items-center gap-2 cursor-pointer">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Modo Mesa (QR Code)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Cliente seleciona a mesa e o pedido é vinculado automaticamente.
                  Ideal para QR codes em mesas.
                </p>
              </div>
            </div>
          </RadioGroup>

          <Separator />

          {/* Customer Data */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              Dados do Cliente
            </h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="require_customer_phone">Solicitar Telefone</Label>
                <p className="text-sm text-muted-foreground">
                  Para campanhas e comunicação futura
                </p>
              </div>
              <Switch
                id="require_customer_phone"
                checked={currentSettings.require_customer_phone}
                onCheckedChange={(checked) => handleChange('require_customer_phone', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="require_customer_name">Solicitar Nome</Label>
                <p className="text-sm text-muted-foreground">
                  Obrigatório para finalizar o pedido
                </p>
              </div>
              <Switch
                id="require_customer_name"
                checked={currentSettings.require_customer_name}
                onCheckedChange={(checked) => handleChange('require_customer_name', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Ticket Settings (only for suggestion mode) */}
          {currentSettings.checkout_mode === 'suggestion' && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                Configurações do Ticket
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="print_ticket_enabled">Imprimir Ticket</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprime ticket automaticamente
                  </p>
                </div>
                <Switch
                  id="print_ticket_enabled"
                  checked={currentSettings.print_ticket_enabled}
                  onCheckedChange={(checked) => handleChange('print_ticket_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket_header_text">Título do Ticket</Label>
                <Input
                  id="ticket_header_text"
                  value={currentSettings.ticket_header_text}
                  onChange={(e) => handleChange('ticket_header_text', e.target.value)}
                  placeholder="Sugestão do Sommelier"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Texts */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Textos Personalizados</CardTitle>
          <CardDescription>
            Personalize as mensagens exibidas ao cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcome_title">Título de Boas-Vindas</Label>
            <Input
              id="welcome_title"
              value={currentSettings.welcome_title}
              onChange={(e) => handleChange('welcome_title', e.target.value)}
              placeholder="Enólogo Virtual da Casa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome_subtitle">Subtítulo</Label>
            <Input
              id="welcome_subtitle"
              value={currentSettings.welcome_subtitle}
              onChange={(e) => handleChange('welcome_subtitle', e.target.value)}
              placeholder="Escolha seu vinho com ajuda especializada"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context_question">Pergunta de Contexto</Label>
            <Input
              id="context_question"
              value={currentSettings.context_question}
              onChange={(e) => handleChange('context_question', e.target.value)}
              placeholder="Como você vai consumir o vinho?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_suggestions">Máximo de Sugestões</Label>
            <Input
              id="max_suggestions"
              type="number"
              min={1}
              max={10}
              value={currentSettings.max_suggestions}
              onChange={(e) => handleChange('max_suggestions', parseInt(e.target.value) || 5)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
