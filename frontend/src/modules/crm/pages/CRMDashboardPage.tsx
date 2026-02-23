import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCRMDashboard, useCRMLeads } from '../hooks';
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG } from '../types';
import { Link } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  UserPlus,
  Target,
  PhoneCall,
  Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export function CRMDashboardPage() {
  const { data: dashboard, isLoading } = useCRMDashboard();
  const { leads } = useCRMLeads();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const statusChartData = dashboard?.leads_by_status 
    ? Object.entries(dashboard.leads_by_status)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG]?.label || status,
          value: count,
          color: LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG]?.color?.replace('bg-', '') || 'gray',
        }))
    : [];

  const sourceChartData = leads.reduce((acc, lead) => {
    const source = lead.source || 'other';
    const existing = acc.find(s => s.source === source);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ 
        source, 
        count: 1, 
        label: LEAD_SOURCE_CONFIG[source]?.label || source 
      });
    }
    return acc;
  }, [] as Array<{ source: string; count: number; label: string }>);

  const COLORS = ['#3b82f6', '#eab308', '#a855f7', '#f97316', '#6366f1', '#22c55e', '#ef4444'];

  if (isLoading) {
    return (
      <DashboardLayout title="CRM">
        <div className="p-6">Carregando CRM...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">CRM - Gestão de Relacionamento</h1>
          <div className="flex gap-2">
            <Link to="/crm/leads">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Ver Leads
              </Button>
            </Link>
            <Link to="/crm/customers">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Ver Clientes
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.total_leads || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.leads_by_status.new || 0} novos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor do Pipeline</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboard?.pipeline_value || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Em oportunidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dashboard?.conversion_rate || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Leads convertidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboard?.avg_deal_size || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Por negócio fechado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Nenhum lead cadastrado
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              {sourceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sourceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Nenhum lead cadastrado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-4">
              <Link to="/crm/leads">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Leads
                </Button>
              </Link>
              <Link to="/crm/customers">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Clientes (360°)
                </Button>
              </Link>
              <Link to="/crm/activities">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Atividades
                </Button>
              </Link>
              <Link to="/customers">
                <Button variant="outline" className="w-full justify-start">
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Lista de Clientes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leads Recentes</CardTitle>
            <Link to="/crm/leads">
              <Button variant="link" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {leads.length > 0 ? (
              <div className="space-y-3">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">
                          {LEAD_SOURCE_CONFIG[lead.source]?.icon || '📌'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone || lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.estimated_value && (
                        <span className="text-sm font-medium">
                          {formatCurrency(lead.estimated_value)}
                        </span>
                      )}
                      <Badge className={LEAD_STATUS_CONFIG[lead.status]?.color}>
                        {LEAD_STATUS_CONFIG[lead.status]?.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lead cadastrado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
