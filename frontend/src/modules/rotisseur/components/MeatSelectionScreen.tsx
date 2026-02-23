import { useState, useEffect } from 'react';
import { Loader2, Plus, Minus, ChevronRight, Sparkles, ShoppingCart, Star, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useRotisseurAI } from '../hooks/useRotisseurAI';
import type { MeatProduct, SelectedMeat, CookingMethod, MeatPreferences, MeatOccasion, RotisseurCustomerInfo } from '../types';
import type { AIRecommendation } from '../hooks/useRotisseurAI';

interface MeatSelectionScreenProps {
  companyId: string;
  meats: MeatProduct[];
  numberOfPeople: number;
  cookingMethod: CookingMethod;
  preferences: MeatPreferences | null;
  occasion: MeatOccasion;
  customer?: RotisseurCustomerInfo | null;
  selectedMeats: SelectedMeat[];
  onSelectMeat: (meat: SelectedMeat) => void;
  onRemoveMeat: (productId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function MeatSelectionScreen({
  companyId,
  meats,
  numberOfPeople,
  cookingMethod,
  preferences,
  occasion,
  customer,
  selectedMeats,
  onSelectMeat,
  onRemoveMeat,
  onContinue,
  onBack,
}: MeatSelectionScreenProps) {
  const [expandedMeat, setExpandedMeat] = useState<string | null>(null);
  const { isLoading: isLoadingAI, response: aiResponse, getRecommendations } = useRotisseurAI();

  // Fetch AI recommendations when the component mounts
  useEffect(() => {
    if (meats.length > 0 && !aiResponse) {
      getRecommendations({
        companyId,
        cookingMethod,
        preferences,
        occasion,
        numberOfPeople,
        customer: customer || null,
        availableMeats: meats,
      });
    }
  }, [companyId, meats, cookingMethod, preferences, occasion, numberOfPeople, customer, aiResponse, getRecommendations]);

  const getSelectedQuantity = (productId: string): number => {
    const selected = selectedMeats.find((m) => m.product.id === productId);
    return selected?.quantity || 0;
  };

  const getAIRecommendation = (productId: string): AIRecommendation | undefined => {
    return aiResponse?.recommendations.find((r) => r.product_id === productId);
  };

  const handleAddMeat = (product: MeatProduct) => {
    const currentQty = getSelectedQuantity(product.id);
    const aiRec = getAIRecommendation(product.id);
    const suggestedQty = product.unit === 'kg' ? 0.5 : 1;
    
    onSelectMeat({
      product,
      quantity: currentQty + suggestedQty,
      aiReason: aiRec?.expert_description,
    });
  };

  const handleRemoveMeat = (product: MeatProduct) => {
    const currentQty = getSelectedQuantity(product.id);
    const decrementQty = product.unit === 'kg' ? 0.5 : 1;
    if (currentQty <= decrementQty) {
      onRemoveMeat(product.id);
    } else {
      const aiRec = getAIRecommendation(product.id);
      onSelectMeat({
        product,
        quantity: currentQty - decrementQty,
        aiReason: aiRec?.expert_description,
      });
    }
  };

  const handleAddAIRecommendation = (rec: AIRecommendation) => {
    const product = meats.find(m => m.id === rec.product_id);
    if (!product) return;
    
    const quantityInKg = rec.quantity_grams / 1000;
    onSelectMeat({
      product,
      quantity: quantityInKg,
      aiReason: rec.expert_description,
    });
  };

  // Sort meats: AI recommended first, then by score
  const sortedMeats = [...meats].sort((a, b) => {
    const recA = getAIRecommendation(a.id);
    const recB = getAIRecommendation(b.id);
    const scoreA = recA?.confidence_score || 0;
    const scoreB = recB?.confidence_score || 0;
    return scoreB - scoreA;
  });

  const totalSelected = selectedMeats.reduce((acc, m) => acc + m.quantity, 0);
  const totalValue = selectedMeats.reduce((acc, m) => acc + m.product.price * m.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/20 via-background to-background">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            🥩 Recomendações do Maître
          </h1>
          <p className="text-muted-foreground">
            Seleção especial para {numberOfPeople} {numberOfPeople === 1 ? 'pessoa' : 'pessoas'}
          </p>
        </div>

        {/* AI Loading State */}
        {isLoadingAI && (
          <div className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl border border-primary/20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <div>
              <p className="text-foreground font-medium">O Maître está analisando...</p>
              <p className="text-xs text-muted-foreground">Consultando base de conhecimento</p>
            </div>
          </div>
        )}

        {/* AI Greeting & Analysis */}
        {!isLoadingAI && aiResponse && (
          <div className="space-y-3 mb-4">
            {/* Greeting */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">{aiResponse.greeting}</p>
                  {aiResponse.analysis && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{aiResponse.analysis}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Add AI Recommendations */}
            {aiResponse.recommendations.length > 0 && (
              <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-accent-foreground font-medium mb-3 flex items-center gap-2">
                  <Star className="w-3 h-3" />
                  SUGESTÕES DO MAÎTRE (toque para adicionar)
                </p>
                <div className="space-y-2">
                  {aiResponse.recommendations.slice(0, 3).map((rec) => (
                    <button
                      key={rec.product_id}
                      onClick={() => handleAddAIRecommendation(rec)}
                      disabled={getSelectedQuantity(rec.product_id) > 0}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                        getSelectedQuantity(rec.product_id) > 0
                          ? "bg-chart-2/20 border border-chart-2/30"
                          : "bg-muted/50 hover:bg-muted border border-transparent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">{rec.product_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {(rec.quantity_grams / 1000).toFixed(1)}kg
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{rec.preparation_tip}</p>
                      </div>
                      {getSelectedQuantity(rec.product_id) > 0 ? (
                        <Badge className="bg-chart-2 shrink-0 ml-2">✓</Badge>
                      ) : (
                        <Plus className="w-4 h-4 text-accent-foreground shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
                {aiResponse.variety_note && (
                  <p className="text-xs text-muted-foreground mt-3 italic">💡 {aiResponse.variety_note}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <p className="text-xs text-muted-foreground mb-3">TODOS OS CORTES DISPONÍVEIS</p>
        
        {meats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma carne cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedMeats.map((meat) => {
              const aiRec = getAIRecommendation(meat.id);
              const qty = getSelectedQuantity(meat.id);
              const isSelected = qty > 0;
              const isRecommended = aiRec && aiRec.confidence_score >= 70;
              const isExpanded = expandedMeat === meat.id;

              return (
                <Card
                  key={meat.id}
                  className={cn(
                    "overflow-hidden transition-all",
                    isSelected && "ring-2 ring-chart-2",
                    isRecommended && !isSelected && "ring-1 ring-accent/50"
                  )}
                >
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="relative aspect-square bg-muted">
                      {meat.image_url ? (
                        <img
                          src={meat.image_url}
                          alt={meat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary/20 to-accent/20">
                          🥩
                        </div>
                      )}
                      
                      {/* AI Score Badge */}
                      {aiRec && aiRec.confidence_score >= 70 && (
                        <Badge className="absolute top-2 right-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          {aiRec.confidence_score}%
                        </Badge>
                      )}

                      {/* Info Button */}
                      {aiRec && (
                        <button
                          onClick={() => setExpandedMeat(isExpanded ? null : meat.id)}
                          className="absolute top-2 left-2 p-1.5 rounded-full bg-background/50 hover:bg-background/70 transition-colors"
                        >
                          <Info className="w-3 h-3 text-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1 mb-1">{meat.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatCurrency(meat.price)}/{meat.unit || 'kg'}
                      </p>

                      {/* Expanded AI Info */}
                      {isExpanded && aiRec && (
                        <div className="mb-3 p-2 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-xs text-accent-foreground mb-1 font-medium">Do Maître:</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{aiRec.expert_description}</p>
                          {aiRec.ideal_doneness && (
                            <p className="text-xs text-accent-foreground mt-2">🔥 Ponto ideal: {aiRec.ideal_doneness}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 italic">💡 {aiRec.preparation_tip}</p>
                        </div>
                      )}

                      {/* Quantity Controls */}
                      {isSelected ? (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleRemoveMeat(meat)}
                            className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold">
                            {qty.toFixed(1)} {meat.unit || 'kg'}
                          </span>
                          <button
                            onClick={() => handleAddMeat(meat)}
                            className="p-2 rounded-lg bg-chart-2/20 hover:bg-chart-2/30 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAddMeat(meat)}
                          className={cn(
                            "w-full",
                            isRecommended 
                              ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                              : "bg-card hover:bg-card/80 text-foreground"
                          )}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="max-w-md mx-auto">
          {selectedMeats.length > 0 && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground">
                {selectedMeats.length} {selectedMeats.length === 1 ? 'corte' : 'cortes'} • {totalSelected.toFixed(1)} kg
              </span>
              <span className="font-bold text-foreground">{formatCurrency(totalValue)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
            <Button
              onClick={onContinue}
              disabled={selectedMeats.length === 0}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Continuar
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
