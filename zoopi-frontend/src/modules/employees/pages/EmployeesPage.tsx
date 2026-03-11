import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployees } from '../hooks/useEmployees';
import { ROLE_LABELS, DEPARTMENT_LABELS, COMMISSION_TYPE_LABELS, Employee } from '../types';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import { CommissionProfilesManager } from '../components/CommissionProfilesManager';
import { 
  Users, 
  Plus, 
  Search,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  Percent
} from 'lucide-react';

export function EmployeesPage() {
  const { employees, isLoading } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Funcionários">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Funcionários">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Funcionários</h1>
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Perfis de Comissão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex items-center justify-end">
              <Button onClick={() => setFormDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Funcionário
              </Button>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employees.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                  <UserX className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{inactiveCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Folha Mensal</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(employees.filter(e => e.is_active).reduce((sum, e) => sum + e.salary_cents, 0))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Employees List */}
            <div className="grid gap-4">
              {filteredEmployees.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum funcionário encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                filteredEmployees.map((employee) => (
                  <Card key={employee.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{employee.name}</h3>
                              <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                                {employee.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Badge variant="outline">{ROLE_LABELS[employee.role]}</Badge>
                              </span>
                              {employee.department && (
                                <span>{DEPARTMENT_LABELS[employee.department]}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-sm space-y-1">
                            {employee.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {employee.phone}
                              </div>
                            )}
                            {employee.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {employee.email}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(employee.salary_cents)}</div>
                            <div className="text-xs text-muted-foreground">
                              {COMMISSION_TYPE_LABELS[employee.commission_type]}
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(employee.hire_date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="commissions">
            <CommissionProfilesManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialog */}
      <EmployeeFormDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} />
    </DashboardLayout>
  );
}
