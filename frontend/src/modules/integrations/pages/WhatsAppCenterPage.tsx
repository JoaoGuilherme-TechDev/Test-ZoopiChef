import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useWhatsAppIntegration } from '../hooks/useWhatsAppIntegration';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function WhatsAppCenterPage() {
  const { messages, isConfigured, sendMessage, isLoading } = useWhatsAppIntegration();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('');

  const handleSend = async () => {
    if (!phone || !message) return;
    
    await sendMessage.mutateAsync({
      phone,
      message,
      customerName: customerName || undefined,
    });
    
    setPhone('');
    setMessage('');
    setCustomerName('');
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Stats
  const totalMessages = messages.length;
  const sentMessages = messages.filter(m => m.status === 'sent' || m.status === 'delivered').length;
  const pendingMessages = messages.filter(m => m.status === 'pending').length;
  const failedMessages = messages.filter(m => m.status === 'failed').length;

  if (!isConfigured) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <MessageSquare className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">WhatsApp não configurado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Configure sua integração com WhatsApp Business para enviar mensagens aos clientes.
          </p>
          <Button asChild>
            <Link to="/settings/integrations">
              <Settings className="w-4 h-4 mr-2" />
              Configurar WhatsApp
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Central WhatsApp</h1>
            <p className="text-muted-foreground">
              Envie mensagens e gerencie conversas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/campaigns">
                <Users className="w-4 h-4 mr-2" />
                Campanhas
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings/integrations">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMessages}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sentMessages}</p>
                  <p className="text-sm text-muted-foreground">Enviadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingMessages}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{failedMessages}</p>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Message Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="w-5 h-5" />
                Enviar Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Telefone</label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nome do Cliente (opcional)</label>
                <Input
                  placeholder="João Silva"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem</label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleSend}
                disabled={!phone || !message || sendMessage.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </CardContent>
          </Card>

          {/* Message History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma mensagem enviada ainda
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className="p-4 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium">{msg.customer_name}</span>
                          <span className="text-muted-foreground ml-2 text-sm">
                            {formatPhone(msg.customer_phone)}
                          </span>
                        </div>
                        <Badge 
                          variant={
                            msg.status === 'sent' || msg.status === 'delivered' 
                              ? 'default' 
                              : msg.status === 'pending' 
                                ? 'secondary' 
                                : 'destructive'
                          }
                        >
                          {msg.status === 'sent' && 'Enviada'}
                          {msg.status === 'delivered' && 'Entregue'}
                          {msg.status === 'read' && 'Lida'}
                          {msg.status === 'pending' && 'Pendente'}
                          {msg.status === 'failed' && 'Falhou'}
                        </Badge>
                      </div>
                      <p className="text-sm">{msg.message_text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(msg.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
