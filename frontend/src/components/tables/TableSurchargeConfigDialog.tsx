import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTableSurchargeRanges, TableSurchargeRange } from '@/hooks/useTableSurchargeRanges';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';

interface TableSurchargeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableSurchargeConfigDialog({ open, onOpenChange }: TableSurchargeConfigDialogProps) {
  const { ranges, createRange, updateRange, deleteRange, isLoading } = useTableSurchargeRanges();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startNumber: '',
    endNumber: '',
    surchargePercentage: '',
  });

  const resetForm = () => {
    setFormData({ startNumber: '', endNumber: '', surchargePercentage: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    const start = parseInt(formData.startNumber);
    const end = parseInt(formData.endNumber);
    const percentage = parseFloat(formData.surchargePercentage);

    if (isNaN(start) || isNaN(end) || isNaN(percentage)) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    if (start > end) {
      toast.error('Mesa inicial deve ser menor ou igual à final');
      return;
    }

    try {
      await createRange.mutateAsync({
        startNumber: start,
        endNumber: end,
        surchargePercentage: percentage,
      });
      toast.success('Faixa de acréscimo criada!');
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar faixa');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    const start = parseInt(formData.startNumber);
    const end = parseInt(formData.endNumber);
    const percentage = parseFloat(formData.surchargePercentage);

    if (isNaN(start) || isNaN(end) || isNaN(percentage)) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    try {
      await updateRange.mutateAsync({
        id: editingId,
        start_number: start,
        end_number: end,
        surcharge_percentage: percentage,
      });
      toast.success('Faixa atualizada!');
      resetForm();
    } catch (error) {
      toast.error('Erro ao atualizar faixa');
    }
  };

  const handleEdit = (range: TableSurchargeRange) => {
    setEditingId(range.id);
    setFormData({
      startNumber: range.start_number.toString(),
      endNumber: range.end_number.toString(),
      surchargePercentage: range.surcharge_percentage.toString(),
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta faixa de acréscimo?')) return;
    
    try {
      await deleteRange.mutateAsync(id);
      toast.success('Faixa removida!');
    } catch (error) {
      toast.error('Erro ao remover faixa');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Acréscimos por Faixa de Mesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure o percentual de acréscimo (taxa de serviço) por faixa de mesas.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesa Inicial</TableHead>
                    <TableHead>Mesa Final</TableHead>
                    <TableHead>Acréscimo (%)</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma faixa configurada
                      </TableCell>
                    </TableRow>
                  ) : (
                    ranges.map((range) => (
                      <TableRow key={range.id}>
                        <TableCell>{range.start_number}</TableCell>
                        <TableCell>{range.end_number}</TableCell>
                        <TableCell>{range.surcharge_percentage}%</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(range)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(range.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {isAdding ? (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Mesa Inicial</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.startNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, startNumber: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mesa Final</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.endNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, endNumber: e.target.value }))}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Acréscimo (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.surchargePercentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, surchargePercentage: e.target.value }))}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={resetForm}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={editingId ? handleUpdate : handleAdd}
                      disabled={createRange.isPending || updateRange.isPending}
                    >
                      {(createRange.isPending || updateRange.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Faixa
                </Button>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
