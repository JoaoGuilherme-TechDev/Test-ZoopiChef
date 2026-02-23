import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTableModuleSettings } from '@/hooks/useTableModuleSettings';
import { useTableSurchargeRanges } from '@/hooks/useTableSurchargeRanges';
import { useTables } from '@/hooks/useTables';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TableSurchargeConfigDialog } from '@/components/tables/TableSurchargeConfigDialog';
import { toast } from 'sonner';
import { 
  Clock, 
  QrCode, 
  Percent, 
  Download,
  Loader2,
  AlertTriangle,
  Settings,
  Trash2
} from 'lucide-react';

export default function SettingsTables() {
  const { data: company } = useCompany();
  const { settings, upsertSettings, isLoading } = useTableModuleSettings();
  const { ranges } = useTableSurchargeRanges();
  const { activeTables, deleteTable } = useTables();
  
  const [surchargeConfigOpen, setSurchargeConfigOpen] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState('30');

  useEffect(() => {
    if (settings?.idle_warning_minutes) {
      setIdleMinutes(settings.idle_warning_minutes.toString());
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await upsertSettings.mutateAsync({
        idle_warning_minutes: parseInt(idleMinutes) || 30,
        enable_qr_ordering: settings.enable_qr_ordering,
        enable_qr_menu_only: settings.enable_qr_menu_only,
        enable_comanda_qr_menu_only: settings.enable_comanda_qr_menu_only,
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleToggleQROrdering = async (enabled: boolean) => {
    try {
      await upsertSettings.mutateAsync({
        enable_qr_ordering: enabled,
        enable_qr_menu_only: enabled ? false : settings.enable_qr_menu_only,
      });
      toast.success('Configuração atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleToggleQRMenuOnly = async (enabled: boolean) => {
    try {
      await upsertSettings.mutateAsync({
        enable_qr_menu_only: enabled,
        enable_qr_ordering: enabled ? false : settings.enable_qr_ordering,
      });
      toast.success('Configuração atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleToggleComandaQRMenuOnly = async (enabled: boolean) => {
    try {
      await upsertSettings.mutateAsync({
        enable_comanda_qr_menu_only: enabled,
      });
      toast.success('Configuração atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleDeleteAllTables = async () => {
    if (!confirm('Tem certeza que deseja excluir TODAS as mesas? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      for (const table of activeTables) {
        await deleteTable.mutateAsync(table.id);
      }
      toast.success('Todas as mesas foram excluídas');
    } catch (error) {
      toast.error('Erro ao excluir mesas');
    }
  };

  const handleExportQRCodes = () => {
    const baseUrl = window.location.origin;
    
    const qrCodesHtml = activeTables.map(table => {
      return `
        <div style="page-break-inside: avoid; margin: 20px; text-align: center; display: inline-block;">
          <div style="border: 2px solid #000; padding: 20px; border-radius: 10px;">
            <div id="qr-${table.number}" style="width: 200px; height: 200px; margin: 0 auto;"></div>
            <p style="font-size: 24px; font-weight: bold; margin-top: 10px;">Mesa ${table.number}</p>
            ${table.name ? `<p style="font-size: 14px; color: #666;">${table.name}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Codes das Mesas</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
          <style>
            body { font-family: Arial, sans-serif; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 20px; background: #f0f0f0; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
              🖨️ Imprimir QR Codes
            </button>
          </div>
          <div style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${qrCodesHtml}
          </div>
          <script>
            ${activeTables.map(table => {
              const mode = settings.enable_qr_menu_only ? 'menu' : 'order';
              const url = `${baseUrl}/menu/${company?.slug}?table=${table.number}&mode=${mode}`;
              return `
                QRCode.toCanvas(document.createElement('canvas'), '${url}', { width: 200 }, function(error, canvas) {
                  if (!error) {
                    document.getElementById('qr-${table.number}').appendChild(canvas);
                  }
                });
              `;
            }).join('\n')}
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Mesas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Mesas">
      <div className="max-w-3xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações de Mesas</h1>
            <p className="text-muted-foreground">
              Configure alertas, acréscimos e QR Codes
            </p>
          </div>
        </div>

        {/* Idle Warning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Alerta de Inatividade
            </CardTitle>
            <CardDescription>
              Configure o tempo para alertar mesas sem consumo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="idleMinutes">Tempo sem consumo (minutos)</Label>
                <Input
                  id="idleMinutes"
                  type="number"
                  min="5"
                  max="120"
                  value={idleMinutes}
                  onChange={(e) => setIdleMinutes(e.target.value)}
                  className="mt-1 max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mesas ficarão amarelas após {idleMinutes} minutos sem novo pedido
                </p>
              </div>
              <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Surcharge Ranges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-blue-500" />
              Acréscimos por Faixa de Mesa
            </CardTitle>
            <CardDescription>
              Configure taxas de serviço diferentes por área (ex: área VIP, varanda)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ranges.length > 0 ? (
              <div className="space-y-2">
                {ranges.map((range) => (
                  <div key={range.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Mesas {range.start_number} a {range.end_number}</span>
                    <Badge variant="secondary" className="font-mono">
                      +{range.surcharge_percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Percent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma faixa de acréscimo configurada</p>
                <p className="text-xs mt-1">Adicione faixas para aplicar taxas por área</p>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setSurchargeConfigOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Faixas de Acréscimo
            </Button>
          </CardContent>
        </Card>

        {/* QR Code Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-purple-500" />
              QR Codes das Mesas
            </CardTitle>
            <CardDescription>
              Configure os QR Codes para pedidos via celular
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Permitir pedidos via QR Code</Label>
                <p className="text-xs text-muted-foreground">
                  Clientes podem fazer pedidos escaneando o QR Code
                </p>
              </div>
              <Switch
                checked={settings.enable_qr_ordering}
                onCheckedChange={handleToggleQROrdering}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Mesa: Apenas visualização do cardápio</Label>
                <p className="text-xs text-muted-foreground">
                  Clientes podem apenas visualizar o cardápio, sem fazer pedidos
                </p>
              </div>
              <Switch
                checked={settings.enable_qr_menu_only}
                onCheckedChange={handleToggleQRMenuOnly}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Comanda: Apenas visualização do cardápio</Label>
                <p className="text-xs text-muted-foreground">
                  QR da comanda permite apenas visualizar o cardápio
                </p>
              </div>
              <Switch
                checked={settings.enable_comanda_qr_menu_only}
                onCheckedChange={handleToggleComandaQRMenuOnly}
              />
            </div>
            
            <Separator />
            
            {activeTables.length > 0 ? (
              <Button variant="outline" className="w-full" onClick={handleExportQRCodes}>
                <Download className="h-4 w-4 mr-2" />
                Exportar QR Codes para Impressão ({activeTables.length} mesas)
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Crie mesas para exportar QR Codes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {activeTables.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllTables}
                disabled={deleteTable.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todas as Mesas ({activeTables.length})
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <TableSurchargeConfigDialog
        open={surchargeConfigOpen}
        onOpenChange={setSurchargeConfigOpen}
      />
    </DashboardLayout>
  );
}
