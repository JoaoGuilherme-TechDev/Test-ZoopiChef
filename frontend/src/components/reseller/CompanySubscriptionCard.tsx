import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompanySubscriptionCardProps {
  company: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
    trial_ends_at?: string | null;
  };
  onManage?: () => void;
}

export function CompanySubscriptionCard({ company, onManage }: CompanySubscriptionCardProps) {
  // Fetch subscription for this company
  const { data: subscription } = useQuery({
    queryKey: ['company-subscription', company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan:plans(name, price_cents)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = () => {
    if (!company.is_active) {
      return <Badge variant="destructive">Inativa</Badge>;
    }
    if (subscription?.status === 'trial') {
      return <Badge variant="secondary">Trial</Badge>;
    }
    if (subscription?.status === 'active') {
      return <Badge variant="default">Ativa</Badge>;
    }
    if (subscription?.status === 'past_due') {
      return <Badge variant="destructive">Inadimplente</Badge>;
    }
    return <Badge variant="outline">Sem assinatura</Badge>;
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{company.name}</CardTitle>
            <CardDescription className="font-mono text-xs">/{company.slug}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-1">
          {subscription?.plan ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-medium">{(subscription.plan as any).name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span>{formatPrice((subscription.plan as any).price_cents)}/mês</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">Sem plano definido</p>
          )}
          
          {company.trial_ends_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trial até:</span>
              <span>{format(new Date(company.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
          )}

          {subscription?.current_period_end && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Próxima cobrança:</span>
              <span>{format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onManage}>
            <Settings className="w-4 h-4 mr-1" />
            Gerenciar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
