import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HrHubPage() {
  return (
    <DashboardLayout title="Hub RH & Ativos">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub RH & Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub para gestão de pessoas e ativos:
              funcionários, garçons, escalas, comissões e patrimônio.
            </p>
            <p>
              Aqui você vai administrar a equipe, configurar regras de comissão
              e controlar ativos físicos e manutenções preventivas.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

