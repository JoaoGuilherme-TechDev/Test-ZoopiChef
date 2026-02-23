import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bot,
  MessageSquare,
  Settings,
  Users,
  Clock,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  useChatbotSettings,
  useUpdateChatbotSettings,
  useChatbotSessions,
} from '@/hooks/useChatbot';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChatbotSettings() {
  const { data: settings, isLoading: settingsLoading } = useChatbotSettings();
  const { data: sessions, isLoading: sessionsLoading } = useChatbotSessions();
  const updateSettings = useUpdateChatbotSettings();

  const [localSettings, setLocalSettings] = useState<any>(null);

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const currentSettings = localSettings || settings;

  const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
  const escalatedSessions = sessions?.filter(s => s.escalated_to_human).length || 0;
  const totalMessages = sessions?.reduce((acc, s) => acc + (s.messages_count || 0), 0) || 0;

  const handleSave = async () => {
    if (!localSettings) return;
    
    try {
      await updateSettings.mutateAsync(localSettings);
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  if (settingsLoading) {
    return (
      <DashboardLayout title="Chatbot IA">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Chatbot IA">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-500" />
              Chatbot IA WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              Atendimento automático 24h via WhatsApp com inteligência artificial
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-blue-500/50 bg-blue-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{activeSessions}</p>
                  <p className="text-xs font-semibold">Sessões Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{totalMessages}</p>
                  <p className="text-xs font-semibold">Mensagens Trocadas</p>
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
                  <p className="text-2xl font-bold text-amber-400">{escalatedSessions}</p>
                  <p className="text-xs font-semibold">Escaladas p/ Humano</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/50 bg-purple-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{sessions?.length || 0}</p>
                  <p className="text-xs font-semibold">Total Sessões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Sessões Recentes
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Chatbot</CardTitle>
                <CardDescription>
                  Configure o comportamento e personalidade do chatbot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enabled">Chatbot Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar ou desativar o chatbot automático
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

                {/* Greeting Message */}
                <div className="space-y-2">
                  <Label>Mensagem de Boas-Vindas</Label>
                  <Textarea
                    value={currentSettings?.greeting_message || ''}
                    onChange={(e) => 
                      setLocalSettings({ ...currentSettings, greeting_message: e.target.value })
                    }
                    placeholder="Olá! 👋 Como posso ajudar?"
                    rows={3}
                  />
                </div>

                {/* Fallback Message */}
                <div className="space-y-2">
                  <Label>Mensagem de Fallback</Label>
                  <Textarea
                    value={currentSettings?.fallback_message || ''}
                    onChange={(e) => 
                      setLocalSettings({ ...currentSettings, fallback_message: e.target.value })
                    }
                    placeholder="Desculpe, não entendi. Posso ajudar de outra forma?"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mensagem exibida quando o bot não consegue entender o cliente
                  </p>
                </div>

                {/* Personality Prompt */}
                <div className="space-y-2">
                  <Label>Personalidade do Bot (Prompt)</Label>
                  <Textarea
                    value={currentSettings?.personality_prompt || ''}
                    onChange={(e) => 
                      setLocalSettings({ ...currentSettings, personality_prompt: e.target.value })
                    }
                    placeholder="Você é um assistente amigável e prestativo..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defina a personalidade e comportamento do bot
                  </p>
                </div>

                {/* Max Turns */}
                <div className="space-y-2">
                  <Label>Máximo de turnos antes de escalar</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={currentSettings?.max_turns_before_escalate || 10}
                    onChange={(e) => 
                      setLocalSettings({ 
                        ...currentSettings, 
                        max_turns_before_escalate: parseInt(e.target.value) 
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Após esse número de mensagens, o bot escala para atendimento humano
                  </p>
                </div>

                {/* Escalate Keywords */}
                <div className="space-y-2">
                  <Label>Palavras-chave para escalar</Label>
                  <Input
                    value={(currentSettings?.auto_escalate_keywords || []).join(', ')}
                    onChange={(e) => 
                      setLocalSettings({ 
                        ...currentSettings, 
                        auto_escalate_keywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                      })
                    }
                    placeholder="atendente, humano, pessoa, gerente"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separadas por vírgula. Quando o cliente usa essas palavras, escala imediatamente.
                  </p>
                </div>

                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário de Início</Label>
                    <Input
                      type="time"
                      value={currentSettings?.operating_hours_start || '08:00'}
                      onChange={(e) => 
                        setLocalSettings({ ...currentSettings, operating_hours_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário de Fim</Label>
                    <Input
                      type="time"
                      value={currentSettings?.operating_hours_end || '22:00'}
                      onChange={(e) => 
                        setLocalSettings({ ...currentSettings, operating_hours_end: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={updateSettings.isPending}
                  className="w-full"
                >
                  {updateSettings.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4 mt-4">
            {sessions?.length === 0 ? (
              <Alert>
                <MessageSquare className="w-4 h-4" />
                <AlertDescription>
                  Nenhuma sessão de chat registrada. Quando clientes conversarem com o bot, as sessões aparecerão aqui.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {sessions?.slice(0, 20).map(session => (
                  <Card key={session.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            session.status === 'active' ? 'bg-emerald-500/20' : 'bg-muted'
                          }`}>
                            <MessageSquare className={`w-5 h-5 ${
                              session.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {session.customer_name || session.customer_phone}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {session.messages_count} mensagens • {formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.escalated_to_human && (
                            <Badge variant="outline" className="text-amber-500">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Escalada
                            </Badge>
                          )}
                          <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                            {session.status === 'active' ? 'Ativa' : 
                             session.status === 'waiting_human' ? 'Aguardando' : 'Fechada'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
