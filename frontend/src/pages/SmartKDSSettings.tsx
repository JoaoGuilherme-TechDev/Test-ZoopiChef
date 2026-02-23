import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, ChefHat, Clock, Zap, TrendingUp, Users, Truck, Crown, 
  RefreshCw, BarChart3, Settings, History, Sparkles 
} from 'lucide-react';
import { 
  useSmartKDSSettings, 
  useProductPrepTimes, 
  useKDSPriorityLog,
  useRecalculateKDSPriority,
  useLearnPrepTimes
} from '@/hooks/useSmartKDS';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SmartKDSSettings() {
  const { settings, isLoading, updateSettings } = useSmartKDSSettings();
  const { prepTimes } = useProductPrepTimes();
  const { data: priorityLog = [] } = useKDSPriorityLog();
  const { data: products = [] } = useProducts();
  const recalculatePriority = useRecalculateKDSPriority();
  const learnPrepTimes = useLearnPrepTimes();

  const prepTimesMap = new Map(prepTimes.map(p => [p.product_id, p]));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">KDS Inteligente</h1>
              <p className="text-muted-foreground">Otimização de pedidos com IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => learnPrepTimes.mutate()}
              disabled={learnPrepTimes.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {learnPrepTimes.isPending ? 'Aprendendo...' : 'Aprender Tempos'}
            </Button>
            <Button 
              onClick={() => recalculatePriority.mutate()}
              disabled={recalculatePriority.isPending || !settings?.is_enabled}
            >
              <Zap className="w-4 h-4 mr-2" />
              {recalculatePriority.isPending ? 'Recalculando...' : 'Recalcular Prioridades'}
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card className={settings?.is_enabled ? 'border-green-500' : ''}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${settings?.is_enabled ? 'bg-green-500/20' : 'bg-muted'}`}>
                  <Brain className={`w-6 h-6 ${settings?.is_enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">KDS Inteligente</h3>
                  <p className="text-muted-foreground">
                    {settings?.is_enabled 
                      ? 'A IA está otimizando a ordem dos pedidos automaticamente'
                      : 'Ative para otimizar a produção com IA'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings?.is_enabled || false}
                onCheckedChange={(checked) => updateSettings.mutate({ is_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="prep-times">Tempos de Preparo</TabsTrigger>
            <TabsTrigger value="log">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            {/* Priorização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Fatores de Priorização
                </CardTitle>
                <CardDescription>
                  Configure quais fatores a IA deve considerar ao ordenar pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tempo de Preparo</p>
                      <p className="text-sm text-muted-foreground">
                        Considerar tempo estimado de cada item
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.consider_prep_time ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ consider_prep_time: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tipo de Pedido</p>
                      <p className="text-sm text-muted-foreground">
                        Priorizar delivery e retirada sobre mesa
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.consider_order_type ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ consider_order_type: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Clientes VIP</p>
                      <p className="text-sm text-muted-foreground">
                        Priorizar pedidos de clientes frequentes
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.consider_vip_customers ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ consider_vip_customers: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Agrupar Itens Similares</p>
                      <p className="text-sm text-muted-foreground">
                        Produzir itens iguais em lote para eficiência
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.batch_similar_items ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ batch_similar_items: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Boost */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Ajustes de Prioridade
                </CardTitle>
                <CardDescription>
                  Configure o peso de cada fator na priorização
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Boost Horário de Pico</Label>
                    <Badge variant="outline">{settings?.rush_hour_boost || 5} min</Badge>
                  </div>
                  <Slider 
                    value={[settings?.rush_hour_boost || 5]}
                    onValueChange={([v]) => updateSettings.mutate({ rush_hour_boost: v })}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Boost Delivery</Label>
                    <Badge variant="outline">{settings?.delivery_priority_boost || 10} pontos</Badge>
                  </div>
                  <Slider 
                    value={[settings?.delivery_priority_boost || 10]}
                    onValueChange={([v]) => updateSettings.mutate({ delivery_priority_boost: v })}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Boost VIP</Label>
                    <Badge variant="outline">{settings?.vip_priority_boost || 15} pontos</Badge>
                  </div>
                  <Slider 
                    value={[settings?.vip_priority_boost || 15]}
                    onValueChange={([v]) => updateSettings.mutate({ vip_priority_boost: v })}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Tamanho Máximo de Lote</Label>
                    <Badge variant="outline">{settings?.max_batch_size || 5} itens</Badge>
                  </div>
                  <Slider 
                    value={[settings?.max_batch_size || 5]}
                    onValueChange={([v]) => updateSettings.mutate({ max_batch_size: v })}
                    min={2}
                    max={20}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prep-times" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Tempos de Preparo por Produto
                </CardTitle>
                <CardDescription>
                  A IA aprende automaticamente os tempos baseado no histórico de produção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {products.slice(0, 20).map((product) => {
                    const prepTime = prepTimesMap.get(product.id);
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt="" 
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {prepTime && (
                              <p className="text-xs text-muted-foreground">
                                {prepTime.samples_count} amostras
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {prepTime?.avg_prep_time_minutes || 10} min
                          </Badge>
                          {prepTime?.min_prep_time_minutes && prepTime?.max_prep_time_minutes && (
                            <span className="text-xs text-muted-foreground">
                              ({prepTime.min_prep_time_minutes}-{prepTime.max_prep_time_minutes})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico de Priorizações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priorityLog.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma priorização registrada ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {priorityLog.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm">
                            Pedido movido de #{log.original_position} para #{log.new_position}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.applied_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline">
                          Score: {log.priority_score?.toFixed(0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
