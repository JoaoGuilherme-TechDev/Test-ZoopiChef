import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrincipalOperacoesEspecificasPage() {
  return (
    <DashboardLayout title="Operações Específicas">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Operações Específicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Acesse acerto, auditoria e rotinas específicas de operação.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
