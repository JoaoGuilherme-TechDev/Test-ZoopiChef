import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  RefreshCw,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { 
  useCustomerBehaviorAnalyses, 
  useSuggestionConversations,
  useBehaviorAnalysisStats,
  useAnalyzeCustomerBehavior,
  useTriggerDailySuggestions
} from "@/hooks/useAIBehaviorAnalysis";
import { CustomerAnalysisTable } from "./CustomerAnalysisTable";
import { ConversationsList } from "./ConversationsList";

export function AIBehaviorAnalysisDashboard() {
  const { data: analyses = [], isLoading: loadingAnalyses, refetch: refetchAnalyses } = useCustomerBehaviorAnalyses();
  const { data: conversations = [], isLoading: loadingConversations } = useSuggestionConversations();
  const { data: stats } = useBehaviorAnalysisStats();
  
  const analyzeAll = useAnalyzeCustomerBehavior();
  const triggerSuggestions = useTriggerDailySuggestions();

  const handleAnalyzeAll = () => {
    analyzeAll.mutate(undefined);
  };

  const handleTriggerSuggestions = () => {
    triggerSuggestions.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Análise Comportamental IA
          </h2>
          <p className="text-muted-foreground">
            Analise padrões de pedidos e envie sugestões personalizadas via WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetchAnalyses()}
            disabled={loadingAnalyses}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={handleAnalyzeAll}
            disabled={analyzeAll.isPending}
          >
            <Brain className="h-4 w-4 mr-2" />
            {analyzeAll.isPending ? 'Analisando...' : 'Analisar Clientes'}
          </Button>
          <Button 
            variant="secondary"
            onClick={handleTriggerSuggestions}
            disabled={triggerSuggestions.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {triggerSuggestions.isPending ? 'Enviando...' : 'Enviar Sugestões'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Analisados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalAnalyzed || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeDaily || 0} recebendo sugestões diárias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversas Iniciadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalConversations || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingConversations || 0} em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.confirmedOrders || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Via sugestões automáticas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.conversionRate || 0}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sugestões → Pedidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Types */}
      {stats?.byBusinessType && Object.keys(stats.byBusinessType).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Tipo de Negócio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byBusinessType).map(([type, count]) => (
                <Badge key={type} variant="secondary">
                  {type}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="analyses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyses" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Análises ({analyses.length})
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas ({conversations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses">
          <CustomerAnalysisTable 
            analyses={analyses} 
            isLoading={loadingAnalyses} 
          />
        </TabsContent>

        <TabsContent value="conversations">
          <ConversationsList 
            conversations={conversations} 
            isLoading={loadingConversations} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
