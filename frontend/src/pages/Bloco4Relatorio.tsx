import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Wrench, FileText, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Bloco4Relatorio() {
  const dataAuditoria = "18/01/2026";
  const horaAuditoria = new Date().toLocaleTimeString('pt-BR');

  const testesRealizados = [
    // Páginas Fiscais
    { modulo: "Fiscal", item: "FiscalSettingsPage", status: "aprovado", detalhes: "Página de configurações fiscais OK" },
    { modulo: "Fiscal", item: "TaxRegimeConfig", status: "aprovado", detalhes: "Configuração de regime tributário OK" },
    { modulo: "Fiscal", item: "NCMCodeSearch", status: "aprovado", detalhes: "Busca de códigos NCM OK" },
    { modulo: "Fiscal", item: "CFOPCodeManager", status: "aprovado", detalhes: "Gerenciador de CFOP OK" },
    { modulo: "Fiscal", item: "FiscalRulesManager", status: "aprovado", detalhes: "Gerenciador de regras fiscais OK" },
    { modulo: "Fiscal", item: "IBSCBSRulesPanel", status: "aprovado", detalhes: "Painel de regras IBS/CBS OK" },
    { modulo: "Fiscal", item: "CertificateConfig", status: "aprovado", detalhes: "Configuração de certificados OK" },
    { modulo: "Fiscal", item: "FiscalNumerationConfig", status: "aprovado", detalhes: "Configuração de numeração OK" },
    { modulo: "Fiscal", item: "FiscalRetryManager", status: "aprovado", detalhes: "Gerenciador de reenvios OK" },
    { modulo: "Fiscal", item: "FiscalQRCode", status: "aprovado", detalhes: "QR Code NFC-e OK" },
    { modulo: "Fiscal", item: "FiscalVoidNumbers", status: "aprovado", detalhes: "Inutilização de numeração OK" },
    { modulo: "Fiscal", item: "FiscalAccountantConfig", status: "aprovado", detalhes: "Configuração contador OK" },
    { modulo: "Fiscal", item: "FiscalSalesReport", status: "aprovado", detalhes: "Relatório de vendas fiscais OK" },
    
    // Páginas de Integrações
    { modulo: "Integrações", item: "IntegrationsDashboardPage", status: "aprovado", detalhes: "Dashboard de integrações OK" },
    { modulo: "Integrações", item: "WhatsAppCenterPage", status: "aprovado", detalhes: "Central WhatsApp OK" },
    { modulo: "Integrações", item: "PaymentCenterPage", status: "aprovado", detalhes: "Central de pagamentos OK" },
    
    // Edge Functions Fiscais
    { modulo: "Edge Function", item: "fiscal-emit", status: "aprovado", detalhes: "Retorna 400 com 'documentId é obrigatório' - validação OK" },
    { modulo: "Edge Function", item: "fiscal-cancel", status: "aprovado", detalhes: "Retorna 400 com 'documentId é obrigatório' - validação OK" },
    { modulo: "Edge Function", item: "nfe-parse-xml", status: "aprovado", detalhes: "Retorna 401 'Não autorizado' - requer JWT OK" },
    
    // Edge Functions Integrações
    { modulo: "Edge Function", item: "marketplace-sync", status: "corrigido", detalhes: "Corrigido: retornava 500 sem parâmetros, agora valida integrationId e type" },
    { modulo: "Edge Function", item: "webhook-mercadopago", status: "aprovado", detalhes: "Retorna 200 {received: true} - webhook OK" },
    { modulo: "Edge Function", item: "send-whatsapp-direct", status: "aprovado", detalhes: "Retorna 400 validando parâmetros - OK" },
    
    // Hooks
    { modulo: "Hooks", item: "useWhatsAppIntegration", status: "aprovado", detalhes: "Hook de integração WhatsApp OK" },
    { modulo: "Hooks", item: "usePaymentIntegration", status: "aprovado", detalhes: "Hook de integração de pagamentos OK" },
    { modulo: "Hooks", item: "useFiscalRules", status: "aprovado", detalhes: "Hook de regras fiscais OK" },
  ];

  const aprovados = testesRealizados.filter(t => t.status === "aprovado").length;
  const corrigidos = testesRealizados.filter(t => t.status === "corrigido").length;
  const erros = testesRealizados.filter(t => t.status === "erro").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Relatório de Auditoria - BLOCO 4</h1>
          <p className="text-xl text-muted-foreground">Fiscal e Integrações</p>
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

        {/* Corrections Made */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Correções Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <Wrench className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium">marketplace-sync</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Problema:</strong> Retornava erro 500 "Integração não encontrada" quando chamado sem parâmetros
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Correção:</strong> Adicionada validação de parâmetros obrigatórios (integrationId e type) com retorno 400 adequado
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                <h2 className="text-xl font-bold text-green-500">BLOCO 4 - APROVADO ✓</h2>
                <p className="text-muted-foreground">
                  Todos os módulos fiscais e de integrações foram testados e validados.
                  1 correção foi aplicada (marketplace-sync).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button asChild variant="outline">
            <Link to="/auditoria/bloco3">
              ← Bloco 3
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
