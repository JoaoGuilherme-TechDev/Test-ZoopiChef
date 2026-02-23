import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Phone, DollarSign, Loader2 } from 'lucide-react';
import { useCustomersWithCredit } from '@/hooks/useCustomerCredit';

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  credit_balance: number;
}

interface PDVCreditSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
}

export function PDVCreditSearchModal({ open, onOpenChange, onSelect }: PDVCreditSearchModalProps) {
  const { customersWithCredit, isLoading } = useCustomersWithCredit();
  const [search, setSearch] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customersWithCredit;
    const searchLower = search.toLowerCase();
    return customersWithCredit.filter(
      c => c.name.toLowerCase().includes(searchLower) || 
           c.whatsapp.includes(search)
    );
  }, [customersWithCredit, search]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalDebt = customersWithCredit.reduce((sum, c) => sum + Number(c.credit_balance), 0);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Clientes com Fiado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Total a receber</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalDebt)}</p>
            <p className="text-xs text-muted-foreground">{customersWithCredit.length} clientes</p>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Lista */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente com fiado'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className="w-full p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.whatsapp}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-500/10">
                        {formatCurrency(Number(customer.credit_balance))}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
