import { useState } from 'react';
import { useInternalMessages, TargetType } from '@/hooks/useInternalMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  CheckCircle,
  User,
  Clock,
  Send,
  ChefHat,
  Printer,
  Radio,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function WaiterMessagePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');

  const { messages, sendMessage, markAsRead } = useInternalMessages('waiter');

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    try {
      await sendMessage.mutateAsync({
        message: message.trim(),
        target_type: targetType,
      });
      toast.success('Mensagem enviada!');
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch (error) {
      toast.error('Erro ao marcar mensagem');
    }
  };

  return (
    <div className="space-y-4">
      {/* Incoming Messages */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagens Recebidas
          </h3>
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className="border-2 border-green-500 bg-green-50 dark:bg-green-950/50"
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-300 text-xs">
                    Mensagem do Caixa
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkAsRead(msg.id)}
                    className="h-7 text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Lido
                  </Button>
                </div>
                <p className="mt-2 font-medium">{msg.message}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <User className="w-3 h-3" />
                  <span>{msg.sender_name}</span>
                  <Clock className="w-3 h-3 ml-1" />
                  <span>{format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send Message Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Enviar Mensagem
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Destino</Label>
              <RadioGroup
                value={targetType}
                onValueChange={(v) => setTargetType(v as TargetType)}
                className="grid grid-cols-1 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="all" id="w-all" />
                  <Label htmlFor="w-all" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Radio className="w-4 h-4 text-primary" />
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="kds" id="w-kds" />
                  <Label htmlFor="w-kds" className="flex items-center gap-2 cursor-pointer text-sm">
                    <ChefHat className="w-4 h-4 text-orange-500" />
                    KDS Cozinha
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="printer" id="w-printer" />
                  <Label htmlFor="w-printer" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Printer className="w-4 h-4 text-blue-500" />
                    Impressoras
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
