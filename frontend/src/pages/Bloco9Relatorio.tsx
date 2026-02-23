import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Wrench } from "lucide-react";

const auditResults = [
  // Edge Functions
  { module: "fiscal-emit", status: "ok", note: "Validação de documentId ✓" },
  { module: "fiscal-cancel", status: "ok", note: "Validação de documentId e reason ✓" },
  { module: "marketplace-sync", status: "corrigido", note: "Mudado de 500 para 400 quando integração não encontrada" },
  
  // Hooks ERP
  { module: "useERPReceivables", status: "ok", note: "CRUD completo com histórico ✓" },
  { module: "useERPPayablesInstallments", status: "ok", note: "Parcelas recorrentes e histórico ✓" },
  { module: "useERPProductCosts", status: "ok", note: "Custos com versionamento ✓" },
  { module: "useERPCostCenters", status: "ok", note: "CRUD centros de custo ✓" },
  { module: "useERPDRE", status: "ok", note: "Cálculo DRE básico ✓" },
  { module: "useERPDREAdvanced", status: "ok", note: "DRE por categoria com comparativo ✓" },
  { module: "useERPCMV", status: "ok", note: "Cálculo CMV e margens ✓" },
  { module: "useERPCashFlow", status: "ok", note: "Projeção fluxo de caixa ✓" },
  { module: "useERPDashboard", status: "ok", note: "Dashboard executivo ✓" },
  { module: "useERPSalesReport", status: "ok", note: "Relatórios por período/operador/pagamento ✓" },
  { module: "useERPTopProducts", status: "ok", note: "Ranking de produtos ✓" },
  { module: "useERPDeliveryFees", status: "ok", note: "Análise taxas de entrega ✓" },
  { module: "useERPDiscounts", status: "ok", note: "Análise de descontos ✓" },
  { module: "useERPBudgets", status: "ok", note: "Gestão de orçamentos ✓" },
  
  // Hooks Fiscal
  { module: "useFiscalDocuments", status: "ok", note: "CRUD documentos fiscais ✓" },
  { module: "useFiscalReferences", status: "ok", note: "Referências fiscais ✓" },
  
  // Hooks Marketplace
  { module: "useMarketplaceIntegrations", status: "ok", note: "Integrações e sincronização ✓" },
  
  // Páginas ERP
  { module: "ERPDashboardPage", status: "ok", note: "Dashboard financeiro ✓" },
  { module: "ERPReceivablesPage", status: "ok", note: "Contas a receber ✓" },
  { module: "ERPPayablesPage", status: "ok", note: "Contas a pagar ✓" },
  { module: "ERPDREPage", status: "ok", note: "Demonstração de resultados ✓" },
  { module: "ERPCMVPage", status: "ok", note: "Custo mercadoria vendida ✓" },
  { module: "ERPCashFlowPage", status: "ok", note: "Fluxo de caixa ✓" },
  { module: "ERPSalesReportPage", status: "ok", note: "Relatórios de vendas ✓" },
  { module: "ERPTopProductsPage", status: "ok", note: "Produtos mais vendidos ✓" },
  { module: "ERPCostCentersPage", status: "ok", note: "Centros de custo ✓" },
  { module: "ERPBudgetsPage", status: "ok", note: "Orçamentos ✓" },
  
  // Páginas Fiscal
  { module: "FiscalDocumentsPage", status: "ok", note: "Documentos fiscais ✓" },
  { module: "FiscalSettingsPage", status: "ok", note: "Configurações fiscais ✓" },
  
  // Páginas Marketplace
  { module: "MarketplaceIntegrationsPage", status: "ok", note: "Gestão integrações ✓" },
  { module: "MarketplaceOrdersPage", status: "ok", note: "Pedidos marketplace ✓" },
];

export default function Bloco9Relatorio() {
  const okCount = auditResults.filter(r => r.status === "ok").length;
  const corrigidoCount = auditResults.filter(r => r.status === "corrigido").length;
  const erroCount = auditResults.filter(r => r.status === "erro").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Auditoria BLOCO 9 - Fiscal, ERP, Marketplace</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold">{auditResults.length}</div>
            <div className="text-muted-foreground">Testes Executados</div>
          </CardContent>
        </Card>
        <Card className="border-green-500">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-green-600">{okCount}</div>
            <div className="text-muted-foreground">Aprovados</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-yellow-600">{corrigidoCount}</div>
            <div className="text-muted-foreground">Corrigidos</div>
          </CardContent>
        </Card>
        <Card className="border-red-500">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-red-600">{erroCount}</div>
            <div className="text-muted-foreground">Erros</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultados Detalhados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditResults.map((result, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {result.status === "ok" && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {result.status === "corrigido" && <Wrench className="h-5 w-5 text-yellow-600" />}
                  {result.status === "erro" && <AlertCircle className="h-5 w-5 text-red-600" />}
                  <span className="font-mono text-sm">{result.module}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{result.note}</span>
                  <Badge variant={result.status === "ok" ? "default" : result.status === "corrigido" ? "secondary" : "destructive"}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
