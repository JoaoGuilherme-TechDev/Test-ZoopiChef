import { useState } from 'react';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { useSaasCompanies, useBlockCompany } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, Power, PowerOff, Clock, AlertTriangle, CheckCircle2, XCircle, Ban, ShieldOff, Gift, Search } from 'lucide-react';
import { format, differenceInDays, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase-shim';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function SaasLicenses() {
  const { data: companies = [], isLoading } = useSaasCompanies();
  const blockCompany = useBlockCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activateDialog, setActivateDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [activationDate, setActivationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [trialDays, setTrialDays] = useState(30);
  const [licenseType, setLicenseType] = useState<'trial' | 'free' | 'paid'>('trial');
  const [isActivating, setIsActivating] = useState(false);

  // Filter companies
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.slug.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'blocked') return matchesSearch && (company as any).is_blocked;
    if (filterStatus === 'active') return matchesSearch && company.is_active && !(company as any).is_blocked;
    if (filterStatus === 'trial') return matchesSearch && company.trial_ends_at && !company.subscription;
    if (filterStatus === 'expired') {
      if (!company.trial_ends_at) return false;
      return matchesSearch && isPast(new Date(company.trial_ends_at));
    }
    return matchesSearch;
  });

  // Get license status for a company
  const getLicenseInfo = (company: any) => {
    if (company.is_blocked) {
      return { 
        label: 'Bloqueada', 
        variant: 'destructive', 
        icon: XCircle,
        daysLeft: null 
      };
    }

    if (company.subscription?.status === 'active') {
      return { 
        label: 'Ativa', 
        variant: 'success', 
        icon: CheckCircle2,
        daysLeft: null 
      };
    }

    if (company.subscription?.status === 'past_due') {
      return { 
        label: 'Inadimplente', 
        variant: 'warning', 
        icon: AlertTriangle,
        daysLeft: null 
      };
    }

    const expiresAt = company.license_expires_at || company.trial_ends_at;
    if (expiresAt) {
      const daysLeft = differenceInDays(new Date(expiresAt), new Date());
      if (daysLeft < 0) {
        return { 
          label: 'Expirada', 
          variant: 'destructive', 
          icon: XCircle,
          daysLeft 
        };
      }
      if (daysLeft <= 3) {
        return { 
          label: `${daysLeft} dias`, 
          variant: 'warning', 
          icon: Clock,
          daysLeft 
        };
      }
      return { 
        label: `${daysLeft} dias`, 
        variant: 'info', 
        icon: Clock,
        daysLeft 
      };
    }

    return { 
      label: 'Sem licença', 
      variant: 'muted', 
      icon: Clock,
      daysLeft: null 
    };
  };

  const handleActivate = async () => {
    if (!selectedCompany) return;

    setIsActivating(true);
    try {
      const { data, error } = await supabase.rpc('activate_company', {
        company_uuid: selectedCompany.id,
        activation_date: new Date(activationDate).toISOString(),
        trial_days: trialDays,
        p_license_type: licenseType
      });

      if (error) throw error;

      toast({
        title: 'Empresa ativada!',
        description: `${selectedCompany.name} foi ativada com ${trialDays} dias de ${licenseType === 'free' ? 'período gratuito' : 'trial'}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['saas-companies'] });
      setActivateDialog(false);
      setSelectedCompany(null);
    } catch (error) {
      console.error('Error activating company:', error);
      toast({
        title: 'Erro ao ativar',
        description: 'Não foi possível ativar a empresa.',
        variant: 'destructive',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const openActivateDialog = (company: any) => {
    setSelectedCompany(company);
    setActivationDate(format(new Date(), 'yyyy-MM-dd'));
    setTrialDays(30);
    setLicenseType('trial');
    setActivateDialog(true);
  };

  if (isLoading) {
    return (
      <SaasLayout title="Licenças">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </SaasLayout>
    );
  }

  return (
    <SaasLayout title="Licenças e Ativação">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {companies.filter(c => c.is_active && !(c as any).is_blocked).length}
                  </p>
                  <p className="text-xs text-slate-500">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {companies.filter(c => {
                      const expires = (c as any).license_expires_at || c.trial_ends_at;
                      if (!expires) return false;
                      const daysLeft = differenceInDays(new Date(expires), new Date());
                      return daysLeft >= 0 && daysLeft <= 5;
                    }).length}
                  </p>
                  <p className="text-xs text-slate-500">Vencendo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {companies.filter(c => (c as any).is_blocked).length}
                  </p>
                  <p className="text-xs text-slate-500">Bloqueadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Gift className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {companies.filter(c => (c as any).license_type === 'free').length}
                  </p>
                  <p className="text-xs text-slate-500">Gratuitas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="trial">Em Trial</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="blocked">Bloqueadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Empresas ({filteredCompanies.length})</CardTitle>
            <CardDescription>Gerencie licenças e ativação das empresas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Empresa</TableHead>
                  <TableHead className="text-slate-400">Tipo</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Ativada em</TableHead>
                  <TableHead className="text-slate-400">Expira em</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => {
                  const licenseInfo = getLicenseInfo(company);
                  const StatusIcon = licenseInfo.icon;

                  return (
                    <TableRow key={company.id} className="border-slate-700/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{company.name}</p>
                          <p className="text-sm text-slate-500">/{company.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          (company as any).license_type === 'paid' ? 'border-emerald-500/50 text-emerald-400' :
                          (company as any).license_type === 'free' ? 'border-blue-500/50 text-blue-400' :
                          'border-purple-500/50 text-purple-400'
                        }>
                          {(company as any).license_type === 'paid' ? 'Pago' :
                           (company as any).license_type === 'free' ? 'Gratuito' : 'Trial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          licenseInfo.variant === 'success' ? 'border-emerald-500/50 text-emerald-400' :
                          licenseInfo.variant === 'warning' ? 'border-amber-500/50 text-amber-400' :
                          licenseInfo.variant === 'destructive' ? 'border-red-500/50 text-red-400' :
                          licenseInfo.variant === 'info' ? 'border-blue-500/50 text-blue-400' :
                          'border-slate-500/50 text-slate-400'
                        }>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {licenseInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {(company as any).activated_at 
                          ? format(new Date((company as any).activated_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {((company as any).license_expires_at || company.trial_ends_at)
                          ? format(new Date((company as any).license_expires_at || company.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActivateDialog(company)}
                            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Ativar
                          </Button>
                          {(company as any).is_blocked ? (
                            <Button
                              size="sm"
                              onClick={() => blockCompany.mutate({ companyId: company.id, isBlocked: false })}
                              disabled={blockCompany.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <ShieldOff className="w-4 h-4 mr-1" />
                              Desbloquear
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => blockCompany.mutate({ 
                                companyId: company.id, 
                                isBlocked: true, 
                                blockedReason: 'Bloqueio manual pelo suporte' 
                              })}
                              disabled={blockCompany.isPending}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Bloquear
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredCompanies.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Nenhuma empresa encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activate Dialog */}
      <Dialog open={activateDialog} onOpenChange={setActivateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Ativar Empresa</DialogTitle>
            <DialogDescription>
              Configure a ativação de {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Licença</Label>
              <Select value={licenseType} onValueChange={(v: 'trial' | 'free' | 'paid') => setLicenseType(v)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Período de Teste)</SelectItem>
                  <SelectItem value="free">Gratuito (Período Grátis)</SelectItem>
                  <SelectItem value="paid">Pago (Assinatura Ativa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Ativação</Label>
              <Input
                type="date"
                value={activationDate}
                onChange={(e) => setActivationDate(e.target.value)}
                className="bg-slate-800/50 border-slate-700"
              />
              <p className="text-xs text-slate-500">
                A licença começa a contar a partir desta data
              </p>
            </div>

            <div className="space-y-2">
              <Label>Dias de {licenseType === 'free' ? 'Período Gratuito' : 'Trial'}</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 30)}
                className="bg-slate-800/50 border-slate-700"
              />
              <p className="text-xs text-slate-500">
                Expira em: {format(addDays(new Date(activationDate), trialDays), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleActivate} 
              disabled={isActivating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isActivating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ativar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
