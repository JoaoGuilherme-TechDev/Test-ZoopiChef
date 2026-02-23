import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, GripVertical, Palette } from 'lucide-react';
import {
  useFlavorHighlightGroups,
  useCreateFlavorHighlightGroup,
  useUpdateFlavorHighlightGroup,
  useDeleteFlavorHighlightGroup,
  FlavorHighlightGroup,
} from '@/hooks/useFlavorHighlightGroups';
import { toast } from 'sonner';

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#6B7280', '#78716C',
];

export default function FlavorHighlightGroups() {
  const { data: groups = [], isLoading } = useFlavorHighlightGroups();
  const createGroup = useCreateFlavorHighlightGroup();
  const updateGroup = useUpdateFlavorHighlightGroup();
  const deleteGroup = useDeleteFlavorHighlightGroup();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FlavorHighlightGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    sort_order: 0,
    active: true,
  });

  const openCreateDialog = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      color: '#6B7280',
      sort_order: groups.length * 10,
      active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (group: FlavorHighlightGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#6B7280',
      sort_order: group.sort_order,
      active: group.active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          ...formData,
        });
      } else {
        await createGroup.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este grupo de destaque?')) return;
    await deleteGroup.mutateAsync(id);
  };

  const handleToggleActive = async (group: FlavorHighlightGroup) => {
    await updateGroup.mutateAsync({
      id: group.id,
      active: !group.active,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Destaques de Sabor</h1>
            <p className="text-muted-foreground">
              Gerencie os grupos de destaque para organizar seus sabores (ex: Frango, Calabresa, Queijo)
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Destaque
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grupos de Destaque</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum grupo cadastrado. Clique em "Novo Destaque" para criar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          {group.sort_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: group.color, color: '#fff' }}
                          className="font-medium"
                        >
                          {group.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: group.color }}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {group.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={group.active}
                          onCheckedChange={() => handleToggleActive(group)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(group.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent aria-describedby="flavor-highlight-dialog-description">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Editar Destaque' : 'Novo Destaque'}
              </DialogTitle>
              <p id="flavor-highlight-dialog-description" className="sr-only">
                Formulário para {editingGroup ? 'editar' : 'criar'} grupo de destaque de sabor
              </p>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Frango, Calabresa, Doces..."
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional do grupo"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cor do Badge
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="mt-2 w-20 h-10 p-1"
                />
              </div>

              <div>
                <Label htmlFor="sort_order">Ordem de Exibição</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createGroup.isPending || updateGroup.isPending}
              >
                {editingGroup ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
