import { useState, useEffect } from 'react';
import { Settings, Printer, Wifi, WifiOff, Check, Loader2, Monitor, Save, Palette, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  isNetworkPrintServiceAvailable, 
  testPrinterConnection 
} from '@/lib/print/NetworkPrintService';

// Chave para localStorage
const STORAGE_KEY = 'pdv-station-config';

// Cores predefinidas para facilitar a seleção
const PRESET_COLORS = [
  { name: 'Azul', primary: '#3b82f6', accent: '#1d4ed8' },
  { name: 'Verde', primary: '#22c55e', accent: '#15803d' },
  { name: 'Roxo', primary: '#a855f7', accent: '#7c3aed' },
  { name: 'Laranja', primary: '#f97316', accent: '#ea580c' },
  { name: 'Vermelho', primary: '#ef4444', accent: '#dc2626' },
  { name: 'Rosa', primary: '#ec4899', accent: '#db2777' },
  { name: 'Ciano', primary: '#06b6d4', accent: '#0891b2' },
  { name: 'Amarelo', primary: '#eab308', accent: '#ca8a04' },
];

export interface PDVStationSettings {
  stationName: string;
  printerType: 'network' | 'browser' | 'none';
  printerHost: string;
  printerPort: number;
  autoPrint: boolean;
  printReceipt: boolean;
  printTicket: boolean;
  beepOnPrint: boolean;
  // Aparência
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
}

const defaultSettings: PDVStationSettings = {
  stationName: 'Caixa 1',
  printerType: 'browser',
  printerHost: '192.168.1.100',
  printerPort: 9100,
  autoPrint: false,
  printReceipt: true,
  printTicket: true,
  beepOnPrint: true,
  // Aparência
  logoUrl: '',
  primaryColor: '#3b82f6',
  accentColor: '#1d4ed8',
  darkMode: false,
};

export function loadStationConfig(): PDVStationSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao carregar config da estação:', e);
  }
  return defaultSettings;
}

export function saveStationConfig(config: PDVStationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar config da estação:', e);
  }
}

interface PDVStationConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDVStationConfig({ open, onOpenChange }: PDVStationConfigProps) {
  const [settings, setSettings] = useState<PDVStationSettings>(defaultSettings);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [printerError, setPrinterError] = useState<string | null>(null);

  // Carregar configurações ao abrir
  useEffect(() => {
    if (open) {
      setSettings(loadStationConfig());
      checkServiceStatus();
    }
  }, [open]);

  const checkServiceStatus = async () => {
    const available = await isNetworkPrintServiceAvailable();
    setServiceAvailable(available);
  };

  const handleSave = () => {
    saveStationConfig(settings);
    toast.success('Configurações da estação salvas!');
    onOpenChange(false);
  };

  const testPrinter = async () => {
    if (settings.printerType !== 'network') {
      toast.info('Teste disponível apenas para impressoras de rede');
      return;
    }

    setPrinterStatus('testing');
    setPrinterError(null);

    const result = await testPrinterConnection(settings.printerHost, settings.printerPort);

    if (result.success) {
      setPrinterStatus('success');
      toast.success('Impressora conectada com sucesso!');
    } else {
      setPrinterStatus('error');
      setPrinterError(result.error || 'Erro desconhecido');
      toast.error(result.error || 'Erro ao conectar com a impressora');
    }
  };

  const updateSetting = <K extends keyof PDVStationSettings>(
    key: K,
    value: PDVStationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setPrinterStatus('idle');
    setPrinterError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração da Estação
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="impressao">Impressão</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-6 py-4">
            {/* Nome da estação */}
            <div className="space-y-2">
              <Label htmlFor="stationName" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Nome desta Estação
              </Label>
              <Input
                id="stationName"
                value={settings.stationName}
                onChange={(e) => updateSetting('stationName', e.target.value)}
                placeholder="Ex: Caixa 1, PDV Principal"
              />
              <p className="text-xs text-muted-foreground">
                Identificação para diferenciar este terminal dos demais
              </p>
            </div>
          </TabsContent>

          {/* Aba Impressão */}
          <TabsContent value="impressao" className="space-y-6 py-4">
            {/* Tipo de impressora */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Tipo de Impressora
              </Label>
              <Select
                value={settings.printerType}
                onValueChange={(v) => updateSetting('printerType', v as PDVStationSettings['printerType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Impressora do Navegador</SelectItem>
                  <SelectItem value="network">Impressora de Rede (TCP/IP)</SelectItem>
                  <SelectItem value="none">Não Imprimir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Configuração de rede */}
            {settings.printerType === 'network' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                {/* Status do serviço */}
                <div className="flex items-center gap-2 text-sm">
                  {serviceAvailable === null ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : serviceAvailable ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className={serviceAvailable ? 'text-green-600' : 'text-red-600'}>
                    {serviceAvailable === null
                      ? 'Verificando serviço...'
                      : serviceAvailable
                      ? 'Zoopi Print Agent conectado'
                      : 'Zoopi Print Agent não encontrado'}
                  </span>
                </div>

                {!serviceAvailable && serviceAvailable !== null && (
                  <div className="text-xs text-muted-foreground bg-orange-500/10 p-3 rounded border border-orange-500/20">
                    <p className="font-medium text-orange-600 mb-1">⚠️ Agente não detectado</p>
                    <p>Para impressão de rede funcionar, instale e execute o Zoopi Print Agent neste computador.</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="printerHost">IP da Impressora</Label>
                    <Input
                      id="printerHost"
                      value={settings.printerHost}
                      onChange={(e) => updateSetting('printerHost', e.target.value)}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="printerPort">Porta</Label>
                    <Input
                      id="printerPort"
                      type="number"
                      value={settings.printerPort}
                      onChange={(e) => updateSetting('printerPort', parseInt(e.target.value) || 9100)}
                      placeholder="9100"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={testPrinter}
                  disabled={printerStatus === 'testing' || !serviceAvailable}
                >
                  {printerStatus === 'testing' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : printerStatus === 'success' ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  {printerStatus === 'testing'
                    ? 'Testando...'
                    : printerStatus === 'success'
                    ? 'Conectada!'
                    : 'Testar Conexão'}
                </Button>

                {printerError && (
                  <p className="text-xs text-destructive">{printerError}</p>
                )}
              </div>
            )}

            {/* Opções de impressão */}
            <div className="space-y-3">
              <Label>Opções de Impressão</Label>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm">Imprimir Cupom de Venda</span>
                  <p className="text-xs text-muted-foreground">Cupom para o cliente ao finalizar</p>
                </div>
                <Switch
                  checked={settings.printReceipt}
                  onCheckedChange={(v) => updateSetting('printReceipt', v)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm">Imprimir Ticket de Produção</span>
                  <p className="text-xs text-muted-foreground">Ticket para a cozinha/bar</p>
                </div>
                <Switch
                  checked={settings.printTicket}
                  onCheckedChange={(v) => updateSetting('printTicket', v)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm">Beep ao Imprimir</span>
                  <p className="text-xs text-muted-foreground">Sinal sonoro na impressora</p>
                </div>
                <Switch
                  checked={settings.beepOnPrint}
                  onCheckedChange={(v) => updateSetting('beepOnPrint', v)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Aba Aparência */}
          <TabsContent value="aparencia" className="space-y-6 py-4">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Logo do Estabelecimento
              </Label>
              <div className="flex gap-3">
                <Input
                  value={settings.logoUrl}
                  onChange={(e) => updateSetting('logoUrl', e.target.value)}
                  placeholder="URL da imagem (https://...)"
                  className="flex-1"
                />
                {settings.logoUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateSetting('logoUrl', '')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {settings.logoUrl && (
                <div className="mt-2 p-4 bg-muted/50 rounded-lg flex justify-center">
                  <img
                    src={settings.logoUrl}
                    alt="Logo preview"
                    className="max-h-20 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Cole a URL de uma imagem para usar como logo no PDV
              </p>
            </div>

            {/* Cores predefinidas */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Tema de Cores
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      updateSetting('primaryColor', preset.primary);
                      updateSetting('accentColor', preset.accent);
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.primaryColor === preset.primary
                        ? 'border-foreground'
                        : 'border-transparent hover:border-muted-foreground/50'
                    }`}
                    style={{ backgroundColor: preset.primary }}
                  >
                    <span className="text-white text-xs font-medium drop-shadow-md">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cores personalizadas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="accentColor"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    placeholder="#1d4ed8"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Prévia</Label>
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: settings.primaryColor + '10' }}
              >
                <div className="flex items-center gap-3">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="h-10 w-10 object-contain rounded"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      P
                    </div>
                  )}
                  <div>
                    <div
                      className="font-bold"
                      style={{ color: settings.primaryColor }}
                    >
                      PDV Loja
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {settings.stationName}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: settings.primaryColor,
                        borderColor: settings.primaryColor,
                      }}
                    >
                      Exemplo
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modo escuro */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm">Modo Escuro</span>
                <p className="text-xs text-muted-foreground">Tema escuro para o PDV</p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(v) => updateSetting('darkMode', v)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Rodapé */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
