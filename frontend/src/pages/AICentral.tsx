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
  RefreshCw,
  Lightbulb,
  FileText,
  ShoppingBag,
  Users,
  DollarSign,
  Zap,
  History,
  RotateCcw,
  Trash2,
  Bot,
  Play,
  Shield,
  Minus,
  Megaphone,
  Package
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAIOperational } from '@/hooks/useAIOperational';
import { useMenuVersions, useRevertMenuVersion, useDeleteMenuVersion } from '@/hooks/useMenuVersions';
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
  useImpactSummary,
  type RecommendationImpact 
} from '@/hooks/useImpactMeasurement';
import {
  useConfidenceScores,
  useUpdateConfidenceOnAction,
  useConfidenceSummary,
  getConfidenceLevel,
  getConfidenceLevelLabel,
  getConfidenceLevelColor,
  type Module,
} from '@/hooks/useConfidenceScores';
import { AIAssistantChat } from '@/components/ai-assistant/AIAssistantChat';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AICentral() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [showAssistant, setShowAssistant] = useState(false);
  const [dismissDialog, setDismissDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [dismissReason, setDismissReason] = useState('');
  const [applyingRewrite, setApplyingRewrite] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Filters for unified suggestions
  const [filters, setFilters] = useState<SuggestionFilters>({
    source: 'all',
    status: 'new',
    days: 30,
  });

  // AI Operational hooks
  const { 
    suggestions: operationalSuggestions, 
    combos, 
    rewrites, 
    segments,
    isLoading: operationalLoading,
    applySuggestion,
    dismissSuggestion,
    runAnalysis,
    applyRewrite,
    dismissRewrite
  } = useAIOperational();

  // Unified suggestions hooks
  const { data: unifiedSuggestions = [], isLoading: unifiedLoading } = useUnifiedSuggestions(filters);
  const { data: counts } = useSuggestionCounts();
  const { data: impactSummary } = useImpactSummary();
  const updateStatus = useUpdateSuggestionStatus();
  const applyRecommendation = useApplyRecommendation();
  const analyzeBusiness = useAnalyzeBusiness();
  
  // Menu versions
  const { data: menuVersions = [] } = useMenuVersions();
  const revertVersion = useRevertMenuVersion();
  const deleteVersion = useDeleteMenuVersion();
  
  // Confidence scoring
  const { data: confidenceScores = [] } = useConfidenceScores();
  const updateConfidenceOnAction = useUpdateConfidenceOnAction();
  const { summary: confidenceSummary } = useConfidenceSummary();

  // Impact measurement
  const gestoraIds = useMemo(() => 
    unifiedSuggestions.filter(s => s.source === 'gestora').map(s => s.id),
    [unifiedSuggestions]
  );
  const { data: impacts = [] } = useRecommendationImpacts(gestoraIds.length > 0 ? gestoraIds : undefined);
  const impactMap = useMemo(() => {
    const map = new Map<string, RecommendationImpact>();
    impacts.forEach(impact => {
      map.set(impact.recommendation_id, impact);
    });
    return map;
  }, [impacts]);

  const pendingSuggestions = operationalSuggestions?.filter(s => s.status === 'pending') || [];
  const pendingCombos = combos?.filter(c => c.status === 'pending') || [];
  const pendingRewrites = rewrites?.filter(r => r.status === 'pending') || [];

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      await runAnalysis.mutateAsync();
      toast.success('Análise concluída! Novas sugestões geradas.');
    } catch (error) {
      toast.error('Erro ao executar análise');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyOperational = async (id: string) => {
    try {
      await applySuggestion.mutateAsync(id);
      toast.success('Sugestão aplicada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aplicar sugestão');
    }
  };

  const handleDismissOperational = async () => {
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

  const handleApplyRewrite = async (id: string) => {
    setApplyingRewrite(id);
    try {
      await applyRewrite.mutateAsync(id);
      toast.success('Descrição do produto atualizada!');
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

  // Unified suggestion handlers
  const handleApplyUnified = (suggestion: UnifiedSuggestion) => {
    const module = suggestion.source as Module;
    updateConfidenceOnAction.mutate({
      module,
      suggestionType: suggestion.type,
      action: 'applied',
    });

    if (suggestion.source === 'gestora' && suggestion.payload) {
      applyRecommendation.mutate({
        id: suggestion.id,
        company_id: '',
        title: suggestion.title,
        reason: suggestion.reason,
        action_type: suggestion.type,
        action_payload_json: suggestion.payload,
        status: 'new',
        created_at: suggestion.created_at,
      });
    } else {
      updateStatus.mutate({
        id: suggestion.id,
        source: suggestion.source,
        status: 'applied',
      });
    }
    toast.success('Sugestão aplicada!');
  };

  const handleDismissUnified = (suggestion: UnifiedSuggestion) => {
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
    toast.success('Sugestão ignorada');
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-emerald-500">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Média</Badge>;
      default:
        return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'campaign': return <Megaphone className="w-5 h-5 text-purple-500" />;
      case 'product': return <Package className="w-5 h-5 text-blue-500" />;
      case 'pricing': return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case 'combo': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      default: return <Lightbulb className="w-5 h-5 text-amber-500" />;
    }
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

  const isLoading = operationalLoading || unifiedLoading;

  if (isLoading) {
    return (
      <DashboardLayout title="Central de IA">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Central de IA">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Central de IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Todas as sugestões e ferramentas de IA em um só lugar
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showAssistant ? 'default' : 'outline'}
              onClick={() => setShowAssistant(!showAssistant)}
              className="gap-2"
            >
              <Bot className="w-4 h-4" />
              {showAssistant ? 'Ver Sugestões' : 'Assistente IA'}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <History className="w-4 h-4" />
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
                    Reverta mudanças aplicadas pela IA
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {menuVersions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma versão salva</p>
                    </div>
                  ) : (
                    menuVersions.map((version) => (
                      <Card key={version.id} className={version.active ? 'border-green-500/50' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{version.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revertVersion.mutate(version.id)}
                                disabled={revertVersion.isPending}
                              >
                                <RotateCcw className="w-3 h-3" />
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
                                      Esta ação não pode ser desfeita.
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
              onClick={handleRunAnalysis}
              disabled={analyzing || analyzeBusiness.isPending}
              className="gap-2"
            >
              {analyzing || analyzeBusiness.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-primary/50 bg-primary/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{counts?.total || pendingSuggestions.length}</p>
                  <p className="text-xs font-semibold text-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{pendingCombos.length}</p>
                  <p className="text-xs font-semibold text-foreground">Combos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-blue-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{pendingRewrites.length}</p>
                  <p className="text-xs font-semibold text-foreground">Descrições</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{segments?.length || 0}</p>
                  <p className="text-xs font-semibold text-foreground">Segmentados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/50 bg-purple-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <History className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{menuVersions.length}</p>
                  <p className="text-xs font-semibold text-foreground">Versões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant or Content */}
        {showAssistant ? (
          <div className="max-w-2xl mx-auto">
            <AIAssistantChat />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
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
              <TabsTrigger value="unified" className="gap-2">
                <Brain className="w-4 h-4" />
                Todas Fontes
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
                          {suggestion.estimated_revenue > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <TrendingUp className="w-4 h-4" />
                              +R$ {suggestion.estimated_revenue.toFixed(2)}
                            </span>
                          )}
                          {suggestion.target_customers > 0 && (
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
                          >
                            <X className="w-4 h-4 mr-1" />
                            Ignorar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplyOperational(suggestion.id)}
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
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/50">
                          <p className="text-xs font-bold text-destructive mb-1">ANTES</p>
                          <p className="font-bold">{rewrite.original_name}</p>
                          {rewrite.original_description && (
                            <p className="text-sm text-muted-foreground mt-1">{rewrite.original_description}</p>
                          )}
                        </div>
                        <div className="p-3 bg-success/10 rounded-lg border border-success/50">
                          <p className="text-xs font-bold text-success mb-1">DEPOIS</p>
                          <p className="font-bold">{rewrite.suggested_name}</p>
                          {rewrite.suggested_description && (
                            <p className="text-sm text-muted-foreground mt-1">{rewrite.suggested_description}</p>
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
                          {applyingRewrite === rewrite.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Aplicar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Unified (All Sources) Tab */}
            <TabsContent value="unified" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Select value={filters.source || 'all'} onValueChange={(v) => setFilters(p => ({ ...p, source: v as any }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="gestora">Gestora</SelectItem>
                    <SelectItem value="cardapio">Cardápio</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status || 'all'} onValueChange={(v) => setFilters(p => ({ ...p, status: v as any }))}>
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
              </div>

              {unifiedSuggestions.length === 0 ? (
                <Alert>
                  <Brain className="w-4 h-4" />
                  <AlertDescription>
                    Nenhuma sugestão encontrada com os filtros selecionados.
                  </AlertDescription>
                </Alert>
              ) : (
                unifiedSuggestions.map((suggestion) => (
                  <Card key={`${suggestion.source}-${suggestion.id}`} className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getSourceIcon(suggestion.source)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSourceColor(suggestion.source)}>
                                {getSourceLabel(suggestion.source)}
                              </Badge>
                              {getConfidenceBadge(suggestion.confidence)}
                            </div>
                            <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <p className="text-sm">{suggestion.reason}</p>
                      </div>
                      
                      {suggestion.status === 'new' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismissUnified(suggestion)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Ignorar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplyUnified(suggestion)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aplicar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Dismiss Dialog */}
        <Dialog open={dismissDialog.open} onOpenChange={(open) => setDismissDialog({ open, id: dismissDialog.id })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ignorar Sugestão</DialogTitle>
              <DialogDescription>
                Por que você está ignorando esta sugestão? (opcional)
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Motivo..."
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissDialog({ open: false, id: null })}>
                Cancelar
              </Button>
              <Button onClick={handleDismissOperational}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
