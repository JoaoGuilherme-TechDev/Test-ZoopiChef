import { useOnboardingProgress } from '../hooks/useOnboardingProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  CheckCircle2,
  Circle,
  ChevronRight,
  Star,
  Zap,
  Gift,
} from 'lucide-react';

interface GamifiedProgressProps {
  compact?: boolean;
}

export function GamifiedProgress({ compact = false }: GamifiedProgressProps) {
  const navigate = useNavigate();
  const {
    isLoading,
    completedSteps,
    totalPoints,
    maxPoints,
    progressPercent,
    isStepCompleted,
    getNextStep,
    allSteps,
  } = useOnboardingProgress();

  const nextStep = getNextStep();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="pt-6">
          <div className="h-20 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // If all steps completed, show celebration
  if (progressPercent === 100) {
    return (
      <Card className="border-0 shadow-soft bg-gradient-to-br from-success/10 to-success/5">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <h3 className="font-semibold text-foreground">Parabéns! 🎉</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Você completou todo o onboarding!
          </p>
          <Badge className="mt-3 bg-success/20 text-success border-0">
            <Star className="w-3 h-3 mr-1" />
            {totalPoints} pontos conquistados
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                <Zap className="w-3 h-3 text-warning-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {completedSteps.length} de {allSteps.length} etapas
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Próximo: {nextStep?.title}
              </p>
              <Progress value={progressPercent} className="mt-2 h-2" />
            </div>
            {nextStep?.path && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(nextStep.path!)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Seu Progresso
          </CardTitle>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Star className="w-3 h-3 mr-1" />
            {totalPoints}/{maxPoints} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              {completedSteps.length} de {allSteps.length} etapas
            </span>
            <span className="font-medium text-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        {/* Next Step CTA */}
        {nextStep && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Próxima etapa: {nextStep.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  +{nextStep.points} pontos
                </p>
              </div>
              {nextStep.path && (
                <Button size="sm" onClick={() => navigate(nextStep.path!)}>
                  Ir
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allSteps.map((step) => {
            const completed = isStepCompleted(step.key);
            return (
              <button
                key={step.key}
                onClick={() => step.path && navigate(step.path)}
                disabled={!step.path}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                  completed
                    ? 'bg-success/5'
                    : 'hover:bg-muted'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      completed ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${
                    completed
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  +{step.points}
                </Badge>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
