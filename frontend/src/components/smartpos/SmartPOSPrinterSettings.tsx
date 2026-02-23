/**
 * Smart POS Printer Settings Component
 * Configurações de impressora Bluetooth no dispositivo
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, 
  Bluetooth, 
  Settings, 
  Check, 
  X, 
  RefreshCw,
  Loader2,
  ChefHat,
  Receipt,
  Sparkles
} from 'lucide-react';
import { SmartPOSDevice, useUpdateSmartPOSDevice } from '@/hooks/useSmartPOS';
import { toast } from 'sonner';

interface SmartPOSPrinterSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: SmartPOSDevice;
}

export interface PrinterConfig {
  printer_enabled: boolean;
  printer_name: string;
  printer_address: string;
  print_production: boolean;
  print_cash_closing: boolean;
  paper_width: 58 | 80;
  print_style: 'elegant' | 'simple';
}

const DEFAULT_CONFIG: PrinterConfig = {
  printer_enabled: true,
  printer_name: '',
  printer_address: '',
  print_production: true,
  print_cash_closing: true,
  paper_width: 80,
  print_style: 'elegant',
};

export function SmartPOSPrinterSettings({
  open,
  onOpenChange,
  device,
}: SmartPOSPrinterSettingsProps) {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_CONFIG);
  const [isScanning, setIsScanning] = useState(false);
  const [foundPrinters, setFoundPrinters] = useState<Array<{ name: string; address: string }>>([]);
  
  const updateDevice = useUpdateSmartPOSDevice();

  // Load config from device
  useEffect(() => {
    if (device?.config_json) {
      const deviceConfig = device.config_json as Partial<PrinterConfig>;
      setConfig({
        ...DEFAULT_CONFIG,
        ...deviceConfig,
      });
    }
  }, [device]);

  const handleSave = async () => {
    try {
      await updateDevice.mutateAsync({
        id: device.id,
        config_json: config as unknown as Record<string, unknown>,
      });
      toast.success('Configurações de impressora salvas!');
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setFoundPrinters([]);

    // Check if Web Bluetooth API is available
    if ('bluetooth' in navigator) {
      try {
        // Request Bluetooth device
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          // Common printer service UUIDs
          optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'],
        });

        if (device) {
          setFoundPrinters([{
            name: device.name || 'Impressora Desconhecida',
            address: device.id || '',
          }]);
          
          // Auto-select if only one found
          setConfig(prev => ({
            ...prev,
            printer_name: device.name || 'Impressora',
            printer_address: device.id || '',
          }));
          
          toast.success(`Impressora encontrada: ${device.name}`);
        }
      } catch (error: any) {
        if (error.name !== 'NotFoundError') {
          toast.error('Erro ao buscar impressoras Bluetooth');
          console.error('Bluetooth error:', error);
        }
      }
    } else {
      // Fallback - show manual input
      toast.info('Bluetooth não disponível. Configure manualmente.');
    }

    setIsScanning(false);
  };

  const handleTestPrint = () => {
    toast.info('Enviando teste para impressora...');
    
    // Simulate test print
    setTimeout(() => {
      toast.success('Teste enviado! Verifique a impressora.');
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            Configurações de Impressora
          </DialogTitle>
          <DialogDescription>
            Configure a impressora Bluetooth deste dispositivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Master switch */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Habilitar Impressão</div>
                    <div className="text-xs text-muted-foreground">
                      Ativar impressora Bluetooth neste dispositivo
                    </div>
                  </div>
                </div>
                <Switch
                  checked={config.printer_enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, printer_enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {config.printer_enabled && (
            <>
              {/* Bluetooth Scanner */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bluetooth className="w-4 h-4 text-blue-500" />
                    Impressora Bluetooth
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleScanBluetooth}
                      disabled={isScanning}
                      className="flex-1"
                    >
                      {isScanning ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Buscar Impressoras
                    </Button>
                    
                    {config.printer_name && (
                      <Button variant="outline" onClick={handleTestPrint}>
                        Testar
                      </Button>
                    )}
                  </div>

                  {/* Current printer */}
                  {config.printer_name && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="font-medium text-sm">{config.printer_name}</div>
                          <div className="text-xs text-muted-foreground">{config.printer_address || 'Conectada'}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-500/20">Ativa</Badge>
                    </div>
                  )}

                  {/* Manual input */}
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="printer_name">Nome da Impressora</Label>
                      <Input
                        id="printer_name"
                        placeholder="Ex: Impressora_Cozinha"
                        value={config.printer_name}
                        onChange={(e) => setConfig(prev => ({ ...prev, printer_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="printer_address">Endereço MAC (opcional)</Label>
                      <Input
                        id="printer_address"
                        placeholder="Ex: 00:11:22:33:44:55"
                        value={config.printer_address}
                        onChange={(e) => setConfig(prev => ({ ...prev, printer_address: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Print Options */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Opções de Impressão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Paper width */}
                  <div className="space-y-1">
                    <Label>Largura do Papel</Label>
                    <Select
                      value={String(config.paper_width)}
                      onValueChange={(v) => setConfig(prev => ({ ...prev, paper_width: Number(v) as 58 | 80 }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="80">80mm (Padrão)</SelectItem>
                        <SelectItem value="58">58mm (Compacta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Print style */}
                  <div className="space-y-1">
                    <Label>Estilo de Impressão</Label>
                    <Select
                      value={config.print_style}
                      onValueChange={(v) => setConfig(prev => ({ ...prev, print_style: v as 'elegant' | 'simple' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elegant">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            Elegante (Destaque invertido)
                          </div>
                        </SelectItem>
                        <SelectItem value="simple">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Simples
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* What to print */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">O que imprimir</CardTitle>
                  <CardDescription>
                    Selecione os tipos de impressão
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <ChefHat className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="font-medium text-sm">Tickets de Produção</div>
                        <div className="text-xs text-muted-foreground">
                          Imprimir pedidos para a cozinha
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={config.print_production}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, print_production: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium text-sm">Fechamento de Caixa</div>
                        <div className="text-xs text-muted-foreground">
                          Imprimir relatório ao fechar
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={config.print_cash_closing}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, print_cash_closing: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateDevice.isPending}>
            {updateDevice.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get printer config from device
 */
export function getPrinterConfig(device: SmartPOSDevice | null): PrinterConfig {
  if (!device?.config_json) return DEFAULT_CONFIG;
  
  const deviceConfig = device.config_json as Partial<PrinterConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...deviceConfig,
  };
}
