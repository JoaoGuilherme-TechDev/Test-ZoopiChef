import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useInternalMessages, TargetType } from '@/hooks/useInternalMessages';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import { toast } from 'sonner';
import { Send, ChefHat, Printer, Users, Radio, Clock, User, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InternalMessages() {
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const { messages, sendMessage, markAsRead, isLoading } = useInternalMessages();
  const { activeSectors } = usePrintSectors();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    try {
      await sendMessage.mutateAsync({
        message: message.trim(),
        target_type: targetType,
        target_sector_id: selectedSector !== 'all' ? selectedSector : null,
      });
      toast.success('Mensagem enviada!');
      setMessage('');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
      toast.success('Mensagem marcada como lida');
    } catch (error) {
      toast.error('Erro ao marcar mensagem');
    }
  };

  const getTargetIcon = (type: TargetType) => {
    switch (type) {
      case 'kds':
        return <ChefHat className="w-4 h-4" />;
      case 'printer':
        return <Printer className="w-4 h-4" />;
      case 'waiter':
        return <Users className="w-4 h-4" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  const getTargetLabel = (type: TargetType) => {
    switch (type) {
      case 'kds':
        return 'KDS Cozinha';
      case 'printer':
        return 'Impressoras';
      case 'waiter':
        return 'Garçons';
      default:
        return 'Todos';
    }
  };

  return (
    <DashboardLayout title="Mensagens Internas">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Message Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Nova Mensagem
            </CardTitle>
            <CardDescription>
              Envie uma mensagem para a equipe de produção ou atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-3">
              <Label>Destino</Label>
              <RadioGroup
                value={targetType}
                onValueChange={(v) => setTargetType(v as TargetType)}
                className="grid grid-cols-2 gap-3"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                    <Radio className="w-4 h-4 text-primary" />
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="kds" id="kds" />
                  <Label htmlFor="kds" className="flex items-center gap-2 cursor-pointer">
                    <ChefHat className="w-4 h-4 text-orange-500" />
                    KDS Cozinha
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="printer" id="printer" />
                  <Label htmlFor="printer" className="flex items-center gap-2 cursor-pointer">
                    <Printer className="w-4 h-4 text-blue-500" />
                    Impressoras
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="waiter" id="waiter" />
                  <Label htmlFor="waiter" className="flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4 text-green-500" />
                    Garçons
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {(targetType === 'printer' || targetType === 'kds') && activeSectors.length > 0 && (
              <div className="space-y-2">
                <Label>Setor (opcional)</Label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {activeSectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sector.color }}
                          />
                          {sector.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMessage.isPending ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Messages Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Mensagens Pendentes
            </CardTitle>
            <CardDescription>
              Mensagens que ainda não foram lidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem pendente
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="border rounded-lg p-4 space-y-2 bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTargetIcon(msg.target_type)}
                          {getTargetLabel(msg.target_type)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(msg.id)}
                        disabled={markAsRead.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Lido
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{msg.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{msg.sender_name}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(msg.created_at), "HH:mm 'de' dd/MM", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
