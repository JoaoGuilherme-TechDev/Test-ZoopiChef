import { useMemo, useState, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Loader2, Wine, Pizza, Coffee, Droplets, HelpCircle, GlassWater, Sandwich, Cake, Salad, Sunrise } from 'lucide-react';
import { useProductTags } from '../../hooks/useProductTags';
import { addProductTag, removeProductTag } from '../../services/tagService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-shim';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Expanded product types for better categorization
type ProductType = 'vinho' | 'bebida' | 'prato_principal' | 'lanche' | 'entrada' | 'sobremesa' | 'cafe_manha' | 'desconhecido';

interface Props {
  productId: string;
  productName?: string;
  productDescription?: string;
  categoryName?: string; // Category from the product
}

// ==================== FOOD CHARACTERISTICS ====================
const COMIDA_PROTEINA = [
  { value: 'carne_vermelha', label: 'Carne Vermelha' },
  { value: 'carne_branca', label: 'Carne Branca (Porco, etc)' },
  { value: 'aves', label: 'Aves (Frango, Pato)' },
  { value: 'peixe', label: 'Peixe' },
  { value: 'frutos_do_mar', label: 'Frutos do Mar' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'queijos', label: 'Queijos' },
  { value: 'embutidos', label: 'Embutidos' },
  { value: 'massa', label: 'Massa' },
  { value: 'sem_proteina', label: 'Sem proteína principal' },
];

const COMIDA_PREPARO = [
  { value: 'grelhado', label: 'Grelhado / Churrasco' },
  { value: 'assado', label: 'Assado no Forno' },
  { value: 'frito', label: 'Frito' },
  { value: 'cozido', label: 'Cozido / Ensopado' },
  { value: 'cru', label: 'Cru (Carpaccio, Sushi)' },
  { value: 'defumado', label: 'Defumado' },
  { value: 'refogado', label: 'Refogado / Salteado' },
];

const COMIDA_MOLHO = [
  { value: 'tomate', label: 'Molho de Tomate' },
  { value: 'cream', label: 'Molho Branco / Cream' },
  { value: 'azeite', label: 'Azeite / Alho' },
  { value: 'manteiga', label: 'Manteiga' },
  { value: 'agridoce', label: 'Agridoce' },
  { value: 'picante', label: 'Picante / Apimentado' },
  { value: 'ervas', label: 'Ervas Finas' },
  { value: 'sem_molho', label: 'Sem molho' },
];

const COMIDA_GORDURA = [
  { value: 'gorduroso', label: 'Gorduroso / Pesado' },
  { value: 'equilibrado', label: 'Equilibrado' },
  { value: 'leve', label: 'Leve / Magro' },
];

const COMIDA_SABOR = [
  { value: 'salgado', label: 'Salgado' },
  { value: 'umami', label: 'Umami (Intenso)' },
  { value: 'acido', label: 'Ácido / Cítrico' },
  { value: 'doce', label: 'Doce' },
  { value: 'picante', label: 'Picante' },
  { value: 'defumado', label: 'Defumado' },
  { value: 'neutro', label: 'Neutro / Suave' },
];

const COMIDA_TEMPERATURA = [
  { value: 'quente', label: 'Servido Quente' },
  { value: 'frio', label: 'Servido Frio' },
  { value: 'ambiente', label: 'Temperatura Ambiente' },
];

const COMIDA_INTENSIDADE = [
  { value: 'leve', label: 'Leve (saladas, peixes leves)' },
  { value: 'medio', label: 'Médio (massas, aves)' },
  { value: 'intenso', label: 'Intenso (carnes, churrasco)' },
];

// ==================== LANCHE (Sandwiches) CHARACTERISTICS ====================
const LANCHE_TIPO = [
  { value: 'hamburguer', label: 'Hambúrguer' },
  { value: 'sanduiche', label: 'Sanduíche' },
  { value: 'hot_dog', label: 'Hot Dog' },
  { value: 'wrap', label: 'Wrap' },
  { value: 'tapioca', label: 'Tapioca' },
  { value: 'crepe', label: 'Crepe Salgado' },
  { value: 'coxinha', label: 'Coxinha/Salgado' },
  { value: 'bauru', label: 'Bauru' },
  { value: 'misto_quente', label: 'Misto Quente' },
  { value: 'pao_na_chapa', label: 'Pão na Chapa' },
];

const LANCHE_PAO = [
  { value: 'brioche', label: 'Brioche' },
  { value: 'australiano', label: 'Australiano' },
  { value: 'integral', label: 'Integral' },
  { value: 'ciabatta', label: 'Ciabatta' },
  { value: 'frances', label: 'Francês' },
  { value: 'baguete', label: 'Baguete' },
  { value: 'pao_forma', label: 'Pão de Forma' },
  { value: 'sem_pao', label: 'Sem pão (Low Carb)' },
];

const LANCHE_PROTEINA = [
  { value: 'carne_bovina', label: 'Carne Bovina' },
  { value: 'frango', label: 'Frango' },
  { value: 'porco', label: 'Porco/Bacon' },
  { value: 'peixe', label: 'Peixe' },
  { value: 'ovo', label: 'Ovo' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
];

const LANCHE_EXTRAS = [
  { value: 'queijo', label: 'Com Queijo' },
  { value: 'bacon', label: 'Com Bacon' },
  { value: 'ovo', label: 'Com Ovo' },
  { value: 'duplo', label: 'Duplo' },
  { value: 'triplo', label: 'Triplo' },
];

const LANCHE_ACOMPANHAMENTO = [
  { value: 'fritas', label: 'Batata Frita' },
  { value: 'onion_rings', label: 'Onion Rings' },
  { value: 'salada', label: 'Salada' },
  { value: 'mandioca', label: 'Mandioca Frita' },
  { value: 'sem_acompanhamento', label: 'Sem Acompanhamento' },
];

// ==================== SOBREMESA (Dessert) CHARACTERISTICS ====================
const SOBREMESA_TIPO = [
  { value: 'torta', label: 'Torta' },
  { value: 'bolo', label: 'Bolo' },
  { value: 'sorvete', label: 'Sorvete' },
  { value: 'mousse', label: 'Mousse' },
  { value: 'pudim', label: 'Pudim' },
  { value: 'brownie', label: 'Brownie' },
  { value: 'petit_gateau', label: 'Petit Gateau' },
  { value: 'cheesecake', label: 'Cheesecake' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'doce_colher', label: 'Doce de Colher' },
  { value: 'bombom', label: 'Bombom/Trufa' },
  { value: 'pavê', label: 'Pavê' },
  { value: 'crepe_doce', label: 'Crepe Doce' },
  { value: 'waffle', label: 'Waffle' },
  { value: 'panqueca', label: 'Panqueca' },
];

const SOBREMESA_BASE = [
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'frutas_vermelhas', label: 'Frutas Vermelhas' },
  { value: 'frutas_tropicais', label: 'Frutas Tropicais' },
  { value: 'doce_leite', label: 'Doce de Leite' },
  { value: 'creme', label: 'Creme/Baunilha' },
  { value: 'cafe', label: 'Café' },
  { value: 'limao', label: 'Limão' },
  { value: 'maracuja', label: 'Maracujá' },
  { value: 'coco', label: 'Coco' },
  { value: 'caramelo', label: 'Caramelo' },
];

const SOBREMESA_TEMPERATURA = [
  { value: 'quente', label: 'Quente' },
  { value: 'gelado', label: 'Gelado' },
  { value: 'ambiente', label: 'Temperatura Ambiente' },
];

const SOBREMESA_TEXTURA = [
  { value: 'cremoso', label: 'Cremoso' },
  { value: 'crocante', label: 'Crocante' },
  { value: 'macio', label: 'Macio/Fofinho' },
  { value: 'aerado', label: 'Aerado' },
  { value: 'denso', label: 'Denso' },
];

const SOBREMESA_DOCURA = [
  { value: 'muito_doce', label: 'Muito Doce' },
  { value: 'equilibrado', label: 'Equilibrado' },
  { value: 'pouco_doce', label: 'Pouco Doce' },
];

// ==================== ENTRADA/PETISCO CHARACTERISTICS ====================
const ENTRADA_TIPO = [
  { value: 'porcao', label: 'Porção' },
  { value: 'tabua', label: 'Tábua' },
  { value: 'carpaccio', label: 'Carpaccio' },
  { value: 'bruschetta', label: 'Bruschetta' },
  { value: 'canape', label: 'Canapé' },
  { value: 'ceviche', label: 'Ceviche' },
  { value: 'bolinho', label: 'Bolinho/Croquete' },
  { value: 'salada', label: 'Salada' },
  { value: 'sopa', label: 'Sopa/Caldo' },
  { value: 'tartar', label: 'Tartar' },
  { value: 'empanado', label: 'Empanado' },
];

const ENTRADA_PROTEINA = [
  { value: 'carne', label: 'Carne' },
  { value: 'frango', label: 'Frango' },
  { value: 'peixe', label: 'Peixe' },
  { value: 'frutos_mar', label: 'Frutos do Mar' },
  { value: 'queijos', label: 'Queijos' },
  { value: 'embutidos', label: 'Embutidos' },
  { value: 'vegetariano', label: 'Vegetariano' },
];

const ENTRADA_TAMANHO = [
  { value: 'individual', label: 'Individual' },
  { value: 'para_dois', label: 'Para 2 pessoas' },
  { value: 'para_compartilhar', label: 'Para compartilhar (mesa)' },
];

const ENTRADA_TEMPERATURA = [
  { value: 'quente', label: 'Quente' },
  { value: 'frio', label: 'Frio' },
  { value: 'misto', label: 'Misto' },
];

const ENTRADA_PREPARO = [
  { value: 'frito', label: 'Frito' },
  { value: 'assado', label: 'Assado' },
  { value: 'cru', label: 'Cru' },
  { value: 'grelhado', label: 'Grelhado' },
];

// ==================== CAFÉ DA MANHÃ CHARACTERISTICS ====================
const CAFE_MANHA_TIPO = [
  { value: 'pao', label: 'Pão/Torrada' },
  { value: 'bolo', label: 'Bolo' },
  { value: 'tapioca', label: 'Tapioca' },
  { value: 'ovos', label: 'Ovos' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'iogurte', label: 'Iogurte/Açaí' },
  { value: 'granola', label: 'Granola/Cereal' },
  { value: 'panqueca', label: 'Panqueca' },
  { value: 'waffle', label: 'Waffle' },
  { value: 'combo', label: 'Combo Completo' },
  { value: 'crepioca', label: 'Crepioca' },
];

const CAFE_MANHA_ESTILO = [
  { value: 'doce', label: 'Doce' },
  { value: 'salgado', label: 'Salgado' },
  { value: 'misto', label: 'Misto' },
];

const CAFE_MANHA_PORCAO = [
  { value: 'individual', label: 'Individual' },
  { value: 'para_dois', label: 'Para 2' },
  { value: 'familia', label: 'Família' },
];

// Auto-fill defaults for each type
const LANCHE_DEFAULTS: Record<string, { pao?: string; acompanhamento?: string }> = {
  hamburguer: { pao: 'brioche', acompanhamento: 'fritas' },
  sanduiche: { pao: 'frances', acompanhamento: 'sem_acompanhamento' },
  hot_dog: { pao: 'frances', acompanhamento: 'fritas' },
  wrap: { pao: 'sem_pao', acompanhamento: 'salada' },
  misto_quente: { pao: 'pao_forma', acompanhamento: 'sem_acompanhamento' },
};

const SOBREMESA_DEFAULTS: Record<string, { temperatura?: string; textura?: string; docura?: string }> = {
  petit_gateau: { temperatura: 'quente', textura: 'cremoso', docura: 'equilibrado' },
  sorvete: { temperatura: 'gelado', textura: 'cremoso', docura: 'equilibrado' },
  mousse: { temperatura: 'gelado', textura: 'aerado', docura: 'equilibrado' },
  brownie: { temperatura: 'ambiente', textura: 'denso', docura: 'muito_doce' },
  pudim: { temperatura: 'gelado', textura: 'cremoso', docura: 'muito_doce' },
  torta: { temperatura: 'ambiente', textura: 'macio', docura: 'equilibrado' },
  cheesecake: { temperatura: 'gelado', textura: 'cremoso', docura: 'equilibrado' },
};

// BEVERAGE OPTIONS - Expanded list (Operator fills)
const BEBIDA_TIPO = [
  { value: 'agua_sem_gas', label: 'Água sem Gás' },
  { value: 'agua_com_gas', label: 'Água com Gás' },
  { value: 'suco', label: 'Suco Natural' },
  { value: 'refrigerante', label: 'Refrigerante' },
  { value: 'cha_quente', label: 'Chá Quente' },
  { value: 'cha_gelado', label: 'Chá Gelado' },
  { value: 'cafe_expresso', label: 'Café Expresso' },
  { value: 'cafe_coado', label: 'Café Coado' },
  { value: 'cappuccino', label: 'Cappuccino' },
  { value: 'leite', label: 'Leite' },
  { value: 'achocolatado', label: 'Achocolatado' },
  { value: 'kombucha', label: 'Kombucha' },
  { value: 'kefir', label: 'Kefir' },
  { value: 'fermentado', label: 'Fermentado' },
  { value: 'cerveja', label: 'Cerveja' },
  { value: 'cerveja_artesanal', label: 'Cerveja Artesanal' },
  { value: 'chopp', label: 'Chopp' },
  { value: 'drink_leve', label: 'Drink Leve' },
  { value: 'drink_forte', label: 'Drink Forte' },
  { value: 'whisky', label: 'Whisky' },
  { value: 'vodka', label: 'Vodka' },
  { value: 'gin', label: 'Gin' },
  { value: 'rum', label: 'Rum' },
  { value: 'cachaca', label: 'Cachaça' },
  { value: 'licor', label: 'Licor' },
  { value: 'energetico', label: 'Energético' },
  { value: 'isotonico', label: 'Isotônico' },
  { value: 'smoothie', label: 'Smoothie' },
  { value: 'vitamina', label: 'Vitamina' },
  { value: 'milkshake', label: 'Milkshake' },
  { value: 'mocktail', label: 'Coquetel sem Álcool' },
];

// Auto-fill defaults when beverage type is selected
const BEVERAGE_DEFAULTS: Record<string, {
  temperatura?: string;
  carbonatacao?: string;
  docura?: string;
  intensidade?: string;
}> = {
  agua_sem_gas: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'leve' },
  agua_com_gas: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'sem_acucar', intensidade: 'leve' },
  suco: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'medio' },
  refrigerante: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'doce', intensidade: 'medio' },
  cha_quente: { temperatura: 'quente', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'leve' },
  cha_gelado: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'leve' },
  cafe_expresso: { temperatura: 'quente', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'forte' },
  cafe_coado: { temperatura: 'quente', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'medio' },
  cappuccino: { temperatura: 'quente', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'medio' },
  leite: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'leve' },
  achocolatado: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'doce', intensidade: 'medio' },
  kombucha: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'pouco_doce', intensidade: 'medio' },
  kefir: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'medio' },
  fermentado: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'pouco_doce', intensidade: 'medio' },
  cerveja: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'sem_acucar', intensidade: 'medio' },
  cerveja_artesanal: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'sem_acucar', intensidade: 'forte' },
  chopp: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'sem_acucar', intensidade: 'medio' },
  drink_leve: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'leve' },
  drink_forte: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'forte' },
  whisky: { temperatura: 'ambiente', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'forte' },
  vodka: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'forte' },
  gin: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'forte' },
  rum: { temperatura: 'ambiente', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'forte' },
  cachaca: { temperatura: 'ambiente', carbonatacao: 'sem_gas', docura: 'sem_acucar', intensidade: 'forte' },
  licor: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'muito_doce', intensidade: 'forte' },
  energetico: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'doce', intensidade: 'forte' },
  isotonico: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'leve' },
  smoothie: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'medio' },
  vitamina: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'pouco_doce', intensidade: 'medio' },
  milkshake: { temperatura: 'gelada', carbonatacao: 'sem_gas', docura: 'doce', intensidade: 'medio' },
  mocktail: { temperatura: 'gelada', carbonatacao: 'com_gas', docura: 'pouco_doce', intensidade: 'medio' },
};

// Beverage characteristics (Operator fills)
const BEBIDA_TEMPERATURA = [
  { value: 'gelada', label: 'Gelada' },
  { value: 'ambiente', label: 'Ambiente' },
  { value: 'quente', label: 'Quente' },
];

const BEBIDA_CARBONATACAO = [
  { value: 'com_gas', label: 'Com Gás' },
  { value: 'sem_gas', label: 'Sem Gás' },
];

const BEBIDA_DOCURA = [
  { value: 'sem_acucar', label: 'Sem Açúcar' },
  { value: 'pouco_doce', label: 'Pouco Doce' },
  { value: 'doce', label: 'Doce' },
  { value: 'muito_doce', label: 'Muito Doce' },
];

const BEBIDA_INTENSIDADE = [
  { value: 'leve', label: 'Leve/Neutro' },
  { value: 'medio', label: 'Médio' },
  { value: 'forte', label: 'Forte/Marcante' },
];

function isSelected(tags: { tag_type: string; tag_value: string }[], type: string, value: string) {
  return tags.some((t) => t.tag_type === type && t.tag_value === value);
}

function detectProductType(categoryName?: string, tags?: { tag_type: string; tag_value: string }[]): ProductType {
  const catLower = (categoryName || '').toLowerCase();
  
  // Check existing tags first - support both old 'comida' and new specific types
  const categoriaTag = tags?.find(t => t.tag_type === 'categoria')?.tag_value;
  if (categoriaTag) {
    if (categoriaTag === 'vinho') return 'vinho';
    if (categoriaTag === 'bebida') return 'bebida';
    if (categoriaTag === 'lanche') return 'lanche';
    if (categoriaTag === 'sobremesa') return 'sobremesa';
    if (categoriaTag === 'entrada') return 'entrada';
    if (categoriaTag === 'cafe_manha') return 'cafe_manha';
    if (categoriaTag === 'prato_principal') return 'prato_principal';
    // Legacy 'comida' tag maps to prato_principal
    if (categoriaTag === 'comida') return 'prato_principal';
  }
  
  // Detect from category name - more specific categories first
  if (catLower.includes('vinho') || catLower.includes('wine')) return 'vinho';
  if (catLower.includes('água') || catLower.includes('agua') || catLower.includes('bebida') || catLower.includes('suco') || catLower.includes('refrigerante')) return 'bebida';
  if (catLower.includes('lanche') || catLower.includes('hamburguer') || catLower.includes('sanduiche') || catLower.includes('hot dog')) return 'lanche';
  if (catLower.includes('sobremesa') || catLower.includes('doce') || catLower.includes('torta') || catLower.includes('sorvete')) return 'sobremesa';
  if (catLower.includes('entrada') || catLower.includes('petisco') || catLower.includes('porção') || catLower.includes('aperitivo')) return 'entrada';
  if (catLower.includes('café da manhã') || catLower.includes('cafe da manha') || catLower.includes('breakfast')) return 'cafe_manha';
  if (catLower.includes('prato') || catLower.includes('carne') || catLower.includes('massa') || catLower.includes('pizza') || catLower.includes('salada') || catLower.includes('comida')) return 'prato_principal';
  
  return 'desconhecido';
}

export function ProductSommelierTagsTab({ productId, productName, productDescription, categoryName }: Props) {
  const { data: company } = useCompany();
  const { data: tags = [], isLoading } = useProductTags(productId);
  const queryClient = useQueryClient();
  
  const [isEnriching, setIsEnriching] = useState(false);
  const [manualType, setManualType] = useState<ProductType | null>(null);

  // Detect product type
  const detectedType = useMemo(() => detectProductType(categoryName, tags), [categoryName, tags]);
  const productType = manualType || detectedType;

  const addTag = useMutation({
    mutationFn: async (input: { tag_type: string; tag_value: string }) => {
      if (!company?.id) throw new Error('Empresa não carregada');
      return addProductTag({
        company_id: company.id,
        product_id: productId,
        tag_type: input.tag_type,
        tag_value: input.tag_value,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product_tags', productId] });
      await queryClient.invalidateQueries({ queryKey: ['sommelier_wines'] });
      await queryClient.invalidateQueries({ queryKey: ['sommelier_suggestions'] });
    },
    onError: () => toast.error('Erro ao adicionar tag'),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => removeProductTag(tagId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product_tags', productId] });
      await queryClient.invalidateQueries({ queryKey: ['sommelier_wines'] });
      await queryClient.invalidateQueries({ queryKey: ['sommelier_suggestions'] });
    },
    onError: () => toast.error('Erro ao remover tag'),
  });

  const onToggle = (type: string, value: string) => {
    const existing = tags.find((t) => t.tag_type === type && t.tag_value === value);
    if (existing) removeTag.mutate(existing.id);
    else addTag.mutate({ tag_type: type, tag_value: value });
  };

  // Set category tag when manual type is selected
  const handleSetProductType = (type: ProductType) => {
    setManualType(type);
    // Remove old category tag if exists
    const oldCatTag = tags.find(t => t.tag_type === 'categoria');
    if (oldCatTag) {
      removeTag.mutate(oldCatTag.id);
    }
    // Add new category tag
    if (type !== 'desconhecido') {
      setTimeout(() => {
        addTag.mutate({ tag_type: 'categoria', tag_value: type });
      }, 100);
    }
  };

  // AI Enrich based on product type
  const handleAIEnrich = async () => {
    if (!productName) {
      toast.error('Nome do produto não disponível');
      return;
    }
    
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('sommelier-ai-enrich', {
        body: {
          wine: {
            name: productName,
            description: productDescription,
            existingTags: tags.map(t => ({ tag_type: t.tag_type, tag_value: t.tag_value })),
            companyId: company?.id,
            productType: productType, // Pass the detected type
          }
        }
      });

      if (error) throw error;
      if (!data?.success || !data?.data) throw new Error(data?.error || 'Erro ao processar IA');

      const enriched = data.data;
      const tagsToAdd: { tag_type: string; tag_value: string }[] = [];

      // Process based on product type
      if (productType === 'vinho') {
        // Wine-specific enrichment
        if (enriched.tipo && !isSelected(tags, 'tipo', enriched.tipo)) {
          tagsToAdd.push({ tag_type: 'tipo', tag_value: enriched.tipo });
        }
        if (enriched.uva && !isSelected(tags, 'uva', enriched.uva)) {
          tagsToAdd.push({ tag_type: 'uva', tag_value: enriched.uva });
        }
        if (enriched.origem && !isSelected(tags, 'origem', enriched.origem)) {
          tagsToAdd.push({ tag_type: 'origem', tag_value: enriched.origem });
        }
        if (enriched.corpo && !isSelected(tags, 'corpo', enriched.corpo)) {
          tagsToAdd.push({ tag_type: 'corpo', tag_value: enriched.corpo });
        }
        if (enriched.docura && !isSelected(tags, 'docura', enriched.docura)) {
          tagsToAdd.push({ tag_type: 'docura', tag_value: enriched.docura });
        }
        if (enriched.taninos && !isSelected(tags, 'taninos', enriched.taninos)) {
          tagsToAdd.push({ tag_type: 'taninos', tag_value: enriched.taninos });
        }
        if (enriched.acidez && !isSelected(tags, 'acidez', enriched.acidez)) {
          tagsToAdd.push({ tag_type: 'acidez', tag_value: enriched.acidez });
        }
        if (enriched.temperatura_servir && !isSelected(tags, 'temperatura', enriched.temperatura_servir)) {
          tagsToAdd.push({ tag_type: 'temperatura', tag_value: enriched.temperatura_servir });
        }
        if (enriched.tempo_decantacao && !isSelected(tags, 'decantacao', enriched.tempo_decantacao)) {
          tagsToAdd.push({ tag_type: 'decantacao', tag_value: enriched.tempo_decantacao });
        }
        if (enriched.descricao_sensorial && !isSelected(tags, 'descricao_sensorial', enriched.descricao_sensorial)) {
          tagsToAdd.push({ tag_type: 'descricao_sensorial', tag_value: enriched.descricao_sensorial });
        }
        if (enriched.historia_vinho && !isSelected(tags, 'historia_vinho', enriched.historia_vinho)) {
          tagsToAdd.push({ tag_type: 'historia_vinho', tag_value: enriched.historia_vinho });
        }
        if (enriched.notas_sommelier && !isSelected(tags, 'notas_sommelier', enriched.notas_sommelier)) {
          tagsToAdd.push({ tag_type: 'notas_sommelier', tag_value: enriched.notas_sommelier });
        }
        if (enriched.aromas?.length) {
          for (const aroma of enriched.aromas) {
            if (!isSelected(tags, 'aroma', aroma)) {
              tagsToAdd.push({ tag_type: 'aroma', tag_value: aroma });
            }
          }
        }
        if (enriched.harmoniza_com?.length) {
          for (const item of enriched.harmoniza_com) {
            if (!isSelected(tags, 'harmoniza_com', item)) {
              tagsToAdd.push({ tag_type: 'harmoniza_com', tag_value: item });
            }
          }
        }
        if (enriched.evitar_com?.length) {
          for (const item of enriched.evitar_com) {
            if (!isSelected(tags, 'evitar_com', item)) {
              tagsToAdd.push({ tag_type: 'evitar_com', tag_value: item });
            }
          }
        }
        if (enriched.ocasiao?.length) {
          for (const item of enriched.ocasiao) {
            if (!isSelected(tags, 'ocasiao', item)) {
              tagsToAdd.push({ tag_type: 'ocasiao', tag_value: item });
            }
          }
        }
      } else if (productType === 'prato_principal' || productType === 'lanche' || productType === 'entrada' || productType === 'sobremesa' || productType === 'cafe_manha') {
        // Food-specific: AI determines which wines pair with this food
        if (enriched.harmoniza_com_vinhos?.length) {
          for (const item of enriched.harmoniza_com_vinhos) {
            if (!isSelected(tags, 'harmoniza_com_vinho', item)) {
              tagsToAdd.push({ tag_type: 'harmoniza_com_vinho', tag_value: item });
            }
          }
        }
        if (enriched.intensidade && !isSelected(tags, 'intensidade', enriched.intensidade)) {
          tagsToAdd.push({ tag_type: 'intensidade', tag_value: enriched.intensidade });
        }
        if (enriched.sequencia && !isSelected(tags, 'sequencia', enriched.sequencia)) {
          tagsToAdd.push({ tag_type: 'sequencia', tag_value: enriched.sequencia });
        }
        if (enriched.justificativa_enologo && !isSelected(tags, 'justificativa_enologo', enriched.justificativa_enologo)) {
          tagsToAdd.push({ tag_type: 'justificativa_enologo', tag_value: enriched.justificativa_enologo });
        }
      } else if (productType === 'bebida') {
        // Beverage: AI determines palate cleanser and wine recommendations
        if (enriched.limpador_paladar && !isSelected(tags, 'limpador_paladar', enriched.limpador_paladar)) {
          tagsToAdd.push({ tag_type: 'limpador_paladar', tag_value: enriched.limpador_paladar });
        }
        if (enriched.recomendado_para?.length) {
          for (const item of enriched.recomendado_para) {
            if (!isSelected(tags, 'recomendado_para', item)) {
              tagsToAdd.push({ tag_type: 'recomendado_para', tag_value: item });
            }
          }
        }
        if (enriched.justificativa_enologo && !isSelected(tags, 'justificativa_enologo', enriched.justificativa_enologo)) {
          tagsToAdd.push({ tag_type: 'justificativa_enologo', tag_value: enriched.justificativa_enologo });
        }
      }

      // Add all tags
      for (const tag of tagsToAdd) {
        await addProductTag({
          company_id: company!.id,
          product_id: productId,
          tag_type: tag.tag_type,
          tag_value: tag.tag_value,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['product_tags', productId] });
      await queryClient.invalidateQueries({ queryKey: ['sommelier_wines'] });
      
      toast.success(`IA adicionou ${tagsToAdd.length} tags automaticamente!`);
    } catch (e: any) {
      console.error('AI enrich error:', e);
      toast.error(e.message || 'Erro ao enriquecer com IA');
    } finally {
      setIsEnriching(false);
    }
  };

  const groupedTags = useMemo(() => {
    const groups: Record<string, typeof tags> = {};
    for (const tag of tags) {
      if (!groups[tag.tag_type]) groups[tag.tag_type] = [];
      groups[tag.tag_type].push(tag);
    }
    return groups;
  }, [tags]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Type Detection */}
      {productType === 'desconhecido' && (
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              Que tipo de produto é este?
            </CardTitle>
            <CardDescription>
              Selecione para mostrar as tags corretas do Enólogo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-purple-500 hover:bg-purple-950/20"
                onClick={() => handleSetProductType('vinho')}
              >
                <Wine className="h-5 w-5 text-purple-500" />
                <span className="text-xs">Vinho</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-blue-500 hover:bg-blue-950/20"
                onClick={() => handleSetProductType('bebida')}
              >
                <Droplets className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Bebida</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-amber-500 hover:bg-amber-950/20"
                onClick={() => handleSetProductType('prato_principal')}
              >
                <Pizza className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Prato</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-orange-500 hover:bg-orange-950/20"
                onClick={() => handleSetProductType('lanche')}
              >
                <Sandwich className="h-5 w-5 text-orange-500" />
                <span className="text-xs">Lanche</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-green-500 hover:bg-green-950/20"
                onClick={() => handleSetProductType('entrada')}
              >
                <Salad className="h-5 w-5 text-green-500" />
                <span className="text-xs">Entrada</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-pink-500 hover:bg-pink-950/20"
                onClick={() => handleSetProductType('sobremesa')}
              >
                <Cake className="h-5 w-5 text-pink-500" />
                <span className="text-xs">Sobremesa</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1 hover:border-yellow-500 hover:bg-yellow-950/20"
                onClick={() => handleSetProductType('cafe_manha')}
              >
                <Sunrise className="h-5 w-5 text-yellow-500" />
                <span className="text-xs">Café Manhã</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with detected type */}
      {productType !== 'desconhecido' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {productType === 'vinho' && <Wine className="h-5 w-5 text-purple-500" />}
            {productType === 'bebida' && <Droplets className="h-5 w-5 text-blue-500" />}
            {productType === 'prato_principal' && <Pizza className="h-5 w-5 text-amber-500" />}
            {productType === 'lanche' && <Sandwich className="h-5 w-5 text-orange-500" />}
            {productType === 'entrada' && <Salad className="h-5 w-5 text-green-500" />}
            {productType === 'sobremesa' && <Cake className="h-5 w-5 text-pink-500" />}
            {productType === 'cafe_manha' && <Sunrise className="h-5 w-5 text-yellow-500" />}
            <div>
              <h3 className="text-sm font-medium">
                Tags do Enólogo - {
                  productType === 'vinho' ? 'Vinho' : 
                  productType === 'bebida' ? 'Bebida' :
                  productType === 'prato_principal' ? 'Prato Principal' :
                  productType === 'lanche' ? 'Lanche' :
                  productType === 'entrada' ? 'Entrada/Petisco' :
                  productType === 'sobremesa' ? 'Sobremesa' :
                  productType === 'cafe_manha' ? 'Café da Manhã' : ''
                }
              </h3>
              <p className="text-xs text-muted-foreground">
                {productType === 'vinho' && 'Características para harmonização com comidas'}
                {productType === 'bebida' && 'Usado para limpar o paladar entre goles'}
                {(productType === 'prato_principal' || productType === 'lanche' || productType === 'entrada' || productType === 'sobremesa' || productType === 'cafe_manha') && 'Qual vinho harmoniza com este item?'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setManualType(null)}
            >
              Alterar tipo
            </Button>
            <Button 
              onClick={handleAIEnrich} 
              disabled={isEnriching || !productName}
              variant="outline"
              className="gap-2"
            >
              {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isEnriching ? 'Analisando...' : 'Preencher com IA'}
            </Button>
          </div>
        </div>
      )}

      {/* Current Tags Display */}
      {tags.length > 0 && (
        <div className="space-y-3">
          <Label>Tags atuais</Label>
          <div className="space-y-2">
            {Object.entries(groupedTags).map(([type, typeTags]) => (
              <div key={type} className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground min-w-[120px]">{formatTagType(type)}:</span>
                {typeTags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="gap-1">
                    <span className="text-xs">{formatTagValue(t.tag_value)}</span>
                    <button
                      type="button"
                      className="ml-1 opacity-70 hover:opacity-100"
                      onClick={() => removeTag.mutate(t.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* WINE-SPECIFIC TAGS */}
      {productType === 'vinho' && (
        <WineTagsSection tags={tags} onToggle={onToggle} />
      )}

      {/* PRATO PRINCIPAL TAGS */}
      {productType === 'prato_principal' && (
        <FoodTagsSection tags={tags} onToggle={onToggle} />
      )}

      {/* LANCHE TAGS */}
      {productType === 'lanche' && (
        <LancheTagsSection tags={tags} onToggle={onToggle} />
      )}

      {/* ENTRADA/PETISCO TAGS */}
      {productType === 'entrada' && (
        <EntradaTagsSection tags={tags} onToggle={onToggle} />
      )}

      {/* SOBREMESA TAGS */}
      {productType === 'sobremesa' && (
        <SobremesaTagsSection tags={tags} onToggle={onToggle} />
      )}

      {/* CAFÉ DA MANHÃ TAGS */}
      {productType === 'cafe_manha' && (
        <CafeManhaTagsSection tags={tags} onToggle={onToggle} />
      )}

      {/* BEVERAGE-SPECIFIC TAGS */}
      {productType === 'bebida' && (
        <BeverageTagsSection tags={tags} onToggle={onToggle} />
      )}
    </div>
  );
}

// Wine Tags Section
function WineTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  const VINHO_HARMONIZA_OPTIONS = [
    { value: 'carnes_vermelhas', label: 'Carnes Vermelhas' },
    { value: 'carnes_brancas', label: 'Carnes Brancas' },
    { value: 'aves', label: 'Aves' },
    { value: 'peixes', label: 'Peixes' },
    { value: 'frutos_do_mar', label: 'Frutos do Mar' },
    { value: 'massas', label: 'Massas' },
    { value: 'pizzas', label: 'Pizzas' },
    { value: 'queijos', label: 'Queijos' },
    { value: 'embutidos', label: 'Embutidos' },
    { value: 'churrasco', label: 'Churrasco' },
    { value: 'sobremesas', label: 'Sobremesas' },
    { value: 'aperitivos', label: 'Aperitivos' },
  ];

  return (
    <div className="space-y-6">
      {/* Tipo do Vinho */}
      <div className="space-y-2">
        <Label>Tipo do Vinho</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'tinto', label: 'Tinto' },
            { value: 'branco', label: 'Branco' },
            { value: 'rose', label: 'Rosé' },
            { value: 'espumante', label: 'Espumante' },
            { value: 'sobremesa', label: 'Sobremesa' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'tipo', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('tipo', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Corpo */}
      <div className="space-y-2">
        <Label>Corpo</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'leve', label: 'Leve' },
            { value: 'medio', label: 'Médio' },
            { value: 'encorpado', label: 'Encorpado' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'corpo', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('corpo', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Harmoniza com (comidas) */}
      <div className="space-y-2">
        <Label>Harmoniza com quais comidas?</Label>
        <div className="flex flex-wrap gap-2">
          {VINHO_HARMONIZA_OPTIONS.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'harmoniza_com', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('harmoniza_com', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Destaque / Indicações */}
      <div className="space-y-2">
        <Label>Destaques</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isSelected(tags, 'destaque', 'sommelier_pick') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('destaque', 'sommelier_pick')}
            className={isSelected(tags, 'destaque', 'sommelier_pick') ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            ⭐ Indicação do Enólogo
          </Button>
          <Button
            type="button"
            variant={isSelected(tags, 'destaque', 'best_seller') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('destaque', 'best_seller')}
          >
            🔥 Mais Vendido
          </Button>
          <Button
            type="button"
            variant={isSelected(tags, 'destaque', 'best_value') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('destaque', 'best_value')}
          >
            💰 Custo-Benefício
          </Button>
          <Button
            type="button"
            variant={isSelected(tags, 'destaque', 'gift') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('destaque', 'gift')}
          >
            🎁 Para Presentear
          </Button>
        </div>
      </div>

      {/* Intensidade (para filtrar por preferência do cliente) */}
      <div className="space-y-2">
        <Label>Intensidade do Vinho</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'suave', label: 'Suave' },
            { value: 'equilibrado', label: 'Equilibrado' },
            { value: 'intenso', label: 'Intenso' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'intensidade', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('intensidade', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Doçura (para filtrar por preferência do cliente) */}
      <div className="space-y-2">
        <Label>Doçura</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'seco', label: 'Seco' },
            { value: 'meio_seco', label: 'Meio Seco' },
            { value: 'doce', label: 'Doce' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'docura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('docura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Ocasião (para filtrar por preferência do cliente) */}
      <div className="space-y-2">
        <Label>Ideal para</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'jantar', label: 'Jantar Especial' },
            { value: 'relaxar', label: 'Relaxar' },
            { value: 'presente', label: 'Presente' },
            { value: 'comemoracao', label: 'Comemoração' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'ocasiao', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('ocasiao', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Contexto */}
      <div className="space-y-2">
        <Label>Contexto de Consumo</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isSelected(tags, 'consumo', 'local') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('consumo', 'local')}
          >
            Consumo Local
          </Button>
          <Button
            type="button"
            variant={isSelected(tags, 'consumo', 'viagem') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('consumo', 'viagem')}
          >
            Para Viagem
          </Button>
        </div>
      </div>
    </div>
  );
}

// Food Tags Section - Questions operator CAN answer, AI determines wine pairing
function FoodTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-3 mb-4">
        <p className="text-xs text-purple-300">
          💡 <strong>Responda sobre o prato</strong> - a IA vai determinar automaticamente quais vinhos combinam baseado nas suas respostas.
        </p>
      </div>

      {/* Sequência */}
      <div className="space-y-2">
        <Label>Momento da Refeição</Label>
        <p className="text-xs text-muted-foreground">Quando este prato é servido?</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'entrada', label: 'Entrada / Aperitivo' },
            { value: 'principal', label: 'Prato Principal' },
            { value: 'acompanhamento', label: 'Acompanhamento' },
            { value: 'sobremesa', label: 'Sobremesa' },
            { value: 'petisco', label: 'Petisco / Porção' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'sequencia', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('sequencia', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Proteína Principal */}
      <div className="space-y-2">
        <Label>Proteína Principal</Label>
        <p className="text-xs text-muted-foreground">Qual a proteína do prato?</p>
        <div className="flex flex-wrap gap-2">
          {COMIDA_PROTEINA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'proteina', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('proteina', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Método de Preparo */}
      <div className="space-y-2">
        <Label>Como é preparado?</Label>
        <p className="text-xs text-muted-foreground">Método de cocção principal</p>
        <div className="flex flex-wrap gap-2">
          {COMIDA_PREPARO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'preparo', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('preparo', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Molho / Tempero */}
      <div className="space-y-2">
        <Label>Molho ou Tempero Dominante</Label>
        <p className="text-xs text-muted-foreground">Qual o sabor principal do molho/tempero?</p>
        <div className="flex flex-wrap gap-2">
          {COMIDA_MOLHO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'molho', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('molho', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Intensidade */}
      <div className="space-y-2">
        <Label>Intensidade do Sabor</Label>
        <p className="text-xs text-muted-foreground">O prato é leve ou pesado?</p>
        <div className="flex flex-wrap gap-2">
          {COMIDA_INTENSIDADE.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'intensidade', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('intensidade', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Gordura */}
      <div className="space-y-2">
        <Label>Nível de Gordura</Label>
        <p className="text-xs text-muted-foreground">O prato é gorduroso ou leve?</p>
        <div className="flex flex-wrap gap-2">
          {COMIDA_GORDURA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'gordura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('gordura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sabor Dominante */}
      <div className="space-y-2">
        <Label>Sabor Dominante</Label>
        <p className="text-xs text-muted-foreground">Qual característica mais marcante?</p>
        <div className="flex flex-wrap gap-2">
          {COMIDA_SABOR.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'sabor', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('sabor', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Temperatura */}
      <div className="space-y-2">
        <Label>Temperatura de Servir</Label>
        <div className="flex flex-wrap gap-2">
          {COMIDA_TEMPERATURA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'temperatura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('temperatura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Contexto */}
      <div className="space-y-2">
        <Label>Disponível para</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isSelected(tags, 'consumo', 'local') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('consumo', 'local')}
          >
            Consumo Local
          </Button>
          <Button
            type="button"
            variant={isSelected(tags, 'consumo', 'viagem') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggle('consumo', 'viagem')}
          >
            Para Viagem
          </Button>
        </div>
      </div>
    </div>
  );
}

// Beverage Tags Section - Operator fills characteristics, AI determines pairing
function BeverageTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  const [autoFilledType, setAutoFilledType] = useState<string | null>(null);
  
  // Get AI-filled tags for display
  const limpadorPaladarTag = tags.find(t => t.tag_type === 'limpador_paladar');
  const recomendadoParaTags = tags.filter(t => t.tag_type === 'recomendado_para');
  const justificativaTag = tags.find(t => t.tag_type === 'justificativa_enologo');
  
  const hasAIAnalysis = limpadorPaladarTag || recomendadoParaTags.length > 0 || justificativaTag;

  // Get currently selected beverage type
  const selectedBeverageType = tags.find(t => t.tag_type === 'tipo_bebida')?.tag_value;

  // Handle beverage type selection with auto-fill
  const handleBeverageTypeSelect = async (value: string) => {
    const isCurrentlySelected = isSelected(tags, 'tipo_bebida', value);
    
    // Toggle the type itself
    onToggle('tipo_bebida', value);
    
    // If selecting (not deselecting), apply defaults
    if (!isCurrentlySelected) {
      const defaults = BEVERAGE_DEFAULTS[value];
      if (defaults) {
        let appliedCount = 0;
        
        // Apply each default only if not already set
        if (defaults.temperatura && !tags.some(t => t.tag_type === 'bebida_temperatura')) {
          setTimeout(() => onToggle('bebida_temperatura', defaults.temperatura!), 50);
          appliedCount++;
        }
        if (defaults.carbonatacao && !tags.some(t => t.tag_type === 'bebida_carbonatacao')) {
          setTimeout(() => onToggle('bebida_carbonatacao', defaults.carbonatacao!), 100);
          appliedCount++;
        }
        if (defaults.docura && !tags.some(t => t.tag_type === 'bebida_docura')) {
          setTimeout(() => onToggle('bebida_docura', defaults.docura!), 150);
          appliedCount++;
        }
        if (defaults.intensidade && !tags.some(t => t.tag_type === 'bebida_intensidade')) {
          setTimeout(() => onToggle('bebida_intensidade', defaults.intensidade!), 200);
          appliedCount++;
        }
        
        if (appliedCount > 0) {
          setAutoFilledType(BEBIDA_TIPO.find(b => b.value === value)?.label || value);
          // Clear the message after 5 seconds
          setTimeout(() => setAutoFilledType(null), 5000);
        }
      }
    } else {
      setAutoFilledType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          💡 <strong>Preencha as características da bebida</strong> - O Enólogo (IA) irá determinar automaticamente se é um limpador de paladar e para quais vinhos é recomendado.
        </p>
      </div>

      {/* Auto-fill feedback */}
      {autoFilledType && (
        <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-green-300">
            ✨ <strong>Características sugeridas para "{autoFilledType}"</strong> aplicadas automaticamente. Você pode ajustar se necessário.
          </p>
        </div>
      )}

      {/* ========== OPERADOR PREENCHE ========== */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>📋 Informações da Bebida (você preenche)</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Tipo de Bebida */}
        <div className="space-y-2">
          <Label>Tipo de Bebida</Label>
          <p className="text-xs text-muted-foreground">Selecione o tipo para preencher automaticamente as características</p>
          <div className="flex flex-wrap gap-2">
            {BEBIDA_TIPO.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={isSelected(tags, 'tipo_bebida', item.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBeverageTypeSelect(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Temperatura */}
        <div className="space-y-2">
          <Label>Temperatura de Servir</Label>
          <div className="flex flex-wrap gap-2">
            {BEBIDA_TEMPERATURA.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={isSelected(tags, 'bebida_temperatura', item.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggle('bebida_temperatura', item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Carbonatação */}
        <div className="space-y-2">
          <Label>Carbonatação</Label>
          <div className="flex flex-wrap gap-2">
            {BEBIDA_CARBONATACAO.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={isSelected(tags, 'bebida_carbonatacao', item.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggle('bebida_carbonatacao', item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Doçura */}
        <div className="space-y-2">
          <Label>Nível de Doçura</Label>
          <div className="flex flex-wrap gap-2">
            {BEBIDA_DOCURA.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={isSelected(tags, 'bebida_docura', item.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggle('bebida_docura', item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Intensidade */}
        <div className="space-y-2">
          <Label>Intensidade do Sabor</Label>
          <div className="flex flex-wrap gap-2">
            {BEBIDA_INTENSIDADE.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={isSelected(tags, 'bebida_intensidade', item.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggle('bebida_intensidade', item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ========== IA PREENCHE (Somente Leitura) ========== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
          <span className="h-px flex-1 bg-purple-500/30" />
          <span>🍷 Análise do Enólogo (IA preenche)</span>
          <span className="h-px flex-1 bg-purple-500/30" />
        </div>

        <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-4">
          {hasAIAnalysis ? (
            <div className="space-y-3">
              {/* Limpador de Paladar */}
              {limpadorPaladarTag && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-purple-300">Limpador de Paladar:</span>
                  <Badge variant="secondary" className="bg-purple-900/50 text-purple-200 border-purple-500/30">
                    {limpadorPaladarTag.tag_value === 'sim' ? '✓ Sim - Ideal para limpar o paladar' : 
                     limpadorPaladarTag.tag_value === 'parcial' ? '~ Parcialmente' : '✗ Não indicado'}
                  </Badge>
                </div>
              )}

              {/* Recomendado Para */}
              {recomendadoParaTags.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-purple-300">Recomendado para:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recomendadoParaTags.map((t) => (
                      <Badge key={t.id} variant="secondary" className="bg-purple-900/50 text-purple-200 border-purple-500/30">
                        {formatTagValue(t.tag_value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Justificativa */}
              {justificativaTag && (
                <div className="mt-2 p-2 bg-purple-900/30 rounded text-sm text-purple-200 italic">
                  💬 "{justificativaTag.tag_value}"
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-purple-300/70 text-center py-2">
              Preencha as informações acima e clique em <strong>"Preencher com IA"</strong> para o Enólogo analisar esta bebida.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Lanche Tags Section
function LancheTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  const [autoFilledType, setAutoFilledType] = useState<string | null>(null);

  const handleLancheTypeSelect = (value: string) => {
    const isCurrentlySelected = isSelected(tags, 'tipo_lanche', value);
    onToggle('tipo_lanche', value);
    
    if (!isCurrentlySelected) {
      const defaults = LANCHE_DEFAULTS[value];
      if (defaults) {
        let appliedCount = 0;
        if (defaults.pao && !tags.some(t => t.tag_type === 'lanche_pao')) {
          setTimeout(() => onToggle('lanche_pao', defaults.pao!), 50);
          appliedCount++;
        }
        if (defaults.acompanhamento && !tags.some(t => t.tag_type === 'lanche_acompanhamento')) {
          setTimeout(() => onToggle('lanche_acompanhamento', defaults.acompanhamento!), 100);
          appliedCount++;
        }
        if (appliedCount > 0) {
          setAutoFilledType(LANCHE_TIPO.find(b => b.value === value)?.label || value);
          setTimeout(() => setAutoFilledType(null), 5000);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-950/20 border border-orange-500/20 rounded-lg p-3">
        <p className="text-xs text-orange-300">
          🍔 <strong>Preencha as características do lanche</strong> - a IA vai determinar quais vinhos ou bebidas combinam.
        </p>
      </div>

      {autoFilledType && (
        <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-3 animate-in fade-in duration-300">
          <p className="text-xs text-green-300">
            ✨ <strong>Sugestões para "{autoFilledType}"</strong> aplicadas automaticamente.
          </p>
        </div>
      )}

      {/* Tipo de Lanche */}
      <div className="space-y-2">
        <Label>Tipo de Lanche</Label>
        <div className="flex flex-wrap gap-2">
          {LANCHE_TIPO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'tipo_lanche', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLancheTypeSelect(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tipo de Pão */}
      <div className="space-y-2">
        <Label>Tipo de Pão</Label>
        <div className="flex flex-wrap gap-2">
          {LANCHE_PAO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'lanche_pao', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('lanche_pao', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Proteína */}
      <div className="space-y-2">
        <Label>Proteína Principal</Label>
        <div className="flex flex-wrap gap-2">
          {LANCHE_PROTEINA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'lanche_proteina', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('lanche_proteina', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div className="space-y-2">
        <Label>Extras/Adicionais</Label>
        <div className="flex flex-wrap gap-2">
          {LANCHE_EXTRAS.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'lanche_extra', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('lanche_extra', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Acompanhamento */}
      <div className="space-y-2">
        <Label>Acompanhamento</Label>
        <div className="flex flex-wrap gap-2">
          {LANCHE_ACOMPANHAMENTO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'lanche_acompanhamento', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('lanche_acompanhamento', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sobremesa Tags Section
function SobremesaTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  const [autoFilledType, setAutoFilledType] = useState<string | null>(null);

  const handleSobremesaTypeSelect = (value: string) => {
    const isCurrentlySelected = isSelected(tags, 'tipo_sobremesa', value);
    onToggle('tipo_sobremesa', value);
    
    if (!isCurrentlySelected) {
      const defaults = SOBREMESA_DEFAULTS[value];
      if (defaults) {
        let appliedCount = 0;
        if (defaults.temperatura && !tags.some(t => t.tag_type === 'sobremesa_temperatura')) {
          setTimeout(() => onToggle('sobremesa_temperatura', defaults.temperatura!), 50);
          appliedCount++;
        }
        if (defaults.textura && !tags.some(t => t.tag_type === 'sobremesa_textura')) {
          setTimeout(() => onToggle('sobremesa_textura', defaults.textura!), 100);
          appliedCount++;
        }
        if (defaults.docura && !tags.some(t => t.tag_type === 'sobremesa_docura')) {
          setTimeout(() => onToggle('sobremesa_docura', defaults.docura!), 150);
          appliedCount++;
        }
        if (appliedCount > 0) {
          setAutoFilledType(SOBREMESA_TIPO.find(b => b.value === value)?.label || value);
          setTimeout(() => setAutoFilledType(null), 5000);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-pink-950/20 border border-pink-500/20 rounded-lg p-3">
        <p className="text-xs text-pink-300">
          🍰 <strong>Preencha as características da sobremesa</strong> - a IA vai sugerir vinhos de sobremesa e harmonizações.
        </p>
      </div>

      {autoFilledType && (
        <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-3 animate-in fade-in duration-300">
          <p className="text-xs text-green-300">
            ✨ <strong>Sugestões para "{autoFilledType}"</strong> aplicadas automaticamente.
          </p>
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo de Sobremesa</Label>
        <div className="flex flex-wrap gap-2">
          {SOBREMESA_TIPO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'tipo_sobremesa', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSobremesaTypeSelect(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Base/Sabor */}
      <div className="space-y-2">
        <Label>Base/Sabor Principal</Label>
        <div className="flex flex-wrap gap-2">
          {SOBREMESA_BASE.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'sobremesa_base', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('sobremesa_base', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Temperatura */}
      <div className="space-y-2">
        <Label>Temperatura</Label>
        <div className="flex flex-wrap gap-2">
          {SOBREMESA_TEMPERATURA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'sobremesa_temperatura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('sobremesa_temperatura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Textura */}
      <div className="space-y-2">
        <Label>Textura</Label>
        <div className="flex flex-wrap gap-2">
          {SOBREMESA_TEXTURA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'sobremesa_textura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('sobremesa_textura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Doçura */}
      <div className="space-y-2">
        <Label>Intensidade da Doçura</Label>
        <div className="flex flex-wrap gap-2">
          {SOBREMESA_DOCURA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'sobremesa_docura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('sobremesa_docura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Entrada/Petisco Tags Section
function EntradaTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-green-950/20 border border-green-500/20 rounded-lg p-3">
        <p className="text-xs text-green-300">
          🥗 <strong>Preencha as características da entrada/petisco</strong> - a IA vai sugerir vinhos para harmonizar.
        </p>
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo de Entrada</Label>
        <div className="flex flex-wrap gap-2">
          {ENTRADA_TIPO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'tipo_entrada', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('tipo_entrada', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Proteína */}
      <div className="space-y-2">
        <Label>Proteína Principal</Label>
        <div className="flex flex-wrap gap-2">
          {ENTRADA_PROTEINA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'entrada_proteina', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('entrada_proteina', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tamanho */}
      <div className="space-y-2">
        <Label>Tamanho/Porção</Label>
        <div className="flex flex-wrap gap-2">
          {ENTRADA_TAMANHO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'entrada_tamanho', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('entrada_tamanho', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Temperatura */}
      <div className="space-y-2">
        <Label>Temperatura</Label>
        <div className="flex flex-wrap gap-2">
          {ENTRADA_TEMPERATURA.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'entrada_temperatura', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('entrada_temperatura', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Preparo */}
      <div className="space-y-2">
        <Label>Preparo</Label>
        <div className="flex flex-wrap gap-2">
          {ENTRADA_PREPARO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'entrada_preparo', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('entrada_preparo', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Café da Manhã Tags Section
function CafeManhaTagsSection({ tags, onToggle }: { tags: any[], onToggle: (type: string, value: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-lg p-3">
        <p className="text-xs text-yellow-300">
          ☀️ <strong>Preencha as características do item de café da manhã</strong> - a IA vai sugerir harmonizações.
        </p>
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-2">
          {CAFE_MANHA_TIPO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'tipo_cafe_manha', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('tipo_cafe_manha', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Estilo */}
      <div className="space-y-2">
        <Label>Estilo</Label>
        <div className="flex flex-wrap gap-2">
          {CAFE_MANHA_ESTILO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'cafe_manha_estilo', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('cafe_manha_estilo', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Porção */}
      <div className="space-y-2">
        <Label>Porção</Label>
        <div className="flex flex-wrap gap-2">
          {CAFE_MANHA_PORCAO.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={isSelected(tags, 'cafe_manha_porcao', item.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle('cafe_manha_porcao', item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTagType(type: string): string {
  const map: Record<string, string> = {
    'categoria': 'Categoria',
    'tipo': 'Tipo',
    'corpo': 'Corpo',
    'harmoniza_com': 'Harmoniza com',
    'harmoniza_com_vinho': 'Combina com vinho',
    'sequencia': 'Sequência',
    'intensidade': 'Intensidade',
    'consumo': 'Consumo',
    'palate_cleanser': 'Limpa paladar',
    'tipo_bebida': 'Tipo bebida',
    'recomendado_para': 'Recomendado para',
    'limpador_paladar': 'Limpador de paladar',
    'justificativa_enologo': 'Análise do Enólogo',
    'bebida_temperatura': 'Temperatura',
    'bebida_carbonatacao': 'Carbonatação',
    'bebida_docura': 'Doçura',
    'bebida_intensidade': 'Intensidade',
    'proteina': 'Proteína',
    'preparo': 'Preparo',
    'molho': 'Molho',
    'gordura': 'Gordura',
    'sabor': 'Sabor',
    'temperatura': 'Temperatura',
    // Lanche
    'tipo_lanche': 'Tipo de Lanche',
    'lanche_pao': 'Pão',
    'lanche_proteina': 'Proteína',
    'lanche_extra': 'Extra',
    'lanche_acompanhamento': 'Acompanhamento',
    // Sobremesa
    'tipo_sobremesa': 'Tipo de Sobremesa',
    'sobremesa_base': 'Base/Sabor',
    'sobremesa_temperatura': 'Temperatura',
    'sobremesa_textura': 'Textura',
    'sobremesa_docura': 'Doçura',
    // Entrada
    'tipo_entrada': 'Tipo de Entrada',
    'entrada_proteina': 'Proteína',
    'entrada_tamanho': 'Tamanho',
    'entrada_temperatura': 'Temperatura',
    'entrada_preparo': 'Preparo',
    // Café da Manhã
    'tipo_cafe_manha': 'Tipo',
    'cafe_manha_estilo': 'Estilo',
    'cafe_manha_porcao': 'Porção',
  };
  return map[type] || type;
}

function formatTagValue(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}