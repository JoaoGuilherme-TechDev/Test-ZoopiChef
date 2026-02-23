import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { PurchaseEntryDialog } from '../components/PurchaseEntryDialog';
import { NFeWizardDialog } from '../components/NFeWizardDialog';
import { useERPPurchases } from '../hooks/useERPPurchases';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Check, Loader2, Trash2, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ENTRY_STATUS_LABELS } from '../types';
import type { ERPPurchaseEntryFormData } from '../types';

export default function ERPPurchasesPage() {
  const { entries, isLoading, createEntry, postEntry, deleteEntry } = useERPPurchases();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nfeDialogOpen, setNfeDialogOpen] = useState(false);

  const handleCreate = async (data: ERPPurchaseEntryFormData) => {
    await createEntry.mutateAsync(data);
    setDialogOpen(false);
  };

  const handlePost = async (entryId: string) => {
    if (confirm('Confirma o lançamento desta entrada? O estoque e custos serão atualizados.')) {
      await postEntry.mutateAsync(entryId);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (confirm('Confirma a exclusão desta entrada?')) {
      await deleteEntry.mutateAsync(entryId);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Compras / Entradas">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Compras / Entradas">
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Registre entradas de compra para atualizar estoque e custo médio dos insumos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNfeDialogOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              <Sparkles className="w-3 h-3 mr-1 text-purple-500" />
              Importar NF-e
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Nº Nota</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const itemsTotal = (entry.items || []).reduce((sum, i) => sum + i.total_cost, 0);
              const total = itemsTotal + (entry.freight || 0) + (entry.taxes || 0);

              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{entry.supplier?.name || '-'}</TableCell>
                  <TableCell>{entry.invoice_number || '-'}</TableCell>
                  <TableCell className="text-center">{entry.items?.length || 0}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'}>
                      {ENTRY_STATUS_LABELS[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.status === 'draft' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePost(entry.id)}
                          disabled={postEntry.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Lançar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteEntry.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {entry.status === 'posted' && entry.posted_at && (
                      <span className="text-xs text-muted-foreground">
                        Lançado em {format(new Date(entry.posted_at), 'dd/MM HH:mm')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma entrada de compra registrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <PurchaseEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isLoading={createEntry.isPending}
      />

      <NFeWizardDialog
        open={nfeDialogOpen}
        onOpenChange={setNfeDialogOpen}
        onComplete={() => {}}
      />
    </ERPInventoryLayout>
  );
}
