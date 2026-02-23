import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { SupplierDetailPanel } from '../components/SupplierDetailPanel';
import { SupplierRatingDialog } from '../components/SupplierRatingDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, Search, Star, Phone, Mail, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  payment_terms?: string;
  credit_limit_cents?: number;
  tax_id?: string;
  avg_rating?: number;
  total_purchases_cents?: number;
  last_purchase_at?: string;
  created_at: string;
}

interface SupplierFormData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  payment_terms?: string;
  credit_limit_cents?: number;
  tax_id?: string;
}

export default function ERPSuppliersPage() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    payment_terms: '30 dias',
    tax_id: '',
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['erp-suppliers', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_suppliers')
        .select('*')
        .eq('company_id', company!.id)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!company?.id,
  });

  const createSupplier = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const { data: result, error } = await supabase
        .from('erp_suppliers')
        .insert({ ...data, company_id: company!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      toast.success('Fornecedor criado com sucesso!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao criar fornecedor');
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierFormData }) => {
      const { data: result, error } = await supabase
        .from('erp_suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      toast.success('Fornecedor atualizado!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao atualizar fornecedor');
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('erp_suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      toast.success('Fornecedor excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir fornecedor');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      payment_terms: '30 dias',
      tax_id: '',
    });
    setEditingSupplier(null);
    setDialogOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      payment_terms: supplier.payment_terms || '30 dias',
      tax_id: supplier.tax_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingSupplier) {
      updateSupplier.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createSupplier.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      deleteSupplier.mutate(id);
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
  };

  const handleRate = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setRatingOpen(true);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Fornecedores">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Fornecedores">
      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead className="text-center">Avaliação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {supplier.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {supplier.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{supplier.tax_id || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{supplier.payment_terms || '30 dias'}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {supplier.avg_rating ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{Number(supplier.avg_rating).toFixed(1)}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRate(supplier)}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      Avaliar
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(supplier)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSuppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@fornecedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Condição de Pagamento</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="30 dias"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas sobre o fornecedor..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createSupplier.isPending || updateSupplier.isPending}
              >
                {editingSupplier ? 'Salvar Alterações' : 'Criar Fornecedor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <SupplierDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        supplier={selectedSupplier}
      />

      {/* Rating Dialog */}
      {selectedSupplier && (
        <SupplierRatingDialog
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          supplierId={selectedSupplier.id}
          supplierName={selectedSupplier.name}
        />
      )}
    </ERPInventoryLayout>
  );
}
