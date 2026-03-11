import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function InteligenciaArtificialPage() {
  return (
    <DashboardLayout title="Central de IA">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Central de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub único para todos os recursos de Inteligência Artificial:
              análise comportamental, assistentes de marketing, chatbot WhatsApp, cardápio criativo
              e ferramentas de QA.
            </p>
            <p>
              No futuro, cada área pode ser organizada em abas ou seções dentro desta mesma tela,
              mantendo a navegação simples para o gerente.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

