import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { useSaasCompanies, useUpdateCompanyStatus, useToggleTemplate, usePlans } from '@/hooks/useSaasAdmin';
import { CreateCompanyDialog } from '@/components/saas/CreateCompanyDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, Power, PowerOff, Copy, Loader2, Plus, Eye, 
  Building2, AlertTriangle, CheckCircle2, Clock, XCircle,
  TrendingUp, Users, CreditCard
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CompanyStatus = 'active' | 'trial' | 'trial_ending' | 'trial_expired' | 'past_due' | 'suspended';

function getCompanyStatus(company: any): { status: CompanyStatus; label: string; variant: string } {
  if (!company.is_active) {
    return { status: 'suspended', label: 'Suspensa', variant: 'destructive' };
  }
  
  if (company.subscription) {
    if (company.subscription.status === 'past_due') {
      return { status: 'past_due', label: 'Inadimplente', variant: 'warning' };
    }
    if (company.subscription.status === 'active') {
      return { status: 'active', label: 'Ativa', variant: 'success' };
    }
    if (company.subscription.status === 'trial') {
      return { status: 'trial', label: 'Trial', variant: 'info' };
    }
  }
  
  if (company.trial_ends_at) {
    const trialEnd = new Date(company.trial_ends_at);
    const daysLeft = differenceInDays(trialEnd, new Date());
    
    if (isPast(trialEnd)) {
      return { status: 'trial_expired', label: 'Trial Expirado', variant: 'destructive' };
    }
    if (daysLeft <= 3) {
      return { status: 'trial_ending', label: `Trial (${daysLeft}d)`, variant: 'warning' };
    }
    return { status: 'trial', label: `Trial (${daysLeft}d)`, variant: 'info' };
  }
  
  return { status: 'active', label: 'Ativa', variant: 'success' };
}

function getStatusBadgeClasses(variant: string) {
  switch (variant) {
    case 'success': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
    case 'warning': return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
    case 'destructive': return 'border-red-500/50 bg-red-500/10 text-red-400';
    case 'info': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
    default: return 'border-slate-500/50 bg-slate-500/10 text-slate-400';
  }
}

export default function SaasCompanies() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useSaasCompanies();
  const { data: plans = [] } = usePlans();
  const updateStatus = useUpdateCompanyStatus();
  const toggleTemplate = useToggleTemplate();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; companyId: string; companyName: string }>({
    open: false,
    companyId: '',
    companyName: '',
  });
  const [suspendReason, setSuspendReason] = useState('');
  
  // Create company dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [newCompanyPlanId, setNewCompanyPlanId] = useState('');
  const [newCompanyTrialDays, setNewCompanyTrialDays] = useState(14);

  const companiesWithStatus = companies.map(c => ({
    ...c,
    statusInfo: getCompanyStatus(c)
  }));

  const filteredCompanies = companiesWithStatus.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && c.statusInfo.status === statusFilter;
  });

  // Stats
  const stats = {
    total: companies.length,
    active: companiesWithStatus.filter(c => c.statusInfo.status === 'active').length,
    trial: companiesWithStatus.filter(c => ['trial', 'trial_ending'].includes(c.statusInfo.status)).length,
    issues: companiesWithStatus.filter(c => ['trial_expired', 'past_due', 'suspended'].includes(c.statusInfo.status)).length,
  };

  const handleActivate = (companyId: string) => {
    updateStatus.mutate({ companyId, isActive: true });
  };

  const handleSuspend = () => {
    if (suspendDialog.companyId) {
      updateStatus.mutate({
        companyId: suspendDialog.companyId,
        isActive: false,
        suspendedReason: suspendReason,
      });
      setSuspendDialog({ open: false, companyId: '', companyName: '' });
      setSuspendReason('');
    }
  };

  const handleToggleTemplate = (companyId: string, isTemplate: boolean) => {
    toggleTemplate.mutate({ companyId, isTemplate: !isTemplate });
  };

  const handleCreateSuccess = (companyId: string) => {
    navigate(`/saas/companies/${companyId}`);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <SaasLayout title="Empresas">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                  <p className="text-xs text-slate-400">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.trial}</p>
                  <p className="text-xs text-slate-400">Em Trial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.issues}</p>
                  <p className="text-xs text-slate-400">Com Problemas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for companies with issues */}
        {stats.issues > 0 && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <AlertDescription className="text-amber-300">
              {stats.issues} empresa(s) precisam de atenção: trial expirado, inadimplência ou suspensão.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Table Card */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">Gerenciar Empresas</CardTitle>
                <CardDescription className="text-slate-400">
                  Lista completa de empresas cadastradas no sistema
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="trial_ending">Trial Acabando</SelectItem>
                    <SelectItem value="trial_expired">Trial Expirado</SelectItem>
                    <SelectItem value="past_due">Inadimplentes</SelectItem>
                    <SelectItem value="suspended">Suspensas</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <Button onClick={() => setCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Empresa</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Plano</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Trial/Assinatura</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr 
                        key={company.id} 
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/saas/companies/${company.id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{company.name}</p>
                              <p className="text-xs text-slate-500">/{company.slug}</p>
                            </div>
                          </div>
                          {company.is_template && (
                            <Badge variant="outline" className="mt-1 border-purple-500/50 text-purple-400 text-xs">
                              Template
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={getStatusBadgeClasses(company.statusInfo.variant)}>
                            {company.statusInfo.label}
                          </Badge>
                          {company.suspended_reason && (
                            <p className="text-xs text-red-400 mt-1 max-w-[150px] truncate" title={company.suspended_reason}>
                              {company.suspended_reason}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {company.subscription?.plan ? (
                            <div>
                              <p className="text-sm text-white">{company.subscription.plan.name}</p>
                              <p className="text-xs text-slate-500">
                                R$ {((company.subscription.plan.price_cents || 0) / 100).toFixed(2)}/mês
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">Sem plano</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {company.trial_ends_at && (
                            <div className="text-sm">
                              <p className="text-slate-300">
                                Até {format(new Date(company.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              {differenceInDays(new Date(company.trial_ends_at), new Date()) <= 3 && 
                               !isPast(new Date(company.trial_ends_at)) && (
                                <p className="text-xs text-amber-400">Expira em breve!</p>
                              )}
                            </div>
                          )}
                          {company.subscription?.current_period_end && (
                            <p className="text-xs text-slate-500">
                              Renova: {format(new Date(company.subscription.current_period_end), "dd/MM/yyyy")}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/saas/companies/${company.id}`)}
                              className="text-slate-400 hover:text-blue-400"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleTemplate(company.id, company.is_template)}
                              className="text-slate-400 hover:text-purple-400"
                              title={company.is_template ? 'Remover template' : 'Marcar como template'}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {company.is_active ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setSuspendDialog({
                                    open: true,
                                    companyId: company.id,
                                    companyName: company.name,
                                  })
                                }
                                className="text-slate-400 hover:text-red-400"
                              >
                                <PowerOff className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleActivate(company.id)}
                                className="text-slate-400 hover:text-emerald-400"
                                disabled={updateStatus.isPending}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCompanies.length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-500">Nenhuma empresa encontrada</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setCreateDialog(true)} 
                      className="mt-4 border-purple-500/50 text-purple-400"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar primeira empresa
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ ...suspendDialog, open })}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Suspender Empresa
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta ação bloqueará o acesso da empresa ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 mb-4">
              Tem certeza que deseja suspender <strong className="text-white">{suspendDialog.companyName}</strong>?
            </p>
            <div className="space-y-2">
              <Label className="text-slate-300">Motivo da suspensão</Label>
              <Textarea
                placeholder="Ex: Inadimplência, violação de termos..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSuspendDialog({ open: false, companyId: '', companyName: '' })}
              className="text-slate-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={updateStatus.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suspender'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Company Dialog - New with CNPJ/Razão Social */}
      <CreateCompanyDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </SaasLayout>
  );
}
