import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'notification_preferences';

export interface NotificationPreferences {
  // Notificações de pedidos
  orderNotificationsEnabled: boolean;
  orderSoundEnabled: boolean;
  orderToastEnabled: boolean;
  
  // Notificações de atraso
  delayNotificationsEnabled: boolean;
  
  // Mensagens internas (KDS)
  internalMessagesEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderNotificationsEnabled: true,
  orderSoundEnabled: true,
  orderToastEnabled: true,
  delayNotificationsEnabled: true,
  internalMessagesEnabled: true,
};

function loadPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[NotificationPreferences] Erro ao carregar:', e);
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('[NotificationPreferences] Erro ao salvar:', e);
  }
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(loadPreferences);

  // Sincroniza com outras abas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(e.newValue) });
        } catch {
          // ignore
        }
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K, 
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const togglePreference = useCallback(<K extends keyof NotificationPreferences>(key: K) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    updatePreference,
    togglePreference,
    resetToDefaults,
  };
}

// Hook simplificado para verificar preferências (sem state management)
export function getNotificationPreferences(): NotificationPreferences {
  return loadPreferences();
}
