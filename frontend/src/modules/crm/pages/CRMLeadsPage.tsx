import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCRMLeads } from '../hooks';
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG, LeadStatus, LeadSource } from '../types';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { Search, Filter, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { formatCurrencyExport, formatDateExport } from '@/utils/exportUtils';

export function CRMLeadsPage() {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [search, setSearch] = useState('');
  
  const { leads, isLoading, updateLead } = useCRMLeads({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
  });

  const filteredLeads = leads.filter(lead => 
    search === '' || 
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    lead.phone?.includes(search) ||
    lead.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const exportColumns = [
    { key: 'name', label: 'Nome' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'Email' },
    { key: 'source', label: 'Origem', format: (v: unknown) => LEAD_SOURCE_CONFIG[v as LeadSource]?.label || String(v) },
    { key: 'status', label: 'Status', format: (v: unknown) => LEAD_STATUS_CONFIG[v as LeadStatus]?.label || String(v) },
    { key: 'estimated_value', label: 'Valor Estimado', format: formatCurrencyExport },
    { key: 'created_at', label: 'Criado em', format: formatDateExport },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="CRM - Leads">
        <div className="p-6">Carregando leads...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM - Leads">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/crm">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Gestão de Leads</h1>
          </div>
          <ExportDropdown
            data={filteredLeads as unknown as Record<string, unknown>[]}
            columns={exportColumns}
            filename="leads"
            title="Relatório de Leads"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(v) => setStatusFilter(v as LeadStatus | 'all')}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={sourceFilter} 
                onValueChange={(v) => setSourceFilter(v as LeadSource | 'all')}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  {Object.entries(LEAD_SOURCE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredLeads.length} Lead{filteredLeads.length !== 1 ? 's' : ''} encontrado{filteredLeads.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        {lead.phone && <div>{lead.phone}</div>}
                        {lead.email && <div className="text-sm text-muted-foreground">{lead.email}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {LEAD_SOURCE_CONFIG[lead.source]?.icon}
                          {LEAD_SOURCE_CONFIG[lead.source]?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={LEAD_STATUS_CONFIG[lead.status]?.color}>
                          {LEAD_STATUS_CONFIG[lead.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {lead.estimated_value ? formatCurrency(lead.estimated_value) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(lead.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum lead encontrado com os filtros selecionados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
