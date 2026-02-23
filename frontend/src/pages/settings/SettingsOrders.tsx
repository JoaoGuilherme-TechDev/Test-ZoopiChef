import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyGeneralSettings } from '@/hooks/useCompanyGeneralSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ClipboardList, Save, MessageCircle } from 'lucide-react';

export default function SettingsOrders() {
  const { data: settings, isLoading, upsert, isPending } = useCompanyGeneralSettings();

  const [formData, setFormData] = useState({
    allow_out_of_stock_sales: false,
    allow_zero_price_sales: false,
    show_unavailable_products: false,
    whatsapp_notify_delivery: true,
    whatsapp_notify_table: true,
    whatsapp_notify_comanda: true,
    whatsapp_notify_counter: true,
    whatsapp_notify_loyalty: true,
    whatsapp_notify_offers: true,
    whatsapp_notify_account_activity: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        allow_out_of_stock_sales: settings.allow_out_of_stock_sales ?? false,
        allow_zero_price_sales: settings.allow_zero_price_sales ?? false,
        show_unavailable_products: settings.show_unavailable_products ?? false,
        whatsapp_notify_delivery: settings.whatsapp_notify_delivery ?? true,
        whatsapp_notify_table: settings.whatsapp_notify_table ?? true,
        whatsapp_notify_comanda: settings.whatsapp_notify_comanda ?? true,
        whatsapp_notify_counter: settings.whatsapp_notify_counter ?? true,
        whatsapp_notify_loyalty: settings.whatsapp_notify_loyalty ?? true,
        whatsapp_notify_offers: settings.whatsapp_notify_offers ?? true,
        whatsapp_notify_account_activity: settings.whatsapp_notify_account_activity ?? true,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert(formData);
      toast.success('Configurações de pedidos salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Pedidos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Pedidos">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        {/* Order Settings Card */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Configurações de Pedidos</CardTitle>
                <CardDescription>
                  Defina regras para venda e exibição de produtos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Permitir venda de produtos sem estoque?</p>
                <p className="text-sm text-muted-foreground">Permite vender mesmo sem estoque disponível</p>
              </div>
              <Switch
                checked={formData.allow_out_of_stock_sales}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_out_of_stock_sales: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Permitir venda de produtos sem valor?</p>
                <p className="text-sm text-muted-foreground">Permite vender produtos com preço zerado</p>
              </div>
              <Switch
                checked={formData.allow_zero_price_sales}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_zero_price_sales: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Exibir produtos indisponíveis?</p>
                <p className="text-sm text-muted-foreground">Mostra produtos sem estoque no cardápio</p>
              </div>
              <Switch
                checked={formData.show_unavailable_products}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_unavailable_products: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Notification Settings */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="font-display">Notificações WhatsApp por Origem</CardTitle>
                <CardDescription>
                  Configure quais tipos de pedido enviam notificação por WhatsApp.
                  O operador pode vincular um cliente para receber notificações.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label className="text-sm font-medium">Enviar notificação por WhatsApp para pedidos origem:</Label>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Delivery</p>
                  <p className="text-sm text-muted-foreground">Pedidos de entrega</p>
                </div>
                <Switch
                  checked={formData.whatsapp_notify_delivery}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_delivery: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Mesa</p>
                  <p className="text-sm text-muted-foreground">Pedidos de mesa</p>
                </div>
                <Switch
                  checked={formData.whatsapp_notify_table}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_table: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Comanda</p>
                  <p className="text-sm text-muted-foreground">Pedidos de comanda</p>
                </div>
                <Switch
                  checked={formData.whatsapp_notify_comanda}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_comanda: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Balcão</p>
                  <p className="text-sm text-muted-foreground">Pedidos de balcão</p>
                </div>
                <Switch
                  checked={formData.whatsapp_notify_counter}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_counter: checked }))}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-sm font-medium mb-3 block">Notificações ao cliente vinculado:</Label>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Fidelidade</p>
                    <p className="text-sm text-muted-foreground">Notificações de pontos e recompensas</p>
                  </div>
                  <Switch
                    checked={formData.whatsapp_notify_loyalty}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_loyalty: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Ofertas</p>
                    <p className="text-sm text-muted-foreground">Promoções e ofertas especiais</p>
                  </div>
                  <Switch
                    checked={formData.whatsapp_notify_offers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_offers: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Movimentação na conta</p>
                    <p className="text-sm text-muted-foreground">Toda movimentação na conta do cliente</p>
                  </div>
                  <Switch
                    checked={formData.whatsapp_notify_account_activity}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_notify_account_activity: checked }))}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isPending} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
