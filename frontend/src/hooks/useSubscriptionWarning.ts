import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';

interface SubscriptionWarning {
  showWarning: boolean;
  daysRemaining: number;
  message: string;
  isBlocked: boolean;
  blockedReason: string | null;
}

export function useSubscriptionWarning(): SubscriptionWarning {
  const { data: profile } = useProfile();

  const { data } = useQuery({
    queryKey: ['subscription_warning', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      // Usar a nova função get_license_status
      const { data: licenseStatus, error: licenseError } = await supabase
        .rpc('get_license_status', { company_uuid: profile.company_id });

      if (licenseError) {
        console.error('Error fetching license status:', licenseError);
        
        // Fallback para o método antigo se a função não existir
        const { data: company } = await supabase
          .from('companies')
          .select('id, trial_ends_at, is_blocked, blocked_reason')
          .eq('id', profile.company_id)
          .single();

        if (!company) return null;

        if (company.is_blocked) {
          return {
            showWarning: true,
            daysRemaining: 0,
            message: company.blocked_reason || 'Sua conta está bloqueada. Entre em contato com o suporte.',
            isBlocked: true,
            blockedReason: company.blocked_reason,
          };
        }

        return {
          showWarning: false,
          daysRemaining: 999,
          message: '',
          isBlocked: false,
          blockedReason: null,
        };
      }

      const status = licenseStatus as {
        status: string;
        should_block: boolean;
        message: string;
        days_remaining: number;
        blocked_at?: string;
        expires_at?: string;
      };

      // Verificar se está bloqueado
      if (status.status === 'blocked' || status.should_block) {
        return {
          showWarning: true,
          daysRemaining: 0,
          message: status.message || 'Licença vencida - Pague sua licença e será liberado automaticamente.',
          isBlocked: true,
          blockedReason: status.message,
        };
      }

      // Se status é 'active' ou 'trial' sem expires_at, não mostrar aviso
      if ((status.status === 'active' || status.status === 'trial') && !status.expires_at) {
        return {
          showWarning: false,
          daysRemaining: 999,
          message: '',
          isBlocked: false,
          blockedReason: null,
        };
      }

      // Verificar se está próximo do vencimento (5 dias ou menos)
      const daysRemaining = Math.max(0, Math.floor(status.days_remaining || 999));
      const showWarning = daysRemaining <= 5 && daysRemaining > 0;

      let message = '';
      if (showWarning) {
        if (daysRemaining === 1) {
          message = 'Seu sistema irá vencer amanhã! Verifique seu pagamento para não ter o serviço bloqueado.';
        } else if (daysRemaining === 2) {
          message = 'Seu sistema irá vencer em 2 dias. Verifique seu pagamento e deixe em dia para não bloquear.';
        } else if (daysRemaining === 3) {
          message = 'Seu sistema irá vencer em 3 dias. Verifique seu pagamento e deixe em dia para não bloquear.';
        } else {
          message = `Seu sistema irá vencer em ${daysRemaining} dias. Verifique seu pagamento e deixe em dia para não bloquear.`;
        }
      }

      return {
        showWarning,
        daysRemaining,
        message,
        isBlocked: false,
        blockedReason: null,
      };
    },
    enabled: !!profile?.company_id,
    refetchInterval: 1000 * 60 * 30, // Verificar a cada 30 minutos
  });

  return data || {
    showWarning: false,
    daysRemaining: 999,
    message: '',
    isBlocked: false,
    blockedReason: null,
  };
}
