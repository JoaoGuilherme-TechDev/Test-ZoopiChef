import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  Package,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import { ProjectionRecommendation, useDismissRecommendation, useApplyRecommendation } from '../hooks/useSalesProjection';

interface AIRecommendationsProps {
  recommendations: ProjectionRecommendation[];
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  overallAssessment?: string;
  successProbability?: number;
}

export function AIRecommendations({ 
  recommendations, 
  isAnalyzing, 
  onAnalyze,
  overallAssessment,
  successProbability 
}: AIRecommendationsProps) {
  const dismissMutation = useDismissRecommendation();
  const applyMutation = useApplyRecommendation();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action': return TrendingUp;
      case 'alert': return AlertTriangle;
      case 'insight': return Lightbulb;
      case 'product': return Package;
      default: return Lightbulb;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'action': return 'Ação';
      case 'alert': return 'Alerta';
      case 'insight': return 'Insight';
      case 'product': return 'Produto';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Recomendações da IA
        </CardTitle>
        {onAnalyze && (
          <Button 
            size="sm" 
            onClick={onAnalyze} 
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              'Analisar com IA'
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {overallAssessment && (
          <div className="mb-4 p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Avaliação Geral</span>
              {successProbability !== undefined && (
                <Badge variant={successProbability >= 70 ? 'default' : successProbability >= 40 ? 'secondary' : 'destructive'}>
                  {successProbability}% probabilidade de sucesso
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{overallAssessment}</p>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma recomendação pendente</p>
              <p className="text-sm">Clique em "Analisar com IA" para gerar recomendações</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => {
                const Icon = getTypeIcon(rec.recommendation_type);
                return (
                  <div
                    key={rec.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                            {rec.priority === 'critical' ? 'Crítico' : 
                             rec.priority === 'high' ? 'Alto' : 
                             rec.priority === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(rec.recommendation_type)}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => applyMutation.mutate(rec.id)}
                          disabled={applyMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => dismissMutation.mutate(rec.id)}
                          disabled={dismissMutation.isPending}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
