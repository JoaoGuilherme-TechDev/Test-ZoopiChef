import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Outlet } from "react-router-dom";

export default function SettingsSecurityAccountPage() {
  return (
    <DashboardLayout title="Configurações - Segurança & Conta">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Segurança & Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Usuários, permissões, pânico, assinatura e parâmetros globais.</p>
          </CardContent>
        </Card>
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
