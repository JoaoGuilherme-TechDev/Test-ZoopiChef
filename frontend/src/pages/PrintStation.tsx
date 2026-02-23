import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Printer, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Maximize,
  ArrowLeft,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPrintService, createTicketFromOrder, printTicketToNetwork, printToNetwork, buildKioskReceiptEscPos } from '@/lib/print';
import { Order } from '@/hooks/useOrders';

interface PrintJob {
  id: string;
  company_id: string;
  order_id: string | null;
  print_sector_id?: string | null;
  job_type: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  source: string;
  metadata: Record<string, unknown>;
  attempts: number;
  error_message: string | null;
  created_at: string;
  printed_at: string | null;
}

interface PrintLog {
  id: string;
  orderId: string;
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
}

export default function PrintStation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  
  const [isActive, setIsActive] = useState(false); // Start PAUSED by default
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  
  const processingRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const printService = getPrintService();

  // Create audio element for notifications
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotification = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  const addLog = useCallback((orderId: string, status: 'success' | 'error', message: string) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      orderId,
      status,
      message,
      timestamp: new Date()
    }, ...prev.slice(0, 99)]); // Keep last 100 logs
  }, []);

  // Fetch pending print jobs - always fetch to show count, even when paused
  const { data: pendingJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['print-station-jobs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('print_job_queue')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PrintJob[];
    },
    enabled: !!company?.id,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Clear all pending jobs
  const clearQueue = useCallback(async () => {
    if (!company?.id || pendingJobs.length === 0) return;
    
    const confirmed = window.confirm(`Tem certeza que deseja limpar ${pendingJobs.length} job(s) pendente(s) da fila?`);
    if (!confirmed) return;

    setIsClearingQueue(true);
    try {
      const { error } = await supabase
        .from('print_job_queue')
        .delete()
        .eq('company_id', company.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      toast.success('Fila limpa com sucesso!');
      refetchJobs();
      queryClient.invalidateQueries({ queryKey: ['print-station-jobs'] });
    } catch (error) {
      console.error('Error clearing queue:', error);
      toast.error('Erro ao limpar fila');
    } finally {
      setIsClearingQueue(false);
    }
  }, [company?.id, pendingJobs.length, refetchJobs, queryClient]);

  // Fetch recent completed/failed jobs for display
  const { data: recentJobs = [] } = useQuery({
    queryKey: ['print-station-recent', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('print_job_queue')
        .select('*')
        .eq('company_id', company.id)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as PrintJob[];
    },
    enabled: !!company?.id,
  });

  // Mark job as completed
  const markCompleted = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('print_job_queue')
        .update({ 
          status: 'completed', 
          printed_at: new Date().toISOString() 
        })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-station-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['print-station-recent'] });
    },
  });

  // Mark job as failed
  const markFailed = useMutation({
    mutationFn: async ({ jobId, errorMessage }: { jobId: string; errorMessage: string }) => {
      const { data: job } = await supabase
        .from('print_job_queue')
        .select('attempts')
        .eq('id', jobId)
        .single();

      const newAttempts = (job?.attempts || 0) + 1;
      const newStatus = newAttempts >= 3 ? 'failed' : 'pending';

      const { error } = await supabase
        .from('print_job_queue')
        .update({ 
          status: newStatus,
          attempts: newAttempts,
          error_message: errorMessage
        })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-station-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['print-station-recent'] });
    },
  });

  // Fetch order details and print
  const processJob = useCallback(async (job: PrintJob) => {
    if (!job.order_id || processingRef.current.has(job.id)) {
      return;
    }

    processingRef.current.add(job.id);

    try {
      console.log(`[PrintStation] Processing job ${job.id} for order ${job.order_id}`);

      // Fetch order with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', job.order_id)
        .single();

      if (orderError || !order) {
        throw new Error('Pedido não encontrado');
      }

      // =============================
      // 1) KIOSK RECEIPT (customer printer)
      // =============================
      if (job.source === 'kiosk_receipt') {
        const meta = (job.metadata || {}) as any;
        const host = meta.printerHost as string | null | undefined;
        const port = (meta.printerPort as number | null | undefined) ?? 9100;

        if (host) {
          // Use our own ESC/POS to guarantee header highlight on thermal printers
          const escpos = buildKioskReceiptEscPos({
            companyName: company?.name || 'ZOOPI',
            orderNumber: (order as any).order_number ?? null,
            orderId: (order as any).id,
            customerName: meta.customerName ?? (order as any).customer_name ?? null,
            dineMode: meta.dineMode ?? null,
            discountDescription: meta.discountApplied ? (meta.discountDescription ?? null) : null,
            items: ((order as any).items || []).map((item: any) => ({
              name: item.product_name,
              quantity: item.quantity,
              notes: item.notes || null,
            })),
            createdAt: (order as any).created_at ?? null,
          });

          const netResult = await printToNetwork(escpos, {
            host,
            port,
            copies: 1,
            cut: true,
            beep: true,
          });

          if (!netResult.success) {
            throw new Error(netResult.error || 'Erro ao imprimir (rede)');
          }

          await markCompleted.mutateAsync(job.id);
          addLog(order.id.slice(0, 8), 'success', `Recibo do cliente impresso (#${order.order_number || order.id.slice(0, 8)})`);
          playNotification();
          return;
        }
        // If no host configured, fall through to default printing (browser)
      }

      // =============================
      // 2) SECTOR PRINT (kitchen/production)
      // =============================
      if (job.print_sector_id) {
        const { data: sector, error: sectorError } = await supabase
          .from('print_sectors')
          .select('*')
          .eq('id', job.print_sector_id)
          .single();

        if (sectorError || !sector) {
          throw new Error('Setor de impressão não encontrado');
        }

        // Get product IDs mapped to this sector
        const { data: mappings, error: mapError } = await supabase
          .from('product_print_sectors')
          .select('product_id')
          .eq('sector_id', job.print_sector_id);

        if (mapError) {
          throw new Error('Erro ao carregar itens do setor');
        }

        const productIds = new Set((mappings || []).map((m: any) => m.product_id));
        const sectorItems = ((order as any).items || []).filter((it: any) => productIds.has(it.product_id));

        // Nothing to print for this sector -> mark as completed
        if (sectorItems.length === 0) {
          await markCompleted.mutateAsync(job.id);
          addLog(order.id.slice(0, 8), 'success', `Sem itens para o setor "${sector.name}" (job concluído)`);
          return;
        }

        const result = await printService.printForSector(order as Order, sector as any, sectorItems, company?.name);

        if (result.success) {
          await markCompleted.mutateAsync(job.id);
          addLog(order.id.slice(0, 8), 'success', `Setor "${sector.name}" impresso (Pedido #${order.order_number || order.id.slice(0, 8)})`);
          playNotification();
          return;
        }

        throw new Error(result.error || 'Erro ao imprimir setor');
      }

      // =============================
      // 3) DEFAULT (full order)
      // =============================
      const result = await printService.printOrder(order as Order, company?.name);

      if (result.success) {
        await markCompleted.mutateAsync(job.id);
        addLog(order.id.slice(0, 8), 'success', `Pedido #${order.order_number || order.id.slice(0, 8)} impresso`);
        playNotification();
        console.log(`[PrintStation] Successfully printed order ${order.id}`);
      } else {
        throw new Error(result.error || 'Erro ao imprimir');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[PrintStation] Failed to print job ${job.id}:`, error);

      await markFailed.mutateAsync({
        jobId: job.id,
        errorMessage,
      });

      addLog(job.order_id?.slice(0, 8) || 'N/A', 'error', errorMessage);
      toast.error(`Erro ao imprimir: ${errorMessage}`);
    } finally {
      processingRef.current.delete(job.id);
    }
  }, [company?.name, markCompleted, markFailed, addLog, playNotification, printService]);

  // Process pending jobs
  useEffect(() => {
    if (!isActive || pendingJobs.length === 0) return;

    const nextJob = pendingJobs.find(j => !processingRef.current.has(j.id));
    if (nextJob) {
      processJob(nextJob);
    }
  }, [isActive, pendingJobs, processJob]);

  // Realtime subscription for new print jobs
  useEffect(() => {
    if (!company?.id || !isActive) {
      setIsConnected(false);
      return;
    }

    const channel = supabase
      .channel('print-station-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_job_queue',
          filter: `company_id=eq.${company.id}`
        },
        (payload) => {
          console.log('[PrintStation] Realtime event:', payload.eventType);
          refetchJobs();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('[PrintStation] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, isActive, refetchJobs]);

  // Fullscreen management
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const completedCount = recentJobs.filter(j => j.status === 'completed').length;
  const failedCount = recentJobs.filter(j => j.status === 'failed').length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Printer className="h-6 w-6" />
              Estação de Impressão
            </h1>
            <p className="text-muted-foreground text-sm">
              {company?.name || 'Carregando...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetchJobs()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <Button 
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsActive(!isActive)}
              className={isActive ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Warning when paused */}
      {!isActive && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-amber-600">Impressão Pausada</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Iniciar" para começar a processar a fila de impressão. 
              {pendingJobs.length > 0 && ` Há ${pendingJobs.length} pedido(s) aguardando.`}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">{pendingJobs.length}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" /> Pendentes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{processingRef.current.size}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Printer className="h-4 w-4" /> Imprimindo
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{completedCount}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4" /> Concluídos
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{failedCount}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4" /> Falhas
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Fila de Impressão
                  {pendingJobs.length > 0 && (
                    <Badge variant="destructive">{pendingJobs.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Pedidos aguardando impressão
                </CardDescription>
              </div>
              {pendingJobs.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearQueue}
                  disabled={isClearingQueue}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Fila
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {pendingJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Printer className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum pedido na fila</p>
                  <p className="text-sm">Aguardando novos pedidos...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {job.order_id 
                            ? `Pedido #${(job.metadata as any)?.orderNumber || job.order_id.slice(0, 8)}`
                            : job.job_type === 'table_bill' ? 'Conta de Mesa'
                            : job.job_type === 'cash_opening_supply' ? 'Suprimento de Caixa'
                            : job.job_type === 'cash_sangria' ? 'Sangria de Caixa'
                            : job.job_type === 'cash_closing_report' ? 'Fechamento de Caixa'
                            : job.job_type === 'credit_statement' ? 'Extrato de Crédito'
                            : job.job_type === 'sommelier_ticket' ? 'Ticket Sommelier'
                            : job.job_type === 'printer_test' ? 'Teste de Impressora'
                            : `Job ${job.id.slice(0, 8)}`
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(job.created_at), "HH:mm:ss", { locale: ptBR })}
                          <span className="ml-2 text-muted-foreground/70">
                            ({job.job_type})
                          </span>
                          {job.attempts > 0 && (
                            <span className="ml-2 text-orange-500">
                              Tentativa {job.attempts + 1}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {processingRef.current.has(job.id) ? 'Imprimindo...' : 'Aguardando'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Log de Atividade
            </CardTitle>
            <CardDescription>
              Histórico de impressões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma atividade ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        log.status === 'success' 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{log.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(log.timestamp, "HH:mm:ss", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Como usar:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Mantenha esta página aberta em um computador conectado à impressora térmica</li>
                <li>Configure o Chrome para imprimir automaticamente (modo quiosque: <code>--kiosk-printing</code>)</li>
                <li>Os pedidos serão impressos automaticamente quando entrarem na fila</li>
                <li>Use o botão de tela cheia para melhor visualização</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
