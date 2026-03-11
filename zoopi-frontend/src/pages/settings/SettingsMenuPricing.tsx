import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsMenuPricingPage() {
  return (
    <DashboardLayout title="Configurações - Cardápio & Preços">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Cardápio & Preços
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Regras de preço, promoções, combos, políticas de entrega,
              sabores e grades de pizza.
            </p>
            <p>
              Configuração de disponibilidade por horário e canal.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
