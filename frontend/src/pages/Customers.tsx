import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCustomers, useCustomerOrders, Customer } from '@/hooks/useCustomers';
import { useCustomerCredit, useCustomersWithCredit } from '@/hooks/useCustomerCredit';
import { useCustomerAddresses, CustomerAddress } from '@/hooks/useCustomerAddresses';
import { useProfile } from '@/hooks/useProfile';
import { useSendWhatsApp } from '@/hooks/useWhatsAppMessages';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyGeneralSettings } from '@/hooks/useCompanyGeneralSettings';
import { useCustomerLookup } from '@/hooks/useCustomerLookup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Pencil, Trash2, History, Phone, User, AlertTriangle, 
  MessageCircle, Send, MapPin, Wallet, DollarSign, Settings,
  ArrowUpCircle, ArrowDownCircle, FileText, Loader2, Star, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { printCreditStatement, CreditStatementData } from '@/lib/print/creditStatement';

interface ExtendedCustomer extends Customer {
  block_reason?: string | null;
  internal_notes?: string | null;
  allow_marketing?: boolean;
  preferred_channel?: string;
}

export default function Customers() {
  const { customers, isLoading, createCustomer, updateCustomer, deleteCustomer, refetch } = useCustomers();
  const { customersWithCredit } = useCustomersWithCredit();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  const { data: generalSettings } = useCompanyGeneralSettings();
  const sendWhatsApp = useSendWhatsApp();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ExtendedCustomer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
    document: '',
    alerts: '',
    internal_notes: '',
    allow_credit: true,
    credit_limit: '',
    is_blocked: false,
    block_reason: '',
    allow_marketing: true,
    preferred_channel: 'whatsapp',
    birthdate: '',
  });
  const [messageDialogCustomer, setMessageDialogCustomer] = useState<Customer | null>(null);
  const [messageText, setMessageText] = useState('');

  // Customer lookup for duplicate detection
  const [existingCustomerWarning, setExistingCustomerWarning] = useState<{ name: string; id: string } | null>(null);
  
  const customerLookup = useCustomerLookup({
    onCustomerFound: (foundCustomer) => {
      setExistingCustomerWarning({ name: foundCustomer.name, id: foundCustomer.id });
    },
    onCustomerNotFound: () => {
      setExistingCustomerWarning(null);
    },
  });

  // Handle whatsapp change with lookup
  const handleWhatsAppChange = (value: string) => {
    setFormData(prev => ({ ...prev, whatsapp: value }));
    customerLookup.searchWithDebounce(value, 600);
  };

  // Clear warning when dialog closes
  useEffect(() => {
    if (!isCreateOpen) {
      setExistingCustomerWarning(null);
      customerLookup.reset();
    }
  }, [isCreateOpen]);

  // Customer details hooks
  const { transactions, customerBalance, receivePayment } = useCustomerCredit(selectedCustomer?.id);
  const { addresses, createAddress, updateAddress, deleteAddress, setDefault, isLoading: addressesLoading } = useCustomerAddresses(selectedCustomer?.id);
  const { data: customerOrders = [] } = useCustomerOrders(selectedCustomer?.id || null);

  // Address form
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    reference: '',
  });

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  // Filter customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp.includes(searchTerm)
  );

  const handleSendMessage = async () => {
    if (!messageDialogCustomer || !messageText.trim()) return;
    
    await sendWhatsApp.mutateAsync({
      phone: messageDialogCustomer.whatsapp,
      message: messageText.trim(),
      customerId: messageDialogCustomer.id,
    });
    
    setMessageDialogCustomer(null);
    setMessageText('');
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.whatsapp) {
      toast.error('Preencha nome e WhatsApp');
      return;
    }

    // Validate based on general settings
    if (generalSettings?.require_cpf_cnpj && !formData.document?.trim()) {
      toast.error('CPF/CNPJ é obrigatório');
      return;
    }

    if (generalSettings?.cpf_behavior === 'show_required' && !formData.document?.trim()) {
      toast.error('CPF/CNPJ é obrigatório');
      return;
    }

    if (generalSettings?.birthdate_behavior === 'require' && !formData.birthdate) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }

    // Check for duplicate document if not allowed
    if (!generalSettings?.allow_duplicate_cpf_cnpj && formData.document?.trim()) {
      const extendedCustomers = customers as ExtendedCustomer[];
      const existingCustomer = extendedCustomers.find(
        c => c.document === formData.document?.trim() && c.id !== selectedCustomer?.id
      );
      if (existingCustomer) {
        toast.error('Já existe um cliente com este CPF/CNPJ');
        return;
      }
    }

    // Check for duplicate email if not allowed
    if (!generalSettings?.allow_duplicate_email && formData.email?.trim()) {
      const extendedCustomers = customers as ExtendedCustomer[];
      const existingCustomer = extendedCustomers.find(
        c => c.email?.toLowerCase() === formData.email?.toLowerCase().trim() && c.id !== selectedCustomer?.id
      );
      if (existingCustomer) {
        toast.error('Já existe um cliente com este email');
        return;
      }
    }

    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      await createCustomer.mutateAsync({
        name: formData.name,
        whatsapp: formData.whatsapp,
        company_id: profile.company_id,
      });
      
      toast.success('Cliente cadastrado com sucesso');
      setFormData({
        name: '', whatsapp: '', email: '', document: '', alerts: '',
        internal_notes: '', allow_credit: true, credit_limit: '',
        is_blocked: false, block_reason: '', allow_marketing: true, preferred_channel: 'whatsapp',
        birthdate: '',
      });
      setIsCreateOpen(false);
    } catch {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleUpdate = async () => {
    if (!selectedCustomer) return;

    try {
      // Use basic update with only known fields
      const updateData: Record<string, unknown> = {
        id: selectedCustomer.id,
        name: formData.name,
        whatsapp: formData.whatsapp,
        alerts: formData.alerts || null,
      };
      
      await updateCustomer.mutateAsync(updateData as { id: string; name?: string; whatsapp?: string; alerts?: string | null });
      
      toast.success('Cliente atualizado com sucesso');
      refetch();
    } catch {
      toast.error('Erro ao atualizar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      await deleteCustomer.mutateAsync(id);
      toast.success('Cliente excluído com sucesso');
      setSelectedCustomer(null);
    } catch {
      toast.error('Erro ao excluir cliente');
    }
  };

  const openCustomerDetails = (customer: Customer) => {
    const extCustomer = customer as ExtendedCustomer;
    setSelectedCustomer(extCustomer);
    setFormData({
      name: customer.name,
      whatsapp: customer.whatsapp,
      email: extCustomer.email || '',
      document: extCustomer.document || '',
      alerts: customer.alerts || '',
      internal_notes: extCustomer.internal_notes || '',
      allow_credit: extCustomer.allow_credit ?? true,
      credit_limit: extCustomer.credit_limit?.toString() || '',
      is_blocked: extCustomer.is_blocked ?? false,
      block_reason: extCustomer.block_reason || '',
      allow_marketing: extCustomer.allow_marketing ?? true,
      preferred_channel: extCustomer.preferred_channel || 'whatsapp',
      birthdate: '',
    });
  };

  const handleSaveAddress = async () => {
    if (!selectedCustomer || !company?.id) return;
    
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood || !addressForm.city) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({
          id: editingAddress.id,
          ...addressForm,
        });
      } else {
        await createAddress.mutateAsync({
          customer_id: selectedCustomer.id,
          ...addressForm,
          is_default: false,
          latitude: null,
          longitude: null,
        });
      }
      setAddressDialogOpen(false);
      setEditingAddress(null);
      setAddressForm({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', cep: '', reference: '' });
    } catch {
      toast.error('Erro ao salvar endereço');
    }
  };

  const handleReceivePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;

    await receivePayment.mutateAsync({
      customerId: selectedCustomer.id,
      amount: parseFloat(paymentAmount),
      paymentMethod,
    });

    setPaymentDialogOpen(false);
    setPaymentAmount('');
  };

  const handlePrintStatement = () => {
    if (!selectedCustomer || !company) {
      toast.error('Dados insuficientes');
      return;
    }

    const statementData: CreditStatementData = {
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        whatsapp: selectedCustomer.whatsapp,
      },
      summary: {
        currentBalance: customerBalance,
        creditLimit: (selectedCustomer as ExtendedCustomer).credit_limit ?? undefined,
        status: (selectedCustomer as ExtendedCustomer).is_blocked ? 'blocked' : 'active',
      },
      transactions: transactions.map(tx => ({
        id: tx.id,
        created_at: tx.created_at,
        transaction_type: tx.transaction_type,
        order_id: tx.order_id,
        amount: tx.amount,
        balance_after: tx.balance_after,
        notes: tx.notes,
      })),
      companyName: company.name || 'Empresa',
    };

    printCreditStatement(statementData);
    toast.success('Extrato enviado para impressão');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const statusLabels: Record<string, string> = {
    novo: 'Novo', preparo: 'Preparo', pronto: 'Pronto', em_rota: 'Em Rota', entregue: 'Entregue',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Clientes</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <div className="relative">
                    <Input 
                      value={formData.whatsapp} 
                      onChange={(e) => handleWhatsAppChange(e.target.value)} 
                    />
                    {customerLookup.isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {existingCustomerWarning && (
                  <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <UserCheck className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      Cliente já cadastrado: <strong>{existingCustomerWarning.name}</strong>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="ml-2 h-auto p-0 text-amber-700 dark:text-amber-400 underline"
                        onClick={() => {
                          const customer = customers.find(c => c.id === existingCustomerWarning.id);
                          if (customer) {
                            openCustomerDetails(customer);
                            setIsCreateOpen(false);
                          }
                        }}
                      >
                        Ver detalhes
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleCreate} className="w-full" disabled={createCustomer.isPending || !!existingCustomerWarning}>
                  {existingCustomerWarning ? 'Cliente já existe' : 'Cadastrar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Input 
            placeholder="Buscar por nome ou telefone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Customer List */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes ({filteredCustomers.length})</CardTitle>
              <CardDescription>Selecione para ver detalhes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
                ) : (
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => {
                      const extCustomer = customer as ExtendedCustomer;
                      const hasCredit = customersWithCredit.find(c => c.id === customer.id);
                      return (
                        <div
                          key={customer.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedCustomer?.id === customer.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => openCustomerDetails(customer)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {customer.name}
                                  {extCustomer.is_blocked && (
                                    <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.whatsapp}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {hasCredit && (
                                <p className="font-bold text-orange-600 text-sm">
                                  {formatCurrency(Number(hasCredit.credit_balance))}
                                </p>
                              )}
                              {customer.alerts && (
                                <AlertTriangle className="h-4 w-4 text-destructive inline" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCustomer ? selectedCustomer.name : 'Selecione um cliente'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCustomer ? (
                <div className="text-center py-12 text-muted-foreground">
                  Clique em um cliente para ver os detalhes
                </div>
              ) : (
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info">Dados</TabsTrigger>
                    <TabsTrigger value="addresses">Endereços</TabsTrigger>
                    <TabsTrigger value="credit">Fiado</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                  </TabsList>

                  {/* Info Tab */}
                  <TabsContent value="info" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>WhatsApp</Label>
                        <Input value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Documento</Label>
                        <Input value={formData.document} onChange={(e) => setFormData({ ...formData, document: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Alertas (visível nos pedidos)</Label>
                      <Textarea value={formData.alerts} onChange={(e) => setFormData({ ...formData, alerts: e.target.value })} rows={2} />
                    </div>

                    <div className="space-y-2">
                      <Label>Observações Internas</Label>
                      <Textarea value={formData.internal_notes} onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })} rows={2} />
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Regras de Fiado
                      </h4>
                      <div className="flex items-center justify-between">
                        <Label>Permitir Fiado</Label>
                        <Switch checked={formData.allow_credit} onCheckedChange={(v) => setFormData({ ...formData, allow_credit: v })} />
                      </div>
                      {formData.allow_credit && (
                        <div className="space-y-2">
                          <Label>Limite de Fiado (R$)</Label>
                          <Input type="number" step="0.01" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })} placeholder="Sem limite" />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label className="text-destructive">Cliente Bloqueado</Label>
                        <Switch checked={formData.is_blocked} onCheckedChange={(v) => setFormData({ ...formData, is_blocked: v })} />
                      </div>
                      {formData.is_blocked && (
                        <div className="space-y-2">
                          <Label>Motivo do Bloqueio</Label>
                          <Input value={formData.block_reason} onChange={(e) => setFormData({ ...formData, block_reason: e.target.value })} />
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Marketing
                      </h4>
                      <div className="flex items-center justify-between">
                        <Label>Permitir Marketing</Label>
                        <Switch checked={formData.allow_marketing} onCheckedChange={(v) => setFormData({ ...formData, allow_marketing: v })} />
                      </div>
                      {formData.allow_marketing && (
                        <div className="space-y-2">
                          <Label>Canal Preferido</Label>
                          <Select value={formData.preferred_channel} onValueChange={(v) => setFormData({ ...formData, preferred_channel: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleUpdate} disabled={updateCustomer.isPending} className="flex-1">
                        {updateCustomer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar Alterações
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedCustomer.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Addresses Tab */}
                  <TabsContent value="addresses" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Endereços do Cliente</h4>
                      <Button size="sm" onClick={() => { setEditingAddress(null); setAddressForm({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', cep: '', reference: '' }); setAddressDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>

                    {addressesLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : addresses.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Nenhum endereço cadastrado</p>
                    ) : (
                      <div className="space-y-2">
                        {addresses.map((addr) => (
                          <div key={addr.id} className="p-3 border rounded-lg flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{addr.label || 'Endereço'}</span>
                                {addr.is_default && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1" />Principal</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''}<br />
                                {addr.neighborhood} - {addr.city}/{addr.state || 'SP'}
                              </p>
                              {addr.reference && <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>}
                            </div>
                            <div className="flex gap-1">
                              {!addr.is_default && (
                                <Button variant="ghost" size="icon" onClick={() => setDefault.mutate(addr.id)} title="Definir como principal">
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => { setEditingAddress(addr); setAddressForm({ label: addr.label || '', street: addr.street, number: addr.number, complement: addr.complement || '', neighborhood: addr.neighborhood, city: addr.city, state: addr.state || '', cep: addr.cep || '', reference: addr.reference || '' }); setAddressDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteAddress.mutate(addr.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Credit Tab */}
                  <TabsContent value="credit" className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="p-4 bg-orange-500/10 rounded-lg flex-1 mr-3">
                        <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(customerBalance)}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => setPaymentDialogOpen(true)} disabled={customerBalance <= 0}>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Receber
                        </Button>
                        <Button variant="outline" onClick={handlePrintStatement}>
                          <FileText className="h-4 w-4 mr-1" />
                          Imprimir
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      <h4 className="font-medium">Extrato</h4>
                      {transactions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nenhuma transação</p>
                      ) : (
                        transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {tx.transaction_type === 'debit' ? (
                                <ArrowUpCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-green-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{tx.transaction_type === 'debit' ? 'Débito' : 'Pagamento'}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${tx.transaction_type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                {tx.transaction_type === 'debit' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">Saldo: {formatCurrency(tx.balance_after)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="space-y-4">
                    <h4 className="font-medium">Últimos Pedidos</h4>
                    <ScrollArea className="h-[350px]">
                      {customerOrders.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nenhum pedido encontrado</p>
                      ) : (
                        <div className="space-y-2">
                          {customerOrders.slice(0, 20).map((order) => (
                            <div key={order.id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                <Badge>{statusLabels[order.status || ''] || order.status}</Badge>
                              </div>
                              <p className="font-bold mt-1">{formatCurrency(Number(order.total) || 0)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Apelido (ex: Casa, Trabalho)</Label>
              <Input value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Rua *</Label>
              <Input value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Número *</Label>
              <Input value={addressForm.number} onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={addressForm.complement} onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bairro *</Label>
              <Input value={addressForm.neighborhood} onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="SP" />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input value={addressForm.cep} onChange={(e) => setAddressForm({ ...addressForm, cep: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Referência</Label>
              <Input value={addressForm.reference} onChange={(e) => setAddressForm({ ...addressForm, reference: e.target.value })} placeholder="Próximo a..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAddress}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Pagamento de Fiado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Cliente: {selectedCustomer?.name}<br />
              Saldo: {formatCurrency(customerBalance)}
            </p>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPaymentAmount(customerBalance.toString())}>Total</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPaymentAmount((customerBalance / 2).toFixed(2))}>50%</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleReceivePayment} disabled={!paymentAmount || receivePayment.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={!!messageDialogCustomer} onOpenChange={(open) => !open && setMessageDialogCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              Enviar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{messageDialogCustomer?.name}</p>
              <p className="text-xs text-muted-foreground">{messageDialogCustomer?.whatsapp}</p>
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={4} />
            </div>
            <Button onClick={handleSendMessage} className="w-full" disabled={sendWhatsApp.isPending || !messageText.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {sendWhatsApp.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
