import { useState } from 'react';
import { Plus, Printer, Trash2, Edit2, Check, Tag, Wifi, Usb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLabelPrinters } from '@/hooks/useLabelPrinters';
import { toast } from 'sonner';
import type { LabelPrinter, LabelPrinterType, LabelLanguage, LabelConnectionType } from '@/lib/print/labels';

const PRINTER_TYPES: { value: LabelPrinterType; label: string }[] = [
  { value: 'zebra', label: 'Zebra' },
  { value: 'elgin', label: 'Elgin' },
  { value: 'aogox', label: 'Aogox / Argox' },
];

const LANGUAGES: { value: LabelLanguage; label: string; description: string }[] = [
  { value: 'zpl', label: 'ZPL', description: 'Zebra Programming Language' },
  { value: 'tspl', label: 'TSPL', description: 'TSC Printer Language (Aogox/Elgin)' },
  { value: 'epl', label: 'EPL', description: 'Eltron Programming Language' },
];

const CONNECTION_TYPES: { value: LabelConnectionType; label: string; icon: typeof Wifi }[] = [
  { value: 'network', label: 'Rede (TCP/IP)', icon: Wifi },
  { value: 'usb', label: 'USB (Windows)', icon: Usb },
];

interface PrinterFormData {
  name: string;
  printer_type: LabelPrinterType;
  connection_type: LabelConnectionType;
  printer_host: string;
  printer_port: number;
  printer_name: string;
  label_width_mm: number;
  label_height_mm: number;
  dpi: number;
  language: LabelLanguage;
  is_active: boolean;
  is_default: boolean;
  auto_print_orders: boolean;
  copies_per_box: number;
}

const defaultFormData: PrinterFormData = {
  name: '',
  printer_type: 'zebra',
  connection_type: 'network',
  printer_host: '',
  printer_port: 9100,
  printer_name: '',
  label_width_mm: 50,
  label_height_mm: 30,
  dpi: 203,
  language: 'zpl',
  is_active: true,
  is_default: false,
  auto_print_orders: true,
  copies_per_box: 1,
};

export function LabelPrinterManager() {
  const { printers, isLoading, createPrinter, updatePrinter, deletePrinter } = useLabelPrinters();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<LabelPrinter | null>(null);
  const [formData, setFormData] = useState<PrinterFormData>(defaultFormData);

  const handleOpenDialog = (printer?: LabelPrinter) => {
    if (printer) {
      setEditingPrinter(printer);
      setFormData({
        name: printer.name,
        printer_type: printer.printer_type as LabelPrinterType,
        connection_type: printer.connection_type as LabelConnectionType,
        printer_host: printer.printer_host || '',
        printer_port: printer.printer_port,
        printer_name: printer.printer_name || '',
        label_width_mm: printer.label_width_mm,
        label_height_mm: printer.label_height_mm,
        dpi: printer.dpi,
        language: printer.language as LabelLanguage,
        is_active: printer.is_active,
        is_default: printer.is_default,
        auto_print_orders: printer.auto_print_orders,
        copies_per_box: printer.copies_per_box,
      });
    } else {
      setEditingPrinter(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingPrinter) {
        await updatePrinter.mutateAsync({
          id: editingPrinter.id,
          ...formData,
          printer_host: formData.connection_type === 'network' ? formData.printer_host : null,
          printer_name: formData.connection_type === 'usb' ? formData.printer_name : null,
        });
        toast.success('Impressora atualizada!');
      } else {
        await createPrinter.mutateAsync({
          ...formData,
          printer_host: formData.connection_type === 'network' ? formData.printer_host : null,
          printer_name: formData.connection_type === 'usb' ? formData.printer_name : null,
        });
        toast.success('Impressora cadastrada!');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar impressora');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta impressora?')) return;
    try {
      await deletePrinter.mutateAsync(id);
      toast.success('Impressora excluída');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handlePrinterTypeChange = (type: LabelPrinterType) => {
    // Auto-select language based on printer type
    const language: LabelLanguage = type === 'zebra' ? 'zpl' : 'tspl';
    setFormData(prev => ({ ...prev, printer_type: type, language }));
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Impressoras de Etiquetas
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure impressoras térmicas para etiquetas adesivas (Zebra, Elgin, Aogox)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPrinter ? 'Editar Impressora' : 'Nova Impressora de Etiquetas'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>Nome da Impressora</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Zebra Expedição"
                />
              </div>

              {/* Printer Type */}
              <div className="space-y-2">
                <Label>Fabricante</Label>
                <Select value={formData.printer_type} onValueChange={handlePrinterTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRINTER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Connection Type */}
              <div className="space-y-2">
                <Label>Tipo de Conexão</Label>
                <Select 
                  value={formData.connection_type} 
                  onValueChange={(v: LabelConnectionType) => setFormData(prev => ({ ...prev, connection_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Network Config */}
              {formData.connection_type === 'network' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>IP da Impressora</Label>
                    <Input
                      value={formData.printer_host}
                      onChange={e => setFormData(prev => ({ ...prev, printer_host: e.target.value }))}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Porta</Label>
                    <Input
                      type="number"
                      value={formData.printer_port}
                      onChange={e => setFormData(prev => ({ ...prev, printer_port: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              {/* USB Config */}
              {formData.connection_type === 'usb' && (
                <div className="space-y-2">
                  <Label>Nome da Impressora (Windows)</Label>
                  <Input
                    value={formData.printer_name}
                    onChange={e => setFormData(prev => ({ ...prev, printer_name: e.target.value }))}
                    placeholder="Zebra ZD230"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use o nome exato como aparece em &quot;Dispositivos e Impressoras&quot;
                  </p>
                </div>
              )}

              {/* Label Dimensions */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Largura (mm)</Label>
                  <Input
                    type="number"
                    value={formData.label_width_mm}
                    onChange={e => setFormData(prev => ({ ...prev, label_width_mm: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Altura (mm)</Label>
                  <Input
                    type="number"
                    value={formData.label_height_mm}
                    onChange={e => setFormData(prev => ({ ...prev, label_height_mm: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DPI</Label>
                  <Select 
                    value={String(formData.dpi)} 
                    onValueChange={v => setFormData(prev => ({ ...prev, dpi: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="203">203 DPI</SelectItem>
                      <SelectItem value="300">300 DPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Linguagem</Label>
                <Select 
                  value={formData.language} 
                  onValueChange={(v: LabelLanguage) => setFormData(prev => ({ ...prev, language: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div>
                          <span className="font-medium">{lang.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({lang.description})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Copies */}
              <div className="space-y-2">
                <Label>Cópias por Caixa</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.copies_per_box}
                  onChange={e => setFormData(prev => ({ ...prev, copies_per_box: Number(e.target.value) }))}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativa</Label>
                    <p className="text-xs text-muted-foreground">Impressora disponível para uso</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={v => setFormData(prev => ({ ...prev, is_active: v }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Padrão</Label>
                    <p className="text-xs text-muted-foreground">Usar como impressora principal</p>
                  </div>
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={v => setFormData(prev => ({ ...prev, is_default: v }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Impressão Automática</Label>
                    <p className="text-xs text-muted-foreground">Imprimir etiquetas ao sair pedido</p>
                  </div>
                  <Switch
                    checked={formData.auto_print_orders}
                    onCheckedChange={v => setFormData(prev => ({ ...prev, auto_print_orders: v }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!formData.name}>
                <Check className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Printers List */}
      {printers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-1">Nenhuma impressora de etiquetas</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione uma impressora para imprimir etiquetas nas caixas de embalagem
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Impressora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {printers.map(printer => (
            <Card key={printer.id} className={!printer.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Printer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{printer.name}</span>
                        {printer.is_default && (
                          <Badge variant="secondary" className="text-xs">Padrão</Badge>
                        )}
                        {!printer.is_active && (
                          <Badge variant="outline" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {PRINTER_TYPES.find(t => t.value === printer.printer_type)?.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {printer.language.toUpperCase()}
                        </Badge>
                        <span>
                          {printer.connection_type === 'network' 
                            ? `${printer.printer_host}:${printer.printer_port}`
                            : printer.printer_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(printer)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(printer.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
