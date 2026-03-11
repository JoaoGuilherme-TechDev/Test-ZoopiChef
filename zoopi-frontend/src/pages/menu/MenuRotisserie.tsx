import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MenuRotisseriePage() {
  return (
    <DashboardLayout title="Rodízio">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Rodízio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta tela será usada para configurar regras de rodízio, preços,
              tempo de permanência e acompanhamento dos consumos por mesa.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

