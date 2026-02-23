import { ArrowLeft, Check, Loader2, ShoppingCart, Package, Droplets, Sparkles, AlertTriangle, Gift, Utensils, Wine, ChevronDown, ChevronUp, Menu } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WineProduct, ConsumptionContext, PairingProduct, SommelierCartItem } from '../types';
import { useSommelierSuggestions } from '../hooks/useSommelierSuggestions';
import { cn } from '@/lib/utils';

interface PairingScreenProps {
  companyId: string;
  wine: WineProduct;
  context: ConsumptionContext;
  onProceedToCheckout: (
    cartItems: SommelierCartItem[], 
    allPairings: PairingProduct[], 
    grandTotal: number, 
    discount: number
  ) => void;
  onBack: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function PairingScreen({
  companyId,
  wine,
  context,
  onProceedToCheckout,
  onBack,
}: PairingScreenProps) {
  const { data: suggestion, isLoading } = useSommelierSuggestions(companyId, wine, context);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Pre-select recommended items when data loads
  useEffect(() => {
    if (suggestion?.preSelectedIds?.length) {
      setSelectedProducts(new Set(suggestion.preSelectedIds));
    }
  }, [suggestion?.preSelectedIds]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleProceedToCheckout = () => {
    // Helper to get prep tip for a product
    const getPrepTipForProduct = (productId: string): string | undefined => {
      const product = allPairings.find(p => p.id === productId);
      return product?.prepTip;
    };

    const items: SommelierCartItem[] = [
      { productId: wine.id, quantity: 1 },
      ...Array.from(selectedProducts).map((id) => ({
        productId: id,
        quantity: 1,
        sommelierSuggested: true,
        sommelierWineId: wine.id,
        sommelierTip: getPrepTipForProduct(id),
      })),
    ];
    
    // Pass to checkout instead of adding to cart directly
    onProceedToCheckout(items, allPairings, grandTotal, discount);
  };

  const handleAcceptKit = () => {
    if (!suggestion) return;
    setSelectedProducts(new Set(suggestion.preSelectedIds));
  };

  // Flatten all pairings for price calculation
  const allPairings = useMemo(() => {
    if (!suggestion) return [];
    const { pairings } = suggestion;
    return [
      ...pairings.palateCleanser,
      ...pairings.starters,
      ...pairings.mains,
      ...pairings.sides,
      ...pairings.desserts,
      ...pairings.takeaway,
    ];
  }, [suggestion]);

  // Calculate totals
  const wineTotal = wine.price;
  const pairingTotal = allPairings
    .filter((p) => selectedProducts.has(p.id))
    .reduce((sum, p) => sum + p.price, 0);
  const subtotal = wineTotal + pairingTotal;
  const discount = suggestion?.kitDiscount && selectedProducts.size >= 2 
    ? (subtotal * suggestion.kitDiscount) / 100 
    : 0;
  const grandTotal = subtotal - discount;

  const hasAnyPairings = allPairings.length > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-purple-500/20 p-4 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h2 className="font-bold text-white">Harmonização</h2>
            <p className="text-sm text-muted-foreground line-clamp-1">{wine.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-52">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-muted-foreground text-sm">O Enólogo está preparando suas sugestões...</p>
          </div>
        )}

        {/* Sommelier Greeting */}
        {!isLoading && suggestion && (
          <div className="animate-fade-in">
            {/* Sommelier Avatar & Tip */}
            <div className="bg-gradient-to-r from-purple-900/40 to-amber-900/30 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center flex-shrink-0">
                  <Wine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Enólogo Virtual</p>
                  <p className="text-sm text-purple-200">{suggestion.sommelierTip}</p>
                </div>
              </div>
            </div>

            {/* Kit Suggestion */}
            {suggestion.kitName && suggestion.preSelectedIds.length >= 2 && (
              <div className="mt-4 bg-gradient-to-r from-amber-900/30 to-purple-900/30 rounded-xl p-4 border border-amber-500/30 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Gift className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-white">{suggestion.kitName}</span>
                  <Badge className="bg-gradient-to-r from-amber-600 to-amber-500 text-white">
                    {suggestion.kitDiscount}% OFF
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Vinho + {suggestion.preSelectedIds.length} acompanhamentos selecionados pelo sommelier
                </p>
                <Button
                  onClick={handleAcceptKit}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Aceitar Sugestão do Enólogo
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Palate Cleanser Section */}
        {!isLoading && suggestion && suggestion.pairings.palateCleanser.length > 0 && (
          <SectionContainer
            title="Para Limpar o Paladar"
            icon={<Droplets className="w-5 h-5 text-blue-400" />}
            tip={suggestion.waterReason}
            delay={0.2}
          >
            <div className="grid grid-cols-2 gap-3">
              {suggestion.pairings.palateCleanser.slice(0, 4).map((product, idx) => (
                <PairingCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.has(product.id)}
                  onToggle={() => toggleProduct(product.id)}
                  isRecommended={suggestion.preSelectedIds.includes(product.id)}
                  compact
                />
              ))}
            </div>
          </SectionContainer>
        )}

        {/* Local Context: Starters, Mains, Desserts */}
        {!isLoading && suggestion && context === 'local' && (
          <>
            {suggestion.pairings.starters.length > 0 && (
              <SectionContainer
                title="Para Começar"
                icon={<Utensils className="w-5 h-5 text-green-400" />}
                tip="Entradas que preparam o paladar perfeitamente"
                delay={0.3}
              >
                <div className="space-y-3">
                  {suggestion.pairings.starters.slice(0, 3).map((product) => (
                    <PairingCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProducts.has(product.id)}
                      onToggle={() => toggleProduct(product.id)}
                      isRecommended={suggestion.preSelectedIds.includes(product.id)}
                    />
                  ))}
                </div>
              </SectionContainer>
            )}

            {suggestion.pairings.mains.length > 0 && (
              <SectionContainer
                title="Harmonização Principal"
                icon={<Sparkles className="w-5 h-5 text-purple-400" />}
                tip="A combinação perfeita para este vinho"
                delay={0.4}
              >
                <div className="space-y-3">
                  {suggestion.pairings.mains.slice(0, 3).map((product) => (
                    <PairingCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProducts.has(product.id)}
                      onToggle={() => toggleProduct(product.id)}
                      isRecommended={suggestion.preSelectedIds.includes(product.id)}
                    />
                  ))}
                </div>
              </SectionContainer>
            )}

            {suggestion.pairings.sides.length > 0 && (
              <SectionContainer
                title="Também Combina"
                icon={<Utensils className="w-5 h-5 text-amber-400" />}
                delay={0.5}
              >
                <div className="grid grid-cols-2 gap-3">
                  {suggestion.pairings.sides.slice(0, 4).map((product) => (
                    <PairingCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProducts.has(product.id)}
                      onToggle={() => toggleProduct(product.id)}
                      compact
                    />
                  ))}
                </div>
              </SectionContainer>
            )}
          </>
        )}

        {/* Takeaway Context */}
        {!isLoading && suggestion && context === 'takeaway' && suggestion.pairings.takeaway.length > 0 && (
          <SectionContainer
            title="Leve para Harmonizar em Casa"
            icon={<Package className="w-5 h-5 text-amber-400" />}
            tip="Produtos selecionados para você aproveitar quando quiser"
            delay={0.3}
          >
            <div className="space-y-3">
              {suggestion.pairings.takeaway.slice(0, 5).map((product) => (
                <PairingCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.has(product.id)}
                  onToggle={() => toggleProduct(product.id)}
                  isRecommended={suggestion.preSelectedIds.includes(product.id)}
                />
              ))}
            </div>
          </SectionContainer>
        )}

        {/* Other Pairings - Collapsible section (scores 5-10) */}
        {!isLoading && suggestion && suggestion.goodPairings && suggestion.goodPairings.length > 0 && (
          <CollapsibleOtherPairings
            title="Outros Pratos que Combinam"
            products={suggestion.goodPairings}
            selectedProducts={selectedProducts}
            onToggle={toggleProduct}
            delay={0.55}
          />
        )}

        {/* Full Menu - All other options (scores < 5 or remaining) */}
        {!isLoading && suggestion && suggestion.otherOptions && suggestion.otherOptions.length > 0 && (
          <CollapsibleOtherPairings
            title="Todo o Cardápio"
            products={suggestion.otherOptions}
            selectedProducts={selectedProducts}
            onToggle={toggleProduct}
            delay={0.6}
            defaultClosed
          />
        )}

        {/* Avoid Section */}
        {!isLoading && suggestion && suggestion.pairings.avoidWith.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '0.65s' }}>
            <div className="bg-red-950/20 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">O Enólogo Sugere Evitar</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {suggestion.pairings.avoidWith.map((item, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="bg-red-900/30 text-red-300 border-red-500/30 text-xs"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-red-400/60 italic">
                💡 Os itens recomendados acima foram selecionados por harmonizarem bem com este vinho
              </p>
            </div>
          </div>
        )}

        {/* No pairings */}
        {!isLoading && !hasAnyPairings && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhuma sugestão de harmonização encontrada para este vinho.
            </p>
            <Button variant="outline" onClick={handleProceedToCheckout}>
              Adicionar só o vinho
            </Button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur border-t border-purple-500/20 p-4">
        <div className="max-w-lg mx-auto">
          {/* Summary */}
          <div className="space-y-1 mb-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{wine.name}</span>
              <span className="text-white">{formatCurrency(wineTotal)}</span>
            </div>
            {selectedProducts.size > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">+ {selectedProducts.size} acompanhamento(s)</span>
                <span className="text-white">{formatCurrency(pairingTotal)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between items-center text-green-400">
                <span>Desconto Kit ({suggestion?.kitDiscount}%)</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
              <span className="font-bold text-white">Total</span>
              <span className="font-bold text-xl text-amber-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Proceed to checkout button */}
          <Button
            size="lg"
            onClick={handleProceedToCheckout}
            className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-semibold py-6 rounded-xl shadow-neon-mixed"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Continuar para Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Section Container Component
interface SectionContainerProps {
  title: string;
  icon: React.ReactNode;
  tip?: string;
  delay?: number;
  children: React.ReactNode;
}

function SectionContainer({ title, icon, tip, delay = 0, children }: SectionContainerProps) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      {tip && (
        <p className="text-xs text-muted-foreground mb-3 italic">"{tip}"</p>
      )}
      {children}
    </div>
  );
}

// Collapsible Other Pairings Component
interface CollapsibleOtherPairingsProps {
  title: string;
  products: PairingProduct[];
  selectedProducts: Set<string>;
  onToggle: (productId: string) => void;
  delay?: number;
  defaultClosed?: boolean;
}

function CollapsibleOtherPairings({ 
  title, 
  products, 
  selectedProducts, 
  onToggle, 
  delay = 0,
  defaultClosed = false 
}: CollapsibleOtherPairingsProps) {
  const [isOpen, setIsOpen] = useState(!defaultClosed);

  if (products.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ animationDelay: `${delay}s` }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-950/30 border border-purple-500/20 hover:border-purple-400/40 transition-colors">
            <div className="flex items-center gap-2">
              <Menu className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-white">{title}</span>
              <Badge variant="secondary" className="ml-2 bg-purple-600/20 text-purple-300 border-purple-500/30">
                {products.length} {products.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <PairingCard
                key={product.id}
                product={product}
                isSelected={selectedProducts.has(product.id)}
                onToggle={() => onToggle(product.id)}
                compact
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Pairing Card Component
interface PairingCardProps {
  product: PairingProduct;
  isSelected: boolean;
  onToggle: () => void;
  isRecommended?: boolean;
  compact?: boolean;
}

function PairingCard({ product, isSelected, onToggle, isRecommended, compact }: PairingCardProps) {
  // Match score badges for credibility
  const getMatchBadge = () => {
    if (!product.matchScore) return null;
    if (product.matchScore >= 12) {
      return (
        <Badge className="bg-green-600/80 text-white text-[9px] px-1.5 py-0 border-0">
          Match Perfeito
        </Badge>
      );
    }
    if (product.matchScore >= 8) {
      return (
        <Badge className="bg-emerald-600/70 text-white text-[9px] px-1.5 py-0 border-0">
          Ótima Harmonia
        </Badge>
      );
    }
    if (product.matchScore >= 5) {
      return (
        <Badge className="bg-amber-600/70 text-white text-[9px] px-1.5 py-0 border-0">
          Boa Opção
        </Badge>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <Card
        onClick={onToggle}
        className={cn(
          "overflow-hidden cursor-pointer transition-all duration-300",
          "bg-gradient-to-br from-card to-purple-950/50",
          isSelected
            ? "border-purple-500 shadow-neon-purple ring-1 ring-purple-500/50"
            : "border-purple-500/20 hover:border-purple-400/40"
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {isRecommended && (
              <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
            )}
            {getMatchBadge()}
          </div>
          <span className="text-sm font-medium text-white line-clamp-2 block mb-2">{product.name}</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-400">{formatCurrency(product.price)}</span>
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-gradient-to-r from-purple-600 to-amber-600"
                  : "border border-purple-500/50"
              )}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={onToggle}
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-card to-purple-950/50",
        isSelected
          ? "border-purple-500 shadow-neon-purple ring-1 ring-purple-500/50"
          : "border-purple-500/20 hover:border-purple-400/40"
      )}
    >
      <div className="flex">
        {/* Image */}
        <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-purple-900/30 to-slate-900/50 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-500/30" />
            </div>
          )}
        </div>

        <CardContent className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isRecommended && (
                <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  Recomendado
                </Badge>
              )}
              {getMatchBadge()}
            </div>
            <h4 className="font-medium text-white line-clamp-1 mt-1">{product.name}</h4>
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-amber-400">
              {formatCurrency(product.price)}
            </span>
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-gradient-to-r from-purple-600 to-amber-600"
                  : "border border-purple-500/50"
              )}
            >
              {isSelected ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <span className="text-purple-400 text-lg leading-none">+</span>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}