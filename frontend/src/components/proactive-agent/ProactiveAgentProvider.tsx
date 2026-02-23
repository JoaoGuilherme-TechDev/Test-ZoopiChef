import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProactiveAlerts, useProactiveAgentSettings, ProactiveAlert } from '@/hooks/useProactiveAgent';
import { ProactiveAlertModal } from './ProactiveAlertModal';

interface ProactiveAgentContextType {
  currentAlert: ProactiveAlert | null;
  pendingAlerts: ProactiveAlert[];
  showAlert: (alert: ProactiveAlert) => void;
  dismissCurrentAlert: () => void;
}

const ProactiveAgentContext = createContext<ProactiveAgentContextType | undefined>(undefined);

export function useProactiveAgentContext() {
  const context = useContext(ProactiveAgentContext);
  if (!context) {
    throw new Error('useProactiveAgentContext must be used within ProactiveAgentProvider');
  }
  return context;
}

interface ProactiveAgentProviderProps {
  children: ReactNode;
}

export function ProactiveAgentProvider({ children }: ProactiveAgentProviderProps) {
  const [currentAlert, setCurrentAlert] = useState<ProactiveAlert | null>(null);
  const [shownAlertIds, setShownAlertIds] = useState<Set<string>>(new Set());
  
  const { settings } = useProactiveAgentSettings();
  const {
    alerts,
    acceptCampaign,
    isAccepting,
    dismissAlert,
    regenerateSuggestions,
    isRegenerating,
  } = useProactiveAlerts();

  // Mostrar automaticamente o primeiro alerta não visto
  useEffect(() => {
    if (!settings?.is_enabled) return;
    if (currentAlert) return;

    const unseenAlert = alerts.find(alert => !shownAlertIds.has(alert.id));
    if (unseenAlert) {
      setCurrentAlert(unseenAlert);
      setShownAlertIds(prev => new Set([...prev, unseenAlert.id]));
    }
  }, [alerts, settings?.is_enabled, currentAlert, shownAlertIds]);

  const showAlert = (alert: ProactiveAlert) => {
    setCurrentAlert(alert);
    setShownAlertIds(prev => new Set([...prev, alert.id]));
  };

  const dismissCurrentAlert = () => {
    setCurrentAlert(null);
  };

  const handleAccept = (alertId: string, campaignIndex: number) => {
    acceptCampaign({ alertId, campaignIndex });
    setCurrentAlert(null);
  };

  const handleDismiss = (alertId: string, reason?: string) => {
    dismissAlert({ alertId, reason });
    setCurrentAlert(null);
  };

  const handleRegenerate = (alertId: string) => {
    regenerateSuggestions(alertId);
  };

  return (
    <ProactiveAgentContext.Provider
      value={{
        currentAlert,
        pendingAlerts: alerts,
        showAlert,
        dismissCurrentAlert,
      }}
    >
      {children}
      
      <ProactiveAlertModal
        alert={currentAlert}
        open={!!currentAlert}
        onClose={dismissCurrentAlert}
        onAccept={handleAccept}
        onDismiss={handleDismiss}
        onRegenerate={handleRegenerate}
        isAccepting={isAccepting}
        isRegenerating={isRegenerating}
      />
    </ProactiveAgentContext.Provider>
  );
}
