import { useState } from 'react';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { usePlans, useCreatePlan, useUpdatePlan } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Loader2, Check, X, Package, Settings2, Receipt, Cpu, Clock, History } from 'lucide-react';
import { ALL_PLAN_MODULES, FISCAL_CONTROLS, PLAN_LIMITS } from '@/hooks/usePlanFeatures';
import { supabase } from '@/lib/supabase-shim';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Define grouped modules for better organization
const MODULE_GROUPS = {
  'Operação': ['kds', 'delivery', 'totem', 'mesa_comanda', 'qrcode', 'rodizio', 'reservas'],
  'TV/Display': ['tv', 'tv_scheduler'],
  'Inteligência Artificial': ['ai_recommendations', 'ai_menu_creative', 'ai_assistant', 'ai_churn', 'ai_pricing'],
  'Marketing': ['campaigns', 'repurchase', 'roleta', 'loyalty', 'coupons'],
  'Administrativo': ['multi_users', 'custom_branding', 'integrations', 'print_sectors', 'reports', 'erp', 'financial'],
} as const;

interface PlanForm {
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  price_yearly_cents: number;
  price_promo_cents: number | null;
  promo_valid_until: string;
  billing_period: string;
  is_active: boolean;
  display_order: number;
  features_json: string[];
  limits_json: Record<string, number>;
  modules_json: Record<string, boolean>;
  fiscal_json: Record<string, boolean>;
}

const emptyPlan: PlanForm = {
  name: '',
  slug: '',
  description: '',
  price_cents: 0,
  price_yearly_cents: 0,
  price_promo_cents: null,
  promo_valid_until: '',
  billing_period: 'monthly',
  is_active: true,
  display_order: 0,
  features_json: [],
  limits_json: {},
  modules_json: {},
  fiscal_json: {},
};

export default function SaasPlans() {
  const { data: plans = [], isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyPlan);
  const [changeNotes, setChangeNotes] = useState('');
  const [applyTo, setApplyTo] = useState<'new_subscriptions' | 'all_subscriptions' | 'immediate'>('new_subscriptions');

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyPlan);
    setChangeNotes('');
    setApplyTo('new_subscriptions');
    setDialogOpen(true);
  };

  const handleOpenEdit = (plan: typeof plans[0]) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_cents: plan.price_cents,
      price_yearly_cents: (plan as any).price_yearly_cents || plan.price_cents * 10,
      price_promo_cents: (plan as any).price_promo_cents || null,
      promo_valid_until: (plan as any).promo_valid_until || '',
      billing_period: plan.billing_period,
      is_active: plan.is_active,
      display_order: plan.display_order,
      features_json: Array.isArray(plan.features_json) ? plan.features_json : [],
      limits_json: typeof plan.limits_json === 'object' && plan.limits_json !== null ? plan.limits_json : {},
      modules_json: typeof (plan as any).modules_json === 'object' && (plan as any).modules_json !== null 
        ? (plan as any).modules_json 
        : {},
      fiscal_json: typeof (plan as any).fiscal_json === 'object' && (plan as any).fiscal_json !== null 
        ? (plan as any).fiscal_json 
        : {},
    });
    setChangeNotes('');
    setApplyTo('new_subscriptions');
    setDialogOpen(true);
  };

  const handleModuleToggle = (moduleId: string) => {
    setForm(prev => ({
      ...prev,
      modules_json: {
        ...prev.modules_json,
        [moduleId]: !prev.modules_json[moduleId]
      }
    }));
  };

  const handleFiscalToggle = (fiscalId: string) => {
    setForm(prev => ({
      ...prev,
      fiscal_json: {
        ...prev.fiscal_json,
        [fiscalId]: !prev.fiscal_json[fiscalId]
      }
    }));
  };

  const handleLimitChange = (limitId: string, value: number) => {
    setForm(prev => ({
      ...prev,
      limits_json: { ...prev.limits_json, [limitId]: value }
    }));
  };

  const handleSubmit = async () => {
    const planData = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      price_cents: form.price_cents,
      price_yearly_cents: form.price_yearly_cents,
      price_promo_cents: form.price_promo_cents,
      promo_valid_until: form.promo_valid_until || null,
      billing_period: form.billing_period,
      is_active: form.is_active,
      display_order: form.display_order,
      features_json: form.features_json,
      limits_json: form.limits_json,
      modules_json: form.modules_json,
      fiscal_json: form.fiscal_json,
    };

    if (editingId) {
      // Get old plan values for history
      const oldPlan = plans.find(p => p.id === editingId);
      
      updatePlan.mutate({ id: editingId, ...planData } as any, {
        onSuccess: async () => {
          // Save change history
          if (user?.id) {
            await (supabase.from('plan_change_history') as any).insert({
              plan_id: editingId,
              changed_by: user.id,
              change_type: 'updated',
              old_values: oldPlan,
              new_values: planData,
              notes: changeNotes || null,
              apply_to: applyTo,
              applied_at: applyTo === 'immediate' ? new Date().toISOString() : null,
            });
          }
          
          toast.success('Plano atualizado com sucesso');
          setDialogOpen(false);
        },
      });
    } else {
      createPlan.mutate(planData as any, {
        onSuccess: async (data) => {
          // Save creation in history
          if (user?.id && data?.id) {
            await (supabase.from('plan_change_history') as any).insert({
              plan_id: data.id,
              changed_by: user.id,
              change_type: 'created',
              old_values: null,
              new_values: planData,
              notes: changeNotes || null,
              apply_to: 'new_subscriptions',
              applied_at: new Date().toISOString(),
            });
          }
          
          setDialogOpen(false);
        },
      });
    }
  };

  const toggleAllModulesInGroup = (group: string, enable: boolean) => {
    const groupModules = MODULE_GROUPS[group as keyof typeof MODULE_GROUPS] || [];
    setForm(prev => {
      const newModules = { ...prev.modules_json };
      groupModules.forEach(m => {
        newModules[m] = enable;
      });
      return { ...prev, modules_json: newModules };
    });
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  // Count enabled modules
  const countEnabledModules = (modules: Record<string, boolean>) => 
    Object.values(modules).filter(Boolean).length;

  // Count enabled fiscals
  const countEnabledFiscals = (fiscals: Record<string, boolean>) => 
    Object.values(fiscals).filter(Boolean).length;

  return (
    <SaasLayout title="Gestão de Planos">
      <div className="space-y-6">
        {/* Header with description */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Planos de Assinatura</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure valores, módulos, limites e controles fiscais de cada plano. 
                  As alterações aqui são aplicadas a todas as empresas conforme o plano contratado.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setHistoryDialogOpen(true)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </Button>
                <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Plano
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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {plans.map((plan) => {
                  const modules = typeof (plan as any).modules_json === 'object' ? (plan as any).modules_json : {};
                  const fiscals = typeof (plan as any).fiscal_json === 'object' ? (plan as any).fiscal_json : {};
                  const limits = typeof plan.limits_json === 'object' && plan.limits_json !== null ? plan.limits_json : {};
                  const yearlyPrice = (plan as any).price_yearly_cents || plan.price_cents * 10;
                  
                  return (
                    <Card key={plan.id} className="bg-slate-800/50 border-slate-700/50 overflow-hidden flex flex-col">
                      <CardHeader className="pb-2 border-b border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              plan.is_active
                                ? 'border-emerald-500/50 text-emerald-400'
                                : 'border-slate-500/50 text-slate-400'
                            }
                          >
                            {plan.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-purple-400">
                            R$ {(plan.price_cents / 100).toFixed(2)}
                            <span className="text-sm font-normal text-slate-400">/mês</span>
                          </p>
                          <p className="text-sm text-slate-500">
                            ou R$ {(yearlyPrice / 100).toFixed(2)}/ano
                          </p>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-4 flex-1 flex flex-col">
                        <div className="space-y-4 flex-1">
                          {/* Modules count */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400 flex items-center gap-2">
                              <Cpu className="w-4 h-4" />
                              Módulos
                            </span>
                            <Badge variant="secondary" className="bg-slate-700">
                              {countEnabledModules(modules)} ativos
                            </Badge>
                          </div>

                          {/* Fiscal count */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400 flex items-center gap-2">
                              <Receipt className="w-4 h-4" />
                              Fiscais
                            </span>
                            <Badge variant="secondary" className="bg-slate-700">
                              {countEnabledFiscals(fiscals)} ativos
                            </Badge>
                          </div>

                          {/* Key limits preview */}
                          {Object.keys(limits).length > 0 && (
                            <div className="border-t border-slate-700 pt-3">
                              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                <Settings2 className="w-3 h-3" />
                                Limites principais
                              </p>
                              <div className="space-y-1">
                                {Object.entries(limits).slice(0, 4).map(([key, value]) => {
                                  const limitDef = PLAN_LIMITS[key as keyof typeof PLAN_LIMITS];
                                  return (
                                    <div key={key} className="flex items-center justify-between text-xs">
                                      <span className="text-slate-400">{limitDef?.label || key}</span>
                                      <span className="text-white font-medium">
                                        {value === -1 ? '∞' : value.toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(plan)}
                          className="mt-4 w-full text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Gerenciar Plano
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Matrix */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Matriz de Módulos</CardTitle>
            <CardDescription className="text-slate-400">
              Comparação rápida de módulos entre todos os planos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-300 sticky left-0 bg-slate-900">Módulo</th>
                    {plans.map(plan => (
                      <th key={plan.id} className="text-center p-3 text-slate-300 min-w-[100px]">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MODULE_GROUPS).map(([groupName, modules]) => (
                    <>
                      <tr key={`group-${groupName}`} className="bg-slate-800/30">
                        <td colSpan={plans.length + 1} className="p-2 text-xs font-semibold text-purple-400 sticky left-0 bg-slate-800/30">
                          {groupName}
                        </td>
                      </tr>
                      {modules.map(moduleId => {
                        const moduleDef = ALL_PLAN_MODULES[moduleId as keyof typeof ALL_PLAN_MODULES];
                        return (
                          <tr key={moduleId} className="border-b border-slate-800/50">
                            <td className="p-2 sticky left-0 bg-slate-900">
                              <p className="text-slate-200 text-xs">{moduleDef?.label}</p>
                            </td>
                            {plans.map(plan => {
                              const modules = typeof (plan as any).modules_json === 'object' ? (plan as any).modules_json : {};
                              const hasModule = modules[moduleId] === true;
                              return (
                                <td key={plan.id} className="text-center p-2">
                                  {hasModule ? (
                                    <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                                  ) : (
                                    <X className="w-4 h-4 text-slate-600 mx-auto" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Gerenciar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure todos os aspectos do plano de forma granular
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800">
              <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs">Preços</TabsTrigger>
              <TabsTrigger value="modules" className="text-xs">Módulos</TabsTrigger>
              <TabsTrigger value="fiscal" className="text-xs">Fiscais</TabsTrigger>
              <TabsTrigger value="limits" className="text-xs">Limites</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[450px] mt-4">
              {/* TAB: Informações Básicas */}
              <TabsContent value="info" className="space-y-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nome do Plano</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Ex: Básico, Pro, Enterprise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Slug (identificador)</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Ex: basico, pro, enterprise"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                    placeholder="Descrição do plano para exibição"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Ordem de exibição</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Status</Label>
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                      />
                      <span className="text-slate-300">{form.is_active ? 'Plano Ativo' : 'Plano Inativo'}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Preços */}
              <TabsContent value="pricing" className="space-y-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Preço Mensal (centavos)</Label>
                    <Input
                      type="number"
                      value={form.price_cents}
                      onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <p className="text-xs text-emerald-400">
                      = R$ {(form.price_cents / 100).toFixed(2)}/mês
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Preço Anual (centavos)</Label>
                    <Input
                      type="number"
                      value={form.price_yearly_cents}
                      onChange={(e) => setForm({ ...form, price_yearly_cents: parseInt(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <p className="text-xs text-emerald-400">
                      = R$ {(form.price_yearly_cents / 100).toFixed(2)}/ano 
                      {form.price_cents > 0 && form.price_yearly_cents > 0 && (
                        <span className="text-slate-400 ml-2">
                          ({Math.round(100 - (form.price_yearly_cents / (form.price_cents * 12)) * 100)}% desconto)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-medium text-purple-400 mb-3">Promoção (opcional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Preço Promocional (centavos)</Label>
                      <Input
                        type="number"
                        value={form.price_promo_cents ?? ''}
                        onChange={(e) => setForm({ ...form, price_promo_cents: e.target.value ? parseInt(e.target.value) : null })}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Deixe vazio se não houver"
                      />
                      {form.price_promo_cents && (
                        <p className="text-xs text-amber-400">
                          = R$ {(form.price_promo_cents / 100).toFixed(2)}/mês
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Válido até</Label>
                      <Input
                        type="datetime-local"
                        value={form.promo_valid_until}
                        onChange={(e) => setForm({ ...form, promo_valid_until: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* TAB: Módulos */}
              <TabsContent value="modules" className="space-y-4 px-1">
                <p className="text-sm text-slate-400 mb-2">
                  Selecione quais módulos estão disponíveis neste plano:
                </p>
                
                {Object.entries(MODULE_GROUPS).map(([groupName, modules]) => (
                  <div key={groupName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-purple-400">{groupName}</h4>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-6 text-emerald-400 hover:text-emerald-300"
                          onClick={() => toggleAllModulesInGroup(groupName, true)}
                        >
                          Todos
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-6 text-slate-400 hover:text-slate-300"
                          onClick={() => toggleAllModulesInGroup(groupName, false)}
                        >
                          Nenhum
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {modules.map(moduleId => {
                        const moduleDef = ALL_PLAN_MODULES[moduleId as keyof typeof ALL_PLAN_MODULES];
                        if (!moduleDef) return null;
                        const isEnabled = form.modules_json[moduleId] === true;
                        
                        return (
                          <div
                            key={moduleId}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              isEnabled
                                ? 'bg-emerald-900/20 border-emerald-500/50'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            }`}
                            onClick={() => handleModuleToggle(moduleId)}
                          >
                            <Checkbox
                              checked={isEnabled}
                              onCheckedChange={() => handleModuleToggle(moduleId)}
                              className="border-slate-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">{moduleDef.label}</p>
                              <p className="text-xs text-slate-500 truncate">{moduleDef.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* TAB: Fiscais */}
              <TabsContent value="fiscal" className="space-y-4 px-1">
                <p className="text-sm text-slate-400 mb-4">
                  Configure quais recursos fiscais estão disponíveis neste plano:
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(FISCAL_CONTROLS).map(([fiscalId, fiscalDef]) => {
                    const isEnabled = form.fiscal_json[fiscalId] === true;
                    
                    return (
                      <div
                        key={fiscalId}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          isEnabled
                            ? 'bg-emerald-900/20 border-emerald-500/50'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                        onClick={() => handleFiscalToggle(fiscalId)}
                      >
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={() => handleFiscalToggle(fiscalId)}
                          className="border-slate-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{fiscalDef.label}</p>
                          <p className="text-xs text-slate-500">{fiscalDef.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
              
              {/* TAB: Limites */}
              <TabsContent value="limits" className="space-y-4 px-1">
                <p className="text-sm text-slate-400 mb-4">
                  Defina os limites de uso para este plano. Use <strong>-1</strong> para ilimitado:
                </p>
                
                <div className="space-y-3">
                  {Object.entries(PLAN_LIMITS).map(([limitId, limitDef]) => (
                    <div 
                      key={limitId} 
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">{limitDef.label}</p>
                        <p className="text-xs text-slate-500">{limitDef.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={form.limits_json[limitId] ?? ''}
                          onChange={(e) => handleLimitChange(limitId, parseInt(e.target.value) || 0)}
                          className="w-28 bg-slate-900 border-slate-600 text-white text-center"
                          placeholder="0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-purple-400 hover:text-purple-300"
                          onClick={() => handleLimitChange(limitId, -1)}
                        >
                          ∞
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Change notes & apply rules (only for editing) */}
          {editingId && (
            <div className="border-t border-slate-700 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Aplicar alterações
                  </Label>
                  <Select value={applyTo} onValueChange={(v: any) => setApplyTo(v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="new_subscriptions">Apenas novas assinaturas</SelectItem>
                      <SelectItem value="all_subscriptions">Todos no próximo ciclo</SelectItem>
                      <SelectItem value="immediate">Imediatamente para todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Observações da alteração</Label>
                  <Input
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Ex: Ajuste de preço anual"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !form.name || !form.slug}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <PlanHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} />
    </SaasLayout>
  );
}

// Plan History Dialog Component
function PlanHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan_change_history')
        .select('*, plan:plans(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (open && history.length === 0 && !loading) {
    loadHistory();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Registro de todas as alterações feitas nos planos
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum histórico encontrado</p>
          ) : (
            <div className="space-y-3 pr-4">
              {history.map((item) => (
                <div key={item.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                      {item.change_type}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-white">{item.plan?.name || 'Plano removido'}</p>
                  {item.notes && (
                    <p className="text-xs text-slate-400 mt-1">{item.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs bg-slate-700">
                      {item.apply_to === 'new_subscriptions' ? 'Novas assinaturas' : 
                       item.apply_to === 'all_subscriptions' ? 'Todos no próximo ciclo' : 
                       'Imediato'}
                    </Badge>
                    {item.applied_at && (
                      <span className="text-xs text-emerald-400">
                        Aplicado em {new Date(item.applied_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
