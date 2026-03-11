import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MesasPage() {
  return (
    <DashboardLayout title="Mesas do Salão">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Mesas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Aqui você vai acompanhar o mapa de mesas, status de ocupação
              e valores aguardando pagamento.
            </p>
            <p>
              Use esta tela como visão detalhada do salão enquanto a visão
              principal resume os indicadores.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

