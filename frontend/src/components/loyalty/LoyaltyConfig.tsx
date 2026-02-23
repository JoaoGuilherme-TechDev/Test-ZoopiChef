import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useLoyalty } from '@/hooks/useLoyalty';
import { Settings, Bell, Brain, Cake, Gift, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LoyaltyConfig() {
  const { config, isLoading, updateConfig } = useLoyalty();

  const handleUpdate = async (updates: Record<string, any>) => {
    try {
      await updateConfig.mutateAsync(updates);
      toast.success('Configuração salva!');
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações Básicas */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Básicas
          </CardTitle>
          <CardDescription>Regras de pontuação e resgate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Programa Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Habilita o acúmulo de pontos em pedidos
              </p>
            </div>
            <Switch
              checked={config?.enabled || false}
              onCheckedChange={(enabled) => handleUpdate({ enabled })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pontos por Real</Label>
              <Input
                type="number"
                step="0.1"
                value={config?.points_per_real || 1}
                onChange={(e) => handleUpdate({ points_per_real: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1.0 = R$100 gera 100 pontos
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mínimo para Resgatar</Label>
              <Input
                type="number"
                value={config?.min_points_to_redeem || 100}
                onChange={(e) => handleUpdate({ min_points_to_redeem: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Pontos mínimos para trocar por recompensa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiração de Pontos */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Expiração de Pontos
          </CardTitle>
          <CardDescription>Configure quando os pontos expiram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dias para Expirar</Label>
              <Input
                type="number"
                value={config?.points_expiry_days || 365}
                onChange={(e) => handleUpdate({ points_expiry_days: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Após quantos dias os pontos expiram (0 = nunca)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Avisar com Antecedência (dias)</Label>
              <Input
                type="number"
                value={config?.notify_expiring_days || 7}
                onChange={(e) => handleUpdate({ notify_expiring_days: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Quantos dias antes avisar o cliente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notificações WhatsApp */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Automáticas (WhatsApp)
          </CardTitle>
          <CardDescription>Configure quais notificações enviar automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Pontos Ganhos</Label>
              <p className="text-sm text-muted-foreground">
                Avisar quando o cliente ganhar pontos em uma compra
              </p>
            </div>
            <Switch
              checked={config?.auto_notify_points_earned || false}
              onCheckedChange={(auto_notify_points_earned) => handleUpdate({ auto_notify_points_earned })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Pontos Prestes a Expirar</Label>
              <p className="text-sm text-muted-foreground">
                Avisar antes dos pontos expirarem
              </p>
            </div>
            <Switch
              checked={config?.notify_expiring_days > 0}
              onCheckedChange={(enabled) => handleUpdate({ notify_expiring_days: enabled ? 7 : 0 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bônus Especiais */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="w-5 h-5" />
            Bônus Especiais
          </CardTitle>
          <CardDescription>Pontos extras em ocasiões especiais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Bônus de Boas-Vindas</Label>
              <Input
                type="number"
                value={config?.welcome_bonus_points || 0}
                onChange={(e) => handleUpdate({ welcome_bonus_points: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Pontos ao se cadastrar (0 = sem bônus)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bônus de Aniversário</Label>
              <Input
                type="number"
                value={config?.birthday_bonus_points || 0}
                onChange={(e) => handleUpdate({ birthday_bonus_points: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Pontos no aniversário do cliente (0 = sem bônus)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inteligência Artificial */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Inteligência Artificial
          </CardTitle>
          <CardDescription>Use IA para personalizar mensagens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Personalizar Mensagens com IA</Label>
              <p className="text-sm text-muted-foreground">
                Mensagens personalizadas para cada cliente
              </p>
            </div>
            <Switch
              checked={config?.ai_personalize_messages || false}
              onCheckedChange={(ai_personalize_messages) => handleUpdate({ ai_personalize_messages })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Portal do Cliente */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Portal do Cliente (PWA)
          </CardTitle>
          <CardDescription>Área exclusiva para o cliente ver pontos e prêmios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar Portal</Label>
              <p className="text-sm text-muted-foreground">
                Clientes podem acessar seu saldo e histórico online
              </p>
            </div>
            <Switch
              checked={config?.customer_portal_enabled || false}
              onCheckedChange={(customer_portal_enabled) => handleUpdate({ customer_portal_enabled })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
