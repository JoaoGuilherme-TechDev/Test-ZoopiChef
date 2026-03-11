import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrincipalEntregasLogisticaPage() {
  return (
    <DashboardLayout title="Entregas & Logística">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Entregas & Logística
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Gerencie entregadores, expedição, ranking, crachá e painel GPS.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
