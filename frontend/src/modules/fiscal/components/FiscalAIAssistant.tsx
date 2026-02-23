import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  FileCheck,
  Loader2,
  RefreshCw,
  Brain,
  Building2,
  Receipt,
  Info,
} from 'lucide-react';
import { useFiscalAIAccountant, FiscalSuggestion } from '../hooks/useFiscalAIAccountant';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export function FiscalAIAssistant() {
  const { data: company } = useCompany();
  const {
    taxSummary,
    lastAnalysis,
    isSummaryLoading,
    isAnalyzing,
    isGettingSuggestions,
    isApplyingCorrections,
    analyzeProducts,
    getSuggestions,
    applyCorrections,
    clearAnalysis,
  } = useFiscalAIAccountant();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<FiscalSuggestion[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<FiscalSuggestion[] | null>(null);
  const [generalNotes, setGeneralNotes] = useState<string | null>(null);

  // Get all products
  const { data: products } = useQuery({
    queryKey: ['products-for-fiscal', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('products')
        .select('id, name, ncm_code')
        .eq('company_id', company.id)
        .eq('active', true);
      return data || [];
    },
    enabled: !!company?.id,
  });

  const handleAnalyzeAll = async () => {
    if (!products?.length) return;
    const productIds = products.map(p => p.id);
    await analyzeProducts(productIds);
  };

  const handleGetAISuggestions = async () => {
    if (!products?.length) return;
    const productIds = products.map(p => p.id);
    const result = await getSuggestions(productIds);
    if (result.suggestions) {
      setAiSuggestions(result.suggestions);
      setGeneralNotes(result.generalNotes || null);
    }
  };

  const handleApplyAllSuggestions = () => {
    const suggestionsToApply = aiSuggestions || lastAnalysis?.suggestions || [];
    if (suggestionsToApply.length === 0) return;
    
    setPendingSuggestions(suggestionsToApply);
    setShowConfirmDialog(true);
  };

  const confirmApplyCorrections = async () => {
    if (!products) return;

    // Map suggestions to corrections format
    const corrections = pendingSuggestions.map(s => {
      const product = products.find(p => p.name === s.productName);
      return {
        productId: s.productId || product?.id || '',
        ncm_code: product?.ncm_code,
        cfop_estadual: s.cfop_estadual || s.suggestedData?.cfop_venda_estadual,
        cfop_interestadual: s.cfop_interestadual || s.suggestedData?.cfop_venda_interestadual,
        csosn: s.csosn || s.suggestedData?.csosn,
        cst_icms: s.cst_icms || s.suggestedData?.cst_icms,
        cst_pis: s.cst_pis || s.suggestedData?.cst_pis,
        cst_cofins: s.cst_cofins || s.suggestedData?.cst_cofins,
        pis_rate: s.pis_rate ?? s.suggestedData?.pis_rate,
        cofins_rate: s.cofins_rate ?? s.suggestedData?.cofins_rate,
        has_st: s.has_st ?? false,
      };
    }).filter(c => c.productId);

    await applyCorrections(corrections);
    setShowConfirmDialog(false);
    setPendingSuggestions([]);
    clearAnalysis();
    setAiSuggestions(null);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  if (isSummaryLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tax Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>IA Contadora</CardTitle>
          </div>
          <CardDescription>
            Assistente virtual tributarista para configuração fiscal automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taxSummary ? (
            <div className="space-y-4">
              {/* Regime Info */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{taxSummary.company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      CNPJ: {taxSummary.company.cnpj || 'Não configurado'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {taxSummary.regimeName}
                </Badge>
              </div>

              {/* Tax Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">PIS</p>
                  <p className="text-xl font-bold">{taxSummary.taxes.pisRate}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">COFINS</p>
                  <p className="text-xl font-bold">{taxSummary.taxes.cofinsRate}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">CFOP Estadual</p>
                  <p className="text-xl font-bold">{taxSummary.cfop.vendaEstadual}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">
                    {taxSummary.taxes.usesCSOSN ? 'CSOSN' : 'CST ICMS'}
                  </p>
                  <p className="text-xl font-bold">
                    {taxSummary.taxes.usesCSOSN ? taxSummary.taxes.defaultCSOSN : taxSummary.taxes.defaultCSTICMS}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertTitle>Regime Tributário</AlertTitle>
                <AlertDescription>{taxSummary.taxes.notes}</AlertDescription>
              </Alert>

              {/* Recommendations */}
              {taxSummary.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recomendações:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {taxSummary.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Regime não configurado</AlertTitle>
              <AlertDescription>
                Configure o regime tributário da empresa para usar a IA Contadora.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Análise Fiscal</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing || !products?.length}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Analisar Produtos
              </Button>
              <Button
                size="sm"
                onClick={handleGetAISuggestions}
                disabled={isGettingSuggestions || !products?.length}
              >
                {isGettingSuggestions ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Sugestões IA
              </Button>
            </div>
          </div>
          <CardDescription>
            {products?.length || 0} produtos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Analysis Results */}
          {lastAnalysis && (
            <div className="space-y-4">
              <Alert variant={lastAnalysis.issuesCount === 0 ? 'default' : 'destructive'}>
                {lastAnalysis.issuesCount === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>{lastAnalysis.message}</AlertTitle>
                <AlertDescription>
                  {lastAnalysis.totalProducts} produtos analisados • 
                  {lastAnalysis.issuesCount} problemas • 
                  {lastAnalysis.suggestionsCount} sugestões
                </AlertDescription>
              </Alert>

              {/* Issues List */}
              {lastAnalysis.issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Problemas Encontrados:</p>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {lastAnalysis.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{issue.productName}</p>
                            <p className="text-sm text-muted-foreground">{issue.issue}</p>
                            {issue.suggestion && (
                              <p className="text-xs text-primary mt-1">{issue.suggestion}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Suggestions */}
              {lastAnalysis.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Correções Sugeridas:</p>
                    <Button
                      size="sm"
                      onClick={handleApplyAllSuggestions}
                      disabled={isApplyingCorrections}
                    >
                      Aplicar Todas
                    </Button>
                  </div>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {lastAnalysis.suggestions.map((sug, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                        >
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="font-medium">{sug.productName}:</span>
                          <span className="text-muted-foreground">{sug.message || sug.observations}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* AI Suggestions */}
          {aiSuggestions && (
            <div className="space-y-4 mt-4">
              <Separator />
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Análise da IA Contadora</p>
              </div>

              {generalNotes && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{generalNotes}</AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {aiSuggestions.map((sug, i) => (
                    <div
                      key={i}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{sug.productName}</p>
                        {sug.has_st && (
                          <Badge variant="secondary">Substituição Tributária</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">CFOP:</span>{' '}
                          {sug.cfop_estadual}/{sug.cfop_interestadual}
                        </div>
                        <div>
                          <span className="text-muted-foreground">CST PIS:</span>{' '}
                          {sug.cst_pis}
                        </div>
                        <div>
                          <span className="text-muted-foreground">CST COFINS:</span>{' '}
                          {sug.cst_cofins}
                        </div>
                      </div>
                      {sug.observations && (
                        <p className="text-xs text-muted-foreground italic">
                          {sug.observations}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                className="w-full"
                onClick={handleApplyAllSuggestions}
                disabled={isApplyingCorrections}
              >
                {isApplyingCorrections ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Aplicar Todas as Correções
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!lastAnalysis && !aiSuggestions && (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Clique em "Analisar Produtos" ou "Sugestões IA" para começar</p>
              <p className="text-sm">
                A IA Contadora irá verificar a tributação de todos os produtos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Confirmar Correções Fiscais
            </DialogTitle>
            <DialogDescription>
              A IA Contadora irá aplicar as seguintes correções automaticamente:
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-64">
            <ul className="text-sm space-y-2">
              {pendingSuggestions.map((sug, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    <strong>{sug.productName}</strong>: {sug.message || sug.observations || 'Configuração fiscal padrão'}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação irá atualizar os dados fiscais dos produtos. Verifique se está de acordo com seu contador.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmApplyCorrections} disabled={isApplyingCorrections}>
              {isApplyingCorrections ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
