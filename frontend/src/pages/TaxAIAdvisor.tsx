import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Calculator, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Search,
  RefreshCw,
  Loader2,
  Package,
  FileText,
  TrendingUp,
  Shield,
  Brain,
  ListChecks
} from 'lucide-react';
import { useTaxAudit, useAnalyzeProducts, useSuggestNCM } from '@/hooks/useAITaxAdvisor';
import { toast } from 'sonner';

export default function TaxAIAdvisor() {
  const [searchProduct, setSearchProduct] = useState('');
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');

  // Hooks
  const { data: auditResult, isLoading: loadingAudit, refetch: refetchAudit } = useTaxAudit();
  const analyzeProducts = useAnalyzeProducts();
  const suggestNCM = useSuggestNCM();

  const handleAnalyzeProducts = () => {
    analyzeProducts.mutate();
  };

  const handleSuggestNCM = () => {
    if (!productName.trim()) {
      toast.error('Informe o nome do produto');
      return;
    }
    suggestNCM.mutate(
      { productName, productDescription },
      {
        onSuccess: (data) => {
          if (data?.ncm) {
            toast.success(`NCM sugerido: ${data.ncm}`);
          }
          setShowSuggestDialog(false);
          setProductName('');
          setProductDescription('');
        }
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Conforme</Badge>;
      case 'atencao':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Atenção</Badge>;
      case 'critico':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Crítico</Badge>;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">Média</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="IA de Tributos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              IA de Tributos
            </h1>
            <p className="text-muted-foreground mt-1">
              Assistente inteligente para classificação fiscal e gestão tributária
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetchAudit()}
              disabled={loadingAudit}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingAudit ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={() => setShowSuggestDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerir NCM
            </Button>
          </div>
        </div>

        {/* Score Card */}
        <Card className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getScoreColor(auditResult?.analysis?.score || 0)}`}>
                    {auditResult?.analysis?.score || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Score Fiscal</div>
                </div>
                <div>
                  {auditResult?.analysis?.status && getStatusBadge(auditResult.analysis.status)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold">{auditResult?.stats?.total_products || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Produtos</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-yellow-500">{auditResult?.stats?.without_ncm || 0}</div>
                  <div className="text-xs text-muted-foreground">Sem NCM</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-orange-500">{auditResult?.stats?.without_cfop || 0}</div>
                  <div className="text-xs text-muted-foreground">Sem CFOP</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audit">
              <FileCheck className="h-4 w-4 mr-2" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <ListChecks className="h-4 w-4 mr-2" />
              Recomendações
            </TabsTrigger>
          </TabsList>

          {/* Auditoria Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Problemas Encontrados
                </CardTitle>
                <CardDescription>
                  Lista de pendências fiscais identificadas nos produtos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : auditResult?.issues && auditResult.issues.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {auditResult.issues.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{issue.product_name}</div>
                              <div className="text-sm text-muted-foreground">{issue.issue}</div>
                            </div>
                          </div>
                          {getSeverityBadge(issue.severity)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                    <p className="text-muted-foreground">Nenhum problema encontrado!</p>
                    <p className="text-sm text-muted-foreground">Todos os produtos estão com a classificação fiscal correta.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Produtos Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Análise Automática de Produtos
                </CardTitle>
                <CardDescription>
                  A IA analisa seus produtos e sugere classificações NCM e CFOP automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar produto..." 
                      className="pl-10"
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAnalyzeProducts}
                    disabled={analyzeProducts.isPending}
                  >
                    {analyzeProducts.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    Analisar Produtos
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/50 p-6 text-center">
                  <Calculator className="h-12 w-12 mx-auto text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Análise com IA</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique em "Analisar Produtos" para que a IA identifique produtos sem NCM 
                    e sugira a classificação fiscal correta automaticamente.
                  </p>
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>NCM sugerido</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>CFOP calculado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>Alíquota estimada</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recomendações Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomendações da IA
                </CardTitle>
                <CardDescription>
                  Ações sugeridas para melhorar sua conformidade fiscal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditResult?.analysis?.recomendacoes && auditResult.analysis.recomendacoes.length > 0 ? (
                  <div className="space-y-3">
                    {auditResult.analysis.recomendacoes.map((rec, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-4 rounded-lg border bg-primary/5 border-primary/20"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium">{rec}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                    <p className="text-muted-foreground">Parabéns!</p>
                    <p className="text-sm text-muted-foreground">Sua empresa está em conformidade fiscal.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <FileText className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold">NCM Automático</h3>
                  <p className="text-sm text-muted-foreground">
                    A IA identifica o código NCM correto baseado no nome e descrição do produto
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Calculator className="h-8 w-8 text-green-500 mb-2" />
                  <h3 className="font-semibold">CFOP Calculado</h3>
                  <p className="text-sm text-muted-foreground">
                    Cálculo automático do CFOP baseado no tipo de operação e localização
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Shield className="h-8 w-8 text-purple-500 mb-2" />
                  <h3 className="font-semibold">Auditoria Contínua</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitoramento automático para identificar inconsistências fiscais
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para Sugerir NCM */}
      <Dialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Sugerir NCM com IA
            </DialogTitle>
            <DialogDescription>
              Informe o nome e descrição do produto para receber uma sugestão de classificação fiscal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Produto *</label>
              <Input 
                placeholder="Ex: Pizza Margherita Grande"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input 
                placeholder="Ex: Pizza com molho de tomate, mussarela e manjericão"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSuggestNCM}
              disabled={suggestNCM.isPending}
            >
              {suggestNCM.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Gerar Sugestão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
