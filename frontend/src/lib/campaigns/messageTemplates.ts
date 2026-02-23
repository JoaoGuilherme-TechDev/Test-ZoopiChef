// Campaign Message Templates by Type
// Each template uses {{nome}} for personalization

export interface MessageTemplate {
  id: string;
  type: string;
  name: string;
  message: string;
  cta: string;
  tone: 'casual' | 'formal' | 'promo' | 'vip';
  emoji: boolean;
}

// Reativação - Clientes inativos
export const reativacaoTemplates: MessageTemplate[] = [
  {
    id: 'reativacao_1',
    type: 'reativacao',
    name: 'Saudade simples',
    message: 'Oi {{nome}}! 🤗 Faz tempo que você não aparece por aqui. Sentimos sua falta! Que tal um pedido especial hoje?',
    cta: 'Pedir agora',
    tone: 'casual',
    emoji: true,
  },
  {
    id: 'reativacao_2',
    type: 'reativacao',
    name: 'Oferta de retorno',
    message: '{{nome}}, queremos você de volta! 🎁 Seu próximo pedido tem 10% OFF. Use agora e aproveite!',
    cta: 'Aproveitar desconto',
    tone: 'promo',
    emoji: true,
  },
  {
    id: 'reativacao_3',
    type: 'reativacao',
    name: 'Novidades',
    message: 'Oi {{nome}}! Temos novidades no cardápio que você vai amar. Vem conferir! 🍕✨',
    cta: 'Ver novidades',
    tone: 'casual',
    emoji: true,
  },
];

// Promoção - Ofertas especiais
export const promocaoTemplates: MessageTemplate[] = [
  {
    id: 'promocao_1',
    type: 'promocao',
    name: 'Flash sale',
    message: '⚡ {{nome}}, PROMOÇÃO RELÂMPAGO! Só hoje, preços especiais esperando por você. Corre!',
    cta: 'Ver promoções',
    tone: 'promo',
    emoji: true,
  },
  {
    id: 'promocao_2',
    type: 'promocao',
    name: 'Desconto exclusivo',
    message: '{{nome}}, você ganhou um desconto exclusivo! 🔥 Aproveite antes que acabe.',
    cta: 'Usar desconto',
    tone: 'promo',
    emoji: true,
  },
  {
    id: 'promocao_3',
    type: 'promocao',
    name: 'Fim de semana',
    message: 'Bom final de semana, {{nome}}! 🎉 Que tal aproveitar nossas ofertas especiais?',
    cta: 'Fazer pedido',
    tone: 'casual',
    emoji: true,
  },
];

// Aniversário
export const aniversarioTemplates: MessageTemplate[] = [
  {
    id: 'aniversario_1',
    type: 'aniversario',
    name: 'Parabéns simples',
    message: 'Parabéns, {{nome}}! 🎂🎉 Desejamos um dia incrível! Seu presente especial está esperando.',
    cta: 'Ver presente',
    tone: 'casual',
    emoji: true,
  },
  {
    id: 'aniversario_2',
    type: 'aniversario',
    name: 'Presente VIP',
    message: '{{nome}}, hoje é seu dia! 🎁 Preparamos algo especial pra você. Feliz aniversário!',
    cta: 'Resgatar presente',
    tone: 'vip',
    emoji: true,
  },
];

// Upsell - Aumentar ticket
export const upsellTemplates: MessageTemplate[] = [
  {
    id: 'upsell_1',
    type: 'upsell',
    name: 'Combo sugerido',
    message: '{{nome}}, que tal turbinar seu pedido? 🚀 Nossos combos têm mais sabor por menos!',
    cta: 'Ver combos',
    tone: 'casual',
    emoji: true,
  },
  {
    id: 'upsell_2',
    type: 'upsell',
    name: 'Adicional',
    message: 'Psiu, {{nome}}! 😋 Já experimentou adicionar um item extra ao pedido? Vale a pena!',
    cta: 'Ver opções',
    tone: 'casual',
    emoji: true,
  },
];

// Cross-sell - Venda cruzada
export const crossSellTemplates: MessageTemplate[] = [
  {
    id: 'cross_sell_1',
    type: 'cross_sell',
    name: 'Produto relacionado',
    message: '{{nome}}, quem pede o que você gosta também ama nosso novo item! 😍 Experimente!',
    cta: 'Conhecer',
    tone: 'casual',
    emoji: true,
  },
  {
    id: 'cross_sell_2',
    type: 'cross_sell',
    name: 'Categoria nova',
    message: 'Oi {{nome}}! Você já conhece nossa nova linha? Clientes como você estão adorando! ⭐',
    cta: 'Ver novidades',
    tone: 'casual',
    emoji: true,
  },
];

// VIP - Clientes especiais
export const vipTemplates: MessageTemplate[] = [
  {
    id: 'vip_1',
    type: 'vip',
    name: 'Exclusivo VIP',
    message: '{{nome}}, você é VIP aqui! ⭐ Confira sua oferta exclusiva antes de todo mundo.',
    cta: 'Acessar oferta VIP',
    tone: 'vip',
    emoji: true,
  },
  {
    id: 'vip_2',
    type: 'vip',
    name: 'Agradecimento',
    message: '{{nome}}, obrigado por ser cliente fiel! 💜 Preparamos algo especial pra você.',
    cta: 'Ver exclusivo',
    tone: 'vip',
    emoji: true,
  },
];

// Carrinho abandonado
export const carrinhoAbandonadoTemplates: MessageTemplate[] = [
  {
    id: 'carrinho_1',
    type: 'carrinho_abandonado',
    name: 'Lembrete gentil',
    message: '{{nome}}, seu pedido ficou esperando! 🛒 Finalize agora e garanta seus itens.',
    cta: 'Finalizar pedido',
    tone: 'casual',
    emoji: true,
  },
  {
    id: 'carrinho_2',
    type: 'carrinho_abandonado',
    name: 'Com desconto',
    message: '{{nome}}, seu carrinho ainda está aí! 🎁 Finalize agora com 5% OFF!',
    cta: 'Finalizar com desconto',
    tone: 'promo',
    emoji: true,
  },
];

// Roleta - Clientes que ganharam prêmios
export const roletaTemplates: MessageTemplate[] = [
  {
    id: 'roleta_1',
    type: 'roleta',
    name: 'Lembrete de prêmio',
    message: '{{nome}}, você ganhou um prêmio na roleta e ainda não usou! 🎰🎁 Corre resgatar!',
    cta: 'Resgatar prêmio',
    tone: 'promo',
    emoji: true,
  },
  {
    id: 'roleta_2',
    type: 'roleta',
    name: 'Nova chance',
    message: '{{nome}}, que tal tentar a sorte de novo? 🎰 A roleta está te esperando!',
    cta: 'Girar roleta',
    tone: 'casual',
    emoji: true,
  },
];

// All templates indexed by type
export const allTemplates: Record<string, MessageTemplate[]> = {
  reativacao: reativacaoTemplates,
  promocao: promocaoTemplates,
  aniversario: aniversarioTemplates,
  upsell: upsellTemplates,
  cross_sell: crossSellTemplates,
  vip: vipTemplates,
  carrinho_abandonado: carrinhoAbandonadoTemplates,
  roleta: roletaTemplates,
};

// Get random template for a campaign type
export const getRandomTemplate = (type: string): MessageTemplate | null => {
  const templates = allTemplates[type];
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
};

// Get all templates for a type
export const getTemplatesForType = (type: string): MessageTemplate[] => {
  return allTemplates[type] || [];
};

// Personalize message with customer data
export const personalizeMessage = (
  template: string,
  customerData: {
    nome?: string;
    produto?: string;
    desconto?: string;
    premio?: string;
  }
): string => {
  let result = template;
  result = result.replace(/\{\{nome\}\}/gi, customerData.nome || 'Cliente');
  result = result.replace(/\{\{produto\}\}/gi, customerData.produto || 'item especial');
  result = result.replace(/\{\{desconto\}\}/gi, customerData.desconto || '10%');
  result = result.replace(/\{\{premio\}\}/gi, customerData.premio || 'seu prêmio');
  return result;
};
