import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingProgress, ONBOARDING_STEPS } from '../hooks/useOnboardingProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Gift,
  PartyPopper,
} from 'lucide-react';

const TOUR_STORAGE_KEY = 'zoopi_tour_completed';
const TOUR_DISMISSED_KEY = 'zoopi_tour_dismissed';

interface OnboardingTourProps {
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { progressPercent, isStepCompleted, completeStep } = useOnboardingProgress();

  useEffect(() => {
    // Check if tour was dismissed or completed
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    const tourDismissed = localStorage.getItem(TOUR_DISMISSED_KEY);

    if (forceShow) {
      setIsVisible(true);
    } else if (!tourCompleted && !tourDismissed && progressPercent < 30) {
      // Show tour for new users (less than 30% progress)
      setIsVisible(true);
    }
  }, [forceShow, progressPercent]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleGoToStep = () => {
    if (currentStep?.path) {
      navigate(currentStep.path);
      // Mark step as completed when user navigates to it
      if (!isStepCompleted(currentStep.key)) {
        completeStep.mutate(currentStep.key);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible || !currentStep) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-fade-in" style={{ position: 'fixed' }}>
      <Card className="border-0 shadow-large bg-card">
        <CardContent className="pt-4 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-primary/10 text-primary border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Tour Guiado
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Etapa {currentStepIndex + 1} de {ONBOARDING_STEPS.length}</span>
              <span>+{currentStep.points} pts</span>
            </div>
            <Progress
              value={((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100}
              className="h-1"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">{currentStep.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentStep.description}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={isFirstStep}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleGoToStep}
            >
              Ir para esta etapa
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
            >
              {isLastStep ? (
                <>
                  <PartyPopper className="w-4 h-4 mr-1" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          <button
            onClick={handleDismiss}
            className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
          >
            Pular tour
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
