import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrincipalVendasAtendimentoPage() {
  return (
    <DashboardLayout title="Vendas & Atendimento">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Vendas & Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Acesse reservas, PDV, terminal de operador, self check-out e agenda.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
