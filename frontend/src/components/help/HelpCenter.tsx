import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  HelpCircle, 
  Search, 
  ShoppingBag, 
  CreditCard, 
  Printer, 
  Users,
  Truck,
  Sparkles,
  Settings,
  BookOpen
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // Pedidos
  {
    category: 'Pedidos',
    question: 'Como criar um pedido manualmente?',
    answer: 'Vá em Pedidos > clique em "Novo Pedido" ou "Pedido Balcão". Selecione os produtos, adicione informações do cliente e finalize.',
  },
  {
    category: 'Pedidos',
    question: 'Como alterar o status de um pedido?',
    answer: 'No Kanban de Pedidos, arraste o cartão do pedido para a coluna desejada, ou clique no pedido e use os botões de ação.',
  },
  {
    category: 'Pedidos',
    question: 'Como cancelar um pedido?',
    answer: 'Clique no pedido, vá em "Ações" e selecione "Cancelar". Informe o motivo do cancelamento.',
  },
  // Caixa
  {
    category: 'Caixa',
    question: 'Como abrir o caixa?',
    answer: 'Vá em Financeiro > Caixa, clique em "Abrir Caixa" e informe o valor inicial em espécie.',
  },
  {
    category: 'Caixa',
    question: 'Como fazer uma sangria ou suprimento?',
    answer: 'Com o caixa aberto, clique em "Sangria" para retirar dinheiro ou "Suprimento" para adicionar. Informe o valor e motivo.',
  },
  {
    category: 'Caixa',
    question: 'O que fazer se houver diferença no fechamento?',
    answer: 'Ao fechar o caixa, informe o valor contado. O sistema mostrará a diferença. Registre o motivo da diferença para controle.',
  },
  // Impressão
  {
    category: 'Impressão',
    question: 'Como configurar a impressão automática?',
    answer: 'Vá em Configurações > Impressão. Configure o endereço da impressora (IP:porta) e ative a impressão automática.',
  },
  {
    category: 'Impressão',
    question: 'A impressão não está funcionando, o que fazer?',
    answer: '1) Verifique se a impressora está ligada e conectada na rede. 2) Teste o IP no navegador. 3) Verifique as configurações em Configurações > Impressão.',
  },
  // Entregadores
  {
    category: 'Entregadores',
    question: 'Como cadastrar um entregador?',
    answer: 'Vá em Entregadores > "Novo Entregador". Preencha nome, WhatsApp e tipo de veículo.',
  },
  {
    category: 'Entregadores',
    question: 'Como fazer o acerto com entregador?',
    answer: 'Vá em Acerto de Entregadores, selecione o entregador e o período. O sistema mostrará os pedidos a acertar com valores.',
  },
  // Clientes
  {
    category: 'Clientes',
    question: 'Como usar o fiado?',
    answer: 'Em Financeiro > Fiado, selecione o cliente e adicione um débito. Para receber, use "Receber Pagamento".',
  },
  {
    category: 'Clientes',
    question: 'Como bloquear fiado para um cliente?',
    answer: 'Edite o cadastro do cliente e desmarque a opção "Permite Fiado", ou defina um limite de crédito.',
  },
  // IA
  {
    category: 'Inteligência Artificial',
    question: 'Como usar o Assistente IA?',
    answer: 'Vá em IA > Assistente e faça perguntas sobre seu negócio. A IA analisa seus dados e fornece insights.',
  },
  {
    category: 'Inteligência Artificial',
    question: 'O que são as sugestões de recompra?',
    answer: 'A IA identifica clientes inativos e sugere campanhas personalizadas para reconquistá-los.',
  },
  // Geral
  {
    category: 'Geral',
    question: 'Como alterar tema claro/escuro?',
    answer: 'Clique no ícone de sol/lua no canto superior direito do sistema.',
  },
  {
    category: 'Geral',
    question: 'Como compartilhar o cardápio online?',
    answer: 'Vá em Configurações > Links Públicos para obter o link do seu cardápio digital.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: BookOpen },
  { id: 'Pedidos', label: 'Pedidos', icon: ShoppingBag },
  { id: 'Caixa', label: 'Caixa', icon: CreditCard },
  { id: 'Impressão', label: 'Impressão', icon: Printer },
  { id: 'Entregadores', label: 'Entregadores', icon: Truck },
  { id: 'Clientes', label: 'Clientes', icon: Users },
  { id: 'Inteligência Artificial', label: 'IA', icon: Sparkles },
  { id: 'Geral', label: 'Geral', icon: Settings },
];

export function HelpCenter() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filteredFAQ = FAQ_DATA.filter(item => {
    const matchesSearch = search === '' || 
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = category === 'all' || item.category === category;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Central de Ajuda
          </SheetTitle>
          <SheetDescription>
            Encontre respostas para suas dúvidas
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant={category === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat.id)}
                  className="text-xs"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {cat.label}
                </Button>
              );
            })}
          </div>

          {/* FAQ List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum resultado encontrado
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredFAQ.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
