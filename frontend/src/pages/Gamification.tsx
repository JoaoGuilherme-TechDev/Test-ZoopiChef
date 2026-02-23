import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy,
  Star,
  Medal,
  Target,
  Users,
  Flame,
  Crown,
  Sparkles,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import {
  useCustomerLevels,
  useAchievements,
  useChallenges,
  useGamificationStats,
} from '@/hooks/useGamification';
import { useAutoSetupGamification } from '@/hooks/useAIGamification';
import { format } from 'date-fns';
import { toast } from 'sonner';

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'from-amber-700 to-amber-500',
  silver: 'from-gray-400 to-gray-300',
  gold: 'from-yellow-500 to-yellow-300',
  platinum: 'from-cyan-400 to-cyan-200',
  diamond: 'from-purple-500 to-pink-400',
};

const LEVEL_ICONS: Record<string, any> = {
  bronze: Medal,
  silver: Star,
  gold: Trophy,
  platinum: Crown,
  diamond: Sparkles,
};

export default function Gamification() {
  const { data: levels, isLoading: levelsLoading } = useCustomerLevels();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { data: challenges, isLoading: challengesLoading } = useChallenges();
  const { data: stats, isLoading: statsLoading } = useGamificationStats();
  const autoSetup = useAutoSetupGamification();

  const activeChallenges = challenges?.filter(c => c.is_active) || [];
  const activeAchievements = achievements?.filter(a => a.is_active) || [];

  if (levelsLoading || achievementsLoading) {
    return (
      <DashboardLayout title="Gamificação">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gamificação">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Gamificação
            </h1>
            <p className="text-muted-foreground mt-1">
              Níveis VIP, conquistas e desafios para engajar seus clientes
            </p>
          </div>
          {(!levels || levels.length === 0) && (
            <Button 
              onClick={() => autoSetup.mutate()}
              disabled={autoSetup.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {autoSetup.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Configurar com IA
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{levels?.length || 0}</p>
                  <p className="text-xs font-semibold">Níveis VIP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/50 bg-purple-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{activeAchievements.length}</p>
                  <p className="text-xs font-semibold">Conquistas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{activeChallenges.length}</p>
                  <p className="text-xs font-semibold">Desafios Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{stats?.totalCustomersGamified || 0}</p>
                  <p className="text-xs font-semibold">Clientes Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="levels" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="levels" className="gap-2">
              <Crown className="w-4 h-4" />
              Níveis
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Medal className="w-4 h-4" />
              Conquistas
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-2">
              <Target className="w-4 h-4" />
              Desafios
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="w-4 h-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          {/* Levels Tab */}
          <TabsContent value="levels" className="space-y-4 mt-4">
            {levels?.length === 0 ? (
              <Alert>
                <Crown className="w-4 h-4" />
                <AlertDescription>
                  Nenhum nível VIP configurado. Configure os níveis para começar a recompensar seus melhores clientes.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {levels?.map(level => {
                  const Icon = LEVEL_ICONS[level.name.toLowerCase()] || Star;
                  const gradient = LEVEL_COLORS[level.name.toLowerCase()] || 'from-gray-500 to-gray-400';
                  
                  return (
                    <Card key={level.id} className="overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{level.name}</CardTitle>
                            <CardDescription>
                              A partir de {level.min_points} pontos
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Multiplicador</span>
                            <span className="font-semibold">{level.multiplier}x</span>
                          </div>
                          {level.benefits && Array.isArray(level.benefits) && level.benefits.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Benefícios:</p>
                              <p className="text-sm">{level.benefits.map(b => String(b)).join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4 mt-4">
            {achievements?.length === 0 ? (
              <Alert>
                <Medal className="w-4 h-4" />
                <AlertDescription>
                  Nenhuma conquista configurada. Crie conquistas para motivar seus clientes.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements?.map(achievement => (
                  <Card key={achievement.id} className={!achievement.is_active ? 'opacity-50' : ''}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                          {achievement.icon || '🏆'}
                        </div>
                        <div>
                          <CardTitle className="text-base">{achievement.name}</CardTitle>
                          <CardDescription>{achievement.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">
                          {achievement.requirement_type}: {achievement.requirement_value}
                        </Badge>
                        <span className="text-emerald-500 font-semibold">
                          +{achievement.points_reward} pts
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-4 mt-4">
            {challenges?.length === 0 ? (
              <Alert>
                <Target className="w-4 h-4" />
                <AlertDescription>
                  Nenhum desafio ativo. Crie desafios temporários para engajar seus clientes.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {challenges?.map(challenge => {
                  const startDate = new Date(challenge.start_date);
                  const endDate = new Date(challenge.end_date);
                  const now = new Date();
                  const isActive = now >= startDate && now <= endDate;
                  
                  return (
                    <Card key={challenge.id} className={!isActive ? 'opacity-50' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                              <Flame className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{challenge.title}</CardTitle>
                              <CardDescription>{challenge.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Meta: {challenge.target_value} {challenge.challenge_type}
                            </span>
                            <span className="text-muted-foreground">
                              {format(startDate, 'dd/MM')} - {format(endDate, 'dd/MM')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {challenge.points_reward && (
                              <Badge variant="outline" className="text-emerald-500">
                                +{challenge.points_reward} pts
                              </Badge>
                            )}
                            {challenge.credit_reward_cents && (
                              <Badge variant="outline" className="text-blue-500">
                                +R$ {(challenge.credit_reward_cents / 100).toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Gamificação</CardTitle>
                <CardDescription>Resumo do engajamento dos clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-emerald-500">{stats?.totalAchievementsUnlocked || 0}</p>
                    <p className="text-sm text-muted-foreground">Conquistas Desbloqueadas</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-purple-500">{stats?.totalChallengesCompleted || 0}</p>
                    <p className="text-sm text-muted-foreground">Desafios Completados</p>
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
