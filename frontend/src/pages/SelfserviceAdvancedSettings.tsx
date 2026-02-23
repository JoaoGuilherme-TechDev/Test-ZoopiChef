import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, Brain, Sparkles, Mic, Heart, AlertTriangle, CreditCard, 
  Gift, LayoutGrid, Clock, Settings, BarChart3, Users, TrendingUp 
} from 'lucide-react';
import { useSelfserviceAdvancedSettings, useSelfserviceRecommendations, useGenerateRecommendations } from '@/hooks/useSelfserviceAdvanced';

export default function SelfserviceAdvancedSettings() {
  const { settings, isLoading, updateSettings } = useSelfserviceAdvancedSettings();
  const { data: recommendations = [] } = useSelfserviceRecommendations(undefined);
  const generateRecommendations = useGenerateRecommendations();

  const recommendationTypeLabels: Record<string, string> = {
    personal: 'Personalizada',
    popular: 'Popular',
    combo: 'Combo',
    upsell: 'Upsell',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Autoatendimento Avançado</h1>
              <p className="text-muted-foreground">Recursos de IA e personalização</p>
            </div>
          </div>
          <Button 
            onClick={() => generateRecommendations.mutate(undefined)}
            disabled={generateRecommendations.isPending}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generateRecommendations.isPending ? 'Gerando...' : 'Gerar Recomendações'}
          </Button>
        </div>

        {/* Status */}
        <Card className={settings?.is_enabled ? 'border-green-500' : ''}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${settings?.is_enabled ? 'bg-green-500/20' : 'bg-muted'}`}>
                  <Brain className={`w-6 h-6 ${settings?.is_enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Recursos Avançados</h3>
                  <p className="text-muted-foreground">
                    {settings?.is_enabled 
                      ? 'IA e personalização ativas no autoatendimento'
                      : 'Ative para usar IA no autoatendimento'}
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

        <Tabs defaultValue="ai">
          <TabsList>
            <TabsTrigger value="ai">Recursos de IA</TabsTrigger>
            <TabsTrigger value="personalization">Personalização</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="gamification">Gamificação</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Inteligência Artificial
                </CardTitle>
                <CardDescription>
                  Configure os recursos de IA para melhorar a experiência do cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Recomendações Inteligentes</p>
                      <p className="text-sm text-muted-foreground">
                        Sugerir produtos baseado no histórico do cliente
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.ai_recommendations_enabled || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ ai_recommendations_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Upsell Inteligente</p>
                      <p className="text-sm text-muted-foreground">
                        Sugerir complementos e upgrades automaticamente
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.ai_upsell_enabled || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ ai_upsell_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Pedido por Voz</p>
                      <p className="text-sm text-muted-foreground">
                        Permitir que clientes façam pedidos falando
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.voice_ordering_enabled || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ voice_ordering_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personalization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Personalização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Lembrar Preferências</p>
                      <p className="text-sm text-muted-foreground">
                        Guardar histórico de pedidos por cliente
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.remember_customer_preferences ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ remember_customer_preferences: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Avisos de Alérgenos</p>
                      <p className="text-sm text-muted-foreground">
                        Mostrar informações sobre alérgenos
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.show_allergen_warnings ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ show_allergen_warnings: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Informações Nutricionais</p>
                      <p className="text-sm text-muted-foreground">
                        Exibir calorias e valores nutricionais
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.show_calorie_info || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ show_calorie_info: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tempo de Preparo</p>
                      <p className="text-sm text-muted-foreground">
                        Mostrar estimativa de tempo de preparo
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.show_preparation_time ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ show_preparation_time: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estilo do Layout</Label>
                  <Select 
                    value={settings?.layout_style || 'grid'}
                    onValueChange={(v) => updateSettings.mutate({ layout_style: v as 'grid' | 'list' | 'carousel' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grade</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dividir Pagamento</p>
                    <p className="text-sm text-muted-foreground">
                      Permitir divisão da conta entre pessoas
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.allow_split_payment || false}
                    onCheckedChange={(checked) => updateSettings.mutate({ allow_split_payment: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Gorjetas</p>
                    <p className="text-sm text-muted-foreground">
                      Permitir que clientes deixem gorjeta
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.allow_tips ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ allow_tips: checked })}
                  />
                </div>

                {settings?.allow_tips && (
                  <div className="space-y-2">
                    <Label>Opções de Gorjeta (%)</Label>
                    <div className="flex gap-2">
                      {(settings?.default_tip_percentages || [10, 15, 20]).map((tip, i) => (
                        <Badge key={i} variant="outline" className="px-4 py-2">
                          {tip}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gamification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Gamificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mostrar Progresso de Fidelidade</p>
                    <p className="text-sm text-muted-foreground">
                      Exibir pontos e nível do cliente
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.show_loyalty_progress ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ show_loyalty_progress: checked })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Multiplicador de Pontos</Label>
                    <Badge variant="outline">{settings?.points_multiplier || 1}x</Badge>
                  </div>
                  <Slider 
                    value={[settings?.points_multiplier || 1]}
                    onValueChange={([v]) => updateSettings.mutate({ points_multiplier: v })}
                    min={1}
                    max={5}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Aplique bônus de pontos para pedidos feitos pelo autoatendimento
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Recomendações Ativas
                </CardTitle>
                <CardDescription>
                  Recomendações geradas pela IA para mostrar aos clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Nenhuma recomendação gerada ainda
                    </p>
                    <Button onClick={() => generateRecommendations.mutate(undefined)}>
                      Gerar Recomendações
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {recommendationTypeLabels[rec.recommendation_type]}
                            </Badge>
                            {rec.score && (
                              <Badge variant="secondary">
                                Score: {rec.score.toFixed(0)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rec.reason || `${rec.product_ids.length} produtos`}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {rec.shown_at && <p>Exibido: ✓</p>}
                          {rec.clicked_at && <p>Clicado: ✓</p>}
                          {rec.converted_at && <p>Convertido: ✓</p>}
                        </div>
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
