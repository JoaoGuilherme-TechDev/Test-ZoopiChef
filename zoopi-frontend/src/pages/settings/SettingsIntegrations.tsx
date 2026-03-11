import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsIntegrationsPage() {
  return (
    <DashboardLayout title="Configurações - Integrações">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Integrações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Marketplaces, WhatsApp, CRM, ERPs, gateways de pagamento e
              webhooks.
            </p>
            <p>
              Configure chaves, escopos de permissão e callbacks.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
