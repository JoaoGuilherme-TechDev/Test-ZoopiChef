import { useParams, useNavigate } from 'react-router-dom';
import { CompanyResetActions } from '@/components/saas/CompanyResetActions';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { useSaasCompanies, useSubscriptions, useAuditLogs, useUpdateCompanyStatus, useCloneCompanyMenu, useTemplateCompanies, useBlockCompany, useUpdateCompanyModules } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getModulesFromFlags } from '@/hooks/useCompanyModules';
import { 
  ArrowLeft, 
  Building2, 
  CreditCard, 
  Calendar, 
  Clock, 
  Power, 
  PowerOff,
  Copy,
  FileText,
  Users,
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ExternalLink,
  Settings,
  Link2,
  ShieldCheck,
  Zap,
  Ban,
  ShieldOff,
  UtensilsCrossed,
  Tags,
  Tv,
  Megaphone,
  Sparkles,
  ToggleLeft,
  MapPin,
  Wine,
  Scale,
  Tablet,
  ShoppingCart,
  PlusCircle,
  Bell,
  MessageSquare,
  ClipboardList,
  Truck
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SaasCompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useSaasCompanies();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: auditLogs = [] } = useAuditLogs(50);
  const { data: templates = [] } = useTemplateCompanies();
  const updateStatus = useUpdateCompanyStatus();
  const cloneMenu = useCloneCompanyMenu();
  const blockCompany = useBlockCompany();
  const updateModules = useUpdateCompanyModules();
  
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [cloneDialog, setCloneDialog] = useState(false);
  const [sourceTemplateId, setSourceTemplateId] = useState('');
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('Sua conta foi bloqueada por inadimplência. Entre em contato com o suporte para regularizar sua situação.');

  const company = companies.find(c => c.id === id);
  const subscription = subscriptions.find(s => s.company_id === id);
  
  // Get company modules
  const companyModules = useMemo(() => {
    if (!company) return null;
    return getModulesFromFlags((company as any).feature_flags);
  }, [company]);
  const companyLogs = auditLogs.filter(l => l.entity_id === id);

  if (isLoading) {
    return (
      <SaasLayout title="Detalhes da Empresa">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </SaasLayout>
    );
  }

  if (!company) {
    return (
      <SaasLayout title="Empresa não encontrada">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
            <p className="text-slate-400">Empresa não encontrada</p>
            <Button variant="ghost" onClick={() => navigate('/saas/companies')} className="mt-4">
              Voltar para lista
            </Button>
          </CardContent>
        </Card>
      </SaasLayout>
    );
  }

  // Calculate status
  const getStatusInfo = () => {
    if (!company.is_active) {
      return { label: 'Suspensa', variant: 'destructive', icon: XCircle };
    }
    if (subscription?.status === 'past_due') {
      return { label: 'Inadimplente', variant: 'warning', icon: AlertTriangle };
    }
    if (subscription?.status === 'active') {
      return { label: 'Ativa', variant: 'success', icon: CheckCircle2 };
    }
    if (company.trial_ends_at) {
      const trialEnd = new Date(company.trial_ends_at);
      const daysLeft = differenceInDays(trialEnd, new Date());
      if (isPast(trialEnd)) {
        return { label: 'Trial Expirado', variant: 'destructive', icon: XCircle };
      }
      if (daysLeft <= 3) {
        return { label: `Trial (${daysLeft} dias)`, variant: 'warning', icon: Clock };
      }
      return { label: `Trial (${daysLeft} dias)`, variant: 'info', icon: Clock };
    }
    return { label: 'Ativa', variant: 'success', icon: CheckCircle2 };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleActivate = () => {
    updateStatus.mutate({ companyId: company.id, isActive: true });
  };

  const handleSuspend = () => {
    updateStatus.mutate({ 
      companyId: company.id, 
      isActive: false, 
      suspendedReason: suspendReason 
    });
    setSuspendDialog(false);
    setSuspendReason('');
  };

  const handleClone = () => {
    if (sourceTemplateId) {
      cloneMenu.mutate({
        sourceCompanyId: sourceTemplateId,
        targetCompanyId: company.id,
        items: { categories: true, subcategories: true, products: true }
      });
      setCloneDialog(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatShortDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  // Calculate trial/subscription progress
  const getTrialProgress = () => {
    if (!company.trial_ends_at) return null;
    const trialEnd = new Date(company.trial_ends_at);
    const trialStart = new Date(company.created_at);
    const totalDays = differenceInDays(trialEnd, trialStart);
    const daysUsed = differenceInDays(new Date(), trialStart);
    const progress = Math.min((daysUsed / totalDays) * 100, 100);
    const daysLeft = Math.max(differenceInDays(trialEnd, new Date()), 0);
    return { progress, daysLeft, totalDays };
  };

  const trialProgress = getTrialProgress();

  return (
    <SaasLayout title="Detalhes da Empresa">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/saas/companies')} className="text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCloneDialog(true)}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Clonar Cardápio
            </Button>
            {(company as any).is_blocked ? (
              <Button 
                onClick={() => blockCompany.mutate({ companyId: company.id, isBlocked: false })}
                disabled={blockCompany.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                Desbloquear
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setBlockDialog(true)}
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              >
                <Ban className="w-4 h-4 mr-2" />
                Bloquear Inadimplência
              </Button>
            )}
            {company.is_active ? (
              <Button 
                variant="outline" 
                onClick={() => setSuspendDialog(true)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <PowerOff className="w-4 h-4 mr-2" />
                Suspender
              </Button>
            ) : (
              <Button 
                onClick={handleActivate}
                disabled={updateStatus.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Power className="w-4 h-4 mr-2" />
                Ativar
              </Button>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {company.suspended_reason && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-300">
              <strong>Motivo da suspensão:</strong> {company.suspended_reason}
            </AlertDescription>
          </Alert>
        )}

        {trialProgress && trialProgress.daysLeft <= 3 && trialProgress.daysLeft > 0 && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <Clock className="w-4 h-4 text-amber-400" />
            <AlertDescription className="text-amber-300">
              O trial desta empresa expira em <strong>{trialProgress.daysLeft} dias</strong>. 
              Configure o plano de assinatura.
            </AlertDescription>
          </Alert>
        )}

        {/* Company Info Header */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{company.name}</h1>
                  <Badge 
                    variant="outline" 
                    className={
                      statusInfo.variant === 'success' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' :
                      statusInfo.variant === 'warning' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' :
                      statusInfo.variant === 'destructive' ? 'border-red-500/50 bg-red-500/10 text-red-400' :
                      'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    }
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  {company.is_template && (
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                      Template
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 mb-4">/{company.slug}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    Criada: {formatShortDate(company.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Subscription Card */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Plano e Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                    <div>
                      <p className="text-lg font-semibold text-white">{subscription.plan?.name || 'Plano'}</p>
                      <p className="text-sm text-slate-400">
                        R$ {((subscription.plan?.price_cents || 0) / 100).toFixed(2)}/mês
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        subscription.status === 'active' ? 'border-emerald-500/50 text-emerald-400' :
                        subscription.status === 'trial' ? 'border-blue-500/50 text-blue-400' :
                        subscription.status === 'past_due' ? 'border-amber-500/50 text-amber-400' :
                        'border-red-500/50 text-red-400'
                      }
                    >
                      {subscription.status === 'active' ? 'Ativa' : 
                       subscription.status === 'trial' ? 'Trial' :
                       subscription.status === 'past_due' ? 'Inadimplente' : 
                       subscription.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Período atual</span>
                      <span className="text-white">
                        {formatShortDate(subscription.current_period_start)} - {formatShortDate(subscription.current_period_end)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Provedor</span>
                      <span className="text-white">{subscription.provider || 'Manual'}</span>
                    </div>
                    {subscription.past_due_since && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-400">Inadimplente desde</span>
                        <span className="text-amber-300">{formatShortDate(subscription.past_due_since)}</span>
                      </div>
                    )}
                  </div>

                  {subscription.plan?.limits_json && (
                    <div className="pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-3">Limites do Plano</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(subscription.plan.limits_json).map(([key, value]) => (
                          <div key={key} className="p-2 rounded bg-slate-800/50 text-center">
                            <p className="text-lg font-semibold text-white">{String(value)}</p>
                            <p className="text-xs text-slate-500">{key}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {trialProgress ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-blue-400">Período de Trial</span>
                          <span className="text-sm font-medium text-blue-300">
                            {trialProgress.daysLeft} dias restantes
                          </span>
                        </div>
                        <Progress value={trialProgress.progress} className="h-2" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Trial termina em</span>
                        <span className="text-white">{formatShortDate(company.trial_ends_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-500">Nenhum plano configurado</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Informações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className="text-2xl font-bold text-white">-</p>
                  <p className="text-xs text-slate-500">Produtos</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className="text-2xl font-bold text-white">-</p>
                  <p className="text-xs text-slate-500">Pedidos/mês</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className="text-2xl font-bold text-white">-</p>
                  <p className="text-xs text-slate-500">Usuários</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className="text-2xl font-bold text-white">-</p>
                  <p className="text-xs text-slate-500">Clientes</p>
                </div>
              </div>
              
              <Separator className="bg-slate-700/50" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Owner ID</span>
                  <span className="text-white font-mono text-xs truncate max-w-[150px]">
                    {company.owner_user_id || '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Template</span>
                  <span className="text-white">{company.is_template ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Modules */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ToggleLeft className="w-5 h-5 text-purple-400" />
              Módulos Ativos
            </CardTitle>
            <CardDescription className="text-slate-400">
              Ative ou desative funcionalidades para esta empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Módulo Mesa */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Módulo Mesa</Label>
                    <p className="text-xs text-slate-500">Mapa de mesas e sessões</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_tables ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_tables: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Módulo Comanda */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Módulo Comanda</Label>
                    <p className="text-xs text-slate-500">Comandas individuais</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_comandas ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_comandas: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Pedidos (Kanban) */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Pedidos Kanban</Label>
                    <p className="text-xs text-slate-500">Gestão visual de pedidos</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_orders ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_orders: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Novo Pedido */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <PlusCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Novo Pedido</Label>
                    <p className="text-xs text-slate-500">Ligação, Balcão, Delivery</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_new_order ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_new_order: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Chamados */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Chamados</Label>
                    <p className="text-xs text-slate-500">Chamados de clientes/garçom</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_calls ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_calls: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Mensagens */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Mensagens</Label>
                    <p className="text-xs text-slate-500">Mensagens internas</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_messages ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_messages: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Telas de TV */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Tv className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Telas de TV</Label>
                    <p className="text-xs text-slate-500">Banners e displays</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_tv ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_tv: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Marketing</Label>
                    <p className="text-xs text-slate-500">Campanhas e promoções</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_marketing ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_marketing: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Inteligência Artificial */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Inteligência Artificial</Label>
                    <p className="text-xs text-slate-500">Recomendações e análises IA</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_ai ?? true}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_ai: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Enólogo Virtual */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <Wine className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Enólogo Virtual</Label>
                    <p className="text-xs text-slate-500">Recomendações de vinhos IA</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_sommelier ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_sommelier: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Balança Automática */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Balança Automática</Label>
                    <p className="text-xs text-slate-500">Pesagem self-service</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_scale ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_scale: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Rastreio GPS */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Rastreio GPS</Label>
                    <p className="text-xs text-slate-500">Rastreamento entregadores</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_tracking ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_tracking: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Tablet Autoatendimento */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <Tablet className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Tablet/Totem</Label>
                    <p className="text-xs text-slate-500">Autoatendimento</p>
                  </div>
                </div>
                <Switch
                  checked={companyModules?.module_tablet ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_tablet: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Self Check-out */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-lime-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Self Check-out</Label>
                    <p className="text-xs text-slate-500">Pagamento de comandas</p>
                  </div>
                </div>
                <Switch
                  checked={(companyModules as any)?.module_self_checkout ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_self_checkout: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Expedição */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Expedição</Label>
                    <p className="text-xs text-slate-500">Terminal de entregadores</p>
                  </div>
                </div>
                <Switch
                  checked={(companyModules as any)?.module_expedition ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_expedition: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>

              {/* Performance Operacional */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-fuchsia-400" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Performance</Label>
                    <p className="text-xs text-slate-500">Dashboard tempo real</p>
                  </div>
                </div>
                <Switch
                  checked={(companyModules as any)?.module_performance ?? false}
                  onCheckedChange={(checked) => updateModules.mutate({ 
                    companyId: company.id, 
                    modules: { module_performance: checked } 
                  })}
                  disabled={updateModules.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Reset Actions (Super Admin only) */}
        <CompanyResetActions companyId={company.id} companyName={company.name} />

        {/* Audit Logs */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Logs Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-slate-400">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {companyLogs.length > 0 ? (
              <div className="space-y-2">
                {companyLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white">{log.action}</p>
                        <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-500">Nenhum log encontrado para esta empresa</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Suspender Empresa
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              A empresa perderá acesso ao sistema imediatamente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 mb-4">
              Tem certeza que deseja suspender <strong className="text-white">{company.name}</strong>?
            </p>
            <Textarea
              placeholder="Motivo da suspensão (opcional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuspendDialog(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSuspend} disabled={updateStatus.isPending} className="bg-red-600 hover:bg-red-700">
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suspender'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={cloneDialog} onOpenChange={setCloneDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-purple-400" />
              Clonar Cardápio
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Copie categorias, subcategorias e produtos de um template
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 mb-4">
              Selecione o template de origem para clonar o cardápio:
            </p>
            <Select value={sourceTemplateId} onValueChange={setSourceTemplateId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">
                Nenhum template disponível. Marque uma empresa como template primeiro.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloneDialog(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button 
              onClick={handleClone} 
              disabled={!sourceTemplateId || cloneMenu.isPending} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              {cloneMenu.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clonar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Bloquear por Inadimplência</DialogTitle>
            <DialogDescription className="text-slate-400">
              O cliente verá esta mensagem ao tentar acessar o sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Mensagem para o cliente..."
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                blockCompany.mutate({ companyId: company!.id, isBlocked: true, blockedReason: blockReason });
                setBlockDialog(false);
              }}
              disabled={blockCompany.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {blockCompany.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bloquear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
