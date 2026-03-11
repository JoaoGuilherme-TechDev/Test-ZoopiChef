import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsPrintersKdsPage() {
  return (
    <DashboardLayout title="Configurações - Impressoras & KDS">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Impressoras & KDS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Filas de impressão, mapeamento por setor, layout de tickets,
              agentes desktop e exibição do KDS.
            </p>
            <p>
              Configure prioridades, agrupamentos e impressões por entregador.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
