import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrincipalRelatoriosBIPage() {
  return (
    <DashboardLayout title="Relatórios & BI">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Relatórios & BI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Acompanhe relatórios, BI avançado, dashboards e projeções de vendas.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
