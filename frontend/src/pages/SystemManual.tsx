import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Search, Home, ClipboardList, UtensilsCrossed, ChefHat, Calculator, 
  Package, Tv, Megaphone, Brain, Settings, Globe, Keyboard, HelpCircle,
  Phone, MessageCircle, Bike, Star, BarChart3, Users, Building2, Printer,
  Gift, Ticket, TrendingUp, Warehouse, FileText, Calendar, Bot, Palette
} from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: {
    title: string;
    route?: string;
    description: string;
  }[];
}

const manualSections: ManualSection[] = [
  {
    id: 'principal',
    title: 'Menu Principal',
    icon: Home,
    color: 'text-blue-500',
    items: [
      { title: 'Dashboard', route: '/', description: 'Visão geral do estabelecimento com resumo de vendas, pedidos recentes e alertas do sistema.' },
      { title: 'Painel Desempenho', route: '/performance-panel', description: 'Análise detalhada de performance com gráficos de vendas, comparativos e KPIs.' },
      { title: 'Pedidos', route: '/orders', description: 'Gestão completa de pedidos: visualizar, filtrar por status, alterar status, imprimir e cancelar.' },
      { title: 'Pedido Ligação', route: '/phone-order', description: 'Criar pedidos recebidos por telefone. Buscar cliente, montar pedido e calcular taxa de entrega.' },
      { title: 'Mesas', route: '/tables', description: 'Controle de mesas do salão com mapa visual, status de ocupação e fechamento de conta.' },
      { title: 'Comandas', route: '/comandas', description: 'Gestão de comandas: criar, adicionar itens, fechar e transferir itens entre comandas.' },
      { title: 'Reservas', route: '/reservations', description: 'Sistema de reservas com agenda, confirmação por WhatsApp e controle de capacidade.' },
      { title: 'Chamados Salão', route: '/service-calls', description: 'Atender chamados de clientes como garçom, conta e solicitações especiais.' },
      { title: 'KDS Cozinha', route: '/kds', description: 'Kitchen Display System para visualização e controle de preparo de pedidos.' },
      { title: 'WhatsApp', route: '/whatsapp', description: 'Gestão de pedidos recebidos via WhatsApp e automações de mensagens.' },
      { title: 'Chat Online', route: '/chat-monitor', description: 'Monitorar chats do site em tempo real com atendimento híbrido IA + Humano.' },
      { title: 'Clientes', route: '/customers', description: 'Cadastro completo de clientes com histórico de pedidos e endereços salvos.' },
      { title: 'Avaliações', route: '/reviews', description: 'Gestão de avaliações recebidas com métricas de satisfação.' },
      { title: 'Entregadores', route: '/deliverers', description: 'Cadastro de entregadores com status, veículo e contato WhatsApp.' },
      { title: 'Ranking Entregas', route: '/deliverer-rankings', description: 'Performance dos entregadores com tempo médio e taxa de pontualidade.' },
      { title: 'Acerto', route: '/settlement', description: 'Acerto financeiro com entregadores: entregas pendentes e pagamentos.' },
      { title: 'Relatórios', route: '/reports', description: 'Relatórios gerenciais de vendas, produtos e métodos de pagamento.' },
      { title: 'Dashboard Tempos', route: '/reports/timers', description: 'Análise de tempos de preparo e entrega com alertas de atraso.' },
      { title: 'Fidelidade', route: '/loyalty', description: 'Programa de fidelidade com pontos acumulados e regras de resgate.' },
      { title: 'Mensagens', route: '/internal-messages', description: 'Comunicação interna entre setores e alertas para cozinha.' },
    ]
  },
  {
    id: 'financeiro',
    title: 'Módulo Financeiro',
    icon: Calculator,
    color: 'text-green-500',
    items: [
      { title: 'Financeiro', route: '/finance', description: 'Dashboard financeiro com receitas, despesas e fluxo de caixa.' },
      { title: 'Controle de Caixa', route: '/cash-register', description: 'Operações de caixa: abrir, fechar, sangrias e reforços.' },
      { title: 'Histórico Caixas', route: '/cash-history', description: 'Histórico de caixas anteriores com diferenças e relatórios.' },
      { title: 'Formas Pagamento', route: '/payment-methods', description: 'Configurar métodos de pagamento: dinheiro, cartões, PIX.' },
      { title: 'Contas Bancárias', route: '/bank-accounts', description: 'Cadastro de contas bancárias e conciliação.' },
      { title: 'Contas a Pagar', route: '/accounts-payable', description: 'Gestão de despesas e programação de pagamentos.' },
      { title: 'Plano de Contas', route: '/chart-of-accounts', description: 'Estrutura contábil com categorias de receita e despesa.' },
      { title: 'Fiado', route: '/customer-credits', description: 'Controle de fiado: clientes com débito e pagamentos.' },
      { title: 'Estoque', route: '/inventory', description: 'Controle básico de estoque com alertas de baixa.' },
      { title: 'ERP Financeiro', route: '/finance-erp', description: 'Módulo ERP completo com DRE, CMV e fluxo de caixa.' },
    ]
  },
  {
    id: 'erp',
    title: 'Módulo ERP Estoque',
    icon: Warehouse,
    color: 'text-amber-500',
    items: [
      { title: 'Itens ERP', route: '/erp/items', description: 'Cadastro de insumos: matérias-primas, embalagens e custos.' },
      { title: 'Compras', route: '/erp/purchases', description: 'Registro de compras com entrada de nota fiscal.' },
      { title: 'Fichas Técnicas', route: '/erp/recipes', description: 'Receitas com ingredientes e cálculo automático de custo.' },
      { title: 'Estoque ERP', route: '/erp/stock', description: 'Posição de estoque com saldo e alertas de reposição.' },
      { title: 'Movimentações', route: '/erp/movements', description: 'Histórico de entradas, saídas e ajustes.' },
      { title: 'Inventário', route: '/erp/inventory-count', description: 'Contagem física e geração de ajustes.' },
      { title: 'CMV', route: '/erp/cmv', description: 'Análise de custo por produto e margem de contribuição.' },
      { title: 'Precificação', route: '/erp/pricing', description: 'Sugestão de preços baseada em custo e margem.' },
      { title: 'Lucro', route: '/erp/profit', description: 'Análise de lucratividade por produto.' },
    ]
  },
  {
    id: 'cardapio',
    title: 'Módulo Cardápio',
    icon: Package,
    color: 'text-purple-500',
    items: [
      { title: 'Categorias', route: '/categories', description: 'Organizar produtos em categorias com ícones e horários.' },
      { title: 'Subcategorias', route: '/subcategories', description: 'Subdivisões de categorias para melhor organização.' },
      { title: 'Produtos', route: '/products', description: 'Cadastro completo de produtos com preços, imagens e opcionais.' },
      { title: 'Sabores', route: '/flavors', description: 'Sabores para pizzas com preços por tamanho.' },
      { title: 'Grupos Opcionais', route: '/optional-groups', description: 'Adicionais e opcionais com limites de seleção.' },
      { title: 'Cardápio Avançado', route: '/advanced-menu', description: 'Informações nutricionais, alérgenos e harmonizações.' },
      { title: 'Destaques Sabor', route: '/flavor-highlight-groups', description: 'Destacar sabores em promoção ou novidades.' },
      { title: 'Ações em Lote', route: '/batch-actions', description: 'Alterar preços e status de vários produtos de uma vez.' },
    ]
  },
  {
    id: 'tv',
    title: 'Módulo TV',
    icon: Tv,
    color: 'text-red-500',
    items: [
      { title: 'Telas de TV', route: '/tv-screens', description: 'Gerenciar TVs do estabelecimento com tokens de acesso.' },
      { title: 'Banners TV', route: '/banners', description: 'Upload de imagens e agendamento para exibição.' },
    ]
  },
  {
    id: 'marketing',
    title: 'Módulo Marketing',
    icon: Megaphone,
    color: 'text-pink-500',
    items: [
      { title: 'Campanhas', route: '/campaigns', description: 'Criar campanhas por WhatsApp com segmentação de clientes.' },
      { title: 'Recompra', route: '/repurchase', description: 'Recuperar clientes inativos com ofertas personalizadas.' },
      { title: 'Programa Indicação', route: '/referral-program', description: 'Marketing de indicação com recompensas automáticas.' },
      { title: 'Gamificação', route: '/gamification', description: 'Engajamento com conquistas, badges e rankings.' },
      { title: 'Destaque Horário', route: '/time-highlights', description: 'Promoções por horário como happy hour.' },
      { title: 'Marketing', route: '/marketing', description: 'Central de marketing com visão geral de campanhas.' },
      { title: 'Roleta Prêmios', route: '/prizes', description: 'Cadastrar prêmios e configurar probabilidades.' },
      { title: 'Cupons', route: '/coupons', description: 'Criar cupons de desconto com regras e validade.' },
    ]
  },
  {
    id: 'ia',
    title: 'Módulo IA',
    icon: Brain,
    color: 'text-cyan-500',
    items: [
      { title: 'IA Operacional', route: '/ai-operational', description: 'Sugestões para otimização de processos e redução de desperdício.' },
      { title: 'IA Recomendações', route: '/ai-recommendations', description: 'Recomendações de negócio priorizadas por impacto.' },
      { title: 'Central de Sugestões', route: '/ai-suggestions', description: 'Hub de todas as sugestões da IA com histórico.' },
      { title: 'Marketing AI Posts', route: '/ai-marketing-posts', description: 'Geração automática de posts com templates e calendário.' },
      { title: 'Previsão de Churn', route: '/ai-churn', description: 'Prever abandono de clientes e ações preventivas.' },
      { title: 'Chatbot WhatsApp', route: '/chatbot-settings', description: 'Configurar respostas automáticas e fluxos.' },
      { title: 'Cardápio Criativo', route: '/ai-menu-creative', description: 'Sugestões de nomes e descrições atrativas.' },
      { title: 'Agenda TV', route: '/ai-tv-scheduler', description: 'Programação automática de conteúdo para TVs.' },
      { title: 'Previsão Demanda', route: '/demand-forecast', description: 'Prever vendas diárias e semanais.' },
    ]
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    color: 'text-gray-500',
    items: [
      { title: 'Empresa', route: '/company', description: 'Dados da empresa: nome, CNPJ, endereço e horário.' },
      { title: 'Clientes', route: '/settings/customers', description: 'Campos obrigatórios e validações de cadastro.' },
      { title: 'Caixa', route: '/settings/cash', description: 'Configurações de abertura e fechamento de caixa.' },
      { title: 'Pedidos', route: '/settings/orders', description: 'Status personalizados e fluxo de aprovação.' },
      { title: 'Mesas', route: '/settings/table', description: 'Quantidade de mesas e taxa de serviço.' },
      { title: 'Reservas', route: '/settings/reservations', description: 'Horários disponíveis e antecedência mínima.' },
      { title: 'Tablet Autoatendimento', route: '/settings/tablet-autoatendimento', description: 'Configurar modo quiosque e produtos.' },
      { title: 'Pedido Online', route: '/settings/pedido-online', description: 'Informações de contato e horário de delivery.' },
      { title: 'Taxas de Entrega', route: '/settings/delivery', description: 'Taxas por bairro/distância e valor mínimo.' },
      { title: 'Pizza', route: '/settings/pizza', description: 'Tamanhos, sabores por pizza e divisão.' },
      { title: 'Enólogo Virtual', route: '/settings/sommelier', description: 'Assistente de vinhos e harmonizações.' },
      { title: 'Branding', route: '/settings/branding', description: 'Cores do sistema, logo e fontes.' },
      { title: 'Integrações', route: '/settings/integrations', description: 'Conectar WhatsApp, pagamentos e impressoras.' },
      { title: 'Impressão', route: '/settings/printing', description: 'Impressoras por setor e layout de cupons.' },
      { title: 'Roleta', route: '/settings/wheel', description: 'Regras de participação e prêmios.' },
      { title: 'IA', route: '/settings/ai', description: 'Modelos utilizados e nível de automação.' },
      { title: 'Layout Cardápio', route: '/settings/layout', description: 'Tema e organização do cardápio online.' },
      { title: 'Pânico', route: '/settings/panic', description: 'Botão de emergência com telefones e mensagem.' },
      { title: 'Sons', route: '/settings/sounds', description: 'Alertas sonoros de pedidos e atrasos.' },
      { title: 'Usuários', route: '/users', description: 'Gerenciar usuários e senhas.' },
      { title: 'Perfis de Acesso', route: '/profiles', description: 'Permissões por perfil (Admin, Caixa, Garçom).' },
      { title: 'Meus Links', route: '/my-links', description: 'Links públicos e QR Codes do sistema.' },
    ]
  },
  {
    id: 'publicos',
    title: 'Aplicativos Públicos',
    icon: Globe,
    color: 'text-indigo-500',
    items: [
      { title: 'Cardápio Online', route: '/:slug', description: 'Cardápio para clientes fazerem pedidos online.' },
      { title: 'TV Menu', route: '/:slug/tv', description: 'Menu para exibição em TVs do estabelecimento.' },
      { title: 'Roleta de Prêmios', route: '/:slug/roleta', description: 'Jogo para clientes ganharem prêmios.' },
      { title: 'KDS', route: '/:slug/kds', description: 'Tela da cozinha.' },
      { title: 'Mesa QR Code', route: '/:slug/qr/mesa/:mesaId', description: 'Cardápio vinculado a mesas específicas.' },
      { title: 'Comanda QR Code', route: '/:slug/qr/comanda/:comandaId', description: 'Cardápio vinculado a comandas.' },
      { title: 'Avaliação', route: '/:slug/avaliacao/:orderId', description: 'Página para cliente avaliar o pedido.' },
      { title: 'Enólogo Virtual', route: '/:slug/enologo', description: 'Assistente de vinhos para clientes.' },
      { title: 'App Entregador', route: '/:slug/entregador', description: 'Aplicativo PWA para entregadores.' },
      { title: 'App Garçom', route: '/:slug/garcom', description: 'Aplicativo PWA para garçons: mesas, comandas e pedidos.' },
      { title: 'Totem', route: '/:slug/totem', description: 'Totem de autoatendimento para clientes.' },
      { title: 'Tablet', route: '/:slug/tablet', description: 'Tablet de autoatendimento para mesas.' },
      { title: 'Reservas', route: '/:slug/reserva', description: 'Página para cliente fazer reservas.' },
    ]
  },
];

const shortcuts = [
  { key: 'Ctrl + K', description: 'Busca rápida' },
  { key: 'Alt + 1', description: 'Dashboard' },
  { key: 'Alt + 2', description: 'Pedidos' },
  { key: 'Alt + 3', description: 'KDS' },
  { key: 'Alt + 4', description: 'Caixa' },
  { key: 'Alt + 5', description: 'Clientes' },
];

export default function SystemManual() {
  const [search, setSearch] = useState('');

  const filteredSections = manualSections.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const totalItems = manualSections.reduce((acc, section) => acc + section.items.length, 0);

  return (
    <DashboardLayout title="Manual do Sistema">
      <div className="space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-xl">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Manual Completo do Sistema</h1>
                <p className="text-muted-foreground">
                  Documentação de todas as funcionalidades • {totalItems} itens documentados
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                v2026.01
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionalidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            <Accordion type="multiple" defaultValue={['principal']} className="space-y-4">
              {filteredSections.map((section) => (
                <AccordionItem 
                  key={section.id} 
                  value={section.id}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${section.color}`}>
                        <section.icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold">{section.title}</span>
                      <Badge variant="secondary">{section.items.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3 pt-2">
                      {section.items.map((item, index) => (
                        <div 
                          key={index}
                          className="p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            </div>
                            {item.route && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {item.route}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Shortcuts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Keyboard className="w-4 h-4" />
                  Atalhos de Teclado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <kbd className="px-2 py-1 text-xs bg-muted rounded border font-mono">
                      {shortcut.key}
                    </kbd>
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="w-4 h-4" />
                  Dicas Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="text-green-500">●</span>
                  <span>Indicador verde = online</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-red-500">●</span>
                  <span>Indicador vermelho = offline</span>
                </div>
                <div className="flex gap-2">
                  <span>🔔</span>
                  <span>Sino = Central de notificações</span>
                </div>
                <div className="flex gap-2">
                  <span>❓</span>
                  <span>Interrogação = Central de ajuda</span>
                </div>
                <div className="flex gap-2">
                  <span>🚨</span>
                  <span>Botão vermelho = Pânico/Emergência</span>
                </div>
                <div className="flex gap-2">
                  <span>🌙</span>
                  <span>Lua/Sol = Alternar tema</span>
                </div>
              </CardContent>
            </Card>

            {/* Module Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="w-4 h-4" />
                  Módulos do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {manualSections.slice(0, 7).map((section) => (
                    <div key={section.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <section.icon className={`w-4 h-4 ${section.color}`} />
                        <span className="text-sm">{section.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {section.items.length}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
