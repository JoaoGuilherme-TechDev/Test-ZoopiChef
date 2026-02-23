import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { SubscriptionWarningBanner } from '@/components/subscription/SubscriptionWarningBanner';
import { AutoPrintListener } from '@/components/orders/AutoPrintListener';
import { OrderSoundListener } from '@/components/orders/OrderSoundListener';
import { PrintFailureAlert } from '@/components/orders/PrintFailureAlert';

import { PanicButton } from '@/components/panic/PanicButton';
import { GlobalPanicListener } from '@/components/panic/GlobalPanicListener';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { HelpCenterAdvanced } from '@/modules/help-center';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnlineStatusIndicator } from '@/components/status/OnlineStatusIndicator';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { useCompanyBlocking } from '@/hooks/useCompanyBlocking';
import { SystemFooter } from './SystemFooter';
import { BlockedCompanyScreen } from '@/components/blocking/BlockedCompanyScreen';
import { GlobalSearch } from './GlobalSearch';
import { SubscriptionExpiryNotice } from '@/modules/saas-subscriptions/components/SubscriptionExpiryNotice';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isBlocked, blockedReason, planExpiresAt, isLoading: blockingLoading, data: blockingData } = useCompanyBlocking();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // OTIMIZAÇÃO: Só bloqueia render no loading de auth
  // Para blocking, mostra conteúdo enquanto verifica em background
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show blocked screen if company is blocked
  if (isBlocked) {
    return (
      <BlockedCompanyScreen 
        reason={blockedReason} 
        planExpiresAt={planExpiresAt}
      />
    );
  }

  return (
    <SidebarProvider>
      <SubscriptionWarningBanner />
      <SubscriptionExpiryNotice />
      <AutoPrintListener />
      <OrderSoundListener />
      <PrintFailureAlert />
      <OnboardingWizard />
      <GlobalPanicListener />
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 bg-card">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {title && (
            <h1 className="font-display font-semibold text-lg">{title}</h1>
          )}
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
          <KeyboardShortcuts />
          <OnlineStatusIndicator />
          <HelpCenterAdvanced />
          <NotificationCenter />
          <ThemeToggle />
          <PanicButton />
        </header>
        <main className="flex-1 p-6 bg-background animate-slide-in-up">
          {children}
        </main>
        <SystemFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
