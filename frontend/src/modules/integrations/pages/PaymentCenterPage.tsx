import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  QrCode, 
  Receipt,
  CheckCircle, 
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  Settings,
  RefreshCw,
  Copy
} from 'lucide-react';
import { usePaymentIntegration } from '../hooks/usePaymentIntegration';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function PaymentCenterPage() {
  const { transactions, isConfigured, createPixPayment, isLoading } = usePaymentIntegration();
  const [pixAmount, setPixAmount] = useState('');
  const [pixDescription, setPixDescription] = useState('');
  const [generatedPix, setGeneratedPix] = useState<{
    code: string;
    qrcodeUrl: string;
  } | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(cents / 100);
  };

  const handleGeneratePix = async () => {
    const amountCents = Math.round(parseFloat(pixAmount.replace(',', '.')) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const result = await createPixPayment.mutateAsync({
      amountCents,
      paymentMethod: 'pix',
      description: pixDescription || 'Pagamento PIX',
    });

    setGeneratedPix({
      code: result.pixCode,
      qrcodeUrl: result.qrcodeUrl,
    });
  };

  const copyPixCode = () => {
    if (generatedPix?.code) {
      navigator.clipboard.writeText(generatedPix.code);
      toast.success('Código PIX copiado!');
    }
  };

  // Stats
  const totalTransactions = transactions.length;
  const approvedTransactions = transactions.filter(t => t.status === 'approved');
  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const totalApproved = approvedTransactions.reduce((sum, t) => sum + t.amount_cents, 0);

  if (!isConfigured) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <CreditCard className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Gateway de Pagamentos não configurado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Configure sua integração com um gateway de pagamentos para aceitar PIX, cartões e boletos.
          </p>
          <Button asChild>
            <Link to="/settings/integrations">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Pagamentos
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
            <h1 className="text-2xl font-bold">Central de Pagamentos</h1>
            <p className="text-muted-foreground">
              Gerencie cobranças e transações
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/settings/integrations">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                  <p className="text-sm text-muted-foreground">Transações</p>
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
                  <p className="text-2xl font-bold">{approvedTransactions.length}</p>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
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
                  <p className="text-2xl font-bold">{pendingTransactions.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalApproved)}</p>
                  <p className="text-sm text-muted-foreground">Recebido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pix" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pix">
              <QrCode className="w-4 h-4 mr-2" />
              Gerar PIX
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="w-4 h-4 mr-2" />
              Transações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pix">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generate PIX Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Gerar Cobrança PIX
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
                    <Input
                      placeholder="0,00"
                      value={pixAmount}
                      onChange={(e) => setPixAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
                    <Input
                      placeholder="Pagamento de pedido"
                      value={pixDescription}
                      onChange={(e) => setPixDescription(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleGeneratePix}
                    disabled={!pixAmount || createPixPayment.isPending}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {createPixPayment.isPending ? 'Gerando...' : 'Gerar PIX'}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated PIX */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">QR Code PIX</CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedPix ? (
                    <div className="space-y-4 text-center">
                      <div className="bg-white p-4 rounded-lg inline-block">
                        <img 
                          src={generatedPix.qrcodeUrl} 
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Código PIX Copia e Cola:</p>
                        <div className="flex gap-2">
                          <Input 
                            value={generatedPix.code} 
                            readOnly 
                            className="text-xs"
                          />
                          <Button variant="outline" size="icon" onClick={copyPixCode}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Preencha os dados ao lado para gerar um QR Code PIX</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            tx.status === 'approved' 
                              ? 'bg-green-500/20' 
                              : tx.status === 'pending' 
                                ? 'bg-yellow-500/20' 
                                : 'bg-red-500/20'
                          }`}>
                            {tx.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {tx.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
                            {tx.status === 'declined' && <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                          <div>
                            <p className="font-medium">{formatCurrency(tx.amount_cents)}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.payment_method === 'pix' && 'PIX'}
                              {tx.payment_method === 'credit_card' && 'Cartão de Crédito'}
                              {tx.payment_method === 'debit_card' && 'Cartão de Débito'}
                              {tx.payment_method === 'boleto' && 'Boleto'}
                              {!['pix', 'credit_card', 'debit_card', 'boleto'].includes(tx.payment_method) && tx.payment_method}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              tx.status === 'approved' 
                                ? 'default' 
                                : tx.status === 'pending' 
                                  ? 'secondary' 
                                  : 'destructive'
                            }
                          >
                            {tx.status === 'approved' && 'Aprovado'}
                            {tx.status === 'pending' && 'Pendente'}
                            {tx.status === 'processing' && 'Processando'}
                            {tx.status === 'declined' && 'Recusado'}
                            {tx.status === 'refunded' && 'Reembolsado'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(tx.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
