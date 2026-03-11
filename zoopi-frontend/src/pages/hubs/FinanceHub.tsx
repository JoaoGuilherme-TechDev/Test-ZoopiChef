import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function FinanceHubPage() {
  return (
    <DashboardLayout title="Hub Financeiro">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub de finanças: fluxo de caixa, contas a pagar,
              fiado, bancos e relatórios financeiros.
            </p>
            <p>
              Aqui você vai acompanhar indicadores financeiros, conciliar caixas,
              gerenciar formas de pagamento e organizar o plano de contas.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

