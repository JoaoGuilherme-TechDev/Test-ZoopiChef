import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useVirtualCard } from '@/hooks/useVirtualCard';
import { CreditCard, Gift, Star, Send, Phone, RefreshCw, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VirtualCardData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  currentPoints: number;
  totalEarned: number;
  levelName: string;
  levelColor: string;
}

interface VirtualCardDisplayProps {
  cardData: VirtualCardData;
}

function VirtualCardDisplay({ cardData }: VirtualCardDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Card Visual */}
      <div 
        className="relative p-6 rounded-2xl text-white overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${cardData.levelColor} 0%, ${cardData.levelColor}aa 100%)` 
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              <span className="font-semibold">Cartão Fidelidade</span>
            </div>
            <Badge className="bg-white/20 text-white border-0">
              <Star className="h-3 w-3 mr-1" />
              {cardData.levelName}
            </Badge>
          </div>

          <div className="mb-4">
            <p className="text-white/80 text-sm">Cliente</p>
            <p className="text-xl font-bold">{cardData.customerName}</p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/80 text-sm">Pontos Atuais</p>
              <p className="text-3xl font-bold">{cardData.currentPoints.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">Total Acumulado</p>
              <p className="text-lg">{cardData.totalEarned.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VirtualCardViewer() {
  const { getCustomerCardData, createCardRequest, requests, stats } = useVirtualCard();
  const [customerId, setCustomerId] = useState('');
  const [cardData, setCardData] = useState<VirtualCardData | null>(null);

  const handleSearch = async () => {
    if (!customerId.trim()) {
      toast.error('Digite o ID do cliente');
      return;
    }

    try {
      const data = await getCustomerCardData.mutateAsync(customerId);
      setCardData(data);
    } catch (error) {
      toast.error('Cliente não encontrado');
      setCardData(null);
    }
  };

  const handleSendViaWhatsApp = async () => {
    if (!cardData) return;

    try {
      await createCardRequest.mutateAsync({
        customer_id: cardData.customerId,
        customer_phone: cardData.customerPhone,
      });
      toast.success('Cartão enviado via WhatsApp');
    } catch (error) {
      toast.error('Erro ao enviar cartão');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Solicitações</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entregues</p>
                <p className="text-2xl font-bold text-green-600">{stats.deliveredRequests}</p>
              </div>
              <Send className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingRequests}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Visualizar Cartão Virtual
          </CardTitle>
          <CardDescription>
            Busque um cliente para visualizar seu cartão de fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="ID do Cliente"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={getCustomerCardData.isPending}>
              {getCustomerCardData.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Buscar'
              )}
            </Button>
          </div>

          {cardData && (
            <>
              <VirtualCardDisplay cardData={cardData} />
              
              {cardData.customerPhone && (
                <Button 
                  onClick={handleSendViaWhatsApp}
                  disabled={createCardRequest.isPending}
                  className="w-full"
                  variant="outline"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Enviar via WhatsApp
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Requests */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solicitações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.slice(0, 10).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{request.customer_phone}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant={request.delivery_status === 'delivered' ? 'default' : 'secondary'}>
                    {request.delivery_status === 'delivered' ? 'Entregue' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}