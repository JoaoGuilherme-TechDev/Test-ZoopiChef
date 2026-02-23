import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Search, Plus, Phone, FileText, Loader2, Check, X } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useCustomerLookup, CustomerLookupResult } from '@/hooks/useCustomerLookup';
import { toast } from 'sonner';

interface QuickCustomerLinkProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onRequestNewCustomer?: () => void;
  compact?: boolean;
  showDocument?: boolean;
}

export function QuickCustomerLink({
  selectedCustomer,
  onSelectCustomer,
  onRequestNewCustomer,
  compact = false,
  showDocument = true,
}: QuickCustomerLinkProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    whatsapp: '',
    document: '',
  });
  
  const { customers, createCustomer } = useCustomers();
  
  // Converter CustomerLookupResult para Customer
  const handleCustomerFound = (lookupResult: CustomerLookupResult) => {
    const customer: Customer = {
      id: lookupResult.id,
      company_id: '', // Será preenchido pelo contexto
      name: lookupResult.name,
      whatsapp: lookupResult.whatsapp,
      phone: lookupResult.phone,
      document: lookupResult.document,
      email: lookupResult.email,
      credit_balance: lookupResult.credit_balance || 0,
      credit_limit: lookupResult.credit_limit,
      allow_credit: lookupResult.allow_credit,
      is_blocked: lookupResult.is_blocked,
      alerts: lookupResult.internal_notes,
      created_at: '',
      updated_at: '',
    };
    onSelectCustomer(customer);
    setOpen(false);
    setSearch('');
  };
  
  const customerLookup = useCustomerLookup({
    showToast: true,
    onCustomerFound: handleCustomerFound,
  });

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.whatsapp.includes(search) ||
    (c.document && c.document.includes(search))
  ).slice(0, 8);

  const handleSearch = () => {
    if (search.length >= 8) {
      // Provavelmente é um telefone
      customerLookup.searchCustomer(search);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name.trim() || !newCustomerData.whatsapp.trim()) {
      toast.error('Nome e WhatsApp são obrigatórios');
      return;
    }

    try {
      const result = await createCustomer.mutateAsync({
        name: newCustomerData.name.trim(),
        whatsapp: newCustomerData.whatsapp.trim(),
        company_id: '', // Will be set by hook
      });
      
      onSelectCustomer(result);
      setShowNewCustomer(false);
      setOpen(false);
      setNewCustomerData({ name: '', whatsapp: '', document: '' });
      toast.success('Cliente cadastrado com sucesso!');
    } catch (error) {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleClear = () => {
    onSelectCustomer(null);
    setSearch('');
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedCustomer ? 'secondary' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <User className="h-4 w-4" />
            {selectedCustomer ? (
              <span className="max-w-[120px] truncate">{selectedCustomer.name}</span>
            ) : (
              'Vincular Cliente'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => setShowNewCustomer(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {selectedCustomer && (
            <div className="p-2 border-b bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{selectedCustomer.name}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleClear}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[200px]">
            {filteredCustomers.length > 0 ? (
              <div className="p-1">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    className="w-full text-left p-2 hover:bg-muted rounded-md flex items-center justify-between"
                    onClick={() => {
                      onSelectCustomer(customer);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.whatsapp}</p>
                    </div>
                    {customer.document && showDocument && (
                      <Badge variant="outline" className="text-xs">
                        {customer.document}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            ) : search ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Digite para buscar clientes
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {selectedCustomer ? (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg flex-1">
            <User className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedCustomer.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedCustomer.whatsapp}</span>
                {selectedCustomer.document && showDocument && (
                  <>
                    <span>•</span>
                    <span>{selectedCustomer.document}</span>
                  </>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="flex-1 justify-start gap-2"
            onClick={() => setOpen(true)}
          >
            <User className="h-4 w-4" />
            Vincular Cliente
          </Button>
        )}
        
        {!selectedCustomer && (
          <Button size="icon" variant="outline" onClick={() => setShowNewCustomer(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dialog de busca */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Cliente</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                  autoFocus
                />
              </div>
              <Button onClick={handleSearch} disabled={customerLookup.isSearching}>
                {customerLookup.isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <ScrollArea className="h-[250px] border rounded-md">
              {filteredCustomers.length > 0 ? (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      className="w-full text-left p-3 hover:bg-muted rounded-md flex items-center justify-between"
                      onClick={() => {
                        onSelectCustomer(customer);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.whatsapp}
                          </div>
                        </div>
                      </div>
                      {customer.document && (
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {customer.document}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum cliente encontrado</p>
                  <p className="text-sm">Tente buscar por outro termo</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => { setOpen(false); setShowNewCustomer(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de novo cliente */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do cliente"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                placeholder="11999999999"
                value={newCustomerData.whatsapp}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, whatsapp: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ (opcional)</Label>
              <Input
                placeholder="000.000.000-00"
                value={newCustomerData.document}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, document: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCustomer} disabled={createCustomer.isPending}>
              {createCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar e Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
