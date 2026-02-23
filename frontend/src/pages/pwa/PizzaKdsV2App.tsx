import React from 'react';
import { PizzaKdsV2SessionProvider, usePizzaKdsV2Session } from '@/contexts/PizzaKdsV2SessionContext';
import { PizzaKdsV2SlugScreen } from '@/components/pizza-kds-v2/PizzaKdsV2SlugScreen';
import { PizzaKdsV2PinScreen } from '@/components/pizza-kds-v2/PizzaKdsV2PinScreen';
import { PizzaKdsV2Dashboard } from '@/components/pizza-kds-v2/PizzaKdsV2Dashboard';
import { Loader2 } from 'lucide-react';

/**
 * Pizza KDS V2 - Main PWA Entry Point
 * 
 * Completely independent from the original Pizza KDS (V1).
 * Uses new state management, new auth flow, and new UI components.
 */

function PizzaKdsV2AppContent() {
  const { isLoading, isAuthenticated, companyId, pizzaKdsV2Enabled } = usePizzaKdsV2Session();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step 1: No company context yet - show slug entry
  if (!companyId) {
    return <PizzaKdsV2SlugScreen />;
  }

  // Step 2: Company resolved but not authenticated - show PIN entry
  if (!isAuthenticated) {
    return <PizzaKdsV2PinScreen />;
  }

  // Step 3: Authenticated - show dashboard
  return <PizzaKdsV2Dashboard />;
}

export default function PizzaKdsV2App() {
  return (
    <PizzaKdsV2SessionProvider>
      <PizzaKdsV2AppContent />
    </PizzaKdsV2SessionProvider>
  );
}
