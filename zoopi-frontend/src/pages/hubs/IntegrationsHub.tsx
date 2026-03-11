import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function IntegrationsHubPage() {
  return (
    <DashboardLayout title="Hub de Integrações">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub de Integrações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub único para todas as integrações do Zoopi:
              agregadores, WhatsApp, gateways de pagamento e APIs avançadas.
            </p>
            <p>
              Aqui você vai:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Conectar e gerenciar marketplaces (iFood, Rappi, etc.)</li>
              <li>Configurar WhatsApp Center e fluxos de mensagens</li>
              <li>Gerenciar provedores de pagamento e maquininhas integradas</li>
              <li>Ajustar configurações técnicas, chaves e webhooks com segurança</li>
            </ul>
            <p>
              No futuro, cada integração terá cards e abas dedicadas para
              monitoramento, status em tempo real e logs de erros.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

