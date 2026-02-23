import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Clock, Calendar, Zap, Plus, Edit, Trash2, 
  DollarSign, Settings, History, AlertTriangle, Sparkles, BarChart3 
} from 'lucide-react';
import { AIModuleHeader, AI_MODULE_DESCRIPTIONS } from "@/components/ai/AIModuleHeader";
import { 
  useDynamicPricingSettings, 
  useDynamicPricingRules, 
  usePricingHistory,
  useApplyDynamicPricing,
  DynamicPricingRule
} from '@/hooks/useDynamicPricing';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ruleTypeLabels: Record<string, string> = {
  time_based: 'Baseado em Horário',
  demand_based: 'Baseado em Demanda',
  inventory_based: 'Baseado em Estoque',
  weather_based: 'Baseado no Clima',
};

const ruleTypeIcons: Record<string, React.ReactNode> = {
  time_based: <Clock className="w-4 h-4" />,
  demand_based: <TrendingUp className="w-4 h-4" />,
  inventory_based: <BarChart3 className="w-4 h-4" />,
  weather_based: <Sparkles className="w-4 h-4" />,
};

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function DynamicPricing() {
  const { settings, isLoading: settingsLoading, updateSettings } = useDynamicPricingSettings();
  const { rules, isLoading: rulesLoading, createRule, updateRule, deleteRule, toggleRule } = useDynamicPricingRules();
  const { data: history = [] } = usePricingHistory(7);
  const applyPricing = useApplyDynamicPricing();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<DynamicPricingRule> | null>(null);
  const [newRule, setNewRule] = useState<Partial<DynamicPricingRule>>({
    name: '',
    rule_type: 'time_based',
    adjustment_type: 'percentage',
    adjustment_value: 0,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    applies_to_all_products: true,
  });

  const handleSaveRule = () => {
    if (editingRule?.id) {
      updateRule.mutate({ id: editingRule.id, ...newRule });
    } else {
      createRule.mutate(newRule);
    }
    setIsDialogOpen(false);
    setEditingRule(null);
    setNewRule({
      name: '',
      rule_type: 'time_based',
      adjustment_type: 'percentage',
      adjustment_value: 0,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      applies_to_all_products: true,
    });
  };

  const handleEditRule = (rule: DynamicPricingRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setIsDialogOpen(true);
  };

  const activeRulesCount = rules.filter(r => r.is_active).length;
  const totalAdjustments = history.length;
  const avgAdjustment = history.length > 0 
    ? history.reduce((sum, h) => sum + (h.adjustment_percent || 0), 0) / history.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com descrição clara */}
        <AIModuleHeader
          title={AI_MODULE_DESCRIPTIONS.dynamicPricing.title}
          icon={DollarSign}
          description={AI_MODULE_DESCRIPTIONS.dynamicPricing.description}
          purpose={AI_MODULE_DESCRIPTIONS.dynamicPricing.purpose}
          whenToUse={AI_MODULE_DESCRIPTIONS.dynamicPricing.whenToUse}
          doesNot={AI_MODULE_DESCRIPTIONS.dynamicPricing.doesNot}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => applyPricing.mutate()}
              disabled={applyPricing.isPending || !settings?.is_enabled}
            >
              <Zap className="w-4 h-4 mr-2" />
              {applyPricing.isPending ? 'Aplicando...' : 'Aplicar Agora'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingRule(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Preço'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome da Regra</Label>
                    <Input 
                      value={newRule.name || ''} 
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Ex: Happy Hour -20%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Regra</Label>
                    <Select 
                      value={newRule.rule_type} 
                      onValueChange={(v) => setNewRule({ ...newRule, rule_type: v as DynamicPricingRule['rule_type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="time_based">Baseado em Horário</SelectItem>
                        <SelectItem value="demand_based">Baseado em Demanda</SelectItem>
                        <SelectItem value="inventory_based">Baseado em Estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Ajuste</Label>
                      <Select 
                        value={newRule.adjustment_type} 
                        onValueChange={(v) => setNewRule({ ...newRule, adjustment_type: v as 'percentage' | 'fixed' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor do Ajuste</Label>
                      <Input 
                        type="number"
                        value={newRule.adjustment_value || 0} 
                        onChange={(e) => setNewRule({ ...newRule, adjustment_value: parseFloat(e.target.value) })}
                        placeholder="Ex: -10 ou 5"
                      />
                    </div>
                  </div>
                  {newRule.rule_type === 'time_based' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário Início</Label>
                        <Input 
                          type="time"
                          value={newRule.start_time || ''} 
                          onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário Fim</Label>
                        <Input 
                          type="time"
                          value={newRule.end_time || ''} 
                          onChange={(e) => setNewRule({ ...newRule, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Dias da Semana</Label>
                    <div className="flex gap-1">
                      {dayNames.map((day, i) => (
                        <Button
                          key={i}
                          variant={newRule.days_of_week?.includes(i) ? 'default' : 'outline'}
                          size="sm"
                          className="w-10"
                          onClick={() => {
                            const days = newRule.days_of_week || [];
                            setNewRule({
                              ...newRule,
                              days_of_week: days.includes(i) 
                                ? days.filter(d => d !== i) 
                                : [...days, i].sort(),
                            });
                          }}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveRule} disabled={!newRule.name}>
                    {editingRule ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-2xl font-bold">{settings?.is_enabled ? 'Ativo' : 'Inativo'}</p>
                </div>
                <Switch 
                  checked={settings?.is_enabled || false}
                  onCheckedChange={(checked) => updateSettings.mutate({ is_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Regras Ativas</p>
              <p className="text-2xl font-bold">{activeRulesCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Ajustes (7 dias)</p>
              <p className="text-2xl font-bold">{totalAdjustments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Ajuste Médio</p>
              <p className={`text-2xl font-bold ${avgAdjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgAdjustment >= 0 ? '+' : ''}{avgAdjustment.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Regras</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {rulesLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma regra de preço configurada</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Regra
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rules.map((rule) => (
                  <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                          />
                          <div className="flex items-center gap-2">
                            {ruleTypeIcons[rule.rule_type]}
                            <div>
                              <h4 className="font-medium">{rule.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {ruleTypeLabels[rule.rule_type]}
                                {rule.start_time && rule.end_time && (
                                  <span className="ml-2">• {rule.start_time} - {rule.end_time}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge 
                            className={rule.adjustment_value >= 0 ? 'bg-green-500' : 'bg-red-500'}
                          >
                            {rule.adjustment_value >= 0 ? '+' : ''}
                            {rule.adjustment_value}
                            {rule.adjustment_type === 'percentage' ? '%' : ' R$'}
                          </Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditRule(rule)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteRule.mutate(rule.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Últimos Ajustes de Preço
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum ajuste registrado</p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 20).map((h) => (
                      <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm">{h.reason || 'Ajuste automático'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(h.applied_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground line-through">
                            R$ {h.original_price.toFixed(2)}
                          </p>
                          <p className="font-medium">R$ {h.adjusted_price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Aplicar Automaticamente</p>
                    <p className="text-sm text-muted-foreground">
                      Ajustar preços automaticamente quando as regras forem atingidas
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.auto_apply || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ auto_apply: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações</p>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas quando preços forem ajustados
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.notification_enabled || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ notification_enabled: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máx. Ajustes por Dia</Label>
                    <Input 
                      type="number"
                      value={settings?.max_daily_adjustments || 50}
                      onChange={(e) => updateSettings.mutate({ max_daily_adjustments: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margem Mínima (%)</Label>
                    <Input 
                      type="number"
                      value={settings?.min_margin_percent || 10}
                      onChange={(e) => updateSettings.mutate({ min_margin_percent: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
