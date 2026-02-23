import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { alertSoundPlayer, getSavedAlertSound, getSavedVolume } from '@/lib/alertSounds';
import { getNotificationPreferences } from '@/hooks/useNotificationPreferences';

// Global tracker para evitar sons duplicados
const globalNotifiedOrders = new Set<string>();
const globalSoundInitialized = new Set<string>();

export function OrderSoundListener() {
  const { data: company } = useCompany();

  const playNotificationSound = useCallback(async () => {
    // Verifica preferências antes de tocar
    const prefs = getNotificationPreferences();
    if (!prefs.orderNotificationsEnabled || !prefs.orderSoundEnabled) {
      return;
    }
    
    try {
      const soundId = getSavedAlertSound('new_order', 'phone_ring');
      const volume = getSavedVolume('new_order', 0.5) * getSavedVolume('global', 0.7);
      await alertSoundPlayer.play(soundId, volume);
    } catch {
      // Browser may block autoplay until user interacts
    }
  }, []);

  // Escuta novos pedidos em tempo real para tocar som
  useEffect(() => {
    if (!company?.id) return;

    // Prevent duplicate initialization per company
    const initKey = `sound-${company.id}`;
    if (globalSoundInitialized.has(initKey)) {
      return;
    }
    globalSoundInitialized.add(initKey);

    console.log('[OrderSound] Iniciando listener para empresa:', company.id);

    const channel = supabase
      .channel(`order-sound-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          const newOrder = payload.new as any;
          
          // Evita notificação duplicada
          if (globalNotifiedOrders.has(newOrder.id)) {
            return;
          }
          globalNotifiedOrders.add(newOrder.id);
          
          // Verifica preferências
          const prefs = getNotificationPreferences();
          if (!prefs.orderNotificationsEnabled) {
            return;
          }
          
          console.log('[OrderSound] Novo pedido - tocando som:', newOrder.id);
          
          // Toca som (se habilitado)
          if (prefs.orderSoundEnabled) {
            playNotificationSound();
          }
          
          // Toast notification disabled to reduce notification spam
          // if (prefs.orderToastEnabled) {
          //   const orderNum = newOrder.order_number 
          //     ? `#${String(newOrder.order_number).padStart(3, '0')}` 
          //     : newOrder.id.slice(-4);
          //   toast.info(`Novo pedido ${orderNum} chegou!`);
          // }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[OrderSound] Canal conectado com sucesso');
        }
      });

    return () => {
      console.log('[OrderSound] Removendo listener');
      supabase.removeChannel(channel);
      globalSoundInitialized.delete(initKey);
    };
  }, [company?.id, playNotificationSound]);

  return null;
}
