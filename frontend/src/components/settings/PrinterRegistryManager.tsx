import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Printer, Plus, Trash2, Settings, Network, Usb, Star, Edit } from 'lucide-react';
import { usePrinterRegistry, JOB_TYPE_LABELS, type Printer as PrinterType } from '@/hooks/usePrinterRegistry';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import { Skeleton } from '@/components/ui/skeleton';

interface PrinterFormData {
  name: string;
  printer_type: 'network' | 'usb';
  printer_host: string;
  printer_port: number;
  printer_name: string;
  paper_width: number;
  encoding: string;
  beep_on_print: boolean;
  cut_after_print: boolean;
  copies: number;
  is_default: boolean;
}

const defaultFormData: PrinterFormData = {
  name: '',
  printer_type: 'network',
  printer_host: '',
  printer_port: 9100,
  printer_name: '',
  paper_width: 80,
  encoding: 'cp860',
  beep_on_print: true,
  cut_after_print: true,
  copies: 1,
  is_default: false,
};

export function PrinterRegistryManager() {
  const { printers, routings, isLoading, createPrinter, updatePrinter, deletePrinter, createRouting, deleteRouting } = usePrinterRegistry();
  const { sectors } = usePrintSectors();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [routingDialogOpen, setRoutingDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [formData, setFormData] = useState<PrinterFormData>(defaultFormData);
  
  const [routingForm, setRoutingForm] = useState({
    printer_id: '',
    job_type: '',
    print_sector_id: '',
  });

  const handleOpenCreate = () => {
    setEditingPrinter(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (printer: PrinterType) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      printer_type: printer.printer_type,
      printer_host: printer.printer_host || '',
      printer_port: printer.printer_port,
      printer_name: printer.printer_name || '',
      paper_width: printer.paper_width,
      encoding: printer.encoding,
      beep_on_print: printer.beep_on_print,
      cut_after_print: printer.cut_after_print,
      copies: printer.copies,
      is_default: printer.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: formData.name,
      printer_type: formData.printer_type,
      printer_host: formData.printer_type === 'network' ? formData.printer_host : null,
      printer_port: formData.printer_type === 'network' ? formData.printer_port : 9100,
      printer_name: formData.printer_type === 'usb' ? formData.printer_name : null,
      paper_width: formData.paper_width,
      encoding: formData.encoding,
      beep_on_print: formData.beep_on_print,
      cut_after_print: formData.cut_after_print,
      copies: formData.copies,
      is_default: formData.is_default,
      is_active: true,
    };

    if (editingPrinter) {
      await updatePrinter.mutateAsync({ id: editingPrinter.id, ...data });
    } else {
      await createPrinter.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleAddRouting = async () => {
    if (!routingForm.printer_id) return;
    
    await createRouting.mutateAsync({
      printer_id: routingForm.printer_id,
      job_type: routingForm.job_type || null,
      print_sector_id: routingForm.print_sector_id || null,
    });
    
    setRoutingForm({ printer_id: '', job_type: '', print_sector_id: '' });
    setRoutingDialogOpen(false);
  };

  const getRoutingsForPrinter = (printerId: string) => {
    return routings.filter(r => r.printer_id === printerId);
  };

  const getRoutingLabel = (routing: typeof routings[0]) => {
    const parts: string[] = [];
    
    if (routing.job_type) {
      parts.push(JOB_TYPE_LABELS[routing.job_type] || routing.job_type);
    }
    
    if (routing.print_sector_id) {
      const sector = sectors.find(s => s.id === routing.print_sector_id);
      if (sector) parts.push(`Setor: ${sector.name}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Todos os tipos';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Impressoras Cadastradas</h3>
          <p className="text-sm text-muted-foreground">
            Configure as impressoras e defina qual tipo de documento cada uma imprime
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Impressora
        </Button>
      </div>

      {printers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Printer className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">Nenhuma impressora cadastrada</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre suas impressoras térmicas para começar a imprimir automaticamente
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Impressora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {printers.map((printer) => (
            <Card key={printer.id} className={!printer.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {printer.printer_type === 'network' ? (
                      <Network className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Usb className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {printer.name}
                        {printer.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                        {!printer.is_active && (
                          <Badge variant="outline" className="text-xs">Inativa</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {printer.printer_type === 'network' 
                          ? `${printer.printer_host}:${printer.printer_port}`
                          : `USB: ${printer.printer_name}`
                        }
                        {' • '}
                        {printer.paper_width}mm
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(printer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir impressora?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá a impressora "{printer.name}" e todos os roteamentos associados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePrinter.mutate(printer.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Roteamentos:</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setRoutingForm({ printer_id: printer.id, job_type: '', print_sector_id: '' });
                        setRoutingDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {getRoutingsForPrinter(printer.id).length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {printer.is_default ? 'Impressora padrão para tipos não mapeados' : 'Nenhum roteamento definido'}
                      </span>
                    ) : (
                      getRoutingsForPrinter(printer.id).map((routing) => (
                        <Badge 
                          key={routing.id} 
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {getRoutingLabel(routing)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 hover:bg-destructive/20"
                            onClick={() => deleteRouting.mutate(routing.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para criar/editar impressora */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}</DialogTitle>
            <DialogDescription>
              Configure os detalhes da impressora térmica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Cozinha Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conexão</Label>
              <Select
                value={formData.printer_type}
                onValueChange={(v) => setFormData({ ...formData, printer_type: v as 'network' | 'usb' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Rede (IP)</SelectItem>
                  <SelectItem value="usb">USB/Windows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.printer_type === 'network' ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>IP da Impressora</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={formData.printer_host}
                    onChange={(e) => setFormData({ ...formData, printer_host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    type="number"
                    value={formData.printer_port}
                    onChange={(e) => setFormData({ ...formData, printer_port: parseInt(e.target.value) || 9100 })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Nome do Compartilhamento</Label>
                <Input
                  placeholder="Ex: Server"
                  value={formData.printer_name}
                  onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Nome exato do compartilhamento Windows (Painel de Controle → Impressoras)
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Largura do Papel</Label>
                <Select
                  value={String(formData.paper_width)}
                  onValueChange={(v) => setFormData({ ...formData, paper_width: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm</SelectItem>
                    <SelectItem value="80">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cópias</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.copies}
                  onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Bip ao imprimir</Label>
              <Switch
                checked={formData.beep_on_print}
                onCheckedChange={(v) => setFormData({ ...formData, beep_on_print: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Cortar papel</Label>
              <Switch
                checked={formData.cut_after_print}
                onCheckedChange={(v) => setFormData({ ...formData, cut_after_print: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Impressora padrão</Label>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || (formData.printer_type === 'network' && !formData.printer_host) || (formData.printer_type === 'usb' && !formData.printer_name)}
            >
              {editingPrinter ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar roteamento */}
      <Dialog open={routingDialogOpen} onOpenChange={setRoutingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Roteamento</DialogTitle>
            <DialogDescription>
              Defina quais tipos de documento esta impressora deve imprimir
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select
                value={routingForm.job_type}
                onValueChange={(v) => setRoutingForm({ ...routingForm, job_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(routingForm.job_type === 'order' || routingForm.job_type === '') && sectors.length > 0 && (
              <div className="space-y-2">
                <Label>Setor de Produção (opcional)</Label>
                <Select
                  value={routingForm.print_sector_id}
                  onValueChange={(v) => setRoutingForm({ ...routingForm, print_sector_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os setores</SelectItem>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRouting}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
