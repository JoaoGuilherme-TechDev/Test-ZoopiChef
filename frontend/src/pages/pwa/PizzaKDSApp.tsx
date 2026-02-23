import React from 'react';
import { PizzaKDSSessionProvider, usePizzaKDSSession } from '@/contexts/PizzaKDSSessionContext';
import { PizzaKDSSlugScreen } from '@/components/pizza-kds/PizzaKDSSlugScreen';
import { PizzaKDSPinScreen } from '@/components/pizza-kds/PizzaKDSPinScreen';
import { PizzaKDSDashboard } from '@/components/pizza-kds/PizzaKDSDashboard';
import { Loader2 } from 'lucide-react';

function PizzaKDSAppContent() {
  const { isLoading, isAuthenticated, companyId, pizzaKdsEnabled } = usePizzaKDSSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step 1: No company context yet - show slug entry
  if (!companyId) {
    return <PizzaKDSSlugScreen />;
  }

  // Step 2: Company resolved but not authenticated - show PIN entry
  if (!isAuthenticated) {
    return <PizzaKDSPinScreen />;
  }

  // Step 3: Authenticated - show dashboard
  return <PizzaKDSDashboard />;
}

export default function PizzaKDSApp() {
  return (
    <PizzaKDSSessionProvider>
      <PizzaKDSAppContent />
    </PizzaKDSSessionProvider>
  );
}
