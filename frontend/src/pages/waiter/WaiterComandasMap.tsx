import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useComandas, useComandaMutations, useComandaSettings, type ComandaStatus } from '@/hooks/useComandas';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { ArrowLeft, Search, Loader2, Clock, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WaiterComandaCreateDialog } from '@/components/waiter/WaiterComandaCreateDialog';

const statusConfig: Record<ComandaStatus, { bg: string; border: string; label: string; color: string }> = {
  free: { bg: 'bg-green-500/10', border: 'border-green-500', label: 'Livre', color: 'text-green-600' },
  open: { bg: 'bg-blue-500/10', border: 'border-blue-500', label: 'Aberta', color: 'text-blue-600' },
  no_activity: { bg: 'bg-slate-500/10', border: 'border-slate-500', label: 'Sem Consumo', color: 'text-slate-600' },
  requested_bill: { bg: 'bg-purple-500/10', border: 'border-purple-500', label: 'Pediu Conta', color: 'text-purple-600' },
  closed: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', label: 'Fechada', color: 'text-emerald-600' },
};

export default function WaiterComandasMap() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { company, isLoading: companyLoading } = useCompanyContext();
  // Show all comandas except fully closed (completed sessions)
  const { comandas, isLoading: comandasLoading } = useComandas(['free', 'open', 'no_activity', 'requested_bill']);
  const { createComanda } = useComandaMutations();
  const { settings: comandaSettings } = useComandaSettings();
  
  const isLoading = companyLoading || comandasLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredComandas = comandas.filter((comanda) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      comanda.command_number.toString().includes(searchLower) ||
      (comanda.name?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleCreateComanda = async (name: string, applyServiceFee: boolean, serviceFeePercent: number) => {
    try {
      const newComanda = await createComanda.mutateAsync({ name, applyServiceFee, serviceFeePercent });
      toast.success(`Comanda ${newComanda.command_number} criada!`);
      setCreateDialogOpen(false);
      navigate(`/waiter/comandas/${newComanda.id}`);
    } catch (error) {
      toast.error('Erro ao criar comanda');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando comandas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/waiter')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Comandas</h1>
          <Badge variant="secondary" className="ml-auto">
            {filteredComandas.length} comandas
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comanda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-2 p-4 border-b">
        {Object.entries(statusConfig)
          .filter(([key]) => key !== 'closed')
          .map(([key, config]) => (
            <Badge key={key} variant="outline" className={`${config.color} ${config.border}`}>
              {config.label}
            </Badge>
          ))}
      </div>

      {/* New Comanda Button */}
      <div className="p-4">
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Nova Comanda
        </Button>
      </div>

      {/* Comandas Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
        {filteredComandas.map((comanda) => {
          const status = comanda.status as ComandaStatus;
          const config = statusConfig[status] ?? statusConfig.open;

          if (!statusConfig[status]) {
            console.warn('[WaiterComandasMap] Status desconhecido:', status, { comandaId: comanda.id });
          }

          return (
            <Card
              key={comanda.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border-2 ${config.border} ${config.bg}`}
              onClick={() => navigate(`/waiter/comandas/${comanda.id}`)}
            >
              <div className="text-center">
                {/* Comanda Icon */}
                <div className="flex justify-center mb-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                    <Tag className={`h-5 w-5 ${config.color}`} />
                  </div>
                </div>

                {/* Comanda Number */}
                <div className="text-2xl font-bold mb-1">#{comanda.command_number}</div>
                
                {/* Comanda Name */}
                {comanda.name && (
                  <p className="text-sm font-medium text-foreground truncate mb-2">{comanda.name}</p>
                )}

                {/* Status Badge */}
                <Badge variant="outline" className={`${config.color} mb-2`}>
                  {config.label}
                </Badge>

                {/* Session Info */}
                <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(comanda.opened_at), {
                        addSuffix: false,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  {comanda.total_amount > 0 && (
                    <div className="font-semibold text-foreground">
                      {formatCurrency(comanda.total_amount)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredComandas.length === 0 && !search && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <Tag className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma comanda aberta</h3>
          <p className="text-muted-foreground mb-4">
            Clique em "Nova Comanda" para começar
          </p>
        </div>
      )}

      {filteredComandas.length === 0 && search && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma comanda encontrada</h3>
          <p className="text-muted-foreground">
            Tente outro termo de busca
          </p>
        </div>
      )}

      <WaiterComandaCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateComanda}
        isLoading={createComanda.isPending}
        defaultServiceFeePercent={comandaSettings?.default_service_fee_percent}
      />
    </div>
  );
}
