import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { SalesProjection, ProjectionDaily } from '../hooks/useSalesProjection';

interface ProjectionKPIsProps {
  projection: SalesProjection;
  dailyData: ProjectionDaily[];
}

export function ProjectionKPIs({ projection, dailyData }: ProjectionKPIsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const progressPercent = projection.target_revenue > 0 
    ? (projection.current_revenue / projection.target_revenue) * 100 
    : 0;

  const today = new Date().toISOString().split('T')[0];
  const targetEnd = new Date(projection.target_end_date);
  const daysRemaining = Math.max(0, Math.ceil((targetEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  
  const revenueRemaining = Math.max(0, projection.target_revenue - projection.current_revenue);
  const averageDailyNeeded = daysRemaining > 0 ? revenueRemaining / daysRemaining : revenueRemaining;

  // Calculate trend
  const recentDays = dailyData.filter(d => d.date <= today).slice(-7);
  const avgDifference = recentDays.length > 0 
    ? recentDays.reduce((sum, d) => sum + d.difference_percent, 0) / recentDays.length 
    : 0;

  // Days above/below target
  const daysAbove = dailyData.filter(d => d.status === 'above').length;
  const daysBelow = dailyData.filter(d => d.status === 'below').length;
  const daysOnTrack = dailyData.filter(d => d.status === 'on_track').length;

  // Status calculation
  let overallStatus: 'success' | 'warning' | 'danger' = 'success';
  let statusMessage = 'No caminho certo';
  
  if (progressPercent < 50 && daysRemaining < dailyData.length / 2) {
    overallStatus = 'danger';
    statusMessage = 'Atenção: Meta em risco';
  } else if (avgDifference < -15) {
    overallStatus = 'warning';
    statusMessage = 'Abaixo do esperado';
  } else if (avgDifference > 10) {
    overallStatus = 'success';
    statusMessage = 'Acima da meta';
  }

  const statusColors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    danger: 'text-red-600 bg-red-50 border-red-200',
  };

  const StatusIcon = overallStatus === 'success' ? CheckCircle2 : overallStatus === 'warning' ? AlertTriangle : AlertTriangle;

  return (
    <div className="space-y-4">
      {/* Main Progress Card */}
      <Card className={`border-2 ${statusColors[overallStatus]}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              <span className="font-semibold">{statusMessage}</span>
            </div>
            <Badge variant={overallStatus === 'success' ? 'default' : overallStatus === 'warning' ? 'secondary' : 'destructive'}>
              {progressPercent.toFixed(1)}% da meta
            </Badge>
          </div>
          <Progress value={Math.min(progressPercent, 100)} className="h-3 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatCurrency(projection.current_revenue)}</span>
            <span>Meta: {formatCurrency(projection.target_revenue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="h-4 w-4" />
              Falta para Meta
            </div>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(revenueRemaining)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Dias Restantes
            </div>
            <div className="text-xl font-bold">
              {daysRemaining}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Média Diária Necessária
            </div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(averageDailyNeeded)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {avgDifference >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Tendência (7 dias)
            </div>
            <div className={`text-xl font-bold ${avgDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgDifference >= 0 ? '+' : ''}{avgDifference.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">{daysAbove}</div>
            <div className="text-sm text-green-700">Dias acima da meta</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{daysOnTrack}</div>
            <div className="text-sm text-yellow-700">Dias no alvo</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">{daysBelow}</div>
            <div className="text-sm text-red-700">Dias abaixo da meta</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
