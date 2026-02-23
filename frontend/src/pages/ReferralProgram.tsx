import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users,
  Gift,
  Copy,
  Check,
  Settings,
  Share2,
  DollarSign,
  UserPlus,
  Loader2
} from 'lucide-react';
import {
  useReferralSettings,
  useUpdateReferralSettings,
  useReferralCodes,
  useReferrals,
  ReferralSettings,
} from '@/hooks/useReferralProgram';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReferralProgram() {
  const { data: settings, isLoading: settingsLoading } = useReferralSettings();
  const { data: referralCodes } = useReferralCodes();
  const { data: referrals } = useReferrals();
  const updateSettings = useUpdateReferralSettings();

  const [copied, setCopied] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Partial<ReferralSettings> | null>(null);

  // Sync local settings when settings load
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(null);
    }
  }, [settings]);

  const currentSettings = localSettings || settings;

  const completedReferrals = referrals?.filter(r => r.status === 'completed' || r.status === 'rewarded').length || 0;
  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
  const totalCreditsGiven = referrals
    ?.filter(r => r.status === 'completed' || r.status === 'rewarded')
    .reduce((acc, r) => acc + (r.referrer_reward_cents || 0) + (r.referred_reward_cents || 0), 0) || 0;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveSettings = async () => {
    if (!currentSettings) return;
    
    try {
      await updateSettings.mutateAsync({
        enabled: currentSettings.enabled,
        referrer_reward_cents: currentSettings.referrer_reward_cents,
        referred_reward_cents: currentSettings.referred_reward_cents,
        min_order_value_cents: currentSettings.min_order_value_cents,
        max_referrals_per_month: currentSettings.max_referrals_per_month,
      });
      setLocalSettings(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  if (settingsLoading) {
    return (
      <DashboardLayout title="Programa de Indicação">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Programa de Indicação">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Share2 className="w-6 h-6 text-purple-500" />
              Programa de Indicação
            </h1>
            <p className="text-muted-foreground mt-1">
              Recompense clientes que indicam amigos
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-purple-500/50 bg-purple-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{completedReferrals}</p>
                  <p className="text-xs font-semibold">Indicações Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{pendingReferrals}</p>
                  <p className="text-xs font-semibold">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {(totalCreditsGiven / 100).toFixed(2)}
                  </p>
                  <p className="text-xs font-semibold">Créditos Distribuídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-blue-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{referralCodes?.length || 0}</p>
                  <p className="text-xs font-semibold">Códigos Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="referrals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="referrals" className="gap-2">
              <Users className="w-4 h-4" />
              Indicações
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-2">
              <Gift className="w-4 h-4" />
              Códigos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4 mt-4">
            {referrals?.length === 0 ? (
              <Alert>
                <Share2 className="w-4 h-4" />
                <AlertDescription>
                  Nenhuma indicação registrada ainda. Quando seus clientes indicarem amigos, as indicações aparecerão aqui.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {referrals?.map(referral => (
                  <Card key={referral.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {(referral.referrer as any)?.name || 'Cliente'} → {(referral.referred as any)?.name || 'Novo Cliente'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(referral.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={referral.status === 'completed' || referral.status === 'rewarded' ? 'default' : 'secondary'}>
                          {referral.status === 'completed' || referral.status === 'rewarded' ? '✓ Concluída' : 'Pendente'}
                        </Badge>
                      </div>
                      {(referral.status === 'completed' || referral.status === 'rewarded') && (
                        <div className="mt-2 text-sm text-emerald-500">
                          Créditos: R$ {((referral.referrer_reward_cents || 0) / 100).toFixed(2)} + R$ {((referral.referred_reward_cents || 0) / 100).toFixed(2)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Codes Tab */}
          <TabsContent value="codes" className="space-y-4 mt-4">
            {referralCodes?.length === 0 ? (
              <Alert>
                <Gift className="w-4 h-4" />
                <AlertDescription>
                  Nenhum código de indicação gerado. Os códigos são criados automaticamente para cada cliente.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {referralCodes?.map(code => (
                  <Card key={code.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-lg font-bold">{code.code}</p>
                          <p className="text-sm text-muted-foreground">
                            {(code.customer as any)?.name || 'Cliente'} - {code.total_referrals} indicação(ões)
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(code.code)}
                        >
                          {copied === code.code ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Programa</CardTitle>
                <CardDescription>
                  Defina as regras e recompensas do programa de indicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enabled">Programa Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar ou desativar o programa de indicação
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={currentSettings?.enabled || false}
                    onCheckedChange={(checked) => 
                      setLocalSettings({ ...currentSettings, enabled: checked })
                    }
                  />
                </div>

                {/* Credits Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Crédito para quem indica (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(currentSettings?.referrer_reward_cents || 0) / 100}
                      onChange={(e) => 
                        setLocalSettings({ 
                          ...currentSettings, 
                          referrer_reward_cents: Math.round(parseFloat(e.target.value || '0') * 100) 
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Crédito para quem foi indicado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(currentSettings?.referred_reward_cents || 0) / 100}
                      onChange={(e) => 
                        setLocalSettings({ 
                          ...currentSettings, 
                          referred_reward_cents: Math.round(parseFloat(e.target.value || '0') * 100) 
                        })
                      }
                    />
                  </div>
                </div>

                {/* Min Order & Max Referrals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pedido mínimo para validar indicação (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(currentSettings?.min_order_value_cents || 0) / 100}
                      onChange={(e) => 
                        setLocalSettings({ 
                          ...currentSettings, 
                          min_order_value_cents: Math.round(parseFloat(e.target.value || '0') * 100) 
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máximo de indicações por mês</Label>
                    <Input
                      type="number"
                      value={currentSettings?.max_referrals_per_month || 10}
                      onChange={(e) => 
                        setLocalSettings({ 
                          ...currentSettings, 
                          max_referrals_per_month: parseInt(e.target.value || '10') 
                        })
                      }
                    />
                  </div>
                </div>

                {localSettings && (
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  >
                    {updateSettings.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Salvar Configurações
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
