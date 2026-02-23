import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Clock, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintJob {
  id: string;
  job_type: string;
  printer_category: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  order_id: string | null;
  retry_count: number;
}

interface Props {
  companyId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  processing: { label: 'Processando', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Concluído', variant: 'outline', icon: <CheckCircle2 className="h-3 w-3 text-primary" /> },
  failed: { label: 'Falhou', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  order_ticket: 'Ticket de Pedido',
  production_ticket: 'Produção',
  table_bill: 'Conta de Mesa',
  test_print: 'Teste',
};

export function PrintJobMonitor({ companyId }: Props) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, completed: 0, failed: 0 });

  const fetchJobs = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('print_job_queue_v3')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const jobList = (data as any[]) || [];
      setJobs(jobList);

      // Calculate stats
      setStats({
        pending: jobList.filter(j => j.status === 'pending').length,
        completed: jobList.filter(j => j.status === 'completed').length,
        failed: jobList.filter(j => j.status === 'failed').length,
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Subscribe to realtime updates
    if (companyId) {
      const channel = supabase
        .channel('print-jobs-monitor')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'print_job_queue_v3',
            filter: `company_id=eq.${companyId}`
          },
          () => {
            fetchJobs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [companyId]);

  const handleClearCompleted = async () => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('print_job_queue_v3')
        .delete()
        .eq('company_id', companyId)
        .eq('status', 'completed');

      if (error) throw error;
      toast.success('Jobs concluídos removidos');
      fetchJobs();
    } catch (error) {
      toast.error('Erro ao limpar jobs');
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('print_job_queue_v3')
        .update({ 
          status: 'pending', 
          error_message: null,
          started_at: null,
          completed_at: null
        })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job reenviado para a fila');
      fetchJobs();
    } catch (error) {
      toast.error('Erro ao reenviar job');
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fila de Impressão</CardTitle>
            <CardDescription>
              Monitore os jobs de impressão em tempo real
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClearCompleted}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar Concluídos
            </Button>
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum job de impressão</p>
            <p className="text-sm">Os jobs aparecerão aqui quando forem criados</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {jobs.map((job) => {
                const statusConfig = getStatusConfig(job.status);
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {statusConfig.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                          </p>
                          <Badge variant={statusConfig.variant} className="text-xs">
                            {statusConfig.label}
                          </Badge>
                          {job.printer_category && (
                            <Badge variant="outline" className="text-xs">
                              {job.printer_category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>
                            {formatDistanceToNow(new Date(job.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                          {job.order_id && (
                            <>
                              <span>•</span>
                              <span>Pedido: {job.order_id.slice(0, 8)}</span>
                            </>
                          )}
                          {job.retry_count > 0 && (
                            <>
                              <span>•</span>
                              <span>Tentativas: {job.retry_count}</span>
                            </>
                          )}
                        </div>
                        {job.error_message && (
                          <p className="text-xs text-destructive mt-1">
                            {job.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(job.id)}
                      >
                        Reenviar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
