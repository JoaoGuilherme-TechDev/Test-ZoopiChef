import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, User, Bot, Bell, BellOff, Clock, CheckCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSession {
  id: string;
  session_token: string;
  company_id: string;
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
  customer_id?: string | null;
  started_at?: string | null;
  last_message_at?: string | null;
  has_unread?: boolean;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function ChatMonitor() {
  const { data: company } = useCompany();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch sessions
  const fetchSessions = async () => {
    if (!company?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('public_chat_sessions')
        .select('*')
        .eq('company_id', company.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const sessionsData = (data || []) as ChatSession[];
      setSessions(sessionsData);
      setUnreadCount(sessionsData.filter((s) => s.has_unread === true).length);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected session
  const fetchMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('public_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);

      // Marcar como lido (usando updated_at como marcador)
      await supabase
        .from('public_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Atualizar localmente
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, has_unread: false } : s
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [company?.id]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);
    }
  }, [selectedSession?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('chat-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'public_chat_sessions',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          console.log('Session update:', payload);
          fetchSessions();
          
          if (payload.eventType === 'UPDATE' && (payload.new as any).has_unread && notificationsEnabled) {
            // Tocar som de notificação
            playNotificationSound();
            toast.info('Nova mensagem no chat!', {
              description: 'Um cliente enviou uma mensagem.',
              action: {
                label: 'Ver',
                onClick: () => setSelectedSession(payload.new as ChatSession),
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'public_chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (selectedSession && newMessage.session_id === selectedSession.id) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, selectedSession?.id, notificationsEnabled]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: usar Web Audio API
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      });
    } catch (e) {
      console.log('Could not play notification sound');
    }
  };

  const getSessionLabel = (session: ChatSession) => {
    const date = session.last_message_at || session.updated_at || session.created_at;
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  if (loading) {
    return (
      <DashboardLayout title="Monitor de Chats">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Monitor de Chats">
      <div className="space-y-6">
        {/* Header com alertas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Conversas Ativas</h2>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSessions}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setNotificationsEnabled(!notificationsEnabled);
                toast.success(notificationsEnabled ? 'Notificações desativadas' : 'Notificações ativadas');
              }}
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 mr-2" />
              ) : (
                <BellOff className="h-4 w-4 mr-2" />
              )}
              {notificationsEnabled ? 'Alertas ON' : 'Alertas OFF'}
            </Button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Nenhuma conversa ainda</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                As conversas do chat público aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
            {/* Lista de sessões */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sessões ({sessions.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="space-y-1 p-2">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedSession?.id === session.id
                            ? 'bg-primary text-primary-foreground'
                            : session.has_unread
                            ? 'bg-primary/10 hover:bg-primary/20'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              Visitante #{session.session_token?.slice(-6) || session.id.slice(-6)}
                            </span>
                          </div>
                          {session.has_unread && selectedSession?.id !== session.id && (
                            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                          <Clock className="h-3 w-3" />
                          {getSessionLabel(session)}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Área de mensagens */}
            <Card className="lg:col-span-2">
              {selectedSession ? (
                <>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Conversa #{selectedSession.session_token?.slice(-6) || selectedSession.id.slice(-6)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Iniciada em {format(new Date(selectedSession.started_at || selectedSession.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {!selectedSession.has_unread && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCheck className="h-3 w-3" />
                          Lida
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-420px)]">
                      <div className="space-y-4 p-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-2 ${
                              msg.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.role === 'user' ? (
                                <User className="w-4 h-4" />
                              ) : (
                                <Bot className="w-4 h-4" />
                              )}
                            </div>
                            <div
                              className={`max-w-[80%] p-3 rounded-2xl ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.role === 'user' ? 'opacity-70' : 'text-muted-foreground'
                              }`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center h-full py-16">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Selecione uma conversa para visualizar
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
