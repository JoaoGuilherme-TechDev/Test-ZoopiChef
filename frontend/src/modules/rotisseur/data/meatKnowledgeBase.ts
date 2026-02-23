/**
 * Base de Conhecimento do Maître Rôtisseur
 * Informações técnicas e gastronômicas sobre cortes de carne
 * 
 * Fontes: Conhecimento gastronômico tradicional, técnicas francesas e brasileiras
 */

export interface MeatCutKnowledge {
  /** Nomes comuns do corte */
  names: string[];
  /** Tipo de animal */
  animalType: 'bovino' | 'suino' | 'ave' | 'cordeiro' | 'peixe';
  /** Parte do animal */
  animalPart: string;
  /** Nível de marmoreio (0-5) */
  marbling: number;
  /** Textura */
  texture: 'macia' | 'média' | 'firme';
  /** Intensidade do sabor (1-5) */
  flavorIntensity: number;
  /** Melhores métodos de preparo */
  bestCookingMethods: string[];
  /** Tempo médio de cocção por kg (minutos) */
  cookingTimePerKg: { min: number; max: number };
  /** Ponto ideal */
  idealDoneness: string[];
  /** Ocasiões recomendadas */
  recommendedOccasions: string[];
  /** Descrição técnica */
  technicalDescription: string;
  /** Dica do chef */
  chefTip: string;
  /** Harmonização */
  pairing: string[];
  /** Preço relativo (1=econômico, 5=premium) */
  priceLevel: number;
}

export const MEAT_KNOWLEDGE_BASE: Record<string, MeatCutKnowledge> = {
  // ============== BOVINOS - TRASEIRO ==============
  'picanha': {
    names: ['picanha', 'cap of rump', 'coulotte'],
    animalType: 'bovino',
    animalPart: 'Traseiro - sobre a alcatra, coberta pela capa de gordura',
    marbling: 2,
    texture: 'macia',
    flavorIntensity: 4,
    bestCookingMethods: ['churrasco', 'grelha', 'parrilla', 'forno'],
    cookingTimePerKg: { min: 20, max: 30 },
    idealDoneness: ['mal passada', 'ao ponto para mal'],
    recommendedOccasions: ['churrasco com amigos', 'festa', 'celebração'],
    technicalDescription: 'Corte triangular com camada generosa de gordura superficial que derrete durante o cozimento, proporcionando suculência excepcional. A gordura deve ficar virada para cima na grelha, garantindo que o sabor penetre na carne.',
    chefTip: 'Mantenha a capa de gordura com pelo menos 1,5cm. Nunca fure a carne durante o preparo para preservar os sucos.',
    pairing: ['vinho tinto encorpado', 'cerveja pilsen', 'farofa', 'vinagrete'],
    priceLevel: 4,
  },
  'contrafile': {
    names: ['contrafilé', 'contra-filé', 'striploin', 'new york strip'],
    animalType: 'bovino',
    animalPart: 'Lombo - parte superior do dorso, entre costelas e alcatra',
    marbling: 3,
    texture: 'macia',
    flavorIntensity: 4,
    bestCookingMethods: ['grelha', 'churrasco', 'frigideira', 'sous-vide'],
    cookingTimePerKg: { min: 15, max: 25 },
    idealDoneness: ['ao ponto', 'ao ponto para mal'],
    recommendedOccasions: ['jantar especial', 'churrasco', 'dia a dia premium'],
    technicalDescription: 'Corte nobre do lombo com fina camada de gordura lateral. Apresenta fibras longas e textura firme porém tenra. Possui sabor intenso de carne bovina bem desenvolvido.',
    chefTip: 'Deixe a carne atingir temperatura ambiente antes do preparo. Descanse por 5 minutos após grelhar.',
    pairing: ['Malbec', 'Cabernet Sauvignon', 'manteiga de ervas', 'batatas'],
    priceLevel: 4,
  },
  'alcatra': {
    names: ['alcatra', 'top sirloin', 'rump'],
    animalType: 'bovino',
    animalPart: 'Traseiro - região da garupa',
    marbling: 2,
    texture: 'média',
    flavorIntensity: 3,
    bestCookingMethods: ['churrasco', 'grelha', 'assado', 'frigideira'],
    cookingTimePerKg: { min: 25, max: 35 },
    idealDoneness: ['ao ponto', 'ao ponto para bem'],
    recommendedOccasions: ['churrasco família', 'almoço de domingo', 'dia a dia'],
    technicalDescription: 'Corte versátil e magro, subdivide-se em miolo, maminha e picanha. Fibras médias com boa consistência. Excelente relação custo-benefício.',
    chefTip: 'Pode ser marinada para amaciar. Fatie contra as fibras para maior maciez.',
    pairing: ['vinho tinto médio', 'cerveja', 'arroz', 'feijão tropeiro'],
    priceLevel: 3,
  },
  'maminha': {
    names: ['maminha', 'tri-tip', 'ponta de alcatra'],
    animalType: 'bovino',
    animalPart: 'Traseiro - parte inferior da alcatra, formato triangular',
    marbling: 2,
    texture: 'macia',
    flavorIntensity: 3,
    bestCookingMethods: ['churrasco', 'grelha', 'assado'],
    cookingTimePerKg: { min: 25, max: 35 },
    idealDoneness: ['ao ponto para mal', 'ao ponto'],
    recommendedOccasions: ['churrasco', 'almoço família', 'churrasqueira de quintal'],
    technicalDescription: 'Corte triangular com fibras bem definidas e gordura entremeada discreta. Suculenta quando preparada corretamente, com sabor delicado.',
    chefTip: 'Asse inteira e fatie após descanso. O corte contra a fibra é essencial.',
    pairing: ['vinho tinto leve', 'chimichurri', 'salada verde'],
    priceLevel: 3,
  },
  'fraldinha': {
    names: ['fraldinha', 'flank steak', 'vazio'],
    animalType: 'bovino',
    animalPart: 'Região ventral - entre costelas e traseiro',
    marbling: 2,
    texture: 'firme',
    flavorIntensity: 4,
    bestCookingMethods: ['churrasco', 'grelha', 'brasa'],
    cookingTimePerKg: { min: 30, max: 45 },
    idealDoneness: ['ao ponto', 'ao ponto para bem'],
    recommendedOccasions: ['churrasco tradicional', 'família', 'casual'],
    technicalDescription: 'Corte com fibras longas e aparentes, sabor intenso e tradicional do churrasco gaúcho. Exige conhecimento no preparo.',
    chefTip: 'Grelhe em fogo alto e rápido. Fatie bem fino contra as fibras.',
    pairing: ['cerveja gelada', 'vinho tinto jovem', 'farofa com bacon'],
    priceLevel: 2,
  },
  
  // ============== BOVINOS - COSTELA ==============
  'costela': {
    names: ['costela', 'costela de boi', 'short ribs'],
    animalType: 'bovino',
    animalPart: 'Caixa torácica - ossos e carne intercostal',
    marbling: 3,
    texture: 'macia',
    flavorIntensity: 5,
    bestCookingMethods: ['assado lento', 'defumado', 'brasa', 'costela de chão'],
    cookingTimePerKg: { min: 60, max: 90 },
    idealDoneness: ['bem passada', 'desfiando'],
    recommendedOccasions: ['churrasco longo', 'festa grande', 'celebração'],
    technicalDescription: 'Corte com osso, rica em colágeno que se transforma em gelatina com cocção lenta. Sabor incomparável quando bem preparada.',
    chefTip: 'Cozimento lento é obrigatório (mínimo 4h). Sal grosso 24h antes potencializa sabor.',
    pairing: ['vinho tinto robusto', 'cerveja escura', 'pão de alho'],
    priceLevel: 2,
  },
  'ancho': {
    names: ['ancho', 'bife ancho', 'ribeye', 'entrecôte'],
    animalType: 'bovino',
    animalPart: 'Costela - músculo entre as vértebras e costelas',
    marbling: 4,
    texture: 'macia',
    flavorIntensity: 5,
    bestCookingMethods: ['grelha', 'churrasco', 'frigideira', 'sous-vide'],
    cookingTimePerKg: { min: 12, max: 20 },
    idealDoneness: ['mal passada', 'ao ponto para mal'],
    recommendedOccasions: ['jantar especial', 'celebração', 'experiência gourmet'],
    technicalDescription: 'Um dos cortes mais nobres, com marmoreio intenso (gordura entremeada). Derrete na boca quando grelhado corretamente.',
    chefTip: 'Temperatura alta inicial, depois fogo baixo. A gordura deve caramelizar, não queimar.',
    pairing: ['Cabernet Sauvignon reserva', 'manteiga clarificada', 'flor de sal'],
    priceLevel: 5,
  },
  
  // ============== BOVINOS - DIANTEIRO ==============
  'acém': {
    names: ['acém', 'carne de panela', 'chuck'],
    animalType: 'bovino',
    animalPart: 'Dianteiro - pescoço e paleta',
    marbling: 2,
    texture: 'firme',
    flavorIntensity: 3,
    bestCookingMethods: ['panela', 'cozido', 'ensopado', 'moída'],
    cookingTimePerKg: { min: 90, max: 120 },
    idealDoneness: ['bem cozida', 'desfiando'],
    recommendedOccasions: ['dia a dia', 'almoço família', 'refeições caseiras'],
    technicalDescription: 'Corte econômico rico em colágeno. Transforma-se em carne macia e saborosa com cocção lenta.',
    chefTip: 'Sele bem antes de cozinhar. O caldo resultante é excelente para molhos.',
    pairing: ['vinho tinto simples', 'purê de batatas', 'arroz branco'],
    priceLevel: 1,
  },
  'paleta': {
    names: ['paleta', 'shoulder', 'raquete'],
    animalType: 'bovino',
    animalPart: 'Dianteiro - membro anterior',
    marbling: 2,
    texture: 'média',
    flavorIntensity: 3,
    bestCookingMethods: ['assado', 'panela', 'churrasco lento'],
    cookingTimePerKg: { min: 50, max: 70 },
    idealDoneness: ['ao ponto para bem', 'bem passada'],
    recommendedOccasions: ['almoço família', 'churrasco econômico'],
    technicalDescription: 'Corte saboroso com boa quantidade de tecido conjuntivo. Necessita cocção mais prolongada.',
    chefTip: 'Asse coberta com papel alumínio nas primeiras horas.',
    pairing: ['cerveja', 'vinho tinto jovem', 'legumes assados'],
    priceLevel: 2,
  },

  // ============== BOVINOS - MIÚDOS ESPECIAIS ==============
  'coracao': {
    names: ['coração', 'coração de boi'],
    animalType: 'bovino',
    animalPart: 'Víscera - músculo cardíaco',
    marbling: 0,
    texture: 'firme',
    flavorIntensity: 3,
    bestCookingMethods: ['churrasco', 'grelha', 'espetinho'],
    cookingTimePerKg: { min: 8, max: 15 },
    idealDoneness: ['ao ponto'],
    recommendedOccasions: ['churrasco completo', 'aperitivo'],
    technicalDescription: 'Músculo denso e magro. Limpar bem removendo gordura e nervos. Cortar em cubos ou rodelas.',
    chefTip: 'Marinar por 2h mínimo. Não passar do ponto para evitar ressecamento.',
    pairing: ['cerveja', 'pimenta', 'vinagrete'],
    priceLevel: 1,
  },

  // ============== SUÍNOS ==============
  'pernil': {
    names: ['pernil', 'pernil suíno', 'perna de porco'],
    animalType: 'suino',
    animalPart: 'Pata traseira',
    marbling: 2,
    texture: 'média',
    flavorIntensity: 3,
    bestCookingMethods: ['assado', 'forno', 'defumado'],
    cookingTimePerKg: { min: 40, max: 55 },
    idealDoneness: ['bem passada'],
    recommendedOccasions: ['festa', 'natal', 'celebração', 'família grande'],
    technicalDescription: 'Corte grande ideal para assar inteiro. Couro crocante quando preparado corretamente.',
    chefTip: 'Faça cortes no couro para deixar crocante. Temperature interna deve atingir 75°C.',
    pairing: ['vinho branco', 'sidra', 'farofa de bacon', 'maionese caseira'],
    priceLevel: 2,
  },
  'lombo_suino': {
    names: ['lombo suíno', 'lombo de porco', 'pork loin'],
    animalType: 'suino',
    animalPart: 'Dorso - músculo lombar',
    marbling: 1,
    texture: 'macia',
    flavorIntensity: 2,
    bestCookingMethods: ['assado', 'grelhado', 'recheado', 'sous-vide'],
    cookingTimePerKg: { min: 30, max: 40 },
    idealDoneness: ['ao ponto', 'levemente rosado'],
    recommendedOccasions: ['jantar especial', 'almoço elegante'],
    technicalDescription: 'Corte magro e macio, aceita bem recheios e marinadas. Sabor suave e versátil.',
    chefTip: 'Não ultrapasse temperatura interna de 63°C para manter suculência.',
    pairing: ['vinho branco', 'mostarda dijon', 'maçãs assadas', 'purê'],
    priceLevel: 3,
  },
  'costela_suina': {
    names: ['costela suína', 'costelinha', 'spare ribs'],
    animalType: 'suino',
    animalPart: 'Caixa torácica',
    marbling: 3,
    texture: 'macia',
    flavorIntensity: 4,
    bestCookingMethods: ['defumado', 'assado lento', 'churrasco', 'barbecue'],
    cookingTimePerKg: { min: 60, max: 90 },
    idealDoneness: ['bem passada', 'soltando do osso'],
    recommendedOccasions: ['churrasco americano', 'festa', 'casual'],
    technicalDescription: 'Corte suculento com gordura entremeada. Ideal para defumação e molhos barbecue.',
    chefTip: 'Retire a membrana do lado interno. Cozimento baixo e lento é o segredo.',
    pairing: ['cerveja IPA', 'molho barbecue', 'coleslaw', 'milho'],
    priceLevel: 2,
  },
  'panceta': {
    names: ['panceta', 'barriga de porco', 'pork belly'],
    animalType: 'suino',
    animalPart: 'Região ventral',
    marbling: 4,
    texture: 'macia',
    flavorIntensity: 5,
    bestCookingMethods: ['assado', 'brasa', 'confitada', 'crispy'],
    cookingTimePerKg: { min: 45, max: 60 },
    idealDoneness: ['bem passada', 'couro crocante'],
    recommendedOccasions: ['festa', 'churrasco gourmet', 'experiência'],
    technicalDescription: 'Camadas alternadas de carne e gordura. Couro transforma-se em torresmo quando bem preparada.',
    chefTip: 'Seque bem a pele antes de assar. Temperatura alta no final para torresmo.',
    pairing: ['cerveja pilsen', 'cachaça', 'limão', 'pimenta'],
    priceLevel: 2,
  },

  // ============== AVES ==============
  'frango_inteiro': {
    names: ['frango inteiro', 'frango caipira', 'galinha'],
    animalType: 'ave',
    animalPart: 'Ave inteira',
    marbling: 1,
    texture: 'macia',
    flavorIntensity: 2,
    bestCookingMethods: ['assado', 'grelha', 'defumado', 'recheado'],
    cookingTimePerKg: { min: 30, max: 40 },
    idealDoneness: ['bem passada'],
    recommendedOccasions: ['almoço família', 'dia a dia', 'festas'],
    technicalDescription: 'Carne magra e versátil. Frango caipira tem sabor mais intenso e carne mais firme.',
    chefTip: 'Tempere por baixo da pele. Amarre as pernas para assar uniforme.',
    pairing: ['vinho branco', 'limão siciliano', 'ervas frescas'],
    priceLevel: 2,
  },
  'coxa_sobrecoxa': {
    names: ['coxa', 'sobrecoxa', 'tulipa', 'coxinha da asa'],
    animalType: 'ave',
    animalPart: 'Membros posteriores',
    marbling: 1,
    texture: 'macia',
    flavorIntensity: 2,
    bestCookingMethods: ['churrasco', 'grelha', 'frito', 'assado'],
    cookingTimePerKg: { min: 25, max: 35 },
    idealDoneness: ['bem passada'],
    recommendedOccasions: ['churrasco', 'almoço rápido', 'dia a dia'],
    technicalDescription: 'Partes mais suculentas do frango devido ao teor de gordura. Ideais para grelha.',
    chefTip: 'Deixe a pele para manter umidade. Vire apenas uma vez na grelha.',
    pairing: ['cerveja', 'farofa', 'vinagrete', 'arroz'],
    priceLevel: 1,
  },
  'asa_frango': {
    names: ['asa de frango', 'tulipa', 'wing'],
    animalType: 'ave',
    animalPart: 'Membros anteriores',
    marbling: 1,
    texture: 'macia',
    flavorIntensity: 2,
    bestCookingMethods: ['churrasco', 'frito', 'buffalo'],
    cookingTimePerKg: { min: 15, max: 25 },
    idealDoneness: ['bem passada', 'crocante'],
    recommendedOccasions: ['aperitivo', 'churrasco', 'petisco'],
    technicalDescription: 'Carne saborosa com pele que fica crocante. Excelente para temperos intensos.',
    chefTip: 'Seque bem antes de grelhar. Pele crocante é o objetivo.',
    pairing: ['cerveja gelada', 'molho buffalo', 'blue cheese'],
    priceLevel: 1,
  },

  // ============== CORDEIRO ==============
  'pernil_cordeiro': {
    names: ['pernil de cordeiro', 'leg of lamb', 'gigot'],
    animalType: 'cordeiro',
    animalPart: 'Pata traseira',
    marbling: 2,
    texture: 'macia',
    flavorIntensity: 4,
    bestCookingMethods: ['assado', 'grelha', 'sous-vide'],
    cookingTimePerKg: { min: 35, max: 50 },
    idealDoneness: ['ao ponto para mal', 'ao ponto'],
    recommendedOccasions: ['páscoa', 'jantar especial', 'celebração'],
    technicalDescription: 'Carne delicada com sabor característico. Combina perfeitamente com alecrim e alho.',
    chefTip: 'Marinar com ervas mediterrâneas. Servir rosado no centro.',
    pairing: ['vinho tinto robusto', 'alecrim', 'alho', 'batatas rústicas'],
    priceLevel: 5,
  },
  'carre_cordeiro': {
    names: ['carré de cordeiro', 'rack of lamb', 'costela de cordeiro'],
    animalType: 'cordeiro',
    animalPart: 'Costelas',
    marbling: 3,
    texture: 'macia',
    flavorIntensity: 5,
    bestCookingMethods: ['grelha', 'forno', 'sous-vide'],
    cookingTimePerKg: { min: 20, max: 30 },
    idealDoneness: ['mal passada', 'ao ponto para mal'],
    recommendedOccasions: ['jantar gourmet', 'celebração especial'],
    technicalDescription: 'Corte premium com ossos limpos (frenched). Extremamente macio e saboroso.',
    chefTip: 'Sele em temperatura alta, finalize no forno. Crosta de ervas é clássica.',
    pairing: ['Bordeaux', 'redução de vinho', 'hortelã'],
    priceLevel: 5,
  },

  // ============== LINGUIÇAS ==============
  'linguica_toscana': {
    names: ['linguiça toscana', 'toscana', 'linguiça de porco'],
    animalType: 'suino',
    animalPart: 'Preparada - carne suína moída',
    marbling: 3,
    texture: 'média',
    flavorIntensity: 3,
    bestCookingMethods: ['churrasco', 'grelha', 'frita', 'cozida'],
    cookingTimePerKg: { min: 15, max: 25 },
    idealDoneness: ['bem passada'],
    recommendedOccasions: ['churrasco', 'almoço casual', 'aperitivo'],
    technicalDescription: 'Embutido temperado tradicional brasileiro. Sabor equilibrado e suculento.',
    chefTip: 'Fure levemente para evitar estourar. Não deixe secar demais.',
    pairing: ['cerveja', 'farofa', 'vinagrete', 'pão de alho'],
    priceLevel: 2,
  },
  'linguica_cuiabana': {
    names: ['linguiça cuiabana', 'cuiabana', 'linguiça de carne'],
    animalType: 'bovino',
    animalPart: 'Preparada - carne bovina moída',
    marbling: 2,
    texture: 'firme',
    flavorIntensity: 3,
    bestCookingMethods: ['churrasco', 'grelha'],
    cookingTimePerKg: { min: 15, max: 20 },
    idealDoneness: ['bem passada'],
    recommendedOccasions: ['churrasco', 'petisco'],
    technicalDescription: 'Linguiça de carne bovina com temperos regionais. Sabor mais intenso que a toscana.',
    chefTip: 'Grelhe em fogo médio para cozinhar por igual.',
    pairing: ['cerveja', 'cachaça', 'pimenta'],
    priceLevel: 2,
  },
};

/**
 * Busca conhecimento sobre um corte de carne pelo nome
 */
export function findMeatKnowledge(meatName: string): MeatCutKnowledge | null {
  const normalizedName = meatName.toLowerCase().trim();
  
  for (const [key, knowledge] of Object.entries(MEAT_KNOWLEDGE_BASE)) {
    // Check if the key matches
    if (key === normalizedName) return knowledge;
    
    // Check if any of the names match
    const matchesName = knowledge.names.some(name => 
      normalizedName.includes(name.toLowerCase()) ||
      name.toLowerCase().includes(normalizedName)
    );
    
    if (matchesName) return knowledge;
  }
  
  return null;
}

/**
 * Gera descrição educativa para um corte de carne
 */
export function generateMeatDescription(meatName: string): string {
  const knowledge = findMeatKnowledge(meatName);
  
  if (!knowledge) {
    return 'Corte selecionado de alta qualidade.';
  }
  
  const textureText = knowledge.texture === 'macia' 
    ? 'textura macia e suculenta'
    : knowledge.texture === 'média'
    ? 'textura equilibrada'
    : 'textura firme e consistente';
  
  const flavorText = knowledge.flavorIntensity >= 4
    ? 'sabor intenso e marcante'
    : knowledge.flavorIntensity >= 3
    ? 'sabor bem desenvolvido'
    : 'sabor suave e delicado';
  
  const methodsText = knowledge.bestCookingMethods.slice(0, 2).join(' ou ');
  
  return `${knowledge.technicalDescription} Apresenta ${textureText} com ${flavorText}. Ideal para ${methodsText}. ${knowledge.chefTip}`;
}

/**
 * Calcula quantidade recomendada por pessoa baseado no tipo de evento
 */
export function calculateQuantityPerPerson(
  occasion: string,
  animalType: 'bovino' | 'suino' | 'ave' | 'cordeiro' | 'peixe'
): number {
  const baseQuantities: Record<string, Record<string, number>> = {
    'churrasco': { bovino: 450, suino: 300, ave: 350, cordeiro: 350, peixe: 250 },
    'churrasco_amigos': { bovino: 500, suino: 350, ave: 400, cordeiro: 400, peixe: 300 },
    'familia': { bovino: 350, suino: 250, ave: 300, cordeiro: 300, peixe: 200 },
    'jantar_especial': { bovino: 300, suino: 250, ave: 280, cordeiro: 280, peixe: 200 },
    'dia_a_dia': { bovino: 250, suino: 200, ave: 250, cordeiro: 250, peixe: 180 },
    'festa': { bovino: 400, suino: 300, ave: 350, cordeiro: 350, peixe: 250 },
  };
  
  const quantities = baseQuantities[occasion] || baseQuantities['familia'];
  return quantities[animalType] || 300;
}

/**
 * Retorna dica de harmonização baseada no corte
 */
export function getPairingTip(meatName: string): string {
  const knowledge = findMeatKnowledge(meatName);
  
  if (!knowledge || knowledge.pairing.length === 0) {
    return 'Harmoniza bem com vinho tinto e cerveja gelada.';
  }
  
  return `Harmoniza perfeitamente com ${knowledge.pairing.slice(0, 3).join(', ')}.`;
}
