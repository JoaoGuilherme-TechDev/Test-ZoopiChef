import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Users,
  TrendingUp,
  Mail,
  MessageSquare,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
  Play,
  Pause,
  Send,
} from 'lucide-react';
import { useMarketingMetrics, useMarketingCampaigns, useMarketingAutomations } from '../hooks';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function MarketingDashboardPage() {
  const { metrics, performance, isLoading: metricsLoading } = useMarketingMetrics();
  const { campaigns, activeCampaigns, isLoading: campaignsLoading } = useMarketingCampaigns();
  const { automations, activeAutomations } = useMarketingAutomations();

  const isLoading = metricsLoading || campaignsLoading;

  const quickActions = [
    {
      title: 'Nova Campanha',
      description: 'Criar campanha de marketing',
      icon: Megaphone,
      href: '/marketing/campaigns',
      color: 'text-blue-500',
    },
    {
      title: 'Automações',
      description: 'Gerenciar fluxos automáticos',
      icon: Zap,
      href: '/marketing/automations',
      color: 'text-yellow-500',
    },
    {
      title: 'Segmentos',
      description: 'Criar audiências',
      icon: Target,
      href: '/marketing/segments',
      color: 'text-purple-500',
    },
    {
      title: 'Análises',
      description: 'Ver relatórios detalhados',
      icon: BarChart3,
      href: '/marketing/analytics',
      color: 'text-green-500',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Marketing</h1>
            <p className="text-muted-foreground">Campanhas, automações e análises</p>
          </div>
          <Button asChild>
            <Link to="/marketing/campaigns">
              <Megaphone className="w-4 h-4 mr-2" />
              Nova Campanha
            </Link>
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
                  <p className="text-2xl font-bold">{metrics.activeCampaigns}</p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alcance Total</p>
                  <p className="text-2xl font-bold">{metrics.totalReach.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
                  <p className="text-2xl font-bold">{metrics.avgOpenRate}%</p>
                </div>
                <Mail className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversões</p>
                  <p className="text-2xl font-bold">{metrics.avgConversionRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance das Campanhas</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    name="Enviados"
                  />
                  <Area
                    type="monotone"
                    dataKey="opened"
                    stackId="2"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                    name="Abertos"
                  />
                  <Area
                    type="monotone"
                    dataKey="clicked"
                    stackId="3"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.3}
                    name="Clicados"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Active Automations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Automações Ativas</CardTitle>
              <Badge variant="secondary">{activeAutomations.length} ativas</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAutomations.slice(0, 4).map((automation) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-sm">{automation.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {automation.executions_count} execuções
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    Ativa
                  </Badge>
                </div>
              ))}
              {activeAutomations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma automação ativa
                </p>
              )}
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/marketing/automations">
                  Ver todas automações
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Campanhas Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/marketing/campaigns">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {campaign.type === 'whatsapp' ? (
                      <MessageSquare className="w-5 h-5 text-green-500" />
                    ) : (
                      <Mail className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.audience_count} destinatários
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        campaign.status === 'running'
                          ? 'default'
                          : campaign.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {campaign.status === 'running' && 'Ativa'}
                      {campaign.status === 'completed' && 'Concluída'}
                      {campaign.status === 'draft' && 'Rascunho'}
                      {campaign.status === 'scheduled' && 'Agendada'}
                      {campaign.status === 'paused' && 'Pausada'}
                    </Badge>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma campanha criada</p>
                  <Button variant="outline" className="mt-3" asChild>
                    <Link to="/marketing/campaigns">Criar primeira campanha</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
