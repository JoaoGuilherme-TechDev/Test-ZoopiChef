import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTables, Table } from '@/hooks/useTables';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { TableBatchCreateDialog } from '@/components/tables/TableBatchCreateDialog';
import { TableQRCodeDialog } from '@/components/tables/TableQRCodeDialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  QrCode, 
  LayoutGrid,
  Loader2,
  UtensilsCrossed,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TablesRegister() {
  const { tables, activeTables, isLoading, createTable, updateTable, deleteTable } = useTables();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({ number: '', name: '' });
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);

  const handleSaveTable = async () => {
    const num = parseInt(formData.number);
    if (isNaN(num) || num <= 0) {
      toast.error('Número da mesa inválido');
      return;
    }

    try {
      if (editingTable) {
        await updateTable.mutateAsync({
          id: editingTable.id,
          number: num,
          name: formData.name || null,
        });
        toast.success('Mesa atualizada!');
      } else {
        await createTable.mutateAsync({
          number: num,
          name: formData.name || undefined,
        });
        toast.success('Mesa criada!');
      }
      setIsDialogOpen(false);
      setEditingTable(null);
      setFormData({ number: '', name: '' });
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        toast.error('Já existe uma mesa com esse número');
      } else {
        toast.error('Erro ao salvar mesa');
      }
    }
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({ number: String(table.number), name: table.name || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta mesa?')) return;
    try {
      await deleteTable.mutateAsync(id);
      toast.success('Mesa removida!');
    } catch {
      toast.error('Erro ao remover mesa');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Cadastro de Mesas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Cadastro de Mesas">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tables">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <LayoutGrid className="h-6 w-6 text-primary" />
                Cadastro de Mesas
              </h1>
              <p className="text-muted-foreground">
                {activeTables.length} mesas cadastradas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBatchCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar em Lote
            </Button>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingTable(null);
                  setFormData({ number: '', name: '' });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTable ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Número da Mesa *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="Ex: 1, 2, 3..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome (opcional)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Varanda, VIP, Área externa..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTable} disabled={createTable.isPending || updateTable.isPending}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tables Grid */}
        {tables.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <UtensilsCrossed className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma mesa cadastrada</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie suas mesas individualmente ou em lote para começar a usar o módulo de mesas
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setBatchCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar em Lote
                </Button>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {tables.map((table) => (
              <Card 
                key={table.id} 
                className={`relative group hover:shadow-lg transition-all ${!table.active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-4">
                  {/* Table Icon */}
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl flex items-center justify-center shadow-inner">
                      <UtensilsCrossed className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  
                  {/* Table Number */}
                  <div className="text-center mb-2">
                    <p className="text-3xl font-bold">{table.number}</p>
                    {table.name && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{table.name}</p>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex justify-center mb-3">
                    <Badge variant={table.active ? 'default' : 'secondary'} className="text-xs">
                      {table.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={() => {
                        setSelectedTable(table);
                        setQrCodeDialogOpen(true);
                      }}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={() => handleEdit(table)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:text-destructive" 
                      onClick={() => handleDelete(table.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TableBatchCreateDialog 
        open={batchCreateOpen} 
        onOpenChange={setBatchCreateOpen} 
      />

      {selectedTable && (
        <TableQRCodeDialog
          open={qrCodeDialogOpen}
          onOpenChange={setQrCodeDialogOpen}
          table={selectedTable}
        />
      )}
    </DashboardLayout>
  );
}
