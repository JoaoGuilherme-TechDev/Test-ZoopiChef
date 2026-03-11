import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEmployeeCommissions } from '../hooks/useEmployeeCommissions';
import { useEmployees } from '../hooks/useEmployees';
import { 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Aprovada', color: 'bg-blue-500', icon: CheckCircle },
  paid: { label: 'Paga', color: 'bg-green-500', icon: CheckCircle },
};

export function EmployeeCommissionsPage() {
  const { commissions, isLoading, payCommission } = useEmployeeCommissions();
  const { employees } = useEmployees();

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Funcionário';
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');

  const totalPending = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commission_cents, 0);

  const totalApproved = commissions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.commission_cents, 0);

  const totalPaid = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commission_cents, 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Comissões">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Comissões">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Comissões de Funcionários</h1>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Calcular Período
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
              <p className="text-xs text-muted-foreground">
                {commissions.filter(c => c.status === 'pending').length} comissões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalApproved)}</div>
              <p className="text-xs text-muted-foreground">
                {commissions.filter(c => c.status === 'approved').length} comissões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pagas</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">
                {commissions.filter(c => c.status === 'paid').length} comissões
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Commissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma comissão registrada
              </div>
            ) : (
              <div className="space-y-3">
                {commissions.map((commission) => {
                  const StatusIcon = STATUS_CONFIG[commission.status].icon;
                  return (
                    <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{getEmployeeName(commission.employee_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(commission.period_start)} - {formatDate(commission.period_end)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Vendas</p>
                          <p className="font-medium">{formatCurrency(commission.total_sales_cents)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Pedidos</p>
                          <p className="font-medium">{commission.total_orders}</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm text-muted-foreground">Comissão</p>
                          <p className="font-bold text-lg">{formatCurrency(commission.commission_cents)}</p>
                        </div>
                        <Badge className={STATUS_CONFIG[commission.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[commission.status].label}
                        </Badge>
                        
                        <div className="flex gap-2">
                        {commission.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => payCommission.mutate(commission.id)}
                          >
                            Aprovar e Pagar
                          </Button>
                        )}
                        {commission.status === 'approved' && (
                          <Button 
                            size="sm"
                            onClick={() => payCommission.mutate(commission.id)}
                          >
                            Pagar
                          </Button>
                        )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
