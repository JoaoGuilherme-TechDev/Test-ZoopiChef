import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Package, 
  CreditCard, 
  Printer, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { useProfile } from '@/hooks/useProfile';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  path: string;
  checkComplete: () => boolean;
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'company',
      title: 'Configure sua Empresa',
      description: 'Adicione informações básicas como nome, endereço e horário de funcionamento.',
      icon: Building2,
      path: '/company',
      checkComplete: () => !!company?.name && !!company?.phone,
    },
    {
      id: 'products',
      title: 'Cadastre seus Produtos',
      description: 'Adicione categorias e produtos ao seu cardápio digital.',
      icon: Package,
      path: '/categories',
      checkComplete: () => true, // Would need products count
    },
    {
      id: 'payments',
      title: 'Métodos de Pagamento',
      description: 'Configure as formas de pagamento aceitas.',
      icon: CreditCard,
      path: '/payment-methods',
      checkComplete: () => true,
    },
    {
      id: 'printer',
      title: 'Impressão (Opcional)',
      description: 'Configure impressoras para impressão automática de pedidos.',
      icon: Printer,
      path: '/settings',
      checkComplete: () => true,
    },
  ];

  const completedSteps = steps.filter(s => s.checkComplete()).length;
  const progress = (completedSteps / steps.length) * 100;
  const isComplete = completedSteps === steps.length;

  // Check if should show onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('zoopi_onboarding_dismissed');
    const isNewUser = profile && !hasSeenOnboarding;
    
    // Show if new user and company not fully configured
    if (isNewUser && company && !company.name) {
      setOpen(true);
    }
  }, [profile, company]);

  const handleDismiss = () => {
    localStorage.setItem('zoopi_onboarding_dismissed', 'true');
    setDismissed(true);
    setOpen(false);
  };

  const handleGoToStep = (step: OnboardingStep) => {
    setOpen(false);
    navigate(step.path);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  if (dismissed || isComplete) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Bem-vindo ao Zoopi!
          </DialogTitle>
          <DialogDescription>
            Vamos configurar sua conta em poucos passos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{completedSteps}/{steps.length} etapas</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-primary' 
                    : step.checkComplete()
                      ? 'bg-green-500'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Current step content */}
          <div className="text-center space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
              currentStepData.checkComplete() ? 'bg-green-100' : 'bg-primary/10'
            }`}>
              {currentStepData.checkComplete() ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <StepIcon className="w-8 h-8 text-primary" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {currentStepData.description}
              </p>
            </div>

            {!currentStepData.checkComplete() && (
              <Button 
                onClick={() => handleGoToStep(currentStepData)}
                className="w-full"
              >
                Configurar agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="text-muted-foreground"
            >
              Pular tutorial
            </Button>

            <Button
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
