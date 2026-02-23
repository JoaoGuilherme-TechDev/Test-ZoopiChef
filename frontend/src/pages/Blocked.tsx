import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CreditCard, XCircle, LogOut, Building2 } from 'lucide-react';

// Reasons from check_company_access RPC: 'active' | 'grace' | 'overdue' | 'trial_expired' | 'inactive'
type BlockReason = 'inactive' | 'trial_expired' | 'overdue' | 'grace';

const reasonConfig: Record<BlockReason, {
  icon: React.ElementType;
  title: string;
  description: string;
  actionText: string;
  actionHref?: string;
}> = {
  inactive: {
    icon: XCircle,
    title: 'Empresa Suspensa',
    description: 'Sua empresa foi suspensa pelo administrador. Entre em contato com o suporte para mais informações.',
    actionText: 'Contatar Suporte',
  },
  trial_expired: {
    icon: Clock,
    title: 'Período de Teste Expirado',
    description: 'Seu período de teste gratuito terminou. Assine um plano para continuar usando o sistema.',
    actionText: 'Ver Planos',
    actionHref: '/settings',
  },
  overdue: {
    icon: AlertTriangle,
    title: 'Pagamento Pendente',
    description: 'Seu pagamento está atrasado há mais de 7 dias. Regularize sua situação para continuar usando o sistema.',
    actionText: 'Regularizar Pagamento',
    actionHref: '/settings',
  },
  grace: {
    icon: CreditCard,
    title: 'Período de Carência',
    description: 'Seu pagamento está pendente. Você tem um período de carência para regularizar.',
    actionText: 'Regularizar Pagamento',
    actionHref: '/settings',
  },
};

export default function Blocked() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const rawReason = location.state?.reason as string;
  // Map from RPC reasons to our config keys
  const reasonMap: Record<string, BlockReason> = {
    inactive: 'inactive',
    trial_expired: 'trial_expired',
    overdue: 'overdue',
    grace: 'grace',
  };
  const reason = reasonMap[rawReason] || 'inactive';
  const config = reasonConfig[reason];
  const IconComponent = config.icon;

  const handleAction = () => {
    if (config.actionHref) {
      navigate(config.actionHref);
    } else {
      // Open support contact
      window.open('mailto:suporte@example.com', '_blank');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <IconComponent className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleAction} 
            className="w-full"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {config.actionText}
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/empresa')}
              className="flex-1"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Ver Empresa
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="flex-1"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Precisa de ajuda? Entre em contato com nosso{' '}
            <a 
              href="mailto:suporte@example.com" 
              className="text-primary hover:underline"
            >
              suporte
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
