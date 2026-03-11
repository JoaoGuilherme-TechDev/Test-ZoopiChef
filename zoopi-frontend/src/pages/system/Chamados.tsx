import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ChamadosPage() {
  return (
    <DashboardLayout title="Chamados de salão">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Chamados de salão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Aqui você vai visualizar e tratar os chamados feitos pelas mesas
              e dispositivos de garçom.
            </p>
            <p>
              Esta tela ficará responsável por centralizar os alertas e priorizar
              o atendimento no salão.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

