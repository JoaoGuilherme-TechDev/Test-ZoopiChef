import { ReactNode } from 'react';
import { usePlanBlockMessage, PlanModuleKey, FiscalControlKey, ALL_PLAN_MODULES, FISCAL_CONTROLS } from '@/hooks/usePlanFeatures';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlanFeatureGuardProps {
  feature: PlanModuleKey | FiscalControlKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradeButton?: boolean;
  variant?: 'alert' | 'card' | 'minimal';
}

/**
 * Guard que bloqueia funcionalidades não disponíveis no plano
 * Exibe mensagem clara de bloqueio sem quebrar o fluxo
 */
export function PlanFeatureGuard({ 
  feature, 
  children, 
  fallback, 
  showUpgradeButton = true,
  variant = 'alert'
}: PlanFeatureGuardProps) {
  const { isSuperAdmin } = useUserRoles();
  const { isBlocked, message } = usePlanBlockMessage(feature);

  // SUPER_ADMIN has unrestricted access - never block
  if (isSuperAdmin || !isBlocked) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const featureLabel = feature in ALL_PLAN_MODULES 
    ? ALL_PLAN_MODULES[feature as PlanModuleKey]?.label
    : FISCAL_CONTROLS[feature as FiscalControlKey]?.label;

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-2 bg-muted/50 rounded-lg">
        <Lock className="w-4 h-4" />
        <span>{featureLabel} não disponível no seu plano</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className="border-dashed border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Crown className="w-5 h-5 text-amber-500" />
            Funcionalidade Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          {showUpgradeButton && (
            <Button variant="outline" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              Ver planos disponíveis
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
      <Lock className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600">Funcionalidade bloqueada</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {message}
        {showUpgradeButton && (
          <Button variant="link" size="sm" className="px-1 h-auto text-amber-600">
            Fazer upgrade
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * HOC para proteger páginas inteiras
 */
export function withPlanFeature<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: PlanModuleKey | FiscalControlKey
) {
  return function ProtectedComponent(props: P) {
    return (
      <PlanFeatureGuard feature={feature} variant="card">
        <WrappedComponent {...props} />
      </PlanFeatureGuard>
    );
  };
}
