import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Bell, ChefHat } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FullscreenButton } from '@/components/tv/FullscreenButton';

interface WaitlistEntry {
  id: string;
  customer_name: string;
  party_size: number;
  status: string;
  requested_at: string;
  estimated_wait_minutes: number | null;
  notified_at: string | null;
}

interface AvailableTable {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function KDSWaitlistPage() {
  const { token } = useParams<{ token: string }>();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) {
      setError('Token inválido');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch company by kds_waitlist token
      const { data: linkData, error: linkError } = await supabase
        .from('company_public_links')
        .select('company_id')
        .or(`kds_waitlist_token.eq.${token},kds_waitlist_token_v2.eq.${token}`)
        .maybeSingle();

      if (linkError || !linkData) {
        setError('Link inválido ou expirado');
        setIsLoading(false);
        return;
      }

      const companyId = linkData.company_id;

      // Fetch company info
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .eq('id', companyId)
        .single();

      if (companyData) {
        setCompany(companyData);
      }

      // Fetch active waitlist entries
      const { data: waitlistData } = await supabase
        .from('smart_waitlist')
        .select('id, customer_name, party_size, status, requested_at, estimated_wait_minutes, notified_at')
        .eq('company_id', companyId)
        .in('status', ['waiting', 'notified'])
        .order('priority_score', { ascending: false })
        .order('requested_at', { ascending: true });

      setEntries(waitlistData || []);

      // Fetch available tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, number, name, capacity')
        .eq('company_id', companyId)
        .eq('active', true);

      const { data: sessionsData } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('company_id', companyId)
        .is('closed_at', null);

      const occupiedTableIds = new Set(sessionsData?.map(s => s.table_id) || []);
      const available = (tablesData || []).filter(t => !occupiedTableIds.has(t.id));
      setAvailableTables(available);

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching KDS waitlist data:', err);
      setError('Erro ao carregar dados');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!token) return;

    // Set up realtime subscription
    const channel = supabase
      .channel('kds-waitlist-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_waitlist',
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Auto-refresh every 30s
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-center text-white">
          <Clock className="h-12 w-12 mx-auto animate-spin" />
          <p className="mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 text-white max-w-md">
          <CardContent className="pt-6 text-center">
            <ChefHat className="h-16 w-16 mx-auto text-red-500" />
            <h1 className="mt-4 text-xl font-bold">{error}</h1>
            <p className="mt-2 text-slate-400">
              Verifique o link ou gere um novo em "Meus Links".
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextCustomer = entries[0];
  const waitingCount = entries.filter(e => e.status === 'waiting').length;
  const notifiedCount = entries.filter(e => e.status === 'notified').length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {company?.logo_url && (
            <img src={company.logo_url} alt={company.name} className="h-12 w-auto rounded" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{company?.name || 'KDS'} - Fila de Espera</h1>
            <p className="text-slate-400">Atualização em tempo real</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2 border-amber-500 text-amber-400">
            <Clock className="h-4 w-4 mr-2" />
            {waitingCount} aguardando
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-blue-500 text-blue-400">
            <Bell className="h-4 w-4 mr-2" />
            {notifiedCount} chamados
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-emerald-500 text-emerald-400">
            <Users className="h-4 w-4 mr-2" />
            {availableTables.length} mesas livres
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Next Customer - Featured */}
        <div className="col-span-1">
          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-500 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Próximo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextCustomer ? (
                <div className="text-center py-8">
                  <div className="text-5xl font-bold mb-4">{nextCustomer.customer_name}</div>
                  <div className="flex items-center justify-center gap-2 text-2xl">
                    <Users className="h-6 w-6" />
                    {nextCustomer.party_size} pessoas
                  </div>
                  {nextCustomer.estimated_wait_minutes && (
                    <div className="mt-4 text-xl opacity-80">
                      ~{nextCustomer.estimated_wait_minutes} min
                    </div>
                  )}
                  <Badge 
                    className={`mt-4 text-lg ${
                      nextCustomer.status === 'notified' 
                        ? 'bg-blue-500' 
                        : 'bg-amber-500'
                    }`}
                  >
                    {nextCustomer.status === 'notified' ? 'CHAMADO' : 'AGUARDANDO'}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-12 opacity-60">
                  <Users className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-xl">Nenhum cliente na fila</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Queue List */}
        <div className="col-span-1">
          <Card className="bg-slate-800 border-slate-700 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Fila ({entries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
              {entries.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Fila vazia</p>
              ) : (
                entries.map((entry, idx) => (
                  <div 
                    key={entry.id}
                    className={`p-4 rounded-lg ${
                      entry.status === 'notified' 
                        ? 'bg-blue-500/20 border border-blue-500' 
                        : 'bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center font-bold text-xl">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{entry.customer_name}</p>
                          <p className="text-slate-400 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {entry.party_size} pessoas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={entry.status === 'notified' ? 'bg-blue-500' : 'bg-amber-500'}>
                          {entry.status === 'notified' ? 'Chamado' : 'Aguardando'}
                        </Badge>
                        <p className="text-sm text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(entry.requested_at), { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Tables */}
        <div className="col-span-1">
          <Card className="bg-slate-800 border-slate-700 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mesas Disponíveis ({availableTables.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
              {availableTables.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Nenhuma mesa disponível</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableTables.map((table) => (
                    <div 
                      key={table.id}
                      className="p-4 rounded-lg bg-emerald-600/20 border border-emerald-500 text-center"
                    >
                      <div className="text-3xl font-bold text-emerald-400">
                        {table.number}
                      </div>
                      {table.name && (
                        <p className="text-sm text-slate-300">{table.name}</p>
                      )}
                      <p className="text-xs text-slate-400">{table.capacity} lugares</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-slate-500 text-sm">
        <p className="flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Atualização automática em tempo real
        </p>
      </div>

      {/* Fullscreen Button */}
      <FullscreenButton 
        className="fixed bottom-4 left-4 z-50" 
        autoHide={false}
      />
    </div>
  );
}
