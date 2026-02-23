import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDelivererRankingsFromOrders } from '@/hooks/useDelivererRankingsFromOrders';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { Trophy, Medal, RefreshCw, Clock, CheckCircle, XCircle, TrendingUp, Settings2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DelivererRankings() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();

  const { rankings, isLoading } = useDelivererRankingsFromOrders(period);

  const currentConfig = useMemo(() => {
    const cfg = ((company as any)?.feature_flags as any)?.deliverer_ranking ?? {};
    return {
      bonusTop1Cents: Number(cfg.bonusTop1Cents ?? 2000),
      bonusTop2Cents: Number(cfg.bonusTop2Cents ?? 1000),
      bonusTop3Cents: Number(cfg.bonusTop3Cents ?? 500),
      onTimeThresholdMinutes: Number(cfg.onTimeThresholdMinutes ?? 45),
    };
  }, [company]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bonusTop1, setBonusTop1] = useState(String(currentConfig.bonusTop1Cents / 100));
  const [bonusTop2, setBonusTop2] = useState(String(currentConfig.bonusTop2Cents / 100));
  const [bonusTop3, setBonusTop3] = useState(String(currentConfig.bonusTop3Cents / 100));
  const [onTimeThreshold, setOnTimeThreshold] = useState(String(currentConfig.onTimeThresholdMinutes));

  const syncFromConfig = () => {
    setBonusTop1(String(currentConfig.bonusTop1Cents / 100));
    setBonusTop2(String(currentConfig.bonusTop2Cents / 100));
    setBonusTop3(String(currentConfig.bonusTop3Cents / 100));
    setOnTimeThreshold(String(currentConfig.onTimeThresholdMinutes));
  };

  const handleRecalculate = async () => {
    toast.info('Rankings são calculados automaticamente a partir dos pedidos');
  };

  const handleSaveSettings = async () => {
    if (!company?.id) {
      toast.error('Empresa não carregada');
      return;
    }

    const toCents = (v: string) => Math.max(0, Math.round(Number(String(v).replace(',', '.')) * 100));
    const next = {
      bonusTop1Cents: toCents(bonusTop1),
      bonusTop2Cents: toCents(bonusTop2),
      bonusTop3Cents: toCents(bonusTop3),
      onTimeThresholdMinutes: Math.max(1, Math.round(Number(onTimeThreshold) || 45)),
    };

    const currentFlags = ((company as any).feature_flags as any) ?? {};

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        feature_flags: {
          ...currentFlags,
          deliverer_ranking: next,
        },
      });
      toast.success('Configurações de bônus salvas');
      setSettingsOpen(false);
    } catch (e: any) {
      toast.error(e?.message ? `Erro ao salvar: ${e.message}` : 'Erro ao salvar');
    }
  };

  const formatCurrency = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Ranking de Entregadores
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe a performance e premie os melhores entregadores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={(open) => {
              setSettingsOpen(open);
              if (open) syncFromConfig();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {}}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Configurar bônus
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar bônus do ranking</DialogTitle>
                  <DialogDescription>
                    Defina os bônus do Top 1/2/3 e o limite (min) para contar como "no prazo".
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bônus Top 1 (R$)</Label>
                    <Input value={bonusTop1} onChange={(e) => setBonusTop1(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bônus Top 2 (R$)</Label>
                    <Input value={bonusTop2} onChange={(e) => setBonusTop2(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bônus Top 3 (R$)</Label>
                    <Input value={bonusTop3} onChange={(e) => setBonusTop3(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>No prazo até (min)</Label>
                    <Input value={onTimeThreshold} onChange={(e) => setOnTimeThreshold(e.target.value)} inputMode="numeric" />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveSettings} disabled={updateCompany.isPending}>
                    {updateCompany.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={handleRecalculate} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">Última Semana</TabsTrigger>
            <TabsTrigger value="month">Último Mês</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : rankings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma entrega registrada no período</p>
                  <p className="text-sm mt-1">Os rankings são calculados a partir das entregas concluídas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Top 3 Highlight */}
                {rankings.length >= 3 && (
                  <div className="grid gap-4 md:grid-cols-3 mb-8">
                    {rankings.slice(0, 3).map((r) => (
                      <Card key={r.deliverer_id} className={cn('border-2', getRankBg(r.rank))}>
                        <CardContent className="pt-6 text-center">
                          <div className="flex justify-center mb-3">
                            {getRankIcon(r.rank)}
                          </div>
                          <h3 className="font-bold text-lg">{r.deliverer_name}</h3>
                          <p className="text-2xl font-bold text-primary mt-2">{r.total_deliveries}</p>
                          <p className="text-sm text-muted-foreground">entregas</p>
                          <div className="flex justify-center gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-4 h-4" />
                              {r.on_time_rate}%
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {r.avg_time_minutes}min
                            </div>
                          </div>
                          {r.total_bonus_cents > 0 && (
                            <Badge variant="secondary" className="mt-4">
                              Bônus: {formatCurrency(r.total_bonus_cents)}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Full Rankings Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Ranking Completo
                    </CardTitle>
                    <CardDescription>
                      Ordenado por taxa de pontualidade e quantidade de entregas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {rankings.map((r) => (
                        <div 
                          key={r.deliverer_id}
                          className={cn(
                            'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                            getRankBg(r.rank)
                          )}
                        >
                          <div className="flex items-center justify-center w-10">
                            {getRankIcon(r.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{r.deliverer_name}</p>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {r.total_on_time} no prazo
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                {r.total_delayed} atrasadas
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{r.total_deliveries}</p>
                            <p className="text-xs text-muted-foreground">entregas</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={r.on_time_rate >= 80 ? "default" : r.on_time_rate >= 60 ? "secondary" : "destructive"}>
                              {r.on_time_rate}%
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{r.avg_time_minutes}min média</p>
                          </div>
                          {r.total_bonus_cents > 0 && (
                            <div className="text-right">
                              <p className="font-bold text-green-500">{formatCurrency(r.total_bonus_cents)}</p>
                              <p className="text-xs text-muted-foreground">bônus</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
