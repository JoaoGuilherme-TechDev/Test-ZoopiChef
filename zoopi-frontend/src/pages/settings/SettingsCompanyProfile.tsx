import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsCompanyProfilePage() {
  return (
    <DashboardLayout title="Configurações - Empresa">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Informações cadastrais, endereço, contatos, horários de
              funcionamento e identidade visual.
            </p>
            <p>
              Também centraliza preferências de fuso horário, idioma e moeda.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
