import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, XCircle, AlertTriangle, Shield, Link2, Tv, Brain, Mic, MessageSquare, Megaphone, RefreshCw, Calendar, Sparkles, Volume2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  rawResponse?: any;
}

interface QAResult {
  success: boolean;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  error?: string;
}

interface AITestResult {
  module: string;
  endpoint: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'error';
  responseTime?: number;
  response?: any;
  error?: string;
  logsInAiJobs?: boolean;
  blocksInactiveCompany?: boolean;
}

export default function QA() {
  const { data: profile } = useProfile();
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningRLS, setIsRunningRLS] = useState(false);
  const [isRunningStability, setIsRunningStability] = useState(false);
  const [isRunningTV, setIsRunningTV] = useState(false);
  const [result, setResult] = useState<QAResult | null>(null);
  const [rlsResult, setRlsResult] = useState<QAResult | null>(null);
  const [stabilityResult, setStabilityResult] = useState<QAResult | null>(null);
  const [tvResult, setTvResult] = useState<QAResult | null>(null);
  
  // AI QA State
  const [aiTests, setAiTests] = useState<Record<string, AITestResult>>({});
  const [isRunningAI, setIsRunningAI] = useState<string | null>(null);

  const runQATests = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('run-qa-tests');

      if (error) {
        throw new Error(error.message);
      }

      setResult(data as QAResult);

      if (data.success) {
        toast.success('Todos os testes passaram!');
      } else if (data.summary?.failed > 0) {
        toast.error(`${data.summary.failed} teste(s) falharam`);
      }
    } catch (error: any) {
      toast.error('Erro ao executar testes: ' + error.message);
      setResult({
        success: false,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0 },
        error: error.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runTokenStabilityTest = async () => {
    setIsRunningStability(true);
    setStabilityResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-token-stability');

      if (error) {
        throw new Error(error.message);
      }

      setStabilityResult(data as QAResult);

      if (data.success) {
        toast.success('Teste de estabilidade do token passou!');
      } else if (data.summary?.failed > 0) {
        toast.error(`${data.summary.failed} teste(s) falharam`);
      }
    } catch (error: any) {
      toast.error('Erro ao executar teste: ' + error.message);
      setStabilityResult({
        success: false,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0 },
        error: error.message,
      });
    } finally {
      setIsRunningStability(false);
    }
  };

  const runTVTests = async () => {
    setIsRunningTV(true);
    setTvResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-tv');

      if (error) {
        throw new Error(error.message);
      }

      setTvResult(data as QAResult);

      if (data.success) {
        toast.success('Todos os testes de TV passaram!');
      } else if (data.summary?.failed > 0) {
        toast.error(`${data.summary.failed} teste(s) de TV falharam`);
      }
    } catch (error: any) {
      toast.error('Erro ao executar testes TV: ' + error.message);
      setTvResult({
        success: false,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0 },
        error: error.message,
      });
    } finally {
      setIsRunningTV(false);
    }
  };

  const runRLSTests = async () => {
    setIsRunningRLS(true);
    setRlsResult(null);

    const tests: TestResult[] = [];

    try {
      const userCompanyId = profile?.company_id;
      
      if (!userCompanyId) {
        throw new Error('Usuário não está associado a uma empresa');
      }

      // Find a different company to test cross-access (QA_B or any other)
      const { data: otherCompanies } = await supabase
        .from('companies')
        .select('id, name')
        .neq('id', userCompanyId)
        .limit(1);

      if (!otherCompanies || otherCompanies.length === 0) {
        throw new Error('Não há outra empresa para testar isolamento. Execute primeiro o QA Multi-tenant para criar empresas de teste.');
      }

      const otherCompanyId = otherCompanies[0].id;
      const otherCompanyName = otherCompanies[0].name;

      // Test 1: Products - should NOT be able to see products from other company
      const { data: productsFromOther, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('company_id', otherCompanyId);

      const productsBlocked = !productsError && (!productsFromOther || productsFromOther.length === 0);
      tests.push({
        name: `RLS Products: Acesso à empresa "${otherCompanyName}"`,
        passed: productsBlocked,
        message: productsBlocked 
          ? 'Produtos de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${productsFromOther?.length || 0} produtos de outra empresa acessíveis!`,
      });

      // Test 2: Customers - should NOT be able to see customers from other company
      const { data: customersFromOther, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', otherCompanyId);

      const customersBlocked = !customersError && (!customersFromOther || customersFromOther.length === 0);
      tests.push({
        name: `RLS Customers: Acesso à empresa "${otherCompanyName}"`,
        passed: customersBlocked,
        message: customersBlocked 
          ? 'Clientes de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${customersFromOther?.length || 0} clientes de outra empresa acessíveis!`,
      });

      // Test 3: Orders - should NOT be able to see orders from other company
      const { data: ordersFromOther, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', otherCompanyId);

      const ordersBlocked = !ordersError && (!ordersFromOther || ordersFromOther.length === 0);
      tests.push({
        name: `RLS Orders: Acesso à empresa "${otherCompanyName}"`,
        passed: ordersBlocked,
        message: ordersBlocked 
          ? 'Pedidos de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${ordersFromOther?.length || 0} pedidos de outra empresa acessíveis!`,
      });

      // Test 4: Banners - should NOT be able to see inactive banners from other company
      // Note: active banners are public by design, so we test inactive ones
      const { data: bannersFromOther, error: bannersError } = await supabase
        .from('banners')
        .select('id, title')
        .eq('company_id', otherCompanyId)
        .eq('active', false);

      const bannersBlocked = !bannersError && (!bannersFromOther || bannersFromOther.length === 0);
      tests.push({
        name: `RLS Banners (inativos): Acesso à empresa "${otherCompanyName}"`,
        passed: bannersBlocked,
        message: bannersBlocked 
          ? 'Banners inativos de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${bannersFromOther?.length || 0} banners inativos de outra empresa acessíveis!`,
      });

      // Test 5: Categories - user can only see their company's categories
      const { data: categoriesFromOther, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, company_id')
        .eq('company_id', otherCompanyId)
        .eq('active', false); // Inactive categories should be blocked

      const categoriesBlocked = !categoriesError && (!categoriesFromOther || categoriesFromOther.length === 0);
      tests.push({
        name: `RLS Categories (inativas): Acesso à empresa "${otherCompanyName}"`,
        passed: categoriesBlocked,
        message: categoriesBlocked 
          ? 'Categorias inativas de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${categoriesFromOther?.length || 0} categorias inativas de outra empresa acessíveis!`,
      });

      // Test 6: Deliverers - should NOT be able to see deliverers from other company
      const { data: deliverersFromOther, error: deliverersError } = await supabase
        .from('deliverers')
        .select('id, name')
        .eq('company_id', otherCompanyId);

      const deliverersBlocked = !deliverersError && (!deliverersFromOther || deliverersFromOther.length === 0);
      tests.push({
        name: `RLS Deliverers: Acesso à empresa "${otherCompanyName}"`,
        passed: deliverersBlocked,
        message: deliverersBlocked 
          ? 'Entregadores de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${deliverersFromOther?.length || 0} entregadores de outra empresa acessíveis!`,
      });

      // Test 7: Profiles - should NOT be able to see profiles from other company
      const { data: profilesFromOther, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', otherCompanyId);

      const profilesBlocked = !profilesError && (!profilesFromOther || profilesFromOther.length === 0);
      tests.push({
        name: `RLS Profiles: Acesso à empresa "${otherCompanyName}"`,
        passed: profilesBlocked,
        message: profilesBlocked 
          ? 'Perfis de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${profilesFromOther?.length || 0} perfis de outra empresa acessíveis!`,
      });

      // Test 8: TV Screens - should NOT be able to see tv_screens from other company (except active ones which are public)
      const { data: tvScreensFromOther, error: tvScreensError } = await supabase
        .from('tv_screens')
        .select('id, name')
        .eq('company_id', otherCompanyId)
        .eq('active', false);

      const tvScreensBlocked = !tvScreensError && (!tvScreensFromOther || tvScreensFromOther.length === 0);
      tests.push({
        name: `RLS TV Screens (inativas): Acesso à empresa "${otherCompanyName}"`,
        passed: tvScreensBlocked,
        message: tvScreensBlocked 
          ? 'TV screens inativas de outra empresa não acessíveis (RLS funcionando)'
          : `ALERTA: ${tvScreensFromOther?.length || 0} TV screens inativas de outra empresa acessíveis!`,
      });

      // Calculate summary
      const passed = tests.filter(t => t.passed).length;
      const failed = tests.filter(t => !t.passed).length;

      const rlsResultData: QAResult = {
        success: failed === 0,
        tests,
        summary: {
          total: tests.length,
          passed,
          failed,
        },
      };

      setRlsResult(rlsResultData);

      if (rlsResultData.success) {
        toast.success('Todos os testes de RLS passaram!');
      } else {
        toast.error(`${failed} teste(s) de RLS falharam - RISCO DE SEGURANÇA!`);
      }

    } catch (error: any) {
      toast.error('Erro ao executar testes RLS: ' + error.message);
      setRlsResult({
        success: false,
        tests,
        summary: { total: tests.length, passed: tests.filter(t => t.passed).length, failed: tests.filter(t => !t.passed).length },
        error: error.message,
      });
    } finally {
      setIsRunningRLS(false);
    }
  };

  // AI QA Test Functions
  const aiModules = [
    { id: 'ai-manager', name: 'IA Gestora', icon: Brain, endpoint: 'ai-manager' },
    { id: 'ai-assistant', name: 'Assistente IA', icon: MessageSquare, endpoint: 'ai-assistant' },
    { id: 'ai-menu-creative', name: 'Cardápio Criativo', icon: Sparkles, endpoint: 'ai-menu-creative' },
    { id: 'ai-repurchase', name: 'Recompra', icon: RefreshCw, endpoint: 'ai-repurchase' },
    { id: 'ai-tv-scheduler', name: 'Agenda TV', icon: Calendar, endpoint: 'ai-tv-scheduler' },
    { id: 'ai-tv-highlight', name: 'Destaque TV', icon: Tv, endpoint: 'ai-tv-highlight' },
    { id: 'ai-campaigns', name: 'Campanhas', icon: Megaphone, endpoint: 'ai-campaigns' },
    { id: 'ai-tts', name: 'Text-to-Speech', icon: Volume2, endpoint: 'ai-tts' },
    { id: 'ai-menu-highlight', name: 'Destaque Menu', icon: Sparkles, endpoint: 'ai-menu-highlight' },
    { id: 'ai-healthcheck', name: 'Healthcheck', icon: Shield, endpoint: 'ai-healthcheck' },
  ];

  const runAITest = async (moduleId: string) => {
    if (!profile?.company_id) {
      toast.error('Usuário não está associado a uma empresa');
      return;
    }

    setIsRunningAI(moduleId);
    setAiTests(prev => ({
      ...prev,
      [moduleId]: { 
        module: moduleId, 
        endpoint: moduleId, 
        status: 'running' 
      }
    }));

    const startTime = Date.now();

    try {
      let payload: any = {};
      let result: AITestResult;

      switch (moduleId) {
        case 'ai-manager':
          payload = { 
            company_id: profile.company_id, 
            user_id: profile.id,
            analysis_type: 'full' 
          };
          break;
        case 'ai-assistant':
          payload = { 
            message: 'Teste automático de QA - listar top 3 produtos', 
            companyId: profile.company_id,
            sessionId: `qa_test_${Date.now()}`
          };
          break;
        case 'ai-menu-creative':
          payload = { company_id: profile.company_id };
          break;
        case 'ai-repurchase':
          payload = { 
            company_id: profile.company_id, 
            action: 'analyze',
            days_threshold: 7 
          };
          break;
        case 'ai-tv-scheduler':
          payload = { companyId: profile.company_id };
          break;
        case 'ai-tv-highlight':
          payload = { companyId: profile.company_id };
          break;
        case 'ai-campaigns':
          payload = { 
            company_id: profile.company_id, 
            action: 'analyze' 
          };
          break;
        case 'ai-tts':
          payload = { 
            text: 'Teste de texto para voz do sistema Zoopi', 
            voice: 'alloy' 
          };
          break;
        case 'ai-menu-highlight':
          payload = { 
            companyId: profile.company_id,
            channels: ['delivery', 'tv']
          };
          break;
        case 'ai-healthcheck':
          payload = {};
          break;
      }

      const { data, error } = await supabase.functions.invoke(moduleId, {
        body: payload
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        result = {
          module: moduleId,
          endpoint: moduleId,
          status: 'error',
          responseTime,
          error: error.message,
          response: null
        };
      } else {
        // Validate response structure
        const hasError = data?.error;
        const isValidResponse = !hasError && data !== null;
        
        result = {
          module: moduleId,
          endpoint: moduleId,
          status: isValidResponse ? 'pass' : 'fail',
          responseTime,
          response: data,
          error: hasError ? data.error : undefined,
          logsInAiJobs: ['ai-assistant', 'ai-tv-scheduler', 'ai-tv-highlight', 'ai-menu-highlight'].includes(moduleId),
          blocksInactiveCompany: ['ai-manager', 'ai-assistant'].includes(moduleId)
        };
      }

      setAiTests(prev => ({ ...prev, [moduleId]: result }));

      if (result.status === 'pass') {
        toast.success(`${moduleId}: PASS (${responseTime}ms)`);
      } else {
        toast.error(`${moduleId}: FAIL - ${result.error || 'Resposta inválida'}`);
      }

    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      setAiTests(prev => ({
        ...prev,
        [moduleId]: {
          module: moduleId,
          endpoint: moduleId,
          status: 'error',
          responseTime,
          error: err.message
        }
      }));
      toast.error(`${moduleId}: ERROR - ${err.message}`);
    } finally {
      setIsRunningAI(null);
    }
  };

  const runAllAITests = async () => {
    for (const module of aiModules) {
      await runAITest(module.id);
    }
  };

  const getAITestSummary = () => {
    const tests = Object.values(aiTests);
    return {
      total: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail' || t.status === 'error').length,
      pending: aiModules.length - tests.length
    };
  };

  const renderResults = (resultData: QAResult | null, title: string) => {
    if (!resultData) return null;

    return (
      <>
        {resultData.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Erro na Execução - {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{resultData.error}</p>
            </CardContent>
          </Card>
        )}

        {resultData.tests.length > 0 && (
          <>
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>{title} - Resumo</CardTitle>
                <CardDescription>
                  Resultado geral dos testes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Total: {resultData.summary.total}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-lg px-4 py-2 border-green-500 text-green-600 bg-green-50"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Passou: {resultData.summary.passed}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-lg px-4 py-2 border-red-500 text-red-600 bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Falhou: {resultData.summary.failed}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Individual Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>{title} - Detalhes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resultData.tests.map((test, index) => (
                    <div 
                      key={index}
                      className={`flex items-start justify-between p-4 rounded-lg border ${
                        test.passed 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {test.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-medium ${
                            test.passed ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {test.name}
                          </p>
                          <p className={`text-sm mt-1 ${
                            test.passed ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {test.message}
                          </p>
                        </div>
                      </div>
                      <Badge variant={test.passed ? 'default' : 'destructive'}>
                        {test.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </>
    );
  };

  const aiSummary = getAITestSummary();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">QA & Testes</h1>
            <p className="text-muted-foreground">
              Validação de isolamento de dados, segurança e módulos de IA
            </p>
          </div>
        </div>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI QA
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Segurança / RLS
            </TabsTrigger>
          </TabsList>

          {/* AI QA Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Módulos de IA - Testes de Execução
                </CardTitle>
                <CardDescription>
                  Testa cada edge function de IA com payload real e valida resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    onClick={runAllAITests}
                    disabled={isRunningAI !== null}
                    size="lg"
                  >
                    {isRunningAI !== null ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testando {isRunningAI}...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Testar Todos os Módulos
                      </>
                    )}
                  </Button>
                  
                  {aiSummary.total > 0 && (
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Total: {aiSummary.total}
                      </Badge>
                      <Badge className="text-lg px-3 py-1 bg-green-600">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {aiSummary.passed}
                      </Badge>
                      {aiSummary.failed > 0 && (
                        <Badge variant="destructive" className="text-lg px-3 py-1">
                          <XCircle className="w-4 h-4 mr-1" />
                          {aiSummary.failed}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aiModules.map((module) => {
                    const test = aiTests[module.id];
                    const Icon = module.icon;
                    
                    return (
                      <Card 
                        key={module.id}
                        className={`border ${
                          test?.status === 'pass' ? 'border-green-300 bg-green-50' :
                          test?.status === 'fail' || test?.status === 'error' ? 'border-red-300 bg-red-50' :
                          test?.status === 'running' ? 'border-blue-300 bg-blue-50' :
                          ''
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {module.name}
                            </CardTitle>
                            {test?.status === 'pass' && (
                              <Badge className="bg-green-600">PASS</Badge>
                            )}
                            {(test?.status === 'fail' || test?.status === 'error') && (
                              <Badge variant="destructive">FAIL</Badge>
                            )}
                            {test?.status === 'running' && (
                              <Badge variant="outline" className="animate-pulse">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ...
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs font-mono">
                            {module.endpoint}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Button
                              onClick={() => runAITest(module.id)}
                              disabled={isRunningAI !== null}
                              size="sm"
                              variant="outline"
                              className="w-full"
                            >
                              {isRunningAI === module.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Testando...
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Testar
                                </>
                              )}
                            </Button>
                            
                            {test && (
                              <div className="text-xs space-y-1">
                                {test.responseTime && (
                                  <p className="text-muted-foreground">
                                    Tempo: {test.responseTime}ms
                                  </p>
                                )}
                                {test.error && (
                                  <p className="text-red-600 break-all">
                                    Erro: {test.error}
                                  </p>
                                )}
                                {test.response && (
                                  <ScrollArea className="h-24 border rounded p-2 bg-muted/50">
                                    <pre className="text-[10px] whitespace-pre-wrap">
                                      {JSON.stringify(test.response, null, 2).substring(0, 500)}
                                      {JSON.stringify(test.response).length > 500 ? '...' : ''}
                                    </pre>
                                  </ScrollArea>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Module Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Matriz de Validação de IA</CardTitle>
                <CardDescription>
                  Status de cada módulo conforme auditoria técnica
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Módulo</th>
                        <th className="text-left p-2">JWT?</th>
                        <th className="text-left p-2">ai_jobs?</th>
                        <th className="text-left p-2">Verifica Acesso?</th>
                        <th className="text-left p-2">Frontend?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'ai-manager', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-assistant', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-menu-creative', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-repurchase', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-tv-scheduler', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-tv-highlight', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-campaigns', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-tts', jwt: false, aiJobs: false, verifyAccess: false, frontend: true },
                        { name: 'ai-menu-highlight', jwt: false, aiJobs: true, verifyAccess: true, frontend: true },
                        { name: 'ai-healthcheck', jwt: false, aiJobs: false, verifyAccess: false, frontend: true },
                      ].map((row) => (
                        <tr key={row.name} className="border-b">
                          <td className="p-2 font-mono text-xs">{row.name}</td>
                          <td className="p-2">{row.jwt ? '✅' : '❌'}</td>
                          <td className="p-2">{row.aiJobs ? '✅' : '❌'}</td>
                          <td className="p-2">{row.verifyAccess ? '✅' : '⚠️'}</td>
                          <td className="p-2">{row.frontend ? '✅' : '❌'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={runTVTests} 
                disabled={isRunningTV}
                variant="outline"
              >
                {isRunningTV ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando TV...
                  </>
                ) : (
                  <>
                    <Tv className="w-4 h-4 mr-2" />
                    Testar TV
                  </>
                )}
              </Button>

              <Button 
                onClick={runTokenStabilityTest} 
                disabled={isRunningStability}
                variant="outline"
              >
                {isRunningStability ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Testar Estabilidade Token
                  </>
                )}
              </Button>

              <Button 
                onClick={runRLSTests} 
                disabled={isRunningRLS || !profile?.company_id}
                variant="outline"
              >
                {isRunningRLS ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando RLS...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Testar RLS
                  </>
                )}
              </Button>

              <Button 
                onClick={runQATests} 
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Rodar QA Multi-tenant
                  </>
                )}
              </Button>
            </div>

            {/* TV Results */}
            {renderResults(tvResult, 'Testes TV')}

            {/* Token Stability Results */}
            {renderResults(stabilityResult, 'Estabilidade do Token')}

            {/* RLS Results */}
            {renderResults(rlsResult, 'Testes RLS')}

            {/* Multi-tenant Results */}
            {renderResults(result, 'QA Multi-tenant')}

            {!result && !rlsResult && !stabilityResult && !tvResult && !isRunning && !isRunningRLS && !isRunningStability && !isRunningTV && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Play className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum teste executado</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Clique nos botões acima para executar os testes
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Test Description */}
            <Card>
              <CardHeader>
                <CardTitle>O que estes testes validam?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Tv className="w-4 h-4" />
                      Testes TV
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Token de TV resolve corretamente</li>
                      <li>• Banners e produtos carregam</li>
                      <li>• Pelo menos 1 item para exibir</li>
                      <li>• Simulação de página TV</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Estabilidade do Token
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Altera slug da empresa</li>
                      <li>• Token continua funcionando</li>
                      <li>• Mesmos produtos retornados</li>
                      <li>• Restaura slug original</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Testes RLS
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Produtos de outra empresa</li>
                      <li>• Clientes de outra empresa</li>
                      <li>• Pedidos de outra empresa</li>
                      <li>• Banners inativos</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      QA Multi-tenant
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Cria empresas QA_A e QA_B</li>
                      <li>• Tokens públicos</li>
                      <li>• Isolamento de produtos</li>
                      <li>• Isolamento de categorias</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
