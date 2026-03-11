import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LogisticsHubPage() {
  return (
    <DashboardLayout title="Hub Logística & Compras">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub Logística & Compras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub para cotações, sugestões de compra e
              planejamento de rotas de entrega.
            </p>
            <p>
              Aqui você vai controlar o fluxo de abastecimento, priorizar pedidos
              de compra e desenhar rotas eficientes para entregadores.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

