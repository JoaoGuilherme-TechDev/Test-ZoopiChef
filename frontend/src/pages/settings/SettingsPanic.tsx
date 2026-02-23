import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePanicButton } from '@/hooks/usePanicButton';
import { toast } from 'sonner';
import { Shield, Plus, X, AlertTriangle, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPanic() {
  const { settings, isLoading, updateSettings } = usePanicButton();
  
  const [enabled, setEnabled] = useState(false);
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [kdsMessage, setKdsMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.panic_enabled ?? false);
      setPhones(settings.panic_phones ?? []);
      setWhatsappMessage(settings.panic_whatsapp_message ?? 'Socorro! Estamos com problemas sérios no estabelecimento. Por favor, chame a polícia.');
      setKdsMessage(settings.panic_kds_message ?? 'Erro de comunicação');
    }
  }, [settings]);

  const handleAddPhone = () => {
    const cleaned = newPhone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      toast.error('Telefone inválido');
      return;
    }
    if (phones.includes(cleaned)) {
      toast.error('Telefone já cadastrado');
      return;
    }
    setPhones([...phones, cleaned]);
    setNewPhone('');
  };

  const handleRemovePhone = (phone: string) => {
    setPhones(phones.filter(p => p !== phone));
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        panic_enabled: enabled,
        panic_phones: phones,
        panic_whatsapp_message: whatsappMessage,
        panic_kds_message: kdsMessage,
      });
      toast.success('Configurações salvas');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Botão de Pânico">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Botão de Pânico">
      <div className="max-w-2xl space-y-6">
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Recurso de segurança.</strong> Use apenas em situações de emergência real. 
            O botão aparece disfarçado como ícone de Wi-Fi no header do sistema.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <CardTitle>Configurações do Botão de Pânico</CardTitle>
            </div>
            <CardDescription>
              Configure o botão de emergência que envia alertas discretamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="panic-enabled" className="text-base">Ativar Botão de Pânico</Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, um ícone discreto aparece no header
                </p>
              </div>
              <Switch
                id="panic-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <Separator />

            {/* Emergency Phones */}
            <div className="space-y-4">
              <div>
                <Label className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefones de Emergência
                </Label>
                <p className="text-sm text-muted-foreground">
                  Números que receberão o alerta via WhatsApp
                </p>
              </div>

              {phones.length > 0 && (
                <div className="space-y-2">
                  {phones.map((phone) => (
                    <div 
                      key={phone} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-mono">{formatPhone(phone)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePhone(phone)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="(11) 99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
                />
                <Button onClick={handleAddPhone} variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>

            <Separator />

            {/* WhatsApp Message */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp-message">Mensagem WhatsApp</Label>
              <Textarea
                id="whatsapp-message"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={3}
                placeholder="Digite a mensagem de emergência..."
              />
              <p className="text-xs text-muted-foreground">
                Esta mensagem será enviada para todos os telefones cadastrados
              </p>
            </div>

            <Separator />

            {/* KDS Message */}
            <div className="space-y-2">
              <Label htmlFor="kds-message">Mensagem Código para Cozinha</Label>
              <Input
                id="kds-message"
                value={kdsMessage}
                onChange={(e) => setKdsMessage(e.target.value)}
                placeholder="Erro de comunicação"
              />
              <p className="text-xs text-muted-foreground">
                Esta mensagem aparecerá no KDS. Combine com a equipe o significado.
              </p>
            </div>

            <Separator />

            {/* How to activate */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Como acionar:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Duplo clique</strong> no ícone de Wi-Fi no header</li>
                <li><strong>Pressionar por 2 segundos</strong> o ícone</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Isso evita acionamentos acidentais. O botão não produz nenhum feedback sonoro.
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
