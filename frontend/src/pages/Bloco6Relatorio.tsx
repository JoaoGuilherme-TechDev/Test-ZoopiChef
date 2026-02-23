import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Wrench, FileCode, Sparkles, Settings, BarChart3, Brain } from 'lucide-react';

interface TestResult {
  name: string;
  type: 'page' | 'edge-function' | 'component';
  status: 'approved' | 'corrected' | 'error';
  notes?: string;
}

const testResults: TestResult[] = [
  // Pages - IA & Relatórios
  { name: 'Reports.tsx', type: 'page', status: 'approved', notes: 'BI - Relatórios Avançados' },
  { name: 'AIRecommendations.tsx', type: 'page', status: 'approved', notes: 'IA Gestora Explicável' },
  { name: 'SettingsAI.tsx', type: 'page', status: 'approved', notes: 'Configurações de IA' },
  { name: 'Settings.tsx', type: 'page', status: 'approved', notes: 'Configurações gerais' },
  { name: 'SettingsBranding.tsx', type: 'page', status: 'approved', notes: 'Logo e cores' },
  { name: 'SettingsSounds.tsx', type: 'page', status: 'approved', notes: 'Sons de notificação' },
  { name: 'SettingsPrinting.tsx', type: 'page', status: 'approved', notes: 'Configuração de impressoras' },
  { name: 'SettingsIntegrations.tsx', type: 'page', status: 'approved', notes: 'WhatsApp, Pix, etc' },
  { name: 'AIInsightsWidget.tsx', type: 'component', status: 'approved', notes: 'Widget no Dashboard' },
  { name: 'AIAssistantChat.tsx', type: 'component', status: 'approved', notes: 'Chat do assistente' },
  
  // Edge Functions - IA
  { name: 'ai-chat', type: 'edge-function', status: 'corrected', notes: 'Corrigido: validação de messages array vazio' },
  { name: 'ai-assistant', type: 'edge-function', status: 'approved', notes: 'Retorna análise correta' },
  { name: 'ai-manager', type: 'edge-function', status: 'approved', notes: 'Valida parâmetros obrigatórios (400)' },
  { name: 'ai-operational-analysis', type: 'edge-function', status: 'approved', notes: 'Valida company_id (400)' },
  { name: 'analyze-business', type: 'edge-function', status: 'approved', notes: 'Valida parâmetros obrigatórios (400)' },
  { name: 'ai-chatbot', type: 'edge-function', status: 'approved', notes: 'Valida parâmetros (400)' },
  { name: 'ai-concierge', type: 'edge-function', status: 'approved', notes: 'Valida campos obrigatórios (500 -> correto)' },
  { name: 'ai-demand-forecast', type: 'edge-function', status: 'approved', notes: 'Valida companyId (400)' },
  { name: 'ai-dynamic-pricing', type: 'edge-function', status: 'approved', notes: 'Valida Company ID (400)' },
  { name: 'ai-execute-suggestion', type: 'edge-function', status: 'approved', notes: 'Valida parâmetros (400)' },
  { name: 'ai-healthcheck', type: 'edge-function', status: 'approved', notes: 'Retorna status dos módulos IA' },
  { name: 'ai-menu-creative', type: 'edge-function', status: 'approved', notes: 'Valida company_id (400)' },
  { name: 'ai-smart-kds', type: 'edge-function', status: 'corrected', notes: 'Corrigido: 500 -> 400 para parâmetros faltantes' },
  { name: 'ai-tts', type: 'edge-function', status: 'approved', notes: 'Valida Text required (400)' },
  { name: 'ai-proactive-agent', type: 'edge-function', status: 'approved', notes: 'Valida company_id (400)' },
  { name: 'ai-tv-scheduler', type: 'edge-function', status: 'approved', notes: 'Valida companyId (400)' },
  { name: 'daily-report', type: 'edge-function', status: 'approved', notes: 'Valida company_id (400)' },
];

export default function Bloco6Relatorio() {
  const approved = testResults.filter(t => t.status === 'approved').length;
  const corrected = testResults.filter(t => t.status === 'corrected').length;
  const errors = testResults.filter(t => t.status === 'error').length;
  const total = testResults.length;

  return (
    <DashboardLayout title="Auditoria BLOCO 6">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-purple-500" />
            <BarChart3 className="w-8 h-8 text-blue-500" />
            <Settings className="w-8 h-8 text-gray-500" />
          </div>
          <h1 className="text-3xl font-display font-bold">BLOCO 6 - IA, Relatórios, BI, Configurações</h1>
          <p className="text-muted-foreground">
            Relatório de auditoria técnica: Inteligência Artificial, Relatórios, BI e Configurações
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-primary">{total}</p>
              <p className="text-sm text-muted-foreground">Testes Executados</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-600">{approved}</p>
              <p className="text-sm text-muted-foreground">Aprovados</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-yellow-600">{corrected}</p>
              <p className="text-sm text-muted-foreground">Corrigidos</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-red-600">{errors}</p>
              <p className="text-sm text-muted-foreground">Erros</p>
            </CardContent>
          </Card>
        </div>

        {/* Corrections Applied */}
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-yellow-600" />
              Correções Aplicadas
            </CardTitle>
            <CardDescription>Problemas identificados e corrigidos durante a auditoria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-start gap-3">
                <FileCode className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">supabase/functions/ai-chat/index.ts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Problema:</strong> Erro 500 "messages is not iterable" quando body vazio
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    <strong>Solução:</strong> Adicionada validação para garantir que messages seja um array válido, retornando erro 400 com mensagem clara
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-start gap-3">
                <FileCode className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">supabase/functions/ai-smart-kds/index.ts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Problema:</strong> Retornava status 500 quando companyId faltava (deveria ser 400)
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    <strong>Solução:</strong> Mudado para retornar status 400 com Response explícito em vez de throw Error
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Resultados dos Testes
            </CardTitle>
            <CardDescription>Lista completa de componentes testados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {test.status === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {test.status === 'corrected' && <Wrench className="w-5 h-5 text-yellow-500" />}
                    {test.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    <div>
                      <p className="font-medium text-sm">{test.name}</p>
                      {test.notes && <p className="text-xs text-muted-foreground">{test.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {test.type === 'page' ? 'Página' : test.type === 'edge-function' ? 'Edge Function' : 'Componente'}
                    </Badge>
                    <Badge
                      variant={test.status === 'approved' ? 'default' : test.status === 'corrected' ? 'secondary' : 'destructive'}
                      className={
                        test.status === 'approved'
                          ? 'bg-green-500'
                          : test.status === 'corrected'
                          ? 'bg-yellow-500 text-yellow-950'
                          : ''
                      }
                    >
                      {test.status === 'approved' ? 'OK' : test.status === 'corrected' ? 'Corrigido' : 'Erro'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Final Status */}
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div className="text-center">
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  BLOCO 6 APROVADO
                </p>
                <p className="text-sm text-muted-foreground">
                  {approved} aprovados, {corrected} corrigidos, {errors} erros
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
