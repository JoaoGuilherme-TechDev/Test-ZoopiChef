import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  XCircle,
  HelpCircle,
  ShoppingCart
} from "lucide-react";
import { SuggestionConversation } from "@/hooks/useAIBehaviorAnalysis";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationsListProps {
  conversations: (SuggestionConversation & { customers?: { name: string; whatsapp: string } })[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  initial: { 
    label: 'Enviada', 
    icon: <MessageSquare className="h-4 w-4" />, 
    variant: 'default'
  },
  awaiting_choice: { 
    label: 'Aguardando Escolha', 
    icon: <Clock className="h-4 w-4" />, 
    variant: 'secondary'
  },
  awaiting_confirmation: { 
    label: 'Aguardando Confirmação', 
    icon: <HelpCircle className="h-4 w-4" />, 
    variant: 'secondary'
  },
  rejected_asking_preferences: { 
    label: 'Coletando Preferências', 
    icon: <MessageSquare className="h-4 w-4" />, 
    variant: 'outline'
  },
  completed: { 
    label: 'Concluída', 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    variant: 'default'
  },
  expired: { 
    label: 'Expirada', 
    icon: <XCircle className="h-4 w-4" />, 
    variant: 'destructive'
  },
};

export function ConversationsList({ conversations, isLoading }: ConversationsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conversa de sugestão ainda.</p>
            <p className="text-sm">Envie sugestões para iniciar conversas com clientes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversas Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {conversations.map((conv) => {
              const state = conv.conversation_state || 'initial';
              const status = statusConfig[state] || statusConfig.initial;
              
              return (
                <Card key={conv.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {(conv as any).customers?.name || 'Cliente'}
                          </span>
                          <Badge variant={status.variant} className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                          {conv.confirmed && conv.created_order_id && (
                            <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary">
                              <ShoppingCart className="h-3 w-3" />
                              Pedido Criado
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {(conv as any).customers?.whatsapp || '-'}
                        </p>

                        {/* Sugestões */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {conv.suggestion_1 && (
                            <div className={`p-2 rounded border text-sm ${conv.chosen_suggestion === 1 ? 'border-primary bg-primary/10' : ''}`}>
                              <span className="font-medium">Opção 1:</span>
                              <p className="text-xs text-muted-foreground">
                                {conv.suggestion_1.name || 'Sugestão Tradicional'}
                              </p>
                            </div>
                          )}
                          {conv.suggestion_2 && (
                            <div className={`p-2 rounded border text-sm ${conv.chosen_suggestion === 2 ? 'border-primary bg-primary/10' : ''}`}>
                              <span className="font-medium">Opção 2:</span>
                              <p className="text-xs text-muted-foreground">
                                {conv.suggestion_2.name || 'Sugestão Novidade'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Preferências coletadas */}
                        {conv.collected_preferences && Object.keys(conv.collected_preferences).length > 0 && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <span className="font-medium">Preferências coletadas:</span>
                            <p className="text-muted-foreground">
                              {JSON.stringify(conv.collected_preferences)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-xs text-muted-foreground">
                        {conv.created_at && (
                          <p>
                            {formatDistanceToNow(new Date(conv.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        )}
                        {conv.expires_at && (
                          <p className="mt-1">
                            Expira: {format(new Date(conv.expires_at), "HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
