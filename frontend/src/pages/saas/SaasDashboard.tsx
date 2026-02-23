import { SaasLayout } from '@/components/saas/SaasLayout';
import { useSaasCompanies, useSubscriptions, usePlans } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';

export default function SaasDashboard() {
  const { data: companies = [] } = useSaasCompanies();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: plans = [] } = usePlans();

  const activeCompanies = companies.filter(c => c.is_active).length;
  const inactiveCompanies = companies.filter(c => !c.is_active).length;
  const trialSubscriptions = subscriptions.filter(s => s.status === 'trial').length;
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const pastDueSubscriptions = subscriptions.filter(s => s.status === 'past_due').length;

  const mrr = subscriptions
    .filter(s => s.status === 'active' && s.plan)
    .reduce((sum, s) => sum + (s.plan?.price_cents || 0), 0) / 100;

  const stats = [
    {
      title: 'Empresas Ativas',
      value: activeCompanies,
      subtitle: `${inactiveCompanies} inativas`,
      icon: Building2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Assinaturas Ativas',
      value: activeSubscriptions,
      subtitle: `${trialSubscriptions} em trial`,
      icon: CreditCard,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Inadimplentes',
      value: pastDueSubscriptions,
      subtitle: 'Pagamento pendente',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'MRR',
      value: `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `${plans.length} planos ativos`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <SaasLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Empresas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companies.slice(0, 5).map((company) => (
                <div key={company.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="font-medium text-white">{company.name}</p>
                    <p className="text-xs text-slate-400">{company.slug}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    company.is_active 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {company.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-slate-500 text-center py-4">Nenhuma empresa cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Assinaturas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="font-medium text-white">{sub.company?.name || 'N/A'}</p>
                    <p className="text-xs text-slate-400">{sub.plan?.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    sub.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    sub.status === 'trial' ? 'bg-blue-500/20 text-blue-400' :
                    sub.status === 'past_due' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <p className="text-slate-500 text-center py-4">Nenhuma assinatura</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SaasLayout>
  );
}
