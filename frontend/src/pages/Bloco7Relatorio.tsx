import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Wrench } from "lucide-react";

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'corrected';
  details?: string;
}

export default function Bloco7Relatorio() {
  const pagesTests: TestResult[] = [
    { name: "DelivererApp.tsx", status: 'pass', details: "Interface de entregador funcional com PWA" },
    { name: "usePublicDeliveryFee.ts", status: 'pass', details: "Hook de taxa de entrega público OK" },
  ];

  const edgeFunctionTests: TestResult[] = [
    { name: "deliverer-orders", status: 'pass', details: "400 Token is required - validação OK" },
    { name: "public-create-order", status: 'pass', details: "400 company_id é obrigatório - validação OK" },
    { name: "deliverer-location", status: 'pass', details: "400 deliverer_id or token required - validação OK" },
    { name: "public-chat", status: 'corrected', details: "Corrigido: adicionada validação de body para evitar 500" },
    { name: "public-wheel-eligibility", status: 'pass', details: "400 company_id e phone são obrigatórios - validação OK" },
    { name: "batch-dispatch", status: 'pass', details: "400 order_ids array is required - validação OK" },
  ];

  const allTests = [...pagesTests, ...edgeFunctionTests];
  const passCount = allTests.filter(t => t.status === 'pass').length;
  const correctedCount = allTests.filter(t => t.status === 'corrected').length;
  const failCount = allTests.filter(t => t.status === 'fail').length;

  const corrections = [
    {
      file: "supabase/functions/public-chat/index.ts",
      issue: "Erro 500 quando body vazio era enviado",
      fix: "Adicionada validação de parsing do body com try-catch e verificação de message/companyId obrigatórios"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatório BLOCO 7</h1>
        <Badge variant="default" className="text-lg px-4 py-2">
          Público, Delivery, Entregadores
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-primary">{allTests.length}</div>
            <div className="text-sm text-muted-foreground">Total de Testes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-green-500">{passCount}</div>
            <div className="text-sm text-muted-foreground">Aprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-amber-500">{correctedCount}</div>
            <div className="text-sm text-muted-foreground">Corrigidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-red-500">{failCount}</div>
            <div className="text-sm text-muted-foreground">Erros</div>
          </CardContent>
        </Card>
      </div>

      {/* Corrections */}
      {corrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Correções Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {corrections.map((c, i) => (
              <div key={i} className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <div className="font-mono text-sm text-amber-400">{c.file}</div>
                <div className="mt-2">
                  <span className="text-muted-foreground">Problema:</span> {c.issue}
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground">Solução:</span> {c.fix}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pages Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Páginas Testadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pagesTests.map((test, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {test.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {test.status === 'corrected' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                  {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-mono">{test.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{test.details}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edge Functions Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Edge Functions Testadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {edgeFunctionTests.map((test, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {test.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {test.status === 'corrected' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                  {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-mono">{test.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{test.details}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conclusion */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <h3 className="text-xl font-bold text-green-500">BLOCO 7 APROVADO</h3>
              <p className="text-muted-foreground">
                Todos os testes passaram. 1 correção aplicada em public-chat.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
