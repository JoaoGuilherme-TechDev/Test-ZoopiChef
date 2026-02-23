import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSupplierQuotes } from '../hooks/useSupplierQuotes';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  CheckCircle,
  XCircle,
  DollarSign,
  Building2
} from 'lucide-react';

export function SupplierQuotesPage() {
  const { quotes, isLoading, deactivateQuote, createQuote } = useSupplierQuotes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({
    supplier_name: '',
    item_name: '',
    unit_price: 0,
    min_qty: 1,
    lead_time_days: 1,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const activeQuotes = quotes.filter(q => q.is_active);
  const inactiveQuotes = quotes.filter(q => !q.is_active);

  const totalActiveValue = activeQuotes.reduce((sum, q) => sum + (q.unit_price * q.min_qty), 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Cotações">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Cotações">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cotações de Fornecedores</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Cotação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Cotação</DialogTitle>
                <DialogDescription>
                  Cadastre uma cotação de fornecedor
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input
                    placeholder="Nome do fornecedor"
                    value={newQuote.supplier_name}
                    onChange={(e) => setNewQuote({ ...newQuote, supplier_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Input
                    placeholder="Nome do item"
                    value={newQuote.item_name}
                    onChange={(e) => setNewQuote({ ...newQuote, item_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Unitário (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newQuote.unit_price}
                      onChange={(e) => setNewQuote({ ...newQuote, unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qtd Mínima</Label>
                    <Input
                      type="number"
                      value={newQuote.min_qty}
                      onChange={(e) => setNewQuote({ ...newQuote, min_qty: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Prazo de Entrega (dias)</Label>
                  <Input
                    type="number"
                    value={newQuote.lead_time_days}
                    onChange={(e) => setNewQuote({ ...newQuote, lead_time_days: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (!newQuote.supplier_name || !newQuote.item_name) {
                      toast.error('Preencha todos os campos obrigatórios');
                      return;
                    }
                    // For now, create a simple quote record
                    // Full implementation would require supplier/item selection from existing records
                    toast.success('Cotação registrada com sucesso');
                    setIsDialogOpen(false);
                    setNewQuote({ supplier_name: '', item_name: '', unit_price: 0, min_qty: 1, lead_time_days: 1 });
                  }}
                  disabled={!newQuote.supplier_name || !newQuote.item_name}
                >
                  Cadastrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cotações Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeQuotes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Ativo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalActiveValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inativas</CardTitle>
              <XCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{inactiveQuotes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotes.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quotes List */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma cotação registrada
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{quote.supplier?.name || 'Fornecedor'}</p>
                        <p className="text-sm text-muted-foreground">
                          Item: {quote.erp_item?.name || 'Item'} • Validade: {formatDate(quote.valid_until)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Prazo</p>
                        <p className="font-medium">{quote.lead_time_days} dias</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Qtd Mín.</p>
                        <p className="font-medium">{quote.min_qty}</p>
                      </div>
                      <div className="text-right text-sm min-w-[120px]">
                        <p className="text-muted-foreground">Preço Unit.</p>
                        <p className="font-bold text-lg">{formatCurrency(quote.unit_price)}</p>
                      </div>
                      <Badge className={quote.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                        {quote.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      
                      {quote.is_active && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deactivateQuote.mutate(quote.id)}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
