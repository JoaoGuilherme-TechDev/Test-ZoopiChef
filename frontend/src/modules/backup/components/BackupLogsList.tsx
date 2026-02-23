import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import type { BackupLog } from '../types';

interface BackupLogsListProps {
  logs: BackupLog[];
  isLoading: boolean;
  onDownload?: (log: BackupLog) => void;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  running: { label: 'Executando', variant: 'default', icon: Loader2 },
  completed: { label: 'Concluído', variant: 'outline', icon: CheckCircle2 },
  failed: { label: 'Falhou', variant: 'destructive', icon: XCircle },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function BackupLogsList({ logs, isLoading, onDownload, onRefresh }: BackupLogsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum backup realizado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onRefresh && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const status = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              
              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {format(new Date(log.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className={`h-3 w-3 ${log.status === 'running' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {log.triggered_by === 'manual' ? 'Manual' : 
                     log.triggered_by === 'scheduled' ? 'Agendado' : 'Agente'}
                  </TableCell>
                  <TableCell className="capitalize">
                    {log.storage_location === 'google_drive' ? 'Google Drive' :
                     log.storage_location === 'local' ? 'Local' : 'Storage'}
                  </TableCell>
                  <TableCell>{formatFileSize(log.file_size_bytes)}</TableCell>
                  <TableCell>
                    {log.modules_included?.length ? (
                      <span className="text-sm text-muted-foreground">
                        {log.modules_included.length} módulos
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.status === 'completed' && log.file_url && onDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(log)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {log.status === 'failed' && log.error_message && (
                      <span className="text-xs text-destructive" title={log.error_message}>
                        Ver erro
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
