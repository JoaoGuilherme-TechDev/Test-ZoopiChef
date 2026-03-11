import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsNotificationsSoundsPage() {
  return (
    <DashboardLayout title="Configurações - Notificações & Sons">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Notificações & Sons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Alertas do KDS, sons de chamados e pedidos, e preferências de
              notificação por canal.
            </p>
            <p>
              Defina níveis de criticidade e volumes por dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
