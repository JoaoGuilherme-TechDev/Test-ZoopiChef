import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { User, Search, Phone, Star, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  total_orders?: number;
  is_vip?: boolean;
}

interface TableLinkCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currentCustomerName?: string | null;
  currentCustomerPhone?: string | null;
  onLink?: (customerId: string | null, name: string, phone: string) => Promise<void>;
}

export function TableLinkCustomerDialog({ 
  open, 
  onOpenChange,
  sessionId,
  currentCustomerName,
  currentCustomerPhone,
  onLink
}: TableLinkCustomerDialogProps) {
  const { data: company } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualName, setManualName] = useState(currentCustomerName || '');
  const [manualPhone, setManualPhone] = useState(currentCustomerPhone || '');
  const [isLinking, setIsLinking] = useState(false);
  const [mode, setMode] = useState<'search' | 'manual'>('search');

  // Search customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers-search', company?.id, searchTerm],
    queryFn: async () => {
      if (!company?.id || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('company_id', company.id)
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      return (data || []) as Customer[];
    },
    enabled: !!company?.id && searchTerm.length >= 2,
  });

  const handleLink = async () => {
    setIsLinking(true);
    try {
      const name = mode === 'search' && selectedCustomer ? selectedCustomer.name : manualName.trim();
      const phone = mode === 'search' && selectedCustomer ? selectedCustomer.phone : manualPhone.trim();
      const customerId = mode === 'search' && selectedCustomer ? selectedCustomer.id : null;
      
      if (!name) {
        toast.error('Informe o nome do cliente');
        return;
      }
      
      if (onLink) {
        await onLink(customerId, name, phone);
      } else {
        // Default: update session directly
        const { error } = await supabase
          .from('table_sessions')
          .update({ 
            customer_name: name,
            customer_phone: phone,
            customer_id: customerId
          })
          .eq('id', sessionId);
          
        if (error) throw error;
      }
      
      toast.success(`Cliente ${name} vinculado!`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking customer:', error);
      toast.error('Erro ao vincular cliente');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Vincular Cliente
          </DialogTitle>
          <DialogDescription>
            Vincule um cliente cadastrado ou informe manualmente
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={mode === 'search' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setMode('search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar Cliente
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setMode('manual')}
          >
            <User className="h-4 w-4 mr-2" />
            Informar Manualmente
          </Button>
        </div>

        {mode === 'search' ? (
          <>
            {/* Search Input */}
            <div className="space-y-2">
              <Label>Buscar por nome ou telefone</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite pelo menos 2 caracteres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Results List */}
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchTerm.length < 2 
                      ? 'Digite para buscar...' 
                      : 'Nenhum cliente encontrado'}
                  </div>
                ) : (
                  customers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customer.name}</p>
                            {customer.is_vip && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        </div>
                        {customer.total_orders && customer.total_orders > 0 && (
                          <Badge variant="secondary">
                            {customer.total_orders} pedidos
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Manual Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input
                  placeholder="Nome completo"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (opcional)</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink}
            disabled={
              isLinking || 
              (mode === 'search' && !selectedCustomer) ||
              (mode === 'manual' && !manualName.trim())
            }
          >
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vinculando...
              </>
            ) : (
              'Vincular Cliente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
