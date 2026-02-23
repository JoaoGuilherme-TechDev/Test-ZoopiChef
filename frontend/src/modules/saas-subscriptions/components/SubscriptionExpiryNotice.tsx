import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SubscriptionExpiryNotice() {
  const { data: company } = useCompany();

  const { data: expiryInfo } = useQuery({
    queryKey: ['subscription-expiry', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('current_period_end, status')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subscription?.current_period_end) return null;

      const expiryDate = new Date(subscription.current_period_end);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        expiryDate,
        daysRemaining,
        shouldWarn: daysRemaining <= 3 && daysRemaining > 0,
      };
    },
    enabled: !!company?.id,
    refetchInterval: 1000 * 60 * 60, // Check every hour
  });

  // Send WhatsApp notification when 3 days remaining
  useEffect(() => {
    const sendWhatsAppNotification = async () => {
      if (!company?.id || !expiryInfo?.shouldWarn) return;

      // Check if we already sent notification today
      const { data: existingNotification } = await supabase
        .from('subscription_notifications')
        .select('id')
        .eq('company_id', company.id)
        .eq('notification_type', 'expiry_warning')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingNotification) return;

      // Get company phone
      const { data: companyData } = await supabase
        .from('companies')
        .select('phone, name')
        .eq('id', company.id)
        .single();

      if (!companyData?.phone) return;

      // Send WhatsApp via edge function
      try {
        await supabase.functions.invoke('send-whatsapp-direct', {
          body: {
            company_id: company.id,
            phone: companyData.phone,
            message: `⚠️ *Aviso de Vencimento*\n\nOlá ${companyData.name}!\n\nSua assinatura vence em *${expiryInfo.daysRemaining} dia(s)* (${expiryInfo.expiryDate.toLocaleDateString('pt-BR')}).\n\nPara evitar o bloqueio do sistema, regularize seu pagamento o quanto antes.\n\nAcesse o sistema e vá em *Assinatura* para visualizar o boleto/PIX.`,
          },
        });

        // Log notification
        await supabase.from('subscription_notifications').insert({
          company_id: company.id,
          notification_type: 'expiry_warning',
          channel: 'whatsapp',
          message: `Aviso de vencimento: ${expiryInfo.daysRemaining} dias restantes`,
          sent_at: new Date().toISOString(),
        });

        console.log('[SubscriptionExpiryNotice] WhatsApp notification sent');
      } catch (error) {
        console.error('[SubscriptionExpiryNotice] Error sending WhatsApp:', error);
      }
    };

    if (expiryInfo?.daysRemaining === 3) {
      sendWhatsAppNotification();
    }
  }, [company?.id, expiryInfo]);

  if (!expiryInfo?.shouldWarn) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Assinatura expira em {expiryInfo.daysRemaining} dia(s)
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>
          Sua assinatura vence em{' '}
          <strong>{expiryInfo.expiryDate.toLocaleDateString('pt-BR')}</strong>.
          Regularize seu pagamento para evitar o bloqueio do sistema.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <a href="/settings/subscription">Ver Assinatura</a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
