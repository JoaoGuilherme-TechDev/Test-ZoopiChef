import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TvDisplayPage() {
  return (
    <DashboardLayout title="TV Display">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              TV Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub para Telas de TV e Banners TV.
            </p>
            <p>
              Aqui você poderá cadastrar TVs, definir o que será exibido em cada tela
              e gerenciar banners, playlists e campanhas visuais.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

