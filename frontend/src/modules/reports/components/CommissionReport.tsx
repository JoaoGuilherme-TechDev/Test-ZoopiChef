import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, DollarSign, Percent, CheckCircle } from 'lucide-react';
import { useCommissionProfiles, useCommissionReport, usePayCommission, type CommissionProfileSummary, type EmployeeWithCommission } from '../hooks/useReportsCommission';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CommissionReportProps {
  startDate: string;
  endDate: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function CommissionReport({ startDate, endDate }: CommissionReportProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const { data: profiles = [], isLoading: loadingProfiles } = useCommissionProfiles();
  const { data: reportData, isLoading: loadingReport } = useCommissionReport(
    { startDate, endDate },
    selectedProfileId || undefined
  );
  const payCommission = usePayCommission();

  const isLoading = loadingProfiles || loadingReport;

  const handlePayCommission = (employee: EmployeeWithCommission) => {
    if (!employee.commission_profile_id) return;
    
    payCommission.mutate({
      employeeId: employee.id,
      periodStart: startDate,
      periodEnd: endDate,
      commissionAmount: employee.commission_amount,
      profileId: employee.commission_profile_id,
      totalSales: employee.total_sales,
      totalOrders: employee.total_orders,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro por Perfil */}
      <div className="flex items-center gap-4">
        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Todos os Perfis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os Perfis</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name} ({profile.commission_percent}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Vendas</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData?.totalSales || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Percent className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Comissões</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(reportData?.totalCommissions || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Funcionários</p>
                <p className="text-2xl font-bold">{reportData?.employeeDetails.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Perfis Ativos</p>
                <p className="text-2xl font-bold">{reportData?.summaryByProfile.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Resumo por Perfil de Comissão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Funcionários</TableHead>
                <TableHead className="text-right">Total Vendas</TableHead>
                <TableHead className="text-right">Total Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reportData?.summaryByProfile || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum perfil com vendas no período
                  </TableCell>
                </TableRow>
              ) : (
                reportData?.summaryByProfile.map((summary: CommissionProfileSummary) => (
                  <TableRow key={summary.profile_id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{summary.profile_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{summary.commission_rate}%</Badge>
                    </TableCell>
                    <TableCell className="text-right">{summary.employee_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.total_sales)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(summary.total_commission)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalhes por Funcionário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Comissões por Operador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Total Vendas</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reportData?.employeeDetails || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum operador encontrado para o período
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.employeeDetails.map((employee: EmployeeWithCommission) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>
                        {employee.commission_profile ? (
                          <Badge variant="outline">{employee.commission_profile.name}</Badge>
                        ) : (
                          <Badge variant="secondary">Sem Perfil</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.commission_profile ? (
                          <Badge variant="secondary">{employee.commission_profile.commission_percent}%</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{employee.total_orders}</TableCell>
                      <TableCell className="text-right">{formatCurrency(employee.total_sales)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(employee.commission_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.commission_amount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePayCommission(employee)}
                            disabled={payCommission.isPending}
                          >
                            {payCommission.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Pagar'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rodapé com informações do período */}
      <div className="text-sm text-muted-foreground text-center">
        Período: {format(new Date(startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} até{' '}
        {format(new Date(endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </div>
    </div>
  );
}
