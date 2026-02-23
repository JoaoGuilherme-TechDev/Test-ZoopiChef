import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight,
  RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIInsights } from '@/hooks/useAIInsights';

const typeConfig = {
  tip: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-50' },
  alert: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  opportunity: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
  trend: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
};

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export function AIInsightsWidget() {
  const navigate = useNavigate();
  const { data: insights, isLoading, refetch, isRefetching } = useAIInsights();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            Insights IA do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Insights IA do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Tudo certo! Nenhum alerta ou sugestão no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Insights IA do Dia
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;

          return (
            <div 
              key={insight.id}
              className={`p-3 rounded-lg border ${config.bg} border-opacity-50 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {insight.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${priorityColors[insight.priority]}`}
                    >
                      {insight.priority === 'high' ? 'Urgente' : insight.priority === 'medium' ? 'Médio' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {insight.description}
                  </p>
                  {insight.actionPath && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1 text-xs"
                      onClick={() => navigate(insight.actionPath!)}
                    >
                      {insight.actionLabel}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => navigate('/ai-recommendations')}
        >
          Ver todas as recomendações
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
