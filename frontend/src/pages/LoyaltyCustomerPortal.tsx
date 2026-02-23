import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase-shim';
import { 
  CreditCard, Gift, Star, Crown, History, Phone, 
  Loader2, ArrowUp, ArrowDown, Clock, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface CustomerData {
  id: string;
  name: string;
  whatsapp: string;
  currentPoints: number;
  totalEarned: number;
  totalRedeemed: number;
  level: {
    name: string;
    color: string;
    multiplier: number;
    benefits: string[];
  } | null;
  expiringPoints: number;
  expiringDate: string | null;
}

interface Transaction {
  id: string;
  transaction_type: string;
  points: number;
  description: string;
  created_at: string;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: number | null;
}

export default function LoyaltyCustomerPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Load company info
  useEffect(() => {
    async function loadCompany() {
      if (!slug) return;
      
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('slug', slug)
        .single();
      
      if (data) {
        setCompanyName(data.name);
        setCompanyLogo(data.logo_url);
      }
    }
    loadCompany();
  }, [slug]);

  const handleSearch = async () => {
    if (!phone.trim() || !slug) {
      toast.error('Digite seu telefone');
      return;
    }

    setIsLoading(true);
    try {
      // Get company ID
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!company) {
        toast.error('Empresa não encontrada');
        return;
      }

      // Find customer by phone
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name, whatsapp')
        .eq('company_id', company.id)
        .eq('whatsapp', phone.replace(/\D/g, ''))
        .single();

      if (!customerData) {
        toast.error('Cliente não encontrado com este telefone');
        return;
      }

      // Get loyalty points
      const { data: loyaltyPoints } = await supabase
        .from('customer_loyalty_points')
        .select('*, level:loyalty_levels(*)')
        .eq('customer_id', customerData.id)
        .eq('company_id', company.id)
        .single();

      // Get transactions
      const { data: txns } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get rewards
      const { data: rwds } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('points_cost', { ascending: true });

      // Get expiring points
      const { data: expiring } = await supabase
        .from('loyalty_points_expiry')
        .select('*')
        .eq('customer_id', customerData.id)
        .eq('expired', false)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })
        .limit(1);

      const level = loyaltyPoints?.level as any;
      
      setCustomer({
        id: customerData.id,
        name: customerData.name || 'Cliente',
        whatsapp: customerData.whatsapp || '',
        currentPoints: loyaltyPoints?.current_points || 0,
        totalEarned: loyaltyPoints?.total_earned || 0,
        totalRedeemed: loyaltyPoints?.total_redeemed || 0,
        level: level ? {
          name: level.name,
          color: level.color,
          multiplier: level.points_multiplier,
          benefits: level.benefits || [],
        } : null,
        expiringPoints: expiring?.[0]?.points || 0,
        expiringDate: expiring?.[0]?.expires_at || null,
      });

      setTransactions(txns || []);
      setRewards(rwds || []);
      
    } catch (error) {
      console.error(error);
      toast.error('Erro ao buscar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRewardValue = (type: string, value: number | null) => {
    if (value === null) return '';
    switch (type) {
      case 'discount_percent':
        return `${value}% de desconto`;
      case 'discount_fixed':
        return `R$ ${value.toFixed(2)} de desconto`;
      case 'cashback':
        return `R$ ${value.toFixed(2)} cashback`;
      case 'free_item':
        return 'Item grátis';
      case 'free_delivery':
        return 'Entrega grátis';
      default:
        return value.toString();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-lg mx-auto text-center">
          {companyLogo && (
            <img src={companyLogo} alt={companyName} className="h-12 mx-auto mb-3" />
          )}
          <h1 className="text-xl font-bold">{companyName || 'Programa de Fidelidade'}</h1>
          <p className="text-sm opacity-80">Consulte seus pontos e recompensas</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!customer ? (
          /* Login Form */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Consultar Pontos
              </CardTitle>
              <CardDescription>
                Digite seu telefone cadastrado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
              />
              <Button 
                className="w-full" 
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Consultar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Customer Card */}
            <div 
              className="relative p-6 rounded-2xl text-white overflow-hidden"
              style={{ 
                background: customer.level 
                  ? `linear-gradient(135deg, ${customer.level.color} 0%, ${customer.level.color}aa 100%)`
                  : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)'
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
                  {customer.level && (
                    <Badge className="bg-white/20 text-white border-0">
                      <Crown className="h-3 w-3 mr-1" />
                      {customer.level.name}
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-white/80 text-sm">Olá,</p>
                  <p className="text-xl font-bold">{customer.name}</p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Seus Pontos</p>
                    <p className="text-4xl font-bold">{customer.currentPoints.toLocaleString()}</p>
                  </div>
                  {customer.level && customer.level.multiplier > 1 && (
                    <Badge className="bg-white/20 text-white border-0">
                      ×{customer.level.multiplier} pontos
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Expiring Warning */}
            {customer.expiringPoints > 0 && customer.expiringDate && (
              <Card className="border-amber-500/50 bg-amber-500/10">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-600">
                      {customer.expiringPoints} pontos vão expirar!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Válidos até {format(new Date(customer.expiringDate), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Level Benefits */}
            {customer.level && customer.level.benefits.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="w-4 h-4" style={{ color: customer.level.color }} />
                    Benefícios {customer.level.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {customer.level.benefits.map((benefit, i) => (
                      <Badge key={i} variant="secondary">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="rewards">
              <TabsList className="w-full">
                <TabsTrigger value="rewards" className="flex-1">
                  <Gift className="w-4 h-4 mr-2" />
                  Recompensas
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rewards" className="space-y-3 mt-4">
                {rewards.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma recompensa disponível</p>
                    </CardContent>
                  </Card>
                ) : (
                  rewards.map((reward) => {
                    const canRedeem = customer.currentPoints >= reward.points_cost;
                    return (
                      <Card 
                        key={reward.id} 
                        className={!canRedeem ? 'opacity-60' : ''}
                      >
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${canRedeem ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Gift className={`w-5 h-5 ${canRedeem ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="font-medium">{reward.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatRewardValue(reward.reward_type, reward.reward_value)}
                              </p>
                            </div>
                          </div>
                          <Badge variant={canRedeem ? 'default' : 'secondary'}>
                            <Star className="w-3 h-3 mr-1" />
                            {reward.points_cost}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-2 mt-4">
                {transactions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma transação</p>
                    </CardContent>
                  </Card>
                ) : (
                  transactions.map((tx) => (
                    <Card key={tx.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tx.transaction_type === 'earn' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                            {tx.transaction_type === 'earn' ? (
                              <ArrowUp className="w-4 h-4 text-success" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tx.description || (tx.transaction_type === 'earn' ? 'Pontos ganhos' : 'Pontos resgatados')}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.transaction_type === 'earn' ? 'text-success' : 'text-destructive'}`}>
                          {tx.transaction_type === 'earn' ? '+' : '-'}{tx.points}
                        </span>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>

            {/* Logout */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setCustomer(null);
                setPhone('');
              }}
            >
              Consultar outro telefone
            </Button>
          </>
        )}
      </div>

      {/* PWA Install hint */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-xs text-muted-foreground">
            💡 Adicione ao seu celular para acesso rápido
          </p>
        </div>
      </div>
    </div>
  );
}
