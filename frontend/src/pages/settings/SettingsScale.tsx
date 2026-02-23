import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { 
  useScaleConfig, 
  SCALE_MODELS, 
  BAUD_RATES, 
  DATA_BITS, 
  STOP_BITS, 
  PARITY_OPTIONS,
  type ScaleConfigFormData 
} from '@/hooks/useScaleConfig';
import { getProtocolForModel, type ScaleReading } from '@/hooks/useScaleProtocol';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Scale, Save, Plus, Trash2, Settings2, Usb, AlertCircle, CheckCircle2, Play, Square, RefreshCw, Printer, ScanBarcode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScaleTerminalSettings } from '@/components/scale-terminal';

export default function SettingsScale() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { config, configs, isLoading, createConfig, updateConfig, deleteConfig } = useScaleConfig();

  const [form, setForm] = useState<ScaleConfigFormData>({
    name: 'Balança Principal',
    model: 'toledo_prix_iii',
    baud_rate: 9600,
    data_bits: 8,
    stop_bits: 1,
    parity: 'none',
    active: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);
  const [isTestingWeight, setIsTestingWeight] = useState(false);
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  useEffect(() => {
    // Check Web Serial API support
    setIsWebSerialSupported('serial' in navigator);
  }, []);

  useEffect(() => {
    if (config && !editingId) {
      setForm({
        name: config.name,
        model: config.model,
        baud_rate: config.baud_rate,
        data_bits: config.data_bits,
        stop_bits: config.stop_bits,
        parity: config.parity,
        active: config.active,
      });
      setEditingId(config.id);
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateConfig.mutateAsync({ id: editingId, ...form });
      } else {
        await createConfig.mutateAsync(form);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({
      name: 'Nova Balança',
      model: 'toledo_prix_iii',
      baud_rate: 9600,
      data_bits: 8,
      stop_bits: 1,
      parity: 'none',
      active: true,
    });
  };

  const handleEdit = (cfg: any) => {
    setEditingId(cfg.id);
    setForm({
      name: cfg.name,
      model: cfg.model,
      baud_rate: cfg.baud_rate,
      data_bits: cfg.data_bits,
      stop_bits: cfg.stop_bits,
      parity: cfg.parity,
      active: cfg.active,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover esta configuração de balança?')) {
      await deleteConfig.mutateAsync(id);
      if (editingId === id) {
        handleNew();
      }
    }
  };

  const testConnection = async () => {
    if (!isWebSerialSupported) {
      toast.error('Web Serial API não suportada neste navegador. Use Chrome ou Edge.');
      return;
    }

    try {
      // Request port access
      const port = await (navigator as any).serial.requestPort();
      await port.open({ 
        baudRate: form.baud_rate,
        dataBits: form.data_bits,
        stopBits: form.stop_bits,
        parity: form.parity,
      });
      
      toast.success('Conexão com a porta serial estabelecida!');
      
      // Close after test
      await port.close();
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        toast.error('Nenhuma porta selecionada');
      } else {
        toast.error('Erro ao conectar: ' + error.message);
      }
    }
  };

  const startWeightTest = async () => {
    if (!isWebSerialSupported) {
      toast.error('Web Serial API não suportada neste navegador.');
      return;
    }

    try {
      setIsTestingWeight(true);
      setLastReading(null);
      
      const port = await (navigator as any).serial.requestPort();
      portRef.current = port;
      
      await port.open({ 
        baudRate: form.baud_rate,
        dataBits: form.data_bits,
        stopBits: form.stop_bits,
        parity: form.parity,
      });

      const protocol = getProtocolForModel(form.model);
      
      // Enviar comando de solicitação de peso se o protocolo tiver
      if (protocol.requestWeightCommand) {
        const writer = port.writable.getWriter();
        await writer.write(protocol.requestWeightCommand);
        writer.releaseLock();
      }

      // Ler resposta
      const reader = port.readable.getReader();
      readerRef.current = reader;

      toast.info(`Lendo peso... (Protocolo: ${protocol.name})`);
      
      // Tentar ler por 5 segundos
      const timeout = setTimeout(() => {
        stopWeightTest();
        if (!lastReading) {
          toast.error('Timeout: nenhum dado recebido da balança');
        }
      }, 5000);

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          if (value) {
            const reading = protocol.parseResponse(value);
            if (reading && reading.weight > 0) {
              setLastReading(reading);
              clearTimeout(timeout);
              toast.success(`Peso lido: ${reading.weight.toFixed(3)} kg`);
              break;
            }
          }
        }
      } catch (e) {
        // Reader closed
      }

      clearTimeout(timeout);
      await stopWeightTest();
      
    } catch (error: any) {
      setIsTestingWeight(false);
      if (error.name === 'NotFoundError') {
        toast.error('Nenhuma porta selecionada');
      } else {
        toast.error('Erro ao ler peso: ' + error.message);
      }
    }
  };

  const stopWeightTest = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (e) {
      // Ignore close errors
    }
    setIsTestingWeight(false);
  };

  if (companyLoading || isLoading) {
    return (
      <DashboardLayout title="Configuração de Balança">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Configuração de Balança">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Configure sua empresa primeiro.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configuração de Balança">
      <div className="max-w-4xl space-y-6 animate-fade-in">
        {/* Browser Support Alert */}
        {!isWebSerialSupported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Seu navegador não suporta a Web Serial API. Use <strong>Google Chrome</strong> ou{' '}
              <strong>Microsoft Edge</strong> para conectar balanças.
            </AlertDescription>
          </Alert>
        )}

        {isWebSerialSupported && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Web Serial API suportada! Você pode conectar balanças via USB/Serial.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connection" className="gap-2">
              <Usb className="w-4 h-4" />
              Conexão Serial
            </TabsTrigger>
            <TabsTrigger value="terminal" className="gap-2">
              <Scale className="w-4 h-4" />
              Terminal Automático
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
          {/* Config Form */}
          <Card className="lg:col-span-2 border-border/50 shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-display">
                    {editingId ? 'Editar Balança' : 'Nova Balança'}
                  </CardTitle>
                  <CardDescription>
                    Configure os parâmetros de comunicação serial
                  </CardDescription>
                </div>
                {configs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleNew}>
                    <Plus className="w-4 h-4 mr-1" />
                    Nova
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Balança</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Balança Principal"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select
                      value={form.model}
                      onValueChange={(v) => setForm(prev => ({ ...prev, model: v }))}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCALE_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    Parâmetros da Porta Serial
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Velocidade (Baud Rate)</Label>
                      <Select
                        value={form.baud_rate.toString()}
                        onValueChange={(v) => setForm(prev => ({ ...prev, baud_rate: parseInt(v) }))}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BAUD_RATES.map((rate) => (
                            <SelectItem key={rate} value={rate.toString()}>
                              {rate.toLocaleString('pt-BR')} bps
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data Bits</Label>
                      <Select
                        value={form.data_bits.toString()}
                        onValueChange={(v) => setForm(prev => ({ ...prev, data_bits: parseInt(v) }))}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_BITS.map((bits) => (
                            <SelectItem key={bits} value={bits.toString()}>
                              {bits}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Stop Bits</Label>
                      <Select
                        value={form.stop_bits.toString()}
                        onValueChange={(v) => setForm(prev => ({ ...prev, stop_bits: parseFloat(v) }))}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STOP_BITS.map((bits) => (
                            <SelectItem key={bits} value={bits.toString()}>
                              {bits}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Paridade</Label>
                      <Select
                        value={form.parity}
                        onValueChange={(v) => setForm(prev => ({ ...prev, parity: v }))}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Usb className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="active" className="cursor-pointer">Balança Ativa</Label>
                      <p className="text-xs text-muted-foreground">
                        Usar esta configuração no PDV
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="active"
                    checked={form.active}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, active: checked }))}
                    disabled={!isAdmin}
                  />
                </div>

                {/* Teste de Leitura de Peso */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    Teste de Leitura de Peso
                  </h4>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center p-4 bg-background rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Peso Lido</p>
                      <p className="text-3xl font-mono font-bold text-primary">
                        {lastReading ? `${lastReading.weight.toFixed(3)}` : '0.000'}
                      </p>
                      <p className="text-sm text-muted-foreground">kg</p>
                      {lastReading?.raw && (
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          Raw: {lastReading.raw.substring(0, 20)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {!isTestingWeight ? (
                        <Button
                          type="button"
                          onClick={startWeightTest}
                          disabled={!isWebSerialSupported}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Ler Peso
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={stopWeightTest}
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Parar
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLastReading(null)}
                        disabled={!lastReading}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Coloque um peso na balança e clique em "Ler Peso" para testar a comunicação.
                    Protocolo: {SCALE_MODELS.find(m => m.value === form.model)?.label || form.model}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testConnection}
                      disabled={!isWebSerialSupported}
                      className="flex-1"
                    >
                      <Usb className="w-4 h-4 mr-2" />
                      Testar Conexão
                    </Button>
                    <Button
                      type="submit"
                      disabled={createConfig.isPending || updateConfig.isPending}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createConfig.isPending || updateConfig.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Saved Configs */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Balanças Cadastradas</CardTitle>
              <CardDescription>
                {configs.length === 0 
                  ? 'Nenhuma balança configurada' 
                  : `${configs.length} balança(s)`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {configs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Configure sua primeira balança</p>
                </div>
              ) : (
                configs.map((cfg) => (
                  <div
                    key={cfg.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer
                      ${editingId === cfg.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border/50 hover:border-primary/50'
                      }
                    `}
                    onClick={() => handleEdit(cfg)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-amber-600 shrink-0" />
                          <p className="font-medium truncate">{cfg.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {SCALE_MODELS.find(m => m.value === cfg.model)?.label || cfg.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cfg.baud_rate} bps • {cfg.data_bits}N{cfg.stop_bits}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {cfg.active && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Ativa
                          </Badge>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(cfg.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="border-border/50 shadow-soft bg-muted/30">
          <CardContent className="py-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Configurações padrão Toledo Prix III:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Velocidade: 9600 bps</li>
                <li>Data Bits: 8</li>
                <li>Stop Bits: 1</li>
                <li>Paridade: Nenhuma</li>
              </ul>
              <p className="mt-3">
                Conecte a balança via cabo USB-Serial. No PDV, produtos marcados como "Pesado" 
                terão o peso capturado automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="terminal">
            <ScaleTerminalSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
