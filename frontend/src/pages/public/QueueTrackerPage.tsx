import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, MapPin, CheckCircle2, XCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaitlistEntry {
  id: string;
  company_id: string;
  customer_name: string;
  party_size: number;
  status: string;
  requested_at: string;
  estimated_wait_minutes: number | null;
  assigned_table_number: number | null;
  notified_at: string | null;
  table_notified_at: string | null;
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function QueueTrackerPage() {
  const { token } = useParams<{ token: string }>();
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) {
      setError('Link inválido');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch waitlist entry by tracking token
      const { data: entryData, error: entryError } = await supabase
        .from('smart_waitlist')
        .select('*')
        .eq('tracking_token', token)
        .single();

      if (entryError || !entryData) {
        setError('Entrada não encontrada ou link expirado');
        setIsLoading(false);
        return;
      }

      setEntry(entryData as WaitlistEntry);

      // Fetch company info
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .eq('id', entryData.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
      }

      // Calculate position in queue
      if (['waiting', 'notified', 'ready'].includes(entryData.status)) {
        const { count } = await supabase
          .from('smart_waitlist')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', entryData.company_id)
          .in('status', ['waiting', 'notified', 'ready'])
          .lte('requested_at', entryData.requested_at);

        setPosition(count || 1);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching queue data:', err);
      setError('Erro ao carregar dados');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!token) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`queue-tracker-${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'smart_waitlist',
          filter: `tracking_token=eq.${token}`,
        },
        (payload) => {
          setEntry(prev => prev ? { ...prev, ...payload.new } : null);
          // Recalculate position when status changes
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <Clock className="h-12 w-12 mx-auto text-primary animate-spin" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
            <h1 className="mt-4 text-xl font-bold">{error || 'Entrada não encontrada'}</h1>
            <p className="mt-2 text-muted-foreground">
              Este link pode ter expirado ou não ser válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (entry.status) {
      case 'waiting':
        return {
          color: 'bg-amber-500',
          text: 'Aguardando',
          icon: Clock,
          description: 'Você está na fila de espera'
        };
      case 'notified':
        return {
          color: 'bg-blue-500',
          text: 'Notificado',
          icon: Bell,
          description: 'Fique atento, sua vez está chegando!'
        };
      case 'ready':
        return {
          color: 'bg-green-500',
          text: 'Mesa Pronta!',
          icon: MapPin,
          description: entry.assigned_table_number 
            ? `Dirija-se à Mesa ${entry.assigned_table_number}`
            : 'Dirija-se à recepção'
        };
      case 'seated':
        return {
          color: 'bg-emerald-600',
          text: 'Acomodado',
          icon: CheckCircle2,
          description: 'Bom apetite!'
        };
      case 'cancelled':
      case 'no_show':
        return {
          color: 'bg-gray-500',
          text: 'Cancelado',
          icon: XCircle,
          description: 'Sua reserva foi cancelada'
        };
      default:
        return {
          color: 'bg-gray-500',
          text: entry.status,
          icon: Clock,
          description: ''
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const isActive = ['waiting', 'notified', 'ready'].includes(entry.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        {/* Company Header */}
        {company && (
          <div className="text-center mb-6">
            {company.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-16 w-auto mx-auto mb-4 rounded-lg"
              />
            )}
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-muted-foreground">Fila de Espera</p>
          </div>
        )}

        {/* Main Status Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={entry.status}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`border-2 ${entry.status === 'ready' ? 'border-green-500 shadow-lg shadow-green-500/20' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Olá, {entry.customer_name}!</CardTitle>
                  <Badge className={`${statusInfo.color} text-white`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Position Display */}
                {isActive && (
                  <div className="text-center py-6">
                    <motion.div
                      key={position}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="relative inline-flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="relative bg-primary text-primary-foreground rounded-full w-24 h-24 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">{position}º</span>
                        <span className="text-xs opacity-80">na fila</span>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Table Ready Celebration */}
                {entry.status === 'ready' && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center py-4 bg-green-50 dark:bg-green-950/30 rounded-xl"
                  >
                    <MapPin className="h-12 w-12 mx-auto text-green-600 mb-2" />
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">
                      {entry.assigned_table_number 
                        ? `Mesa ${entry.assigned_table_number}`
                        : 'Sua mesa está pronta!'}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Dirija-se à recepção
                    </p>
                  </motion.div>
                )}

                {/* Info Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-semibold">{entry.party_size}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.party_size === 1 ? 'pessoa' : 'pessoas'}
                    </p>
                  </div>
                  {entry.estimated_wait_minutes && isActive && (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-semibold">~{entry.estimated_wait_minutes}</p>
                      <p className="text-xs text-muted-foreground">minutos</p>
                    </div>
                  )}
                </div>

                {/* Status Description */}
                <p className="text-center text-muted-foreground text-sm">
                  {statusInfo.description}
                </p>

                {/* Auto-refresh indicator */}
                {isActive && (
                  <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Atualização em tempo real
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Completed State */}
        {entry.status === 'seated' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold">Você foi acomodado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Esperamos que tenha uma ótima experiência.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
