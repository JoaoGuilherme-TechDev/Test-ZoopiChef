import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsBillingPaymentsPage() {
  return (
    <DashboardLayout title="Configurações - Faturamento & Pagamentos">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Faturamento & Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Métodos de pagamento, bandeiras, taxas, fechamento de caixa,
              conciliação e emissão de nota.
            </p>
            <p>
              Integrações com TEF/maquininhas e configuração de recibos.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
