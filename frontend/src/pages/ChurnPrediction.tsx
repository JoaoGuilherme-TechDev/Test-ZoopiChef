import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  RefreshCw, 
  UserMinus, 
  Phone,
  Send,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  Sparkles,
} from 'lucide-react';
import { AIModuleHeader, AI_MODULE_DESCRIPTIONS } from "@/components/ai/AIModuleHeader";
import {
  useChurnPredictions,
  useAnalyzeChurn,
  useIntervenChurn,
} from '@/hooks/useChurnPrediction';

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500' },
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500' },
};

const RISK_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export default function ChurnPrediction() {
  const { data: predictions, isLoading } = useChurnPredictions();
  const analyzeChurn = useAnalyzeChurn();
  const interveneMutation = useIntervenChurn();

  const criticalCount = predictions?.filter(p => p.risk_level === 'critical').length || 0;
  const highCount = predictions?.filter(p => p.risk_level === 'high').length || 0;
  const mediumCount = predictions?.filter(p => p.risk_level === 'medium').length || 0;

  const totalLifetimeValue = predictions?.reduce((acc, p) => acc + (p.total_lifetime_value || 0), 0) || 0;

  const handleAnalyze = async () => {
    try {
      await analyzeChurn.mutateAsync();
    } catch (error) {
      console.error('Erro ao analisar:', error);
    }
  };

  const handleIntervene = async (predictionId: string, type: string) => {
    try {
      await interveneMutation.mutateAsync({ predictionId, interventionType: type });
    } catch (error) {
      console.error('Erro na intervenção:', error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Previsão de Churn">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Previsão de Churn">
      <div className="space-y-6 animate-fade-in">
        {/* Header com descrição clara */}
        <AIModuleHeader
          title={AI_MODULE_DESCRIPTIONS.churnPredictor.title}
          icon={UserMinus}
          description={AI_MODULE_DESCRIPTIONS.churnPredictor.description}
          purpose={AI_MODULE_DESCRIPTIONS.churnPredictor.purpose}
          whenToUse={AI_MODULE_DESCRIPTIONS.churnPredictor.whenToUse}
          doesNot={AI_MODULE_DESCRIPTIONS.churnPredictor.doesNot}
        />

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={handleAnalyze}
            disabled={analyzeChurn.isPending}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          >
            {analyzeChurn.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Analisar Clientes
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-red-500/50 bg-red-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                  <p className="text-xs font-semibold">Críticos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{highCount}</p>
                  <p className="text-xs font-semibold">Alto Risco</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{mediumCount}</p>
                  <p className="text-xs font-semibold">Médio Risco</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {(totalLifetimeValue / 100).toFixed(0)}
                  </p>
                  <p className="text-xs font-semibold">Valor em Risco</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions List */}
        <Tabs defaultValue="critical" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="critical" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Críticos ({criticalCount})
            </TabsTrigger>
            <TabsTrigger value="high" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              Alto Risco ({highCount})
            </TabsTrigger>
            <TabsTrigger value="medium" className="gap-2">
              <Clock className="w-4 h-4" />
              Médio Risco ({mediumCount})
            </TabsTrigger>
          </TabsList>

          {['critical', 'high', 'medium'].map(riskLevel => (
            <TabsContent key={riskLevel} value={riskLevel} className="space-y-4 mt-4">
              {predictions?.filter(p => p.risk_level === riskLevel).length === 0 ? (
                <Alert>
                  <Sparkles className="w-4 h-4" />
                  <AlertDescription>
                    Nenhum cliente com risco {RISK_LABELS[riskLevel]?.toLowerCase()}. 
                    Execute uma análise para atualizar os dados.
                  </AlertDescription>
                </Alert>
              ) : (
                predictions
                  ?.filter(p => p.risk_level === riskLevel)
                  .map(prediction => {
                    const colors = RISK_COLORS[prediction.risk_level];
                    const customer = prediction.customer as { name?: string; whatsapp?: string } | null;
                    
                    return (
                      <Card key={prediction.id} className={`border-l-4 ${colors.border}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {customer?.name || 'Cliente'}
                              </CardTitle>
                              <CardDescription>
                                {customer?.whatsapp || 'Sem telefone'}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`${colors.bg} ${colors.text}`}>
                                {RISK_LABELS[prediction.risk_level]} - {prediction.churn_score}%
                              </Badge>
                              {prediction.intervention_status !== 'pending' && (
                                <Badge variant="outline">
                                  {prediction.intervention_status === 'contacted' ? '✓ Contatado' : prediction.intervention_status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Churn Score Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Score de Churn</span>
                              <span>{prediction.churn_score}%</span>
                            </div>
                            <Progress 
                              value={prediction.churn_score} 
                              className={`h-2 ${colors.bg}`}
                            />
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Dias sem comprar</p>
                              <p className="font-semibold">{prediction.days_since_last_order} dias</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Frequência média</p>
                              <p className="font-semibold">{prediction.avg_order_frequency_days} dias</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Dias atrasado</p>
                              <p className="font-semibold text-red-500">{prediction.days_overdue} dias</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Valor total</p>
                              <p className="font-semibold">R$ {((prediction.total_lifetime_value || 0) / 100).toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          {prediction.intervention_status === 'pending' && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIntervene(prediction.id, 'manual_contact')}
                                disabled={interveneMutation.isPending}
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Ligar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleIntervene(prediction.id, 'campaign')}
                                disabled={interveneMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Enviar Campanha
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
