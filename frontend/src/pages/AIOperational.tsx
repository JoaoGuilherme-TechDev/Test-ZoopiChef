import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAIOperational } from '@/hooks/useAIOperational';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Package, 
  Megaphone,
  Check,
  X,
  AlertTriangle,
  Target,
  DollarSign,
  RefreshCw,
  Lightbulb,
  Zap,
  FileText,
  ShoppingBag
} from 'lucide-react';

export default function AIOperational() {
  const { 
    suggestions, 
    combos, 
    rewrites, 
    segments,
    isLoading,
    applySuggestion,
    dismissSuggestion,
    runAnalysis,
    applyRewrite,
    dismissRewrite
  } = useAIOperational();

  const [dismissDialog, setDismissDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [dismissReason, setDismissReason] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [applyingRewrite, setApplyingRewrite] = useState<string | null>(null);

  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') || [];
  const pendingCombos = combos?.filter(c => c.status === 'pending') || [];
  const pendingRewrites = rewrites?.filter(r => r.status === 'pending') || [];

  const handleApply = async (id: string) => {
    try {
      await applySuggestion.mutateAsync(id);
      toast.success('Sugestão aplicada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aplicar sugestão');
    }
  };

  const handleDismiss = async () => {
    if (!dismissDialog.id) return;
    try {
      await dismissSuggestion.mutateAsync({ id: dismissDialog.id, reason: dismissReason });
      toast.success('Sugestão ignorada');
      setDismissDialog({ open: false, id: null });
      setDismissReason('');
    } catch (error) {
      toast.error('Erro ao ignorar sugestão');
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      await runAnalysis.mutateAsync();
      toast.success('Análise iniciada! Novas sugestões serão geradas em breve.');
    } catch (error) {
      toast.error('Erro ao iniciar análise');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyRewrite = async (id: string) => {
    setApplyingRewrite(id);
    try {
      await applyRewrite.mutateAsync(id);
      toast.success('Descrição do produto atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aplicar descrição');
    } finally {
      setApplyingRewrite(null);
    }
  };

  const handleDismissRewrite = async (id: string) => {
    try {
      await dismissRewrite.mutateAsync(id);
      toast.success('Sugestão ignorada');
    } catch (error) {
      toast.error('Erro ao ignorar sugestão');
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-emerald-500">Alta Confiança</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Média Confiança</Badge>;
      default:
        return <Badge variant="secondary">Baixa Confiança</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'campaign':
        return <Megaphone className="w-5 h-5 text-purple-500" />;
      case 'product':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'pricing':
        return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case 'combo':
        return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="IA Operacional">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="IA Operacional">
      <div className="space-y-6 animate-fade-in">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-purple-500/50 bg-purple-500/10 dark:bg-purple-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{pendingSuggestions.length}</p>
                  <p className="text-xs font-semibold text-white">Sugestões Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/50 bg-orange-500/10 dark:bg-orange-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{pendingCombos.length}</p>
                  <p className="text-xs font-semibold text-white">Combos Sugeridos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{pendingRewrites.length}</p>
                  <p className="text-xs font-semibold text-white">Descrições p/ Reescrever</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{segments?.length || 0}</p>
                  <p className="text-xs font-semibold text-white">Clientes Segmentados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Run Analysis Button */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Análise Inteligente</h3>
                  <p className="text-sm text-muted-foreground">
                    Execute a IA para analisar vendas, clientes e gerar novas sugestões
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="gap-2"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Executar Análise
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Sugestões ({pendingSuggestions.length})
            </TabsTrigger>
            <TabsTrigger value="combos" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Combos ({pendingCombos.length})
            </TabsTrigger>
            <TabsTrigger value="rewrites" className="gap-2">
              <FileText className="w-4 h-4" />
              Descrições ({pendingRewrites.length})
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4 mt-4">
            {pendingSuggestions.length === 0 ? (
              <Alert>
                <Brain className="w-4 h-4" />
                <AlertDescription>
                  Nenhuma sugestão pendente. Execute a análise para gerar novas recomendações.
                </AlertDescription>
              </Alert>
            ) : (
              pendingSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(suggestion.category)}
                        <div>
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          <CardDescription className="mt-1">{suggestion.description}</CardDescription>
                        </div>
                      </div>
                      {getConfidenceBadge(suggestion.confidence)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Por quê:</strong> {suggestion.reason}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        {suggestion.estimated_revenue && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <TrendingUp className="w-4 h-4" />
                            +R$ {suggestion.estimated_revenue.toFixed(2)} estimado
                          </span>
                        )}
                        {suggestion.target_customers && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Target className="w-4 h-4" />
                            {suggestion.target_customers} clientes
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDismissDialog({ open: true, id: suggestion.id })}
                          disabled={dismissSuggestion.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Ignorar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApply(suggestion.id)}
                          disabled={applySuggestion.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Combos Tab */}
          <TabsContent value="combos" className="space-y-4 mt-4">
            {pendingCombos.length === 0 ? (
              <Alert>
                <ShoppingBag className="w-4 h-4" />
                <AlertDescription>
                  Nenhum combo sugerido. A IA analisa produtos frequentemente comprados juntos.
                </AlertDescription>
              </Alert>
            ) : (
              pendingCombos.map((combo) => (
                <Card key={combo.id} className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {combo.suggested_name || combo.product_names.join(' + ')}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {combo.suggested_description || `Combo com ${combo.product_names.length} produtos`}
                        </CardDescription>
                      </div>
                      <Badge className="bg-orange-500">
                        {combo.discount_percent}% OFF
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {combo.product_names.map((name, idx) => (
                        <Badge key={idx} variant="outline">{name}</Badge>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg mb-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Original</p>
                        <p className="font-semibold line-through text-muted-foreground">
                          R$ {combo.original_total.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Combo</p>
                        <p className="font-bold text-emerald-600">
                          R$ {combo.suggested_price.toFixed(2)}
                        </p>
                      </div>
                      {combo.margin_percent && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Margem</p>
                          <p className="font-semibold text-blue-600">
                            {combo.margin_percent.toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <X className="w-4 h-4 mr-1" />
                        Ignorar
                      </Button>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        <Check className="w-4 h-4 mr-1" />
                        Criar Combo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rewrites Tab */}
          <TabsContent value="rewrites" className="space-y-4 mt-4">
            {pendingRewrites.length === 0 ? (
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  Nenhuma descrição para reescrever. A IA analisa produtos com descrições fracas.
                </AlertDescription>
              </Alert>
            ) : (
              pendingRewrites.map((rewrite) => (
                <Card key={rewrite.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Produto: {rewrite.original_name}</CardTitle>
                    {rewrite.improvement_reason && (
                      <CardDescription>{rewrite.improvement_reason}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-lg border border-red-500/50">
                        <p className="text-xs font-bold text-red-400 mb-1">ANTES</p>
                        <p className="font-bold text-white">{rewrite.original_name}</p>
                        {rewrite.original_description && (
                          <p className="text-sm text-gray-200 mt-1">{rewrite.original_description}</p>
                        )}
                      </div>
                      <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg border border-emerald-500/50">
                        <p className="text-xs font-bold text-emerald-400 mb-1">DEPOIS</p>
                        <p className="font-bold text-white">{rewrite.suggested_name}</p>
                        {rewrite.suggested_description && (
                          <p className="text-sm text-gray-200 mt-1">{rewrite.suggested_description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDismissRewrite(rewrite.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Ignorar
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleApplyRewrite(rewrite.id)}
                        disabled={applyingRewrite === rewrite.id}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {applyingRewrite === rewrite.id ? 'Aplicando...' : 'Aplicar Descrição'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Dismiss Dialog */}
        <Dialog open={dismissDialog.open} onOpenChange={(open) => setDismissDialog({ open, id: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ignorar Sugestão</DialogTitle>
              <DialogDescription>
                Informe o motivo para ignorar esta sugestão (opcional). Isso ajuda a IA a aprender suas preferências.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Ex: Já tentei isso antes e não funcionou..."
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissDialog({ open: false, id: null })}>
                Cancelar
              </Button>
              <Button onClick={handleDismiss} disabled={dismissSuggestion.isPending}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
