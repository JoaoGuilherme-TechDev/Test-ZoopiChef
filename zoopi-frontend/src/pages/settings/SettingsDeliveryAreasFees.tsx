import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsDeliveryAreasFeesPage() {
  return (
    <DashboardLayout title="Configurações - Entregas & Taxas">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Áreas de Entrega & Taxas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Zonas de entrega, cálculo por raio, prazos, agendamento e
              taxas dinâmicas por período.
            </p>
            <p>
              Integração com localização e restrições de CEP/bairros.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
