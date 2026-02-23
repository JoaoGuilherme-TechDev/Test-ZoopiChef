import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  LayoutGrid,
  Users,
  BarChart3,
  Truck,
  ChefHat,
  MessageCircle,
  Star,
  CreditCard,
  Package,
  Settings,
  ArrowRight,
  Play,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface DemoFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  category: 'operations' | 'sales' | 'ai' | 'finance' | 'marketing';
}

const DEMO_FEATURES: DemoFeature[] = [
  {
    id: 'orders',
    title: 'Gestão de Pedidos',
    description: 'Visualize e gerencie todos os pedidos em tempo real',
    icon: ShoppingBag,
    path: '/orders',
    category: 'operations',
  },
  {
    id: 'kds',
    title: 'KDS - Cozinha',
    description: 'Painel de produção para a cozinha',
    icon: ChefHat,
    path: '/kds',
    category: 'operations',
  },
  {
    id: 'products',
    title: 'Cardápio Digital',
    description: 'Cadastre e organize seus produtos',
    icon: Package,
    path: '/products',
    category: 'sales',
  },
  {
    id: 'customers',
    title: 'Clientes & CRM',
    description: 'Gestão completa de clientes',
    icon: Users,
    path: '/customers',
    category: 'sales',
  },
  {
    id: 'deliverers',
    title: 'Entregadores',
    description: 'Gerencie sua frota de entrega',
    icon: Truck,
    path: '/deliverers',
    category: 'operations',
  },
  {
    id: 'ai',
    title: 'IA Gestora',
    description: 'Sugestões inteligentes para seu negócio',
    icon: Sparkles,
    path: '/ai-recommendations',
    category: 'ai',
  },
  {
    id: 'finance',
    title: 'Financeiro',
    description: 'Controle financeiro completo',
    icon: CreditCard,
    path: '/finance',
    category: 'finance',
  },
  {
    id: 'reports',
    title: 'Relatórios',
    description: 'Análises e métricas do negócio',
    icon: BarChart3,
    path: '/reports',
    category: 'finance',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Atendimento via WhatsApp',
    icon: MessageCircle,
    path: '/whatsapp',
    category: 'marketing',
  },
  {
    id: 'reviews',
    title: 'Avaliações',
    description: 'Gerencie avaliações dos clientes',
    icon: Star,
    path: '/reviews',
    category: 'marketing',
  },
];

const CATEGORY_LABELS = {
  operations: { label: 'Operações', color: 'bg-blue-100 text-blue-700' },
  sales: { label: 'Vendas', color: 'bg-green-100 text-green-700' },
  ai: { label: 'Inteligência', color: 'bg-purple-100 text-purple-700' },
  finance: { label: 'Financeiro', color: 'bg-orange-100 text-orange-700' },
  marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
};

export default function Demo() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Check if there's a demo company
  const { data: demoCompany } = useQuery({
    queryKey: ['demo-company'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_demo', true)
        .limit(1)
        .single();

      if (error) return null;
      return data;
    },
  });

  const filteredFeatures = selectedCategory
    ? DEMO_FEATURES.filter((f) => f.category === selectedCategory)
    : DEMO_FEATURES;

  const categories = Object.entries(CATEGORY_LABELS);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-white/20 text-white border-0">
              <Play className="w-3 h-3 mr-1" />
              Modo Demonstração
            </Badge>
            <div className="mb-4">
              <img src="/zoopi-logo.png" alt="Zoopi" className="h-20 w-auto mx-auto" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Conheça o Zoopi
            </h1>
            <p className="text-lg opacity-90 mb-6">
              Sistema completo para gestão de restaurantes, lanchonetes e delivery.
              Explore todas as funcionalidades sem compromisso.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/auth')}
              >
                Criar minha conta
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => navigate('/roi-calculator')}
              >
                Calcular economia
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-12">
          {[
            { label: 'Pedidos/mês', value: '2.500+', icon: ShoppingBag },
            { label: 'Economia', value: '30%', icon: BarChart3 },
            { label: 'Tempo ganho', value: '4h/dia', icon: ChefHat },
            { label: 'Satisfação', value: '4.9★', icon: Star },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-large bg-card">
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map(([key, { label }]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filteredFeatures.map((feature) => (
            <Card
              key={feature.id}
              className="border-border/50 hover:border-primary/30 hover:shadow-medium transition-all cursor-pointer group"
              onClick={() => {
                if (demoCompany) {
                  navigate(feature.path);
                } else {
                  // Show message that demo requires setup
                  navigate('/auth');
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl ${
                      CATEGORY_LABELS[feature.category].color
                    } flex items-center justify-center`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[feature.category].label}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full group-hover:bg-primary/5">
                  Explorar
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="border-0 shadow-large bg-gradient-to-br from-card to-primary/5 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">
              Por que escolher o Zoopi?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Tudo em um só lugar',
                  description: 'Pedidos, delivery, financeiro, marketing e IA integrados',
                  icon: LayoutGrid,
                },
                {
                  title: 'IA que trabalha por você',
                  description: 'Sugestões automáticas para aumentar vendas e reduzir custos',
                  icon: Sparkles,
                },
                {
                  title: 'Suporte especializado',
                  description: 'Equipe pronta para ajudar a qualquer momento',
                  icon: MessageCircle,
                },
              ].map((benefit, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center py-8">
          <h2 className="text-2xl font-display font-bold mb-4 text-foreground">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground mb-6">
            Teste gratuitamente por 14 dias. Sem cartão de crédito.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Começar agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/roi-calculator')}>
              Calcular minha economia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
