import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  Eye, 
  Loader2, 
  Copy,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tv,
  ChefHat,
  Brain,
  BarChart3,
  Clock,
  RefreshCw
} from 'lucide-react';
import { AIModuleHeader, AI_MODULE_DESCRIPTIONS } from "@/components/ai/AIModuleHeader";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useUnifiedSuggestions,
  useUpdateSuggestionStatus,
  useSuggestionCounts,
  type UnifiedSuggestion,
  type SuggestionFilters,
} from '@/hooks/useAISuggestions';
import { useApplyRecommendation } from '@/hooks/useApplyRecommendation';
import { useAnalyzeBusiness } from '@/hooks/useAIRecommendations';
import { 
  useRecommendationImpacts, 
  useEvaluateImpact,
  useImpactSummary,
  type RecommendationImpact 
} from '@/hooks/useImpactMeasurement';
import {
  useConfidenceScores,
  useUpdateConfidenceOnAction,
  useUpdateConfidenceOnImpact,
  useConfidenceSummary,
  getConfidenceLevel,
  getConfidenceLevelLabel,
  getConfidenceLevelColor,
  type Module,
} from '@/hooks/useConfidenceScores';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AISuggestions() {
  const [filters, setFilters] = useState<SuggestionFilters>({
    source: 'all',
    status: 'new',
    days: 30,
  });
  const [selectedSuggestion, setSelectedSuggestion] = useState<UnifiedSuggestion | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: suggestions = [], isLoading } = useUnifiedSuggestions(filters);
  const { data: counts } = useSuggestionCounts();
  const { data: impactSummary } = useImpactSummary();
  const updateStatus = useUpdateSuggestionStatus();
  const applyRecommendation = useApplyRecommendation();
  const analyzeBusiness = useAnalyzeBusiness();
  const evaluateImpact = useEvaluateImpact();
  
  // Confidence scoring
  const { data: confidenceScores = [] } = useConfidenceScores();
  const updateConfidenceOnAction = useUpdateConfidenceOnAction();
  const updateConfidenceOnImpact = useUpdateConfidenceOnImpact();
  const { summary: confidenceSummary } = useConfidenceSummary();

  // Get all recommendation IDs from gestora source for impact lookup
  const gestoraIds = useMemo(() => 
    suggestions.filter(s => s.source === 'gestora').map(s => s.id),
    [suggestions]
  );
  const { data: impacts = [] } = useRecommendationImpacts(gestoraIds.length > 0 ? gestoraIds : undefined);

  // Create impact lookup map
  const impactMap = useMemo(() => {
    const map = new Map<string, RecommendationImpact>();
    impacts.forEach(impact => {
      map.set(impact.recommendation_id, impact);
    });
    return map;
  }, [impacts]);

  const handleTabChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      source: value as SuggestionFilters['source'],
    }));
  };

  const handleStatusFilter = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value as SuggestionFilters['status'],
    }));
  };

  const handleDaysFilter = (value: string) => {
    setFilters(prev => ({
      ...prev,
      days: parseInt(value) as 7 | 30 | 90,
    }));
  };

  const handleApplyClick = (suggestion: UnifiedSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowConfirmDialog(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedSuggestion) return;

    // Update confidence score for applied action
    const module = selectedSuggestion.source as Module;
    updateConfidenceOnAction.mutate({
      module,
      suggestionType: selectedSuggestion.type,
      action: 'applied',
    });

    if (selectedSuggestion.source === 'gestora' && selectedSuggestion.payload) {
      applyRecommendation.mutate({
        id: selectedSuggestion.id,
        company_id: '',
        title: selectedSuggestion.title,
        reason: selectedSuggestion.reason,
        action_type: selectedSuggestion.type,
        action_payload_json: selectedSuggestion.payload,
        status: 'new',
        created_at: selectedSuggestion.created_at,
      });
    } else {
      updateStatus.mutate({
        id: selectedSuggestion.id,
        source: selectedSuggestion.source,
        status: 'applied',
      });
    }

    setShowConfirmDialog(false);
    setSelectedSuggestion(null);
  };

  const handleDismiss = (suggestion: UnifiedSuggestion) => {
    // Update confidence score for dismissed action
    const module = suggestion.source as Module;
    updateConfidenceOnAction.mutate({
      module,
      suggestionType: suggestion.type,
      action: 'dismissed',
    });

    updateStatus.mutate({
      id: suggestion.id,
      source: suggestion.source,
      status: 'dismissed',
    });
  };

  const handleViewDetails = (suggestion: UnifiedSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowDetailsDialog(true);
  };

  const handleCopyText = (suggestion: UnifiedSuggestion) => {
    const text = `📊 Sugestão IA: ${suggestion.title}\n\n📝 Motivo: ${suggestion.reason}${suggestion.risk_if_ignored ? `\n\n⚠️ Risco se ignorar: ${suggestion.risk_if_ignored}` : ''}\n\n📈 Confiança: ${getConfidenceLabel(suggestion.confidence)}`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência.',
    });
  };

  const handleEvaluateImpact = (suggestion: UnifiedSuggestion) => {
    if (!suggestion.applied_at) {
      toast({
        title: 'Erro',
        description: 'Esta sugestão ainda não foi aplicada.',
        variant: 'destructive',
      });
      return;
    }

    evaluateImpact.mutate(
      {
        recommendationId: suggestion.id,
        appliedAt: suggestion.applied_at,
        windowDays: 7,
      },
      {
        onSuccess: (data) => {
          // Update confidence based on impact result
          if (data.status === 'evaluated' && data.impactType) {
            const module = suggestion.source as Module;
            updateConfidenceOnImpact.mutate({
              module,
              suggestionType: suggestion.type,
              impactType: data.impactType,
            });
          }
        },
      }
    );
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gestora': return <Brain className="w-4 h-4" />;
      case 'cardapio': return <ChefHat className="w-4 h-4" />;
      case 'tv': return <Tv className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'gestora': return 'IA Gestora';
      case 'cardapio': return 'IA Cardápio';
      case 'tv': return 'IA TV';
      default: return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'gestora': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'cardapio': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'tv': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return '';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return confidence;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return '';
    }
  };

  // Get system confidence for a suggestion based on learned scores
  const getSystemConfidence = (suggestion: UnifiedSuggestion) => {
    const module = suggestion.source as Module;
    const found = confidenceScores.find(
      s => s.module === module && s.suggestion_type === suggestion.type
    );
    const score = found?.score ?? 60;
    const level = getConfidenceLevel(score);
    return { score, level, label: getConfidenceLevelLabel(level), color: getConfidenceLevelColor(level) };
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <Badge variant="destructive">Urgente</Badge>;
    if (priority === 2) return <Badge variant="default">Alta</Badge>;
    if (priority <= 3) return <Badge variant="secondary">Média</Badge>;
    return <Badge variant="outline">Baixa</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aplicado</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="text-muted-foreground">Ignorado</Badge>;
      default:
        return <Badge variant="secondary">Novo</Badge>;
    }
  };

  const getImpactBadge = (suggestion: UnifiedSuggestion) => {
    if (suggestion.source !== 'gestora' || suggestion.status !== 'applied') return null;
    
    const impact = impactMap.get(suggestion.id);
    
    if (!impact) {
      // Check if enough time has passed
      if (suggestion.applied_at) {
        const daysSince = Math.floor((Date.now() - new Date(suggestion.applied_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 7) {
          return (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              Aguardando ({7 - daysSince}d)
            </Badge>
          );
        }
      }
      return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
          <BarChart3 className="w-3 h-3" />
          Impacto pendente
        </Badge>
      );
    }

    if (impact.status === 'insufficient_data') {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <AlertTriangle className="w-3 h-3" />
          Dados insuficientes
        </Badge>
      );
    }

    if (impact.status === 'evaluated') {
      const revenuePercent = impact.delta_metrics_json.revenue_percent;
      const isPositive = revenuePercent > 0;
      return (
        <Badge 
          variant="outline" 
          className={`gap-1 ${isPositive ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{revenuePercent.toFixed(1)}% receita
        </Badge>
      );
    }

    return null;
  };

  const renderImpactDetails = (suggestion: UnifiedSuggestion) => {
    if (suggestion.source !== 'gestora') return null;
    
    const impact = impactMap.get(suggestion.id);
    if (!impact || impact.status !== 'evaluated') return null;

    const { baseline_metrics_json: baseline, after_metrics_json: after, delta_metrics_json: delta } = impact;

    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Impacto Medido (janela de {impact.baseline_window_days} dias)</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm text-muted-foreground">{baseline.total_orders}</span>
              <span className="text-xs">→</span>
              <span className="text-sm font-medium">{after.total_orders}</span>
            </div>
            <p className={`text-xs font-medium ${delta.orders_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta.orders_percent >= 0 ? '+' : ''}{delta.orders_percent.toFixed(1)}%
            </p>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">Receita</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm text-muted-foreground">R${baseline.total_revenue.toFixed(0)}</span>
              <span className="text-xs">→</span>
              <span className="text-sm font-medium">R${after.total_revenue.toFixed(0)}</span>
            </div>
            <p className={`text-xs font-medium ${delta.revenue_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta.revenue_percent >= 0 ? '+' : ''}{delta.revenue_percent.toFixed(1)}%
            </p>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm text-muted-foreground">R${baseline.avg_ticket.toFixed(0)}</span>
              <span className="text-xs">→</span>
              <span className="text-sm font-medium">R${after.avg_ticket.toFixed(0)}</span>
            </div>
            <p className={`text-xs font-medium ${delta.ticket_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta.ticket_percent >= 0 ? '+' : ''}{delta.ticket_percent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com descrição clara */}
        <AIModuleHeader
          title="Central de Sugestões"
          icon={Sparkles}
          description="Todas as sugestões de IA num só lugar"
          purpose={AI_MODULE_DESCRIPTIONS.gestora.purpose}
          whenToUse="Para revisar e aplicar sugestões de todos os módulos de IA"
          doesNot="Não substitui análise humana - você decide o que aplicar"
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 flex-wrap">

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => analyzeBusiness.mutate()}
              disabled={analyzeBusiness.isPending}
              className="gap-2"
            >
              {analyzeBusiness.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Gerar Sugestões
            </Button>

            <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="new">Novos</SelectItem>
                <SelectItem value="applied">Aplicados</SelectItem>
                <SelectItem value="dismissed">Ignorados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(filters.days || 30)} onValueChange={handleDaysFilter}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{counts?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{counts?.gestora || 0}</p>
                <p className="text-xs text-muted-foreground">Gestora</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{counts?.cardapio || 0}</p>
                <p className="text-xs text-muted-foreground">Cardápio</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Tv className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{counts?.tv || 0}</p>
                <p className="text-xs text-muted-foreground">TV</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {impactSummary?.avg_revenue_delta 
                    ? `${impactSummary.avg_revenue_delta >= 0 ? '+' : ''}${impactSummary.avg_revenue_delta.toFixed(1)}%`
                    : '—'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Receita média</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={filters.source || 'all'} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="gestora" className="gap-2">
              <Brain className="w-4 h-4" />
              Gestora
            </TabsTrigger>
            <TabsTrigger value="cardapio" className="gap-2">
              <ChefHat className="w-4 h-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="tv" className="gap-2">
              <Tv className="w-4 h-4" />
              TV
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filters.source || 'all'} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : suggestions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma sugestão encontrada
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    As IAs ainda não geraram sugestões para este período ou filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {suggestions.map((suggestion) => (
                  <Card key={`${suggestion.source}-${suggestion.id}`} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(suggestion.source)}`}>
                              {getSourceIcon(suggestion.source)}
                              {getSourceLabel(suggestion.source)}
                            </span>
                            {getPriorityBadge(suggestion.priority)}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                              {getConfidenceLabel(suggestion.confidence)}
                            </span>
                            {/* System learned confidence */}
                            {(() => {
                              const sysConf = getSystemConfidence(suggestion);
                              return (
                                <span 
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${sysConf.color}`}
                                  title={`Score do sistema: ${sysConf.score}/100`}
                                >
                                  🧠 {sysConf.label}
                                </span>
                              );
                            })()}
                            {getStatusBadge(suggestion.status)}
                            {getImpactBadge(suggestion)}
                          </div>
                          <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(suggestion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Why */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-primary mb-1">Por que sugerimos</p>
                            <p className="text-sm text-foreground">{suggestion.reason}</p>
                          </div>
                        </div>
                      </div>

                      {/* Risk */}
                      {suggestion.risk_if_ignored && (
                        <div className="bg-destructive/5 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-destructive mb-1">Risco se ignorar</p>
                              <p className="text-sm text-foreground">{suggestion.risk_if_ignored}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Diff preview for cardapio */}
                      {suggestion.source === 'cardapio' && (suggestion.current_value || suggestion.suggested_value) && (
                        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Alteração proposta:</p>
                          <div className="grid grid-cols-2 gap-4">
                            {suggestion.current_value && (
                              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Atual</p>
                                <p className="text-sm">{suggestion.current_value}</p>
                              </div>
                            )}
                            {suggestion.suggested_value && (
                              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Sugerido</p>
                                <p className="text-sm">{suggestion.suggested_value}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Impact details for evaluated recommendations */}
                      {renderImpactDetails(suggestion)}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        {suggestion.status === 'new' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApplyClick(suggestion)}
                              className="gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Aplicar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismiss(suggestion)}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              Ignorar
                            </Button>
                          </>
                        )}
                        {suggestion.status === 'applied' && suggestion.source === 'gestora' && !impactMap.get(suggestion.id)?.evaluated_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEvaluateImpact(suggestion)}
                            disabled={evaluateImpact.isPending}
                            className="gap-1"
                          >
                            {evaluateImpact.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <BarChart3 className="w-4 h-4" />
                            )}
                            Avaliar Impacto
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(suggestion)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyText(suggestion)}
                          className="gap-1"
                        >
                          <Copy className="w-4 h-4" />
                          Copiar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirm Apply Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Confirmar Aplicação
              </DialogTitle>
              <DialogDescription>
                Você está prestes a aplicar esta sugestão. Revise os detalhes abaixo antes de confirmar.
              </DialogDescription>
            </DialogHeader>

            {selectedSuggestion && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(selectedSuggestion.source)}`}>
                    {getSourceIcon(selectedSuggestion.source)}
                    {getSourceLabel(selectedSuggestion.source)}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold">{selectedSuggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{selectedSuggestion.reason}</p>
                </div>

                {selectedSuggestion.source === 'cardapio' && selectedSuggestion.suggested_value && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium mb-2">O que vai mudar:</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSuggestion.current_value && (
                        <div>
                          <p className="text-xs text-muted-foreground">De:</p>
                          <p className="text-sm line-through">{selectedSuggestion.current_value}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Para:</p>
                        <p className="text-sm font-medium text-primary">{selectedSuggestion.suggested_value}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSuggestion.source === 'tv' && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Aplicar = confirmar/agendar, não publicar automaticamente.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmApply}
                disabled={updateStatus.isPending || applyRecommendation.isPending}
              >
                {(updateStatus.isPending || applyRecommendation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Confirmar Aplicação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Sugestão</DialogTitle>
            </DialogHeader>

            {selectedSuggestion && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(selectedSuggestion.source)}`}>
                    {getSourceIcon(selectedSuggestion.source)}
                    {getSourceLabel(selectedSuggestion.source)}
                  </span>
                  {getPriorityBadge(selectedSuggestion.priority)}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(selectedSuggestion.confidence)}`}>
                    Confiança: {getConfidenceLabel(selectedSuggestion.confidence)}
                  </span>
                  {getStatusBadge(selectedSuggestion.status)}
                  {getImpactBadge(selectedSuggestion)}
                </div>

                {/* System confidence section */}
                {(() => {
                  const sysConf = getSystemConfidence(selectedSuggestion);
                  return (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">🧠 Confiança do Sistema</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${sysConf.color}`}>
                            {sysConf.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Score: {sysConf.score}/100
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Baseado em resultados históricos de sugestões semelhantes.
                      </p>
                    </div>
                  );
                })()}

                <div>
                  <h4 className="font-semibold text-lg">{selectedSuggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tipo: {selectedSuggestion.type}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">Motivo</p>
                    <p className="text-sm">{selectedSuggestion.reason}</p>
                  </div>

                  {selectedSuggestion.risk_if_ignored && (
                    <div>
                      <p className="text-xs font-medium text-destructive mb-1">Risco se Ignorar</p>
                      <p className="text-sm">{selectedSuggestion.risk_if_ignored}</p>
                    </div>
                  )}

                  {selectedSuggestion.current_value && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Valor Atual</p>
                      <p className="text-sm bg-muted/50 p-2 rounded">{selectedSuggestion.current_value}</p>
                    </div>
                  )}

                  {selectedSuggestion.suggested_value && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Valor Sugerido</p>
                      <p className="text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded">{selectedSuggestion.suggested_value}</p>
                    </div>
                  )}
                </div>

                {/* Impact details in dialog */}
                {renderImpactDetails(selectedSuggestion)}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Criado em: {format(new Date(selectedSuggestion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  {selectedSuggestion.applied_at && (
                    <p>Aplicado em: {format(new Date(selectedSuggestion.applied_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
