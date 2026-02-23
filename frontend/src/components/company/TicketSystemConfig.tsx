/**
 * TicketSystemConfig - Configuração do sistema de tickets por produto
 * 
 * Salva/carrega de company.ticket_config (JSONB).
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { Ticket, QrCode, Save, Users, Building2, FileText } from 'lucide-react';

export interface TicketConfig {
  enabled: boolean;
  generatePerItem: boolean;
  controlByQrCode: boolean;
  header: {
    showRestaurantName: boolean;
    showDateTime: boolean;
    showOperatorName: boolean;
  };
  footer: {
    showSystemInfo: boolean;
    systemName: string;
    systemWebsite: string;
  };
}

const DEFAULT_TICKET_CONFIG: TicketConfig = {
  enabled: false,
  generatePerItem: true,
  controlByQrCode: false,
  header: {
    showRestaurantName: true,
    showDateTime: true,
    showOperatorName: false,
  },
  footer: {
    showSystemInfo: false,
    systemName: '',
    systemWebsite: '',
  },
};

export function TicketSystemConfig() {
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();
  const loadedRef = useRef(false);

  const [config, setConfig] = useState<TicketConfig>(DEFAULT_TICKET_CONFIG);

  // Carregar config do backend UMA vez
  useEffect(() => {
    if (!company || loadedRef.current) return;
    
    const saved = (company as any).ticket_config as TicketConfig | null;
    if (saved) {
      setConfig({
        enabled: saved.enabled ?? DEFAULT_TICKET_CONFIG.enabled,
        generatePerItem: saved.generatePerItem ?? DEFAULT_TICKET_CONFIG.generatePerItem,
        controlByQrCode: saved.controlByQrCode ?? DEFAULT_TICKET_CONFIG.controlByQrCode,
        header: {
          showRestaurantName: saved.header?.showRestaurantName ?? DEFAULT_TICKET_CONFIG.header.showRestaurantName,
          showDateTime: saved.header?.showDateTime ?? DEFAULT_TICKET_CONFIG.header.showDateTime,
          showOperatorName: saved.header?.showOperatorName ?? DEFAULT_TICKET_CONFIG.header.showOperatorName,
        },
        footer: {
          showSystemInfo: saved.footer?.showSystemInfo ?? DEFAULT_TICKET_CONFIG.footer.showSystemInfo,
          systemName: saved.footer?.systemName ?? DEFAULT_TICKET_CONFIG.footer.systemName,
          systemWebsite: saved.footer?.systemWebsite ?? DEFAULT_TICKET_CONFIG.footer.systemWebsite,
        },
      });
    }
    loadedRef.current = true;
  }, [company]);

  // Reset ref quando empresa muda
  useEffect(() => {
    loadedRef.current = false;
  }, [company?.id]);

  const update = (partial: Partial<TicketConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  const updateHeader = (partial: Partial<TicketConfig['header']>) => {
    setConfig(prev => ({ ...prev, header: { ...prev.header, ...partial } }));
  };

  const updateFooter = (partial: Partial<TicketConfig['footer']>) => {
    setConfig(prev => ({ ...prev, footer: { ...prev.footer, ...partial } }));
  };

  const handleSave = async () => {
    if (!company) return;
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        ticket_config: config,
      });
      toast.success('Configuração de tickets salva!');
    } catch {
      toast.error('Erro ao salvar configuração');
    }
  };

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Ticket className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <CardTitle className="font-display">Sistema de Tickets</CardTitle>
            <CardDescription>Gere tickets individuais por produto no pedido</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle principal */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Ticket className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Ativar sistema de tickets</p>
              <p className="text-sm text-muted-foreground">
                Gera tickets individuais por produto ao finalizar pedido
              </p>
            </div>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>

        {config.enabled && (
          <>
            {/* Ticket por produto */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Gerar ticket por produto</p>
                <p className="text-sm text-muted-foreground">
                  Cada unidade do produto gera um ticket separado
                </p>
              </div>
              <Switch checked={config.generatePerItem} onCheckedChange={(v) => update({ generatePerItem: v })} />
            </div>

            {/* Controle por QR Code */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Controle por ticket (QR Code)</p>
                  <p className="text-sm text-muted-foreground">
                    Cada ticket tem QR Code único para controle de entrega
                  </p>
                </div>
              </div>
              <Switch checked={config.controlByQrCode} onCheckedChange={(v) => update({ controlByQrCode: v })} />
            </div>

            {/* === HEADER === */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cabeçalho do Ticket</Label>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Exibir nome do restaurante</p>
                </div>
                <Switch checked={config.header.showRestaurantName} onCheckedChange={(v) => updateHeader({ showRestaurantName: v })} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Exibir data e hora</p>
                </div>
                <Switch checked={config.header.showDateTime} onCheckedChange={(v) => updateHeader({ showDateTime: v })} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Exibir nome do operador</p>
                    <p className="text-sm text-muted-foreground">
                      Mostra o nome do atendente ou cliente no ticket
                    </p>
                  </div>
                </div>
                <Switch checked={config.header.showOperatorName} onCheckedChange={(v) => updateHeader({ showOperatorName: v })} />
              </div>
            </div>

            {/* === FOOTER === */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rodapé do Ticket</Label>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Exibir informações do sistema</p>
                  <p className="text-sm text-muted-foreground">
                    Mostra nome e site do sistema no rodapé
                  </p>
                </div>
                <Switch checked={config.footer.showSystemInfo} onCheckedChange={(v) => updateFooter({ showSystemInfo: v })} />
              </div>

              {config.footer.showSystemInfo && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">Nome do sistema</Label>
                    <Input
                      id="systemName"
                      value={config.footer.systemName}
                      onChange={(e) => updateFooter({ systemName: e.target.value })}
                      placeholder="Ex: MeuSistema"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemWebsite">Site do sistema</Label>
                    <Input
                      id="systemWebsite"
                      value={config.footer.systemWebsite}
                      onChange={(e) => updateFooter({ systemWebsite: e.target.value })}
                      placeholder="Ex: www.meusistema.com.br"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={updateCompany.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateCompany.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
}
