import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MenuCombosPage() {
  return (
    <DashboardLayout title="Combos do Cardápio">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Combos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Aqui você vai cadastrar, organizar e destacar os combos do cardápio,
              agrupando produtos em ofertas atrativas para o cliente.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

