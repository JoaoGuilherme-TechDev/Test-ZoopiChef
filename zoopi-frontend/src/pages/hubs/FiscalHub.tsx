import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function FiscalHubPage() {
  return (
    <DashboardLayout title="Hub Fiscal">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub para documentos fiscais, configurações
              tributárias e automações de IA para tributos.
            </p>
            <p>
              Aqui você vai acompanhar notas emitidas, ajustar regras fiscais,
              integrar com contabilidade e usar IA para sugerir enquadramentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

