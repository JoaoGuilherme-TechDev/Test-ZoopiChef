import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MenuAdvancedPage() {
  return (
    <DashboardLayout title="Cardápio Avançado">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Cardápio Avançado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Aqui você vai configurar regras avançadas do menu, como horários,
              segmentação, experiências por canal e variações inteligentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

