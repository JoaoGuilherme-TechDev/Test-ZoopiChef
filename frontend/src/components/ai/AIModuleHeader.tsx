import { cn } from "@/lib/utils";
import { Info, HelpCircle, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIModuleHeaderProps {
  title: string;
  icon?: LucideIcon;
  description: string;
  purpose: string;
  whenToUse: string;
  doesNot?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  className?: string;
}

/**
 * Componente padrão de cabeçalho para telas de IA
 * Exibe informações claras sobre o propósito, uso e limitações de cada módulo de IA
 */
export function AIModuleHeader({
  title,
  icon: Icon,
  description,
  purpose,
  whenToUse,
  doesNot,
  badge,
  className,
}: AIModuleHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Title Row */}
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-8 h-8 text-primary" />}
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {title}
          </h1>
          {badge && (
            <Badge variant={badge.variant || "secondary"}>{badge.text}</Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm p-4 space-y-2">
              <p className="font-semibold">📌 {purpose}</p>
              <p className="text-sm">✅ {whenToUse}</p>
              {doesNot && <p className="text-sm text-muted-foreground">❌ {doesNot}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Description + Info Box */}
      <p className="text-muted-foreground">{description}</p>

      {/* Expandable Info Box */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">📌 {purpose}</p>
          <p className="text-muted-foreground">✅ <span className="font-medium">Quando usar:</span> {whenToUse}</p>
          {doesNot && (
            <p className="text-muted-foreground">❌ <span className="font-medium">Esta IA não:</span> {doesNot}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// DESCRIÇÕES PRÉ-DEFINIDAS PARA CADA MÓDULO DE IA
// ========================================

export const AI_MODULE_DESCRIPTIONS = {
  // === ANÁLISE DE NEGÓCIO ===
  gestora: {
    title: "IA Gestora",
    description: "Análise inteligente do seu negócio com recomendações baseadas em dados",
    purpose: "Analisar vendas, cardápio e operação para sugerir melhorias com base em dados reais",
    whenToUse: "Para obter insights sobre o negócio e descobrir oportunidades de melhoria",
    doesNot: "Não executa ações automaticamente - apenas sugere e você decide",
  },

  // === CAMPANHAS DE MARKETING ===
  campaigns: {
    title: "Campanhas Inteligentes",
    description: "Criação automática de campanhas de marketing segmentadas",
    purpose: "Segmentar clientes e sugerir campanhas de WhatsApp personalizadas",
    whenToUse: "Para reativar clientes inativos, VIPs ou criar promoções direcionadas",
    doesNot: "Não envia mensagens sem sua aprovação - você controla o disparo",
  },

  repurchase: {
    title: "Recompra Automática",
    description: "Mensagens personalizadas para trazer clientes de volta",
    purpose: "Identificar clientes que podem querer repetir um pedido e sugerir mensagem personalizada",
    whenToUse: "Quando quiser incentivar clientes a pedir novamente com base no histórico deles",
    doesNot: "Não envia mensagens automaticamente - você decide quais sugestões aprovar",
  },

  proactiveAgent: {
    title: "Agente Proativo",
    description: "Monitoramento automático com alertas inteligentes",
    purpose: "Detectar automaticamente situações que precisam de atenção (faturamento baixo, clientes inativos)",
    whenToUse: "Deixe ativo para receber alertas quando algo precisa de ação",
    doesNot: "Não toma ações sozinho - apenas alerta e sugere campanhas",
  },

  // === CARDÁPIO ===
  menuCreative: {
    title: "Cardápio Criativo",
    description: "Sugestões de nomes e descrições atraentes para produtos",
    purpose: "Melhorar a apresentação dos produtos com nomes e descrições mais vendedores",
    whenToUse: "Quando quiser tornar seu cardápio mais atraente e profissional",
    doesNot: "Não altera preços ou remove produtos - apenas sugere melhorias de texto",
  },

  menuHighlight: {
    title: "Destaque por Horário",
    description: "Sugestões de produtos para destacar em cada período do dia",
    purpose: "Identificar quais produtos vendem melhor em cada horário e sugerir destaques",
    whenToUse: "Para otimizar o que aparece na TV ou no menu em cada período",
    doesNot: "Não altera o cardápio - apenas sugere quais produtos destacar",
  },

  // === PREÇOS ===
  dynamicPricing: {
    title: "Preços Dinâmicos",
    description: "Ajuste automático de preços baseado em demanda e horário",
    purpose: "Otimizar preços automaticamente com base em regras que você define",
    whenToUse: "Para maximizar vendas em horários de pico ou baixa demanda",
    doesNot: "Não aplica preços sem suas regras configuradas - você controla os limites",
  },

  // === CLIENTE ===
  churnPredictor: {
    title: "Predição de Churn",
    description: "Identificação de clientes em risco de abandono",
    purpose: "Detectar clientes que podem estar deixando de comprar e sugerir intervenções",
    whenToUse: "Para agir antes que clientes importantes deixem de comprar",
    doesNot: "Não contata clientes automaticamente - apenas identifica e sugere ações",
  },

  behaviorAnalysis: {
    title: "Análise Comportamental",
    description: "Padrões de comportamento e preferências dos clientes",
    purpose: "Entender o comportamento de compra para sugestões proativas",
    whenToUse: "Para personalizar ofertas com base nos hábitos de cada cliente",
    doesNot: "Não envia mensagens - fornece dados para suas decisões",
  },

  // === ATENDIMENTO ===
  assistant: {
    title: "Assistente IA",
    description: "Chat inteligente para consultas sobre o negócio",
    purpose: "Responder perguntas sobre seu negócio, cardápio e operação",
    whenToUse: "Para tirar dúvidas rápidas ou analisar imagens e documentos",
    doesNot: "Não faz alterações no sistema - apenas responde e sugere",
  },

  concierge: {
    title: "Concierge Virtual",
    description: "Atendimento automatizado para reservas e pedidos",
    purpose: "Atender clientes automaticamente para reservas e pedidos simples",
    whenToUse: "Para agilizar o atendimento inicial e capturar informações",
    doesNot: "Não substitui atendimento humano para casos complexos",
  },

  // === COZINHA ===
  smartKds: {
    title: "KDS Inteligente",
    description: "Priorização automática de pedidos na cozinha",
    purpose: "Organizar a fila da cozinha de forma inteligente baseado em múltiplos fatores",
    whenToUse: "Para otimizar o tempo de preparo e reduzir atrasos",
    doesNot: "Não substitui o controle manual - você pode ajustar prioridades",
  },

  demandForecast: {
    title: "Previsão de Demanda",
    description: "Estimativa de pedidos para os próximos dias",
    purpose: "Prever a demanda com base no histórico para melhor planejamento",
    whenToUse: "Para planejar compras e escala de equipe",
    doesNot: "Não gera pedidos de compra automaticamente - apenas prevê demanda",
  },

  // === ESPECIALISTAS ===
  sommelier: {
    title: "Enólogo Virtual",
    description: "Recomendações personalizadas de vinhos",
    purpose: "Ajudar clientes a escolher vinhos com base em suas preferências",
    whenToUse: "Quando o cliente precisa de orientação para escolher vinhos",
    doesNot: "Não substitui um sommelier profissional para ocasiões especiais",
  },

  rotisseur: {
    title: "Maître Rotisseur",
    description: "Recomendações personalizadas de carnes",
    purpose: "Ajudar clientes a escolher cortes de carne com base em suas preferências",
    whenToUse: "Quando o cliente precisa de orientação para escolher carnes",
    doesNot: "Não substitui um churrasqueiro profissional",
  },

  // === TV ===
  tvScheduler: {
    title: "Agenda TV",
    description: "Programação automática do conteúdo da TV",
    purpose: "Criar uma grade de programação otimizada para sua TV de cardápio",
    whenToUse: "Para manter a TV sempre atualizada com conteúdo relevante",
    doesNot: "Não cria conteúdo novo - organiza o que você já tem",
  },

  tvHighlight: {
    title: "Destaque TV",
    description: "Sugestões de produtos para destacar na TV",
    purpose: "Identificar produtos que devem aparecer em destaque na TV",
    whenToUse: "Para maximizar o impacto visual dos produtos na TV",
    doesNot: "Não altera preços ou disponibilidade - apenas sugere destaques",
  },

  // === UPSELLING ===
  upselling: {
    title: "Upselling Preditivo",
    description: "Sugestões de produtos adicionais durante o pedido",
    purpose: "Sugerir produtos complementares para aumentar o ticket médio",
    whenToUse: "Durante o pedido, para oferecer itens que combinam",
    doesNot: "Não adiciona itens automaticamente ao pedido do cliente",
  },

  // === MARKETING ===
  marketingPost: {
    title: "Posts de Marketing",
    description: "Criação automática de posts para redes sociais",
    purpose: "Gerar conteúdo para WhatsApp e Instagram baseado em seus produtos",
    whenToUse: "Quando precisar de ideias para posts nas redes sociais",
    doesNot: "Não publica automaticamente - você revisa e publica",
  },
} as const;

export type AIModuleKey = keyof typeof AI_MODULE_DESCRIPTIONS;
