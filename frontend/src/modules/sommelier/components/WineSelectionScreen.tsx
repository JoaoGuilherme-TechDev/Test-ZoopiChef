import { ArrowLeft, Search, Loader2, Wine, Star, Sparkles, Bot, RefreshCw, Utensils, MapPin, Flag } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WineProduct, ConsumptionContext, WineProfile, FoodSelection, SommelierApproach, SommelierCustomerInfo } from '../types';
import { WineCarousel } from './WineCarousel';
import { WineInfoCard } from './WineInfoCard';
import { useSommelierWines, useSommelierAIRecommend, useSommelierFoodPairing, transformToWineProducts, transformFoodPairingToWines, AIEnrichedWineProduct } from '../hooks';
import { cn } from '@/lib/utils';

export interface WineSelectionScreenProps {
  companyId: string;
  context: ConsumptionContext;
  profile: WineProfile;
  foodSelection?: FoodSelection;
  approach?: SommelierApproach;
  customer?: SommelierCustomerInfo | null; // CRITICAL: For allergen filtering
  onSelectWine: (wineId: string) => void;
  onBack: () => void;
}

/**
 * Score a wine based on how well it matches the user's profile preferences (fallback)
 */
function calculateProfileMatch(wine: WineProduct, profile: WineProfile): number {
  let score = 0;
  const tags = wine.tags || [];
  
  if (profile.intensity) {
    const wineIntensity = tags.find(t => t.tag_type === 'intensidade')?.tag_value;
    if (wineIntensity === profile.intensity) score += 30;
    if (profile.intensity === 'equilibrado' && (wineIntensity === 'suave' || wineIntensity === 'intenso')) score += 10;
  }
  
  if (profile.sweetness) {
    const wineSweetness = tags.find(t => t.tag_type === 'docura')?.tag_value;
    if (wineSweetness === profile.sweetness) score += 30;
  }
  
  if (profile.occasion) {
    const wineOccasions = tags.filter(t => t.tag_type === 'ocasiao').map(t => t.tag_value);
    if (wineOccasions.includes(profile.occasion)) score += 25;
  }
  
  const isSommelierPick = tags.some(t => t.tag_type === 'destaque' && t.tag_value === 'sommelier_pick');
  if (isSommelierPick) score += 15;
  
  return score;
}

export function WineSelectionScreen({
  companyId,
  context,
  profile,
  foodSelection,
  approach = 'wine_first',
  customer,
  onSelectWine,
  onBack,
}: WineSelectionScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [useAI, setUseAI] = useState(true);
  
  const isFoodFirst = approach === 'food_first' && foodSelection;
  
  // Fallback: vinhos estáticos
  const { data: wines = [], isLoading: isLoadingWines } = useSommelierWines(companyId);
  
  // IA: recomendações por perfil de vinho (CRITICAL: now passes customer for allergen filtering)
  const { 
    data: aiResult, 
    isLoading: isLoadingAI, 
    error: aiError,
    refetch: refetchAI 
  } = useSommelierAIRecommend(companyId, profile, context, useAI && !isFoodFirst, customer);

  // IA: recomendações por harmonização com alimentos (CRITICAL: now passes customer for allergen filtering)
  const {
    data: foodPairingResult,
    isLoading: isLoadingFoodPairing,
    error: foodPairingError,
    refetch: refetchFoodPairing
  } = useSommelierFoodPairing(
    companyId, 
    isFoodFirst && foodSelection ? foodSelection : null, 
    context, 
    useAI && isFoodFirst && !!foodSelection,
    customer
  );

  const hasProfile = !!(profile.intensity || profile.sweetness || profile.occasion);
  const isLoading = isFoodFirst 
    ? (useAI ? isLoadingFoodPairing : isLoadingWines)
    : (useAI ? isLoadingAI : isLoadingWines);

  const activeError = isFoodFirst ? foodPairingError : aiError;

  // Processar vinhos baseado em IA ou fallback
  const { aiWines, fallbackWines, greeting, overallTip } = useMemo(() => {
    // Food-first: usar resultado da harmonização
    if (isFoodFirst && useAI && foodPairingResult?.recommendations?.length) {
      const transformed = transformFoodPairingToWines(foodPairingResult.recommendations);
      const filtered = searchQuery
        ? transformed.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : transformed;
      
      return {
        aiWines: filtered,
        fallbackWines: [],
        greeting: foodPairingResult.greeting,
        overallTip: foodPairingResult.pairing_tip || foodPairingResult.overall_tip,
      };
    }

    // Wine-first: usar resultado do perfil
    if (!isFoodFirst && useAI && aiResult?.recommendations?.length) {
      const transformed = transformToWineProducts(aiResult.recommendations);
      const filtered = searchQuery
        ? transformed.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : transformed;
      
      return {
        aiWines: filtered,
        fallbackWines: [],
        greeting: aiResult.greeting,
        overallTip: aiResult.overall_tip,
      };
    }
    
    // Fallback para lógica estática
    let filtered = searchQuery
      ? wines.filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : wines;
    
    if (!hasProfile && !isFoodFirst) {
      const sorted = [...filtered].sort((a, b) => {
        const aIsPick = a.tags?.some(t => t.tag_type === 'destaque' && t.tag_value === 'sommelier_pick') ? 1 : 0;
        const bIsPick = b.tags?.some(t => t.tag_type === 'destaque' && t.tag_value === 'sommelier_pick') ? 1 : 0;
        return bIsPick - aIsPick;
      });
      return { aiWines: [], fallbackWines: sorted, greeting: null, overallTip: null };
    }
    
    const scored = filtered.map(wine => ({
      wine,
      score: calculateProfileMatch(wine, profile),
    }));
    scored.sort((a, b) => b.score - a.score);
    
    return { 
      aiWines: [], 
      fallbackWines: scored.map(s => s.wine), 
      greeting: null, 
      overallTip: null 
    };
  }, [wines, aiResult, foodPairingResult, profile, searchQuery, hasProfile, useAI, isFoodFirst]);

  const displayWines = aiWines.length > 0 ? aiWines : fallbackWines;
  const isAIMode = useAI && aiWines.length > 0;
  
  const handleRefetch = () => {
    if (isFoodFirst) {
      refetchFoodPairing();
    } else {
      refetchAI();
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-2">
          {/* Toggle AI */}
          <Button
            variant={useAI ? "default" : "outline"}
            size="sm"
            onClick={() => setUseAI(!useAI)}
            className={cn(
              "text-xs",
              useAI && "bg-gradient-to-r from-purple-600 to-pink-600"
            )}
          >
            <Bot className="w-3 h-3 mr-1" />
            {useAI ? 'IA Ativa' : 'Ativar IA'}
          </Button>
          
          <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
            <Wine className="w-3 h-3 mr-1" />
            {wines.length}
          </Badge>
        </div>
      </div>

      {/* AI Greeting */}
      {isAIMode && greeting && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">{greeting}</p>
              {overallTip && (
                <p className="text-purple-300 text-sm mt-1">💡 {overallTip}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="text-center mb-4 animate-fade-in">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {isFoodFirst 
            ? 'Harmonização com seu Prato' 
            : isAIMode 
              ? 'Recomendações do Sommelier IA' 
              : 'Escolha seu Vinho'}
        </h2>
        <p className="text-muted-foreground">
          {isFoodFirst && foodSelection?.categories?.length 
            ? `Para harmonizar com: ${foodSelection.categories.join(', ')}`
            : context === 'local' ? 'Para consumo no local' : 'Para levar'}
        </p>
        {isFoodFirst && foodSelection?.details && (
          <p className="text-sm text-purple-300 mt-1 flex items-center justify-center gap-1">
            <Utensils className="w-3 h-3" />
            {foodSelection.details}
          </p>
        )}
        {isAIMode && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm text-purple-300">
              {isFoodFirst ? 'Harmonização por IA' : 'Ranqueado por Inteligência Artificial'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefetch}
              className="ml-2 h-6 px-2"
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto w-full mb-6 animate-fade-in">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar vinho..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-purple-500/30 focus:border-purple-400"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          {useAI && (
            <p className="text-purple-300 text-sm animate-pulse">
              Sommelier IA analisando suas preferências...
            </p>
          )}
        </div>
      )}

      {/* Error state - AI fallback */}
      {useAI && activeError && !isLoading && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm text-center">
          IA indisponível no momento. Mostrando vinhos por ranking manual.
        </div>
      )}

      {/* No wines */}
      {!isLoading && displayWines.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[300px]">
          <Wine className="w-12 h-12 text-purple-500/30 mb-4" />
          <p className="text-muted-foreground mb-2">
            {searchQuery ? 'Nenhum vinho encontrado' : 'Nenhum vinho cadastrado'}
          </p>
          {searchQuery && (
            <Button variant="ghost" onClick={() => setSearchQuery('')}>
              Limpar busca
            </Button>
          )}
        </div>
      )}

      {/* Wine List with AI scores */}
      {!isLoading && displayWines.length > 0 && (
        <div className="flex-1 overflow-y-auto min-h-[300px] animate-fade-in space-y-6">
          {isAIMode ? (
            // AI Recommendations with enhanced wine cards showing grape, country, region
            <div className="space-y-4">
              {displayWines.map((wine, index) => {
                const enrichedWine = wine as AIEnrichedWineProduct;
                return (
                  <WineInfoCard
                    key={wine.id}
                    wine={{
                      id: wine.id,
                      name: wine.name,
                      price: wine.price,
                      image_url: wine.image_url,
                      badge: wine.badge,
                      aiScore: enrichedWine.aiScore,
                      aiReason: enrichedWine.aiReason,
                      aiTip: enrichedWine.aiTip,
                      grape: enrichedWine.grape,
                      country: enrichedWine.country,
                      region: enrichedWine.region,
                    }}
                    rank={index}
                    onSelect={() => onSelectWine(wine.id)}
                  />
                );
              })}
              
              {/* Quantity suggestion from AI */}
              {aiResult?.quantity_suggestion && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🍷</span>
                    <span className="font-medium text-green-300">Sugestão de Quantidade</span>
                  </div>
                  <p className="text-sm text-green-200">{aiResult.quantity_suggestion}</p>
                </div>
              )}
            </div>
          ) : (
            // Fallback: carousel mode
            <WineCarousel
              wines={displayWines}
              onSelectWine={(wine) => onSelectWine(wine.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
