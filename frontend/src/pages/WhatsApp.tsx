import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWhatsAppConversations, useConversationMessages, useSendWhatsApp } from '@/hooks/useWhatsAppMessages';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Plus, User, Clock, Check, CheckCheck, X, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function WhatsApp() {
  const { data: conversations = [], isLoading } = useWhatsAppConversations();
  const { customers = [] } = useCustomers();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const { data: messages = [] } = useConversationMessages(selectedPhone);
  const sendWhatsApp = useSendWhatsApp();
  const [newMessage, setNewMessage] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedPhone || !newMessage.trim()) return;
    
    const customer = conversations.find(c => c.phone === selectedPhone);
    await sendWhatsApp.mutateAsync({
      phone: selectedPhone,
      message: newMessage.trim(),
      customerId: customer?.customerId || undefined,
    });
    setNewMessage('');
  };

  const handleNewChat = async () => {
    if (!newChatPhone || !newChatMessage.trim()) return;

    await sendWhatsApp.mutateAsync({
      phone: newChatPhone,
      message: newChatMessage.trim(),
      customerId: selectedCustomerId || undefined,
    });

    setIsNewChatOpen(false);
    setNewChatPhone('');
    setNewChatMessage('');
    setSelectedCustomerId('');
    setSelectedPhone(newChatPhone.replace(/\D/g, ''));
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setNewChatPhone(customer.whatsapp);
    }
  };

  const selectedConversation = conversations.find(c => c.phone === selectedPhone);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        {/* Conversations List */}
        <Card className="w-80 flex flex-col border-border/50">
          <CardHeader className="py-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-success" />
                Conversas
              </CardTitle>
              <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Mensagem</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Selecionar Cliente</Label>
                      <Select value={selectedCustomerId} onValueChange={handleSelectCustomer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ou digite o número abaixo" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.whatsapp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={newChatPhone}
                        onChange={(e) => setNewChatPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        rows={4}
                      />
                    </div>
                    <Button 
                      onClick={handleNewChat} 
                      className="w-full"
                      disabled={sendWhatsApp.isPending || !newChatPhone || !newChatMessage}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa</p>
                <p className="text-xs mt-1">Clique em + para iniciar</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.phone}
                    onClick={() => setSelectedPhone(conv.phone)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      selectedPhone === conv.phone
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-success" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {conv.customerName || conv.phone}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.isInbound ? '←' : '→'} {conv.lastMessage.slice(0, 30)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(conv.lastMessageAt), 'HH:mm', { locale: ptBR })}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="mt-1 text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col border-border/50">
          {selectedPhone ? (
            <>
              <CardHeader className="py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {selectedConversation?.customerName || selectedPhone}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedPhone}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.type === 'outbound' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          msg.type === 'outbound'
                            ? "bg-success text-success-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.message_text}
                        </p>
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          msg.type === 'outbound' ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-xs opacity-70">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                          {msg.type === 'outbound' && (
                            <span className="opacity-70">
                              {msg.status === 'sent' ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : msg.status === 'failed' ? (
                                <X className="w-3 h-3 text-destructive" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={sendWhatsApp.isPending}
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={sendWhatsApp.isPending || !newMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecione uma conversa</p>
                <p className="text-sm">Ou inicie uma nova clicando em +</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
