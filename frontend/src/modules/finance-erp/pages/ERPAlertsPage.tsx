import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  AlertTriangle,
  Info,
  AlertCircle,
  Check,
  X,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useFinancialAlerts,
  useMarkAlertRead,
  useDismissAlert,
  type FinancialAlert,
} from "../hooks/useFinancialAlerts";

export function ERPAlertsPage() {
  const { data: alerts, isLoading } = useFinancialAlerts();
  const markRead = useMarkAlertRead();
  const dismiss = useDismissAlert();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Atenção</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      budget_warning: "Orçamento",
      budget_exceeded: "Orçamento Excedido",
      cash_low: "Caixa Baixo",
      payment_due: "Pagamento Pendente",
      receivable_overdue: "Recebível Atrasado",
    };
    return labels[type] || type;
  };

  const formatRelativeTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const unreadAlerts = alerts?.filter((a) => !a.is_read) || [];
  const readAlerts = alerts?.filter((a) => a.is_read) || [];

  if (isLoading) {
    return (
      <DashboardLayout title="Alertas Financeiros">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const AlertCard = ({ alert }: { alert: FinancialAlert }) => (
    <Card className={`${!alert.is_read ? "border-l-4 border-l-primary" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {getSeverityIcon(alert.severity)}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{alert.title}</h3>
                {getSeverityBadge(alert.severity)}
                <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(alert.created_at)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!alert.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markRead.mutate(alert.id)}
                disabled={markRead.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Marcar lido
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismiss.mutate(alert.id)}
              disabled={dismiss.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout title="Alertas Financeiros">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <div>
              <h2 className="text-2xl font-bold">Alertas Financeiros</h2>
              <p className="text-muted-foreground">
                Monitore situações que precisam de atenção
              </p>
            </div>
          </div>
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadAlerts.length} não lido(s)
            </Badge>
          )}
        </div>

        {/* Unread Alerts */}
        {unreadAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Não Lidos</h3>
            {unreadAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Read Alerts */}
        {readAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-muted-foreground">
              Lidos Anteriormente
            </h3>
            {readAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!alerts || alerts.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhum alerta</h3>
              <p className="text-muted-foreground">
                Você não tem alertas financeiros no momento
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
