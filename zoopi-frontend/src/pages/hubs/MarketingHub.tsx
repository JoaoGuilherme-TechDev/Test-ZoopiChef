import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MarketingHubPage() {
  return (
    <DashboardLayout title="Hub Marketing">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub Marketing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub único para campanhas, promoções, cupons,
              programas de indicação, gamificação e estratégias de recompra.
            </p>
            <p>
              No futuro, cada área poderá ser organizada em abas ou seções dentro
              desta tela, consolidando todas as ações de marketing em um só lugar.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

