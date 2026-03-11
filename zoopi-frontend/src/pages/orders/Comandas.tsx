import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ComandasPage() {
  return (
    <DashboardLayout title="Comandas">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Comandas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Aqui você vai gerenciar comandas em aberto, valores consumidos
              e pagamentos realizados.
            </p>
            <p>
              A visão de Salão &amp; Pedidos resume os números, enquanto esta
              tela traz o detalhe por comanda.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

