import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useCustomers';
import { useCustomer360 } from '../hooks';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { Search, ArrowLeft, Eye, Crown, Star, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { formatCurrencyExport, formatDateExport } from '@/utils/exportUtils';

export function CRMCustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const { customers, isLoading } = useCustomers();
  const { data: customer360, isLoading: is360Loading } = useCustomer360(selectedCustomerId);

  const filteredCustomers = customers.filter(customer => 
    search === '' || 
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.whatsapp?.includes(search)
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const exportColumns = [
    { key: 'name', label: 'Nome' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'total_orders', label: 'Total Pedidos' },
    { key: 'total_spent', label: 'Total Gasto', format: formatCurrencyExport },
    { key: 'created_at', label: 'Cliente desde', format: formatDateExport },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="CRM - Clientes">
        <div className="p-6">Carregando clientes...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM - Clientes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/crm">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Clientes - Visão 360°</h1>
          </div>
          <ExportDropdown
            data={filteredCustomers as unknown as Record<string, unknown>[]}
            columns={exportColumns}
            filename="clientes"
            title="Relatório de Clientes"
          />
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredCustomers.length} Cliente{filteredCustomers.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Cliente Desde</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.slice(0, 50).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {customer.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.whatsapp && <div>{customer.whatsapp}</div>}
                      </TableCell>
                      <TableCell>
                        - pedidos
                      </TableCell>
                      <TableCell>
                        {format(new Date(customer.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCustomerId(customer.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver 360°
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer 360 Modal */}
      <Dialog 
        open={!!selectedCustomerId} 
        onOpenChange={() => setSelectedCustomerId(undefined)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visão 360° do Cliente
            </DialogTitle>
          </DialogHeader>
          
          {is360Loading ? (
            <div className="flex justify-center py-8">Carregando...</div>
          ) : customer360 ? (
            <div className="space-y-6">
              {/* Customer Header */}
              <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {customer360.customer.name}
                    {customer360.segment?.is_vip && (
                      <Badge className="bg-yellow-500">
                        <Crown className="h-3 w-3 mr-1" />
                        VIP
                      </Badge>
                    )}
                    {customer360.segment?.is_frequent && (
                      <Badge className="bg-blue-500">
                        <Star className="h-3 w-3 mr-1" />
                        Frequente
                      </Badge>
                    )}
                  </h3>
                  <p className="text-muted-foreground">
                    {customer360.customer.whatsapp} • {customer360.customer.email || 'Sem email'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliente desde {format(new Date(customer360.customer.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>
                {customer360.segment?.churn_risk !== undefined && customer360.segment.churn_risk > 0.5 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Risco de Churn: {(customer360.segment.churn_risk * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{customer360.stats.total_orders}</p>
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{formatCurrency(customer360.stats.total_spent)}</p>
                    <p className="text-sm text-muted-foreground">Total Gasto</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{formatCurrency(customer360.stats.avg_ticket)}</p>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">
                      {customer360.stats.days_since_last_order ?? '-'}
                    </p>
                    <p className="text-sm text-muted-foreground">Dias sem comprar</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Últimos Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer360.orders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer360.orders.slice(0, 5).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>#{order.order_number}</TableCell>
                            <TableCell>
                              {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(order.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum pedido encontrado
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Cliente não encontrado
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
