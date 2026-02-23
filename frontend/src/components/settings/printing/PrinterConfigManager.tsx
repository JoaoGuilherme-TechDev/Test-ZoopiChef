import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Printer, Plus, Trash2, TestTube, Wifi, Usb, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

interface PrinterConfig {
  id: string;
  name: string;
  category: string;
  connection_type: 'usb' | 'network';
  system_name?: string;
  share_path?: string;
  host?: string;
  port?: number;
  paper_width: number;
  is_default: boolean;
  is_active: boolean;
  auto_cut: boolean;
  beep_on_print: boolean;
}

interface Props {
  companyId?: string;
}

const CATEGORIES = [
  { value: 'cozinha', label: 'Cozinha', icon: '👨‍🍳' },
  { value: 'bar', label: 'Bar', icon: '🍺' },
  { value: 'caixa', label: 'Caixa', icon: '💰' },
  { value: 'principal', label: 'Principal/Escritório', icon: '🖨️' },
  { value: 'etiqueta', label: 'Etiquetas', icon: '🏷️' },
];

export function PrinterConfigManager({ companyId }: Props) {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'cozinha',
    connection_type: 'usb' as 'usb' | 'network',
    system_name: '',
    share_path: '',
    host: '',
    port: 9100,
    paper_width: 80,
    is_default: false,
    auto_cut: true,
    beep_on_print: true,
  });

  // Fetch printers
  const fetchPrinters = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('printer_config_v3')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      setPrinters((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching printers:', error);
      toast.error('Erro ao carregar impressoras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, [companyId]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'cozinha',
      connection_type: 'usb',
      system_name: '',
      share_path: '',
      host: '',
      port: 9100,
      paper_width: 80,
      is_default: false,
      auto_cut: true,
      beep_on_print: true,
    });
    setEditingPrinter(null);
  };

  // Open edit dialog
  const handleEdit = (printer: PrinterConfig) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      category: printer.category,
      connection_type: printer.connection_type,
      system_name: printer.system_name || '',
      share_path: printer.share_path || '',
      host: printer.host || '',
      port: printer.port || 9100,
      paper_width: printer.paper_width,
      is_default: printer.is_default,
      auto_cut: printer.auto_cut,
      beep_on_print: printer.beep_on_print,
    });
    setDialogOpen(true);
  };

  // Save printer
  const handleSave = async () => {
    if (!companyId) return;

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (formData.connection_type === 'network' && !formData.host.trim()) {
      toast.error('IP é obrigatório para impressora de rede');
      return;
    }

    try {
      const payload = {
        company_id: companyId,
        name: formData.name.trim(),
        category: formData.category,
        connection_type: formData.connection_type,
        system_name: formData.connection_type === 'usb' ? formData.system_name : null,
        share_path: formData.connection_type === 'usb' ? formData.share_path : null,
        host: formData.connection_type === 'network' ? formData.host : null,
        port: formData.connection_type === 'network' ? formData.port : null,
        paper_width: formData.paper_width,
        is_default: formData.is_default,
        is_active: true,
        auto_cut: formData.auto_cut,
        beep_on_print: formData.beep_on_print,
      };

      if (editingPrinter) {
        const { error } = await supabase
          .from('printer_config_v3')
          .update(payload)
          .eq('id', editingPrinter.id);

        if (error) throw error;
        toast.success('Impressora atualizada');
      } else {
        const { error } = await supabase
          .from('printer_config_v3')
          .insert(payload);

        if (error) throw error;
        toast.success('Impressora adicionada');
      }

      setDialogOpen(false);
      resetForm();
      fetchPrinters();
    } catch (error: any) {
      console.error('Error saving printer:', error);
      toast.error(error.message || 'Erro ao salvar impressora');
    }
  };

  // Delete printer
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta impressora?')) return;

    try {
      const { error } = await supabase
        .from('printer_config_v3')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Impressora removida');
      fetchPrinters();
    } catch (error) {
      console.error('Error deleting printer:', error);
      toast.error('Erro ao remover impressora');
    }
  };

  // Test printer
  const handleTest = async (printer: PrinterConfig) => {
    toast.info(`Enviando teste para ${printer.name}...`);

    try {
      // Tenta via agente local primeiro
      const res = await fetch(`http://localhost:9898/test-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: printer.id,
          printerConfig: printer
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success('Teste enviado com sucesso!');
        } else {
          toast.error(`Falha: ${data.message}`);
        }
      } else {
        toast.error('Agente não respondeu - está rodando?');
      }
    } catch {
      toast.error('Agente offline - inicie o Zoopi Print Agent');
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || { label: category, icon: '🖨️' };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Impressoras Configuradas</CardTitle>
            <CardDescription>
              Configure as impressoras que serão usadas pelo sistema
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}
                </DialogTitle>
                <DialogDescription>
                  Configure os dados da impressora para o agente local
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome de Identificação</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Cozinha Principal"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Conexão</Label>
                  <Select
                    value={formData.connection_type}
                    onValueChange={(v: 'usb' | 'network') => setFormData(f => ({ ...f, connection_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usb">
                        <span className="flex items-center gap-2">
                          <Usb className="h-4 w-4" />
                          USB / Local
                        </span>
                      </SelectItem>
                      <SelectItem value="network">
                        <span className="flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          Rede / IP
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.connection_type === 'usb' && (
                  <>
                    <div className="space-y-2">
                      <Label>Nome da Impressora no Sistema</Label>
                      <Input
                        value={formData.system_name}
                        onChange={(e) => setFormData(f => ({ ...f, system_name: e.target.value }))}
                        placeholder="Ex: EPSON TM-T20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Nome exato como aparece no Windows/Linux
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Caminho de Compartilhamento (opcional)</Label>
                      <Input
                        value={formData.share_path}
                        onChange={(e) => setFormData(f => ({ ...f, share_path: e.target.value }))}
                        placeholder="\\SERVIDOR\Impressora"
                      />
                    </div>
                  </>
                )}

                {formData.connection_type === 'network' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-2">
                      <Label>Endereço IP</Label>
                      <Input
                        value={formData.host}
                        onChange={(e) => setFormData(f => ({ ...f, host: e.target.value }))}
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Porta</Label>
                      <Input
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData(f => ({ ...f, port: parseInt(e.target.value) || 9100 }))}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Largura do Papel</Label>
                  <Select
                    value={String(formData.paper_width)}
                    onValueChange={(v) => setFormData(f => ({ ...f, paper_width: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80">80mm (padrão)</SelectItem>
                      <SelectItem value="58">58mm (compacta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Impressora Padrão</Label>
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, is_default: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Corte Automático</Label>
                    <Switch
                      checked={formData.auto_cut}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, auto_cut: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Beep ao Imprimir</Label>
                    <Switch
                      checked={formData.beep_on_print}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, beep_on_print: v }))}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingPrinter ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : printers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Printer className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma impressora configurada</p>
            <p className="text-sm">Clique em "Adicionar" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {printers.map((printer) => {
              const catInfo = getCategoryInfo(printer.category);
              return (
                <div
                  key={printer.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
                      {catInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{printer.name}</p>
                        {printer.is_default && (
                          <Badge variant="secondary" className="text-xs">Padrão</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{catInfo.label}</span>
                        <span>•</span>
                        {printer.connection_type === 'network' ? (
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            {printer.host}:{printer.port}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Usb className="h-3 w-3" />
                            {printer.system_name || 'USB'}
                          </span>
                        )}
                        <span>•</span>
                        <span>{printer.paper_width}mm</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(printer)}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Testar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(printer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(printer.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
