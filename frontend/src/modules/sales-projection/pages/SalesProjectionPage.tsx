import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Target } from 'lucide-react';
import { 
  useActiveProjection, 
  useProjectionDaily, 
  useProjectionRecommendations,
  useAnalyzeProjection,
  useUpdateProjectionDaily,
  useSalesProjections
} from '../hooks/useSalesProjection';
import { ProjectionKPIs } from '../components/ProjectionKPIs';
import { ProjectionChart } from '../components/ProjectionChart';
import { AIRecommendations } from '../components/AIRecommendations';
import { DailyTrackingTable } from '../components/DailyTrackingTable';
import { CreateProjectionDialog } from '../components/CreateProjectionDialog';

export default function SalesProjectionPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { data: activeProjection, isLoading: loadingProjection } = useActiveProjection();
  const { data: allProjections } = useSalesProjections();
  const { data: dailyData = [], isLoading: loadingDaily } = useProjectionDaily(activeProjection?.id);
  const { data: recommendations = [] } = useProjectionRecommendations(activeProjection?.id);
  
  const analyzeMutation = useAnalyzeProjection();
  const updateDailyMutation = useUpdateProjectionDaily();

  // Auto-update daily data
  useEffect(() => {
    if (activeProjection?.id) {
      updateDailyMutation.mutate(activeProjection.id);
    }
  }, [activeProjection?.id]);

  const handleAnalyze = async () => {
    if (!activeProjection?.id) return;
    const result = await analyzeMutation.mutateAsync(activeProjection.id);
    setAnalysisResult(result);
  };

  const isLoading = loadingProjection || loadingDaily;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[300px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!activeProjection) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6" />
                Projeção de Vendas
              </h1>
              <p className="text-muted-foreground">Defina metas e acompanhe o desempenho com IA</p>
            </div>
          </div>

          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma projeção ativa</h2>
              <p className="text-muted-foreground mb-6">
                Crie uma projeção baseada em períodos anteriores e defina sua meta de crescimento
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Projeção
              </Button>
            </CardContent>
          </Card>

          <CreateProjectionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6" />
              {activeProjection.name}
            </h1>
            <p className="text-muted-foreground">
              Meta: +{activeProjection.margin_percent}% sobre o período base
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => updateDailyMutation.mutate(activeProjection.id)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${updateDailyMutation.isPending ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Projeção
            </Button>
          </div>
        </div>

        <ProjectionKPIs projection={activeProjection} dailyData={dailyData} />
        
        <ProjectionChart dailyData={dailyData} targetRevenue={activeProjection.target_revenue} />

        <div className="grid gap-6 lg:grid-cols-2">
          <DailyTrackingTable dailyData={dailyData} />
          <AIRecommendations 
            recommendations={recommendations}
            isAnalyzing={analyzeMutation.isPending}
            onAnalyze={handleAnalyze}
            overallAssessment={analysisResult?.overallAssessment}
            successProbability={analysisResult?.successProbability}
          />
        </div>

        <CreateProjectionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </DashboardLayout>
  );
}
