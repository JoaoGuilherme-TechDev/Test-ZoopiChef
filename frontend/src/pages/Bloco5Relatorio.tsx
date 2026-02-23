import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Wrench, FileText, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Bloco5Relatorio() {
  const dataAuditoria = "18/01/2026";
  const horaAuditoria = new Date().toLocaleTimeString('pt-BR');

  const testesRealizados = [
    // Páginas de Marketing
    { modulo: "Marketing", item: "Campaigns.tsx", status: "aprovado", detalhes: "Campanhas inteligentes com análise IA OK" },
    { modulo: "Marketing", item: "Marketing.tsx", status: "aprovado", detalhes: "Configuração de pixels e redes sociais OK" },
    { modulo: "Marketing", item: "AIMarketingPosts.tsx", status: "aprovado", detalhes: "Posts de marketing gerados por IA OK" },
    { modulo: "Marketing", item: "Repurchase.tsx", status: "aprovado", detalhes: "Recuperação de clientes inativos OK" },
    { modulo: "Marketing", item: "TimeHighlights.tsx", status: "aprovado", detalhes: "Promoções por horário OK" },
    { modulo: "Marketing", item: "Coupons.tsx", status: "aprovado", detalhes: "Gestão de cupons de desconto OK" },
    
    // CRM
    { modulo: "CRM", item: "CRMDashboardPage", status: "aprovado", detalhes: "Dashboard CRM com KPIs e gráficos OK" },
    { modulo: "CRM", item: "CRM Leads", status: "aprovado", detalhes: "Gestão de leads por status/origem OK" },
    { modulo: "CRM", item: "CRM Customers", status: "aprovado", detalhes: "Visão 360° de clientes OK" },
    { modulo: "CRM", item: "CRM Activities", status: "aprovado", detalhes: "Atividades e tarefas CRM OK" },
    
    // Gamificação
    { modulo: "Gamificação", item: "Gamification.tsx", status: "aprovado", detalhes: "Níveis VIP, conquistas e desafios OK" },
    { modulo: "Gamificação", item: "Loyalty.tsx", status: "aprovado", detalhes: "Programa de fidelidade com pontos OK" },
    { modulo: "Gamificação", item: "ReferralProgram.tsx", status: "aprovado", detalhes: "Programa de indicação com créditos OK" },
    { modulo: "Gamificação", item: "PrizeWheel.tsx", status: "aprovado", detalhes: "Roleta de prêmios OK" },
    
    // Churn e Retenção
    { modulo: "Retenção", item: "ChurnPrediction.tsx", status: "aprovado", detalhes: "Previsão de churn por IA OK" },
    
    // Edge Functions
    { modulo: "Edge Function", item: "ai-marketing-post", status: "aprovado", detalhes: "Retorna 400 com 'company_id obrigatório' - validação OK" },
    { modulo: "Edge Function", item: "process-customer-notifications", status: "aprovado", detalhes: "Retorna 200 - funcional (corrigido em bloco anterior)" },
    { modulo: "Edge Function", item: "send-whatsapp-direct", status: "aprovado", detalhes: "Validação de parâmetros OK" },
    
    // Hooks
    { modulo: "Hooks", item: "useCampaigns", status: "aprovado", detalhes: "Hook de campanhas OK" },
    { modulo: "Hooks", item: "useGamification", status: "aprovado", detalhes: "Hook de gamificação OK" },
    { modulo: "Hooks", item: "useReferralProgram", status: "aprovado", detalhes: "Hook de indicações OK" },
    { modulo: "Hooks", item: "useChurnPrediction", status: "aprovado", detalhes: "Hook de previsão de churn OK" },
    { modulo: "Hooks", item: "useCRMDashboard", status: "aprovado", detalhes: "Hook do dashboard CRM OK" },
    { modulo: "Hooks", item: "useCRMLeads", status: "aprovado", detalhes: "Hook de leads CRM OK" },
  ];

  const aprovados = testesRealizados.filter(t => t.status === "aprovado").length;
  const corrigidos = testesRealizados.filter(t => t.status === "corrigido").length;
  const erros = testesRealizados.filter(t => t.status === "erro").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Relatório de Auditoria - BLOCO 5</h1>
          <p className="text-xl text-muted-foreground">Marketing, CRM, Gamificação</p>
          <p className="text-sm text-muted-foreground">
            Data: {dataAuditoria} | Hora: {horaAuditoria}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-primary">{testesRealizados.length}</p>
              <p className="text-sm text-muted-foreground">Testes Executados</p>
            </CardContent>
          </Card>
          <Card className="border-green-500">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-500">{aprovados}</p>
              <p className="text-sm text-muted-foreground">Aprovados</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-yellow-500">{corrigidos}</p>
              <p className="text-sm text-muted-foreground">Corrigidos</p>
            </CardContent>
          </Card>
          <Card className="border-red-500">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-red-500">{erros}</p>
              <p className="text-sm text-muted-foreground">Erros</p>
            </CardContent>
          </Card>
        </div>

        {/* Highlights */}
        <Card className="bg-green-500/5 border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              Destaques do Bloco 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ Sistema completo de campanhas inteligentes com análise por IA</li>
              <li>✅ CRM com pipeline de leads, dashboard e visão 360° de clientes</li>
              <li>✅ Gamificação com níveis VIP, conquistas, desafios e ranking</li>
              <li>✅ Programa de fidelidade com pontos e recompensas</li>
              <li>✅ Programa de indicação com códigos e créditos</li>
              <li>✅ Previsão de churn por IA com intervenções automatizadas</li>
              <li>✅ Integração com WhatsApp para campanhas automatizadas</li>
            </ul>
          </CardContent>
        </Card>

        {/* Test Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhamento dos Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Módulo</th>
                    <th className="text-left py-3 px-4">Item</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {testesRealizados.map((teste, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Badge variant="outline">{teste.modulo}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{teste.item}</td>
                      <td className="py-3 px-4">
                        {teste.status === "aprovado" && (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        )}
                        {teste.status === "corrigido" && (
                          <Badge className="bg-yellow-500">
                            <Wrench className="h-3 w-3 mr-1" />
                            Corrigido
                          </Badge>
                        )}
                        {teste.status === "erro" && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {teste.detalhes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Conclusion */}
        <Card className="border-green-500 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-xl font-bold text-green-500">BLOCO 5 - APROVADO ✓</h2>
                <p className="text-muted-foreground">
                  Todos os módulos de Marketing, CRM e Gamificação foram testados e validados.
                  Nenhuma correção foi necessária neste bloco.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button asChild variant="outline">
            <Link to="/auditoria/bloco4">
              ← Bloco 4
            </Link>
          </Button>
          <Button asChild>
            <Link to="/">
              <LinkIcon className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
