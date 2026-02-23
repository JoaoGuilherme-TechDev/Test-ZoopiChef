import { useState } from 'react';
import { Sparkles, Play, Check, X, Eye, Loader2, Lightbulb, Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Shield, History, RotateCcw, Trash2, Bot } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useAIRecommendations,
  useUpdateRecommendationStatus,
  useAnalyzeBusiness,
  useAIInsightRuns,
  type AIRecommendation,
} from '@/hooks/useAIRecommendations';
import { useApplyRecommendation } from '@/hooks/useApplyRecommendation';
import { useMenuVersions, useRevertMenuVersion, useDeleteMenuVersion } from '@/hooks/useMenuVersions';
import { AIAssistantChat } from '@/components/ai-assistant/AIAssistantChat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExplainablePayload {
  explanation: {
    why: string;
    risk_if_ignored: string;
    expected_impact: {
      sales: 'increase' | 'neutral' | 'decrease';
      operation: 'simplify' | 'neutral' | 'complex';
      confidence: 'low' | 'medium' | 'high';
    };
  };
  suggested_action: {
    action: string;
    details?: Record<string, unknown>;
  };
  priority: number;
}

export default function AIRecommendations() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  const { data: recommendations = [], isLoading } = useAIRecommendations('new');
  const { data: insightRuns = [] } = useAIInsightRuns();
  const { data: menuVersions = [] } = useMenuVersions();
  const updateStatus = useUpdateRecommendationStatus();
  const analyzeBusiness = useAnalyzeBusiness();
  const applyRecommendation = useApplyRecommendation();
  const revertVersion = useRevertMenuVersion();
  const deleteVersion = useDeleteMenuVersion();

  const lastRun = insightRuns[0];

  const handleAnalyze = () => {
    analyzeBusiness.mutate();
  };

  const handleApply = (recommendation: AIRecommendation) => {
    applyRecommendation.mutate(recommendation);
  };

  const handleDismiss = (recommendation: AIRecommendation) => {
    updateStatus.mutate({ id: recommendation.id, status: 'dismissed' });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      menu: 'Cardápio',
      price: 'Preço',
      combo: 'Combo',
      promo: 'Promoção',
      remove: 'Remover',
      tv: 'TV/Destaque',
      menu_improvement: 'Cardápio',
      sales_top_seller: 'Campeão',
      sales_low_seller: 'Baixa Venda',
      sales_no_sales: 'Sem Venda',
      create_combo: 'Combo',
      promo_discount: 'Desconto',
      promo_highlight: 'Destaque',
      promo_tv_banner: 'Banner TV',
      promo_happy_hour: 'Happy Hour',
      cleanup_remove: 'Remover',
      cleanup_reformulate: 'Reformular',
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      menu: 'outline',
      price: 'secondary',
      combo: 'default',
      promo: 'default',
      remove: 'destructive',
      tv: 'secondary',
    };
    return variants[type] || 'secondary';
  };

  const getPayload = (recommendation: AIRecommendation): ExplainablePayload | null => {
    const payload = recommendation.action_payload_json as unknown as ExplainablePayload | null;
    if (payload?.explanation) {
      return payload;
    }
    return null;
  };

  const getSalesIcon = (sales: string) => {
    if (sales === 'increase') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (sales === 'decrease') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[confidence] || colors.medium}`}>
        {labels[confidence] || confidence}
      </span>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <Badge variant="destructive">Urgente</Badge>;
    if (priority === 2) return <Badge variant="default">Alta</Badge>;
    if (priority <= 3) return <Badge variant="secondary">Média</Badge>;
    return <Badge variant="outline">Baixa</Badge>;
  };

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const payloadA = getPayload(a);
    const payloadB = getPayload(b);
    const priorityA = payloadA?.priority || 5;
    const priorityB = payloadB?.priority || 5;
    return priorityA - priorityB;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              IA Gestora Explicável
            </h1>
            <p className="text-muted-foreground mt-1">
              Recomendações inteligentes com justificativas baseadas em dados
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showAssistant ? 'default' : 'outline'}
              size="lg"
              className="gap-2"
              onClick={() => setShowAssistant(!showAssistant)}
            >
              <Bot className="w-5 h-5" />
              {showAssistant ? 'Ver Recomendações' : 'Assistente IA'}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <History className="w-5 h-5" />
                  Histórico ({menuVersions.length})
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Versões
                  </SheetTitle>
                  <SheetDescription>
                    Reverta mudanças aplicadas pela IA com 1 clique
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {menuVersions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma versão salva ainda</p>
                      <p className="text-sm">Versões são criadas automaticamente ao aplicar sugestões</p>
                    </div>
                  ) : (
                    menuVersions.map((version) => (
                      <Card key={version.id} className={version.active ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{version.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                              {version.active && (
                                <Badge variant="outline" className="mt-1 text-xs text-green-600">
                                  Restaurado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revertVersion.mutate(version.id)}
                                disabled={revertVersion.isPending}
                                className="gap-1"
                              >
                                {revertVersion.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                                Reverter
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir versão?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. A versão será removida permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteVersion.mutate(version.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Button
              onClick={handleAnalyze}
              disabled={analyzeBusiness.isPending}
              size="lg"
              className="gap-2"
            >
              {analyzeBusiness.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Analisar agora
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-primary">Por que sugeriu</h3>
                <p className="text-xs text-muted-foreground mt-1">Cada sugestão explica o motivo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-destructive">Risco se ignorar</h3>
                <p className="text-xs text-muted-foreground mt-1">O que pode acontecer</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-success mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-success">Impacto esperado</h3>
                <p className="text-xs text-muted-foreground mt-1">Vendas e operação</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-blue-500">Pode desfazer</h3>
                <p className="text-xs text-muted-foreground mt-1">Reverta com 1 clique</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Run Info */}
        {lastRun && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Última análise: {format(new Date(lastRun.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Conditional: Show Assistant or Recommendations */}
        {showAssistant ? (
          <div className="max-w-2xl mx-auto">
            <AIAssistantChat />
          </div>
        ) : (
          <>
            {/* Recommendations List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sortedRecommendations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Lightbulb className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma recomendação pendente
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Clique em "Analisar agora" para que a IA analise os dados e gere recomendações explicáveis.
                  </p>
                </CardContent>
              </Card>
            ) : (
          <div className="grid gap-4">
            {sortedRecommendations.map((recommendation) => {
              const payload = getPayload(recommendation);
              
              return (
                <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getTypeBadgeVariant(recommendation.action_type)}>
                            {getTypeLabel(recommendation.action_type)}
                          </Badge>
                          {payload && getPriorityBadge(payload.priority)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(recommendation.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        </div>
                        <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Why - Main reason */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-primary mb-1">Por que sugerimos</p>
                          <p className="text-sm text-foreground">{recommendation.reason}</p>
                        </div>
                      </div>
                    </div>

                    {payload?.explanation && (
                      <>
                        {/* Risk if ignored */}
                        <div className="bg-destructive/5 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-destructive mb-1">Risco se ignorar</p>
                              <p className="text-sm text-foreground">{payload.explanation.risk_if_ignored}</p>
                            </div>
                          </div>
                        </div>

                        {/* Expected impact */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Vendas:</span>
                            {getSalesIcon(payload.explanation.expected_impact.sales)}
                            <span className="capitalize">
                              {payload.explanation.expected_impact.sales === 'increase' ? 'Aumentar' : 
                               payload.explanation.expected_impact.sales === 'decrease' ? 'Diminuir' : 'Neutro'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Operação:</span>
                            <span className="capitalize">
                              {payload.explanation.expected_impact.operation === 'simplify' ? 'Simplifica' :
                               payload.explanation.expected_impact.operation === 'complex' ? 'Complexa' : 'Neutro'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Confiança:</span>
                            {getConfidenceBadge(payload.explanation.expected_impact.confidence)}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Undo notice */}
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                      <RotateCcw className="w-3 h-3" />
                      <span>Você pode desfazer essa mudança no Histórico</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApply(recommendation)}
                        disabled={applyRecommendation.isPending || updateStatus.isPending}
                        className="gap-1"
                      >
                        {applyRecommendation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Aplicar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(recommendation)}
                        disabled={applyRecommendation.isPending || updateStatus.isPending}
                        className="gap-1"
                      >
                        <X className="w-4 h-4" />
                        Ignorar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedRecommendation(recommendation)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* Details Dialog */}
        <Dialog open={!!selectedRecommendation} onOpenChange={() => setSelectedRecommendation(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {selectedRecommendation?.title}
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getTypeBadgeVariant(selectedRecommendation?.action_type || '')}>
                    {getTypeLabel(selectedRecommendation?.action_type || '')}
                  </Badge>
                  {selectedRecommendation && getPayload(selectedRecommendation) && 
                    getPriorityBadge(getPayload(selectedRecommendation)!.priority)}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {selectedRecommendation && (
                <>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-primary mb-1">Por que sugerimos</p>
                        <p className="text-sm text-foreground">{selectedRecommendation.reason}</p>
                      </div>
                    </div>
                  </div>

                  {getPayload(selectedRecommendation)?.explanation && (
                    <>
                      <div className="bg-destructive/5 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-destructive mb-1">Risco se ignorar</p>
                            <p className="text-sm text-foreground">
                              {getPayload(selectedRecommendation)!.explanation.risk_if_ignored}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Impacto esperado</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-muted rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">Vendas</p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              {getSalesIcon(getPayload(selectedRecommendation)!.explanation.expected_impact.sales)}
                            </div>
                          </div>
                          <div className="bg-muted rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">Operação</p>
                            <p className="text-xs mt-1 capitalize">
                              {getPayload(selectedRecommendation)!.explanation.expected_impact.operation === 'simplify' ? 'Simplifica' :
                               getPayload(selectedRecommendation)!.explanation.expected_impact.operation === 'complex' ? 'Complexa' : 'Neutro'}
                            </p>
                          </div>
                          <div className="bg-muted rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">Confiança</p>
                            <div className="mt-1">
                              {getConfidenceBadge(getPayload(selectedRecommendation)!.explanation.expected_impact.confidence)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {getPayload(selectedRecommendation)?.suggested_action && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Ação sugerida</h4>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                            {JSON.stringify(getPayload(selectedRecommendation)!.suggested_action, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  )}

                  {/* Undo notice in dialog */}
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                    <RotateCcw className="w-3 h-3" />
                    <span>Você pode desfazer essa mudança depois de aplicar</span>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    if (selectedRecommendation) handleApply(selectedRecommendation);
                    setSelectedRecommendation(null);
                  }}
                  disabled={applyRecommendation.isPending || updateStatus.isPending}
                  className="gap-1"
                >
                  {applyRecommendation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Aplicar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedRecommendation) handleDismiss(selectedRecommendation);
                    setSelectedRecommendation(null);
                  }}
                  disabled={applyRecommendation.isPending || updateStatus.isPending}
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  Ignorar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
