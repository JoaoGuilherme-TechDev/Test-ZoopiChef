import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, CreditCard, Wallet, Building2, Loader2 } from 'lucide-react';
import { usePaymentMethods, PaymentMethod, PAYMENT_TYPES, PAYMENT_STATUS } from '@/hooks/usePaymentMethods';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { Textarea } from '@/components/ui/textarea';

export default function PaymentMethods() {
  const { methods, isLoading, createMethod, updateMethod, deleteMethod } = usePaymentMethods();
  const { activeAccounts } = useBankAccounts();
  const { accounts: chartAccounts } = useChartOfAccounts();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({
    name: '',
    payment_type: 'dinheiro',
    status: 'ativo',
    adjustment_percent: 0,
    allows_change: true,
    admin_fee_percent: 0,
    days_to_receive: 0,
    has_loyalty_points: false,
    loyalty_bonus_points: 0,
    is_fiado: false,
    allows_prepaid: false,
    requires_customer: false,
    notes: '',
  });

  const handleOpenCreate = () => {
    setEditingMethod(null);
    setFormData({
      name: '',
      payment_type: 'dinheiro',
      status: 'ativo',
      adjustment_percent: 0,
      allows_change: true,
      admin_fee_percent: 0,
      days_to_receive: 0,
      has_loyalty_points: false,
      loyalty_bonus_points: 0,
      is_fiado: false,
      allows_prepaid: false,
      requires_customer: false,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      payment_type: method.payment_type,
      status: method.status,
      adjustment_percent: method.adjustment_percent,
      allows_change: method.allows_change,
      admin_fee_percent: method.admin_fee_percent,
      days_to_receive: method.days_to_receive,
      bank_account_id: method.bank_account_id,
      chart_account_id: method.chart_account_id,
      has_loyalty_points: method.has_loyalty_points,
      loyalty_bonus_points: method.loyalty_bonus_points ?? 0,
      is_fiado: method.is_fiado,
      allows_prepaid: method.allows_prepaid,
      requires_customer: method.requires_customer,
      notes: method.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    
    if (editingMethod) {
      await updateMethod.mutateAsync({ id: editingMethod.id, ...formData });
    } else {
      await createMethod.mutateAsync({ ...formData, name: formData.name });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta forma de pagamento?')) {
      await deleteMethod.mutateAsync(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'desativado':
        return <Badge variant="secondary">Desativado</Badge>;
      case 'arquivado':
        return <Badge variant="destructive">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isFiadoType = formData.payment_type === 'conta_corrente' || formData.payment_type === 'caderneta';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Formas de Pagamento</h1>
            <p className="text-muted-foreground">Configure as formas de recebimento do seu estabelecimento</p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Forma
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="fiado">Fiado/Crédito</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Ajuste %</TableHead>
                        <TableHead>Taxa Adm.</TableHead>
                        <TableHead>Dias Receber</TableHead>
                        <TableHead>Troco</TableHead>
                        <TableHead>Fidelidade</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {methods.map((method) => (
                        <TableRow key={method.id}>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell>
                            {PAYMENT_TYPES.find(t => t.value === method.payment_type)?.label || method.payment_type}
                          </TableCell>
                          <TableCell>{getStatusBadge(method.status)}</TableCell>
                          <TableCell>{method.adjustment_percent}%</TableCell>
                          <TableCell>{method.admin_fee_percent}%</TableCell>
                          <TableCell>{method.days_to_receive} dias</TableCell>
                          <TableCell>{method.allows_change ? 'Sim' : 'Não'}</TableCell>
                          <TableCell>{method.has_loyalty_points ? 'Sim' : 'Não'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(method)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {methods.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Nenhuma forma de pagamento cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ajuste %</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methods.filter(m => m.status === 'ativo').map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell>
                          {PAYMENT_TYPES.find(t => t.value === method.payment_type)?.label || method.payment_type}
                        </TableCell>
                        <TableCell>{method.adjustment_percent}%</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(method)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiado">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Formas de Fiado / Conta Corrente
                </CardTitle>
                <CardDescription>
                  Formas de pagamento que permitem crédito pré-pago ou fiado para clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pré-pago</TableHead>
                      <TableHead>Fiado</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methods.filter(m => m.is_fiado || m.allows_prepaid).map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell>
                          {PAYMENT_TYPES.find(t => t.value === method.payment_type)?.label || method.payment_type}
                        </TableCell>
                        <TableCell>
                          <Badge variant={method.allows_prepaid ? 'default' : 'outline'}>
                            {method.allows_prepaid ? 'Sim' : 'Não'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={method.is_fiado ? 'default' : 'outline'}>
                            {method.is_fiado ? 'Sim' : 'Não'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(method)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Descrição *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da forma de pagamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Pagamento *</Label>
                  <Select
                    value={formData.payment_type}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      payment_type: value,
                      is_fiado: value === 'conta_corrente' || value === 'caderneta',
                      allows_prepaid: value === 'conta_corrente',
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Situação</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.icon} {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustment">Ajuste em Porcentagem</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="adjustment"
                      type="number"
                      step="0.01"
                      value={formData.adjustment_percent}
                      onChange={(e) => setFormData({ ...formData, adjustment_percent: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_fee">Taxa Administradora</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="admin_fee"
                      type="number"
                      step="0.01"
                      value={formData.admin_fee_percent}
                      onChange={(e) => setFormData({ ...formData, admin_fee_percent: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days">Dias para Cair na Conta</Label>
                  <Input
                    id="days"
                    type="number"
                    value={formData.days_to_receive}
                    onChange={(e) => setFormData({ ...formData, days_to_receive: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select
                    value={formData.bank_account_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, bank_account_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {activeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} {account.bank_name ? `- ${account.bank_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plano de Contas</Label>
                  <Select
                    value={formData.chart_account_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, chart_account_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {chartAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allows_change">Permite Troco</Label>
                  <Switch
                    id="allows_change"
                    checked={formData.allows_change}
                    onCheckedChange={(checked) => setFormData({ ...formData, allows_change: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="has_loyalty">Pontua Fidelidade</Label>
                    <Switch
                      id="has_loyalty"
                      checked={formData.has_loyalty_points}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_loyalty_points: checked, loyalty_bonus_points: checked ? (formData.loyalty_bonus_points || 0) : 0 })}
                    />
                  </div>
                  {formData.has_loyalty_points && (
                    <div className="mt-2">
                      <Label htmlFor="loyalty_bonus_points" className="text-xs">Pontos Bônus (adicional)</Label>
                      <Input
                        id="loyalty_bonus_points"
                        type="number"
                        min="0"
                        value={formData.loyalty_bonus_points || 0}
                        onChange={(e) => setFormData({ ...formData, loyalty_bonus_points: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pontos extras ao usar esta forma de pagamento
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isFiadoType && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="is_fiado">Permite Fiado</Label>
                        <p className="text-xs text-muted-foreground">Cliente compra e paga depois</p>
                      </div>
                      <Switch
                        id="is_fiado"
                        checked={formData.is_fiado}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          is_fiado: checked,
                          requires_customer: checked ? true : formData.requires_customer 
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allows_prepaid">Permite Pré-pago</Label>
                        <p className="text-xs text-muted-foreground">Cliente deposita antes</p>
                      </div>
                      <Switch
                        id="allows_prepaid"
                        checked={formData.allows_prepaid}
                        onCheckedChange={(checked) => setFormData({ ...formData, allows_prepaid: checked })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <Label htmlFor="requires_customer" className="text-orange-500 font-medium">
                        Obriga Vincular Cliente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Fiado/crediário precisa de cliente identificado
                      </p>
                    </div>
                    <Switch
                      id="requires_customer"
                      checked={formData.requires_customer || formData.is_fiado}
                      disabled={formData.is_fiado}
                      onCheckedChange={(checked) => setFormData({ ...formData, requires_customer: checked })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={createMethod.isPending || updateMethod.isPending || !formData.name}
              >
                {(createMethod.isPending || updateMethod.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
