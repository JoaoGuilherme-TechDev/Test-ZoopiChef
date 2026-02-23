import { SaasLayout } from '@/components/saas/SaasLayout';
import { useAuditLogs } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionLabels: Record<string, { label: string; color: string }> = {
  company_activated: { label: 'Empresa Ativada', color: 'border-emerald-500/50 text-emerald-400' },
  company_suspended: { label: 'Empresa Suspensa', color: 'border-red-500/50 text-red-400' },
  template_marked: { label: 'Marcado Template', color: 'border-purple-500/50 text-purple-400' },
  template_unmarked: { label: 'Template Removido', color: 'border-slate-500/50 text-slate-400' },
  menu_cloned: { label: 'Cardápio Clonado', color: 'border-blue-500/50 text-blue-400' },
  subscription_created: { label: 'Assinatura Criada', color: 'border-emerald-500/50 text-emerald-400' },
  subscription_updated: { label: 'Assinatura Atualizada', color: 'border-amber-500/50 text-amber-400' },
  webhook_received: { label: 'Webhook Recebido', color: 'border-slate-500/50 text-slate-400' },
};

export default function SaasAudit() {
  const { data: logs = [], isLoading } = useAuditLogs(200);

  return (
    <SaasLayout title="Logs de Auditoria">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Últimas Ações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const actionInfo = actionLabels[log.action] || {
                  label: log.action,
                  color: 'border-slate-500/50 text-slate-400',
                };
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={actionInfo.color}>
                        {actionInfo.label}
                      </Badge>
                      <div>
                        <p className="text-sm text-white">{log.entity_type}</p>
                        {log.entity_id && (
                          <p className="text-xs text-slate-500 font-mono">{log.entity_id.slice(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {log.admin_user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                );
              })}
              {logs.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhum log registrado</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </SaasLayout>
  );
}
