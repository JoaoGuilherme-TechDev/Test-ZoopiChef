import { useState } from 'react';
import { User, Search, Plus, Phone, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomers } from '@/hooks/useCustomers';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CustomerData {
  id: string;
  name: string;
  cpf_cnpj?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
}

interface QuickCustomerLinkButtonProps {
  selectedCustomer?: CustomerData | null;
  onSelectCustomer: (customer: CustomerData | null) => void;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
  showRemoveButton?: boolean;
}

export function QuickCustomerLinkButton({
  selectedCustomer,
  onSelectCustomer,
  variant = 'default',
  className,
  showRemoveButton = true,
}: QuickCustomerLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'new'>('search');
  
  // Form state for new customer
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCpfCnpj, setNewCpfCnpj] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  const { customers, isLoading, createCustomer } = useCustomers();
  const { data: profile } = useProfile();

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.whatsapp?.includes(search) ||
      c.document?.includes(search)
    );
  }).slice(0, 10);

  const handleSelectCustomer = (customer: typeof customers[0]) => {
    onSelectCustomer({
      id: customer.id,
      name: customer.name,
      cpf_cnpj: customer.document,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: null,
    });
    setOpen(false);
    setSearch('');
    toast.success(`Cliente ${customer.name} vinculado!`);
  };

  const handleRemoveCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
    toast.info('Cliente removido');
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim()) {
      toast.error('Digite o nome do cliente');
      return;
    }
    if (!newPhone.trim()) {
      toast.error('Digite o telefone do cliente');
      return;
    }
    if (!profile?.company_id) {
      toast.error('Empresa não identificada');
      return;
    }

    try {
      const customer = await createCustomer.mutateAsync({
        name: newName.trim(),
        whatsapp: newPhone.trim(),
        company_id: profile.company_id,
      });
      
      onSelectCustomer({
        id: customer.id,
        name: customer.name,
        cpf_cnpj: null,
        whatsapp: customer.whatsapp,
        email: null,
        address: null,
      });
      
      setOpen(false);
      setNewName('');
      setNewPhone('');
      setNewCpfCnpj('');
      setNewEmail('');
      toast.success(`Cliente ${customer.name} cadastrado e vinculado!`);
    } catch (error) {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  // Render based on variant
  if (variant === 'icon') {
    return (
      <>
        <Button
          variant={selectedCustomer ? 'default' : 'outline'}
          size="icon"
          onClick={() => setOpen(true)}
          className={cn(
            selectedCustomer && 'bg-green-600 hover:bg-green-700',
            className
          )}
          title={selectedCustomer ? `Cliente: ${selectedCustomer.name}` : 'Vincular cliente'}
        >
          {selectedCustomer ? (
            <UserCheck className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Button>
        <CustomerDialog
          open={open}
          onOpenChange={setOpen}
          search={search}
          onSearchChange={setSearch}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filteredCustomers={filteredCustomers}
          isLoading={isLoading}
          onSelectCustomer={handleSelectCustomer}
          newName={newName}
          newPhone={newPhone}
          newCpfCnpj={newCpfCnpj}
          newEmail={newEmail}
          onNewNameChange={setNewName}
          onNewPhoneChange={setNewPhone}
          onNewCpfCnpjChange={setNewCpfCnpj}
          onNewEmailChange={setNewEmail}
          onCreateCustomer={handleCreateCustomer}
          isCreating={createCustomer.isPending}
          formatPhone={formatPhone}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={selectedCustomer ? 'secondary' : 'outline'}
              size="sm"
              className={cn('gap-2', className)}
            >
              {selectedCustomer ? (
                <>
                  <UserCheck className="h-3 w-3 text-green-600" />
                  <span className="max-w-24 truncate">{selectedCustomer.name}</span>
                  {showRemoveButton && (
                    <X 
                      className="h-3 w-3 text-muted-foreground hover:text-destructive cursor-pointer" 
                      onClick={handleRemoveCustomer}
                    />
                  )}
                </>
              ) : (
                <>
                  <User className="h-3 w-3" />
                  Cliente
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <CustomerSearchContent
              search={search}
              onSearchChange={setSearch}
              filteredCustomers={filteredCustomers}
              isLoading={isLoading}
              onSelectCustomer={handleSelectCustomer}
              onOpenNewCustomer={() => {
                setOpen(false);
                setTimeout(() => setOpen(true), 100);
                setActiveTab('new');
              }}
              formatPhone={formatPhone}
            />
          </PopoverContent>
        </Popover>
        <CustomerDialog
          open={open && activeTab === 'new'}
          onOpenChange={(o) => {
            if (!o) setActiveTab('search');
            setOpen(o);
          }}
          search={search}
          onSearchChange={setSearch}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filteredCustomers={filteredCustomers}
          isLoading={isLoading}
          onSelectCustomer={handleSelectCustomer}
          newName={newName}
          newPhone={newPhone}
          newCpfCnpj={newCpfCnpj}
          newEmail={newEmail}
          onNewNameChange={setNewName}
          onNewPhoneChange={setNewPhone}
          onNewCpfCnpjChange={setNewCpfCnpj}
          onNewEmailChange={setNewEmail}
          onCreateCustomer={handleCreateCustomer}
          isCreating={createCustomer.isPending}
          formatPhone={formatPhone}
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <Button
        variant={selectedCustomer ? 'secondary' : 'outline'}
        onClick={() => setOpen(true)}
        className={cn('gap-2 justify-start', className)}
      >
        {selectedCustomer ? (
          <>
            <UserCheck className="h-4 w-4 text-green-600" />
            <div className="flex-1 text-left">
              <div className="font-medium">{selectedCustomer.name}</div>
              {selectedCustomer.whatsapp && (
                <div className="text-xs text-muted-foreground">
                  {formatPhone(selectedCustomer.whatsapp)}
                </div>
              )}
            </div>
            {showRemoveButton && (
              <X 
                className="h-4 w-4 text-muted-foreground hover:text-destructive" 
                onClick={handleRemoveCustomer}
              />
            )}
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            Vincular Cliente
          </>
        )}
      </Button>
      <CustomerDialog
        open={open}
        onOpenChange={setOpen}
        search={search}
        onSearchChange={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filteredCustomers={filteredCustomers}
        isLoading={isLoading}
        onSelectCustomer={handleSelectCustomer}
        newName={newName}
        newPhone={newPhone}
        newCpfCnpj={newCpfCnpj}
        newEmail={newEmail}
        onNewNameChange={setNewName}
        onNewPhoneChange={setNewPhone}
        onNewCpfCnpjChange={setNewCpfCnpj}
        onNewEmailChange={setNewEmail}
        onCreateCustomer={handleCreateCustomer}
        isCreating={createCustomer.isPending}
        formatPhone={formatPhone}
      />
    </>
  );
}

// Define a simpler type for the customer list items
interface CustomerListItem {
  id: string;
  name: string;
  whatsapp: string;
  document?: string | null;
  email?: string | null;
}

// Sub-components
function CustomerSearchContent({
  search,
  onSearchChange,
  filteredCustomers,
  isLoading,
  onSelectCustomer,
  onOpenNewCustomer,
  formatPhone,
}: {
  search: string;
  onSearchChange: (s: string) => void;
  filteredCustomers: CustomerListItem[];
  isLoading: boolean;
  onSelectCustomer: (c: CustomerListItem) => void;
  onOpenNewCustomer: () => void;
  formatPhone: (p: string | null | undefined) => string;
}) {
  return (
    <div className="p-3 space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
          autoFocus
        />
      </div>
      
      <ScrollArea className="h-48">
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {search ? 'Nenhum cliente encontrado' : 'Digite para buscar'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
              >
                <div className="font-medium text-sm">{customer.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {customer.whatsapp && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(customer.whatsapp)}
                    </span>
                  )}
                  {customer.document && (
                    <Badge variant="outline" className="text-[10px] py-0">
                      {customer.document}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <Separator />
      
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={onOpenNewCustomer}
      >
        <Plus className="h-4 w-4 mr-2" />
        Cadastrar Novo Cliente
      </Button>
    </div>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  filteredCustomers,
  isLoading,
  onSelectCustomer,
  newName,
  newPhone,
  newCpfCnpj,
  newEmail,
  onNewNameChange,
  onNewPhoneChange,
  onNewCpfCnpjChange,
  onNewEmailChange,
  onCreateCustomer,
  isCreating,
  formatPhone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  search: string;
  onSearchChange: (s: string) => void;
  activeTab: 'search' | 'new';
  onTabChange: (t: 'search' | 'new') => void;
  filteredCustomers: CustomerListItem[];
  isLoading: boolean;
  onSelectCustomer: (c: CustomerListItem) => void;
  newName: string;
  newPhone: string;
  newCpfCnpj: string;
  newEmail: string;
  onNewNameChange: (v: string) => void;
  onNewPhoneChange: (v: string) => void;
  onNewCpfCnpjChange: (v: string) => void;
  onNewEmailChange: (v: string) => void;
  onCreateCustomer: () => void;
  isCreating: boolean;
  formatPhone: (p: string | null | undefined) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Vincular Cliente
          </DialogTitle>
          <DialogDescription>
            Busque um cliente existente ou cadastre um novo
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'search' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou CPF..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            
            <ScrollArea className="h-64 border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'Nenhum cliente encontrado' : 'Digite para buscar'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => onSelectCustomer(customer)}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {customer.whatsapp && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(customer.whatsapp)}
                          </span>
                        )}
                        {customer.document && (
                          <Badge variant="outline" className="text-xs">
                            {customer.document}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-name">Nome *</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => onNewNameChange(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="new-phone">Telefone/WhatsApp *</Label>
                <Input
                  id="new-phone"
                  value={newPhone}
                  onChange={(e) => onNewPhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="new-cpf">CPF/CNPJ</Label>
                <Input
                  id="new-cpf"
                  value={newCpfCnpj}
                  onChange={(e) => onNewCpfCnpjChange(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="new-email">E-mail</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => onNewEmailChange(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            
            <Button 
              onClick={onCreateCustomer} 
              className="w-full"
              disabled={isCreating}
            >
              {isCreating ? 'Cadastrando...' : 'Cadastrar e Vincular'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
