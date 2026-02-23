import { useInternalMessages } from '@/hooks/useInternalMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function KDSMessageOverlay() {
  const { messages, markAsRead } = useInternalMessages('kds');

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch (error) {
      toast.error('Erro ao marcar mensagem');
    }
  };

  // Verifica preferências
  const prefs = getNotificationPreferences();
  if (!prefs.internalMessagesEnabled) return null;

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
      {messages.map((msg) => (
        <Card
          key={msg.id}
          className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50 shadow-lg animate-in slide-in-from-right-5"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <MessageSquare className="w-5 h-5" />
              <Badge variant="outline" className="bg-orange-600 text-white border-orange-600">
                Mensagem do Caixa
              </Badge>
              </div>
            </div>

            <p className="mt-3 text-lg font-semibold text-orange-900 dark:text-orange-100">{msg.message}</p>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{msg.sender_name}</span>
                <Clock className="w-3 h-3 ml-2" />
                <span>
                  {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => handleMarkAsRead(msg.id)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Lido
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
