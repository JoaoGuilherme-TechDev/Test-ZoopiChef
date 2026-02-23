import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Share2, GitCompare, Star } from 'lucide-react';
import { useSommelierSession, useSommelierSettingsPublic, useSommelierWines, useSommelierFoodPairing } from '../hooks';
import { WelcomeScreen } from './WelcomeScreen';
import { ApproachScreen } from './ApproachScreen';
import { ContextScreen } from './ContextScreen';
import { EnhancedProfileScreen } from './EnhancedProfileScreen';
import { FoodSelectionScreen } from './FoodSelectionScreen';
import { WineSelectionScreen } from './WineSelectionScreen';
import { WineDetailScreen } from './WineDetailScreen';
import { PairingScreen } from './PairingScreen';
import { CheckoutScreen } from './CheckoutScreen';
import { WineComparison } from './WineComparison';
import { CustomerIdentificationScreen, DietaryAlertBanner } from '@/components/customer';
import { WineProduct, SommelierCartItem, PairingProduct, FoodSelection, SommelierCustomerInfo } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IdentifiedCustomer } from '@/hooks/usePublicCustomerIdentification';

interface SommelierFlowProps {
  companyId: string;
  companyName: string;
  logoUrl?: string | null;
  onAddToCart?: (items: { productId: string; quantity: number }[]) => void;
  onClose?: () => void;
}

export function SommelierFlow({
  companyId,
  companyName,
  logoUrl,
  onAddToCart,
  onClose,
}: SommelierFlowProps) {
  const { data: settings } = useSommelierSettingsPublic(companyId);
  const { data: wines = [], isLoading: isLoadingWines } = useSommelierWines(companyId);
  
  const session = useSommelierSession(companyId);
  
  // New state for enhanced features
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonWines, setComparisonWines] = useState<WineProduct[]>([]);
  const [wineRatings, setWineRatings] = useState<Record<string, number>>({});

  const selectedWine: WineProduct | undefined = session.selectedWineId
    ? wines.find((w) => w.id === session.selectedWineId)
    : undefined;

  // Check if selected wine is a sommelier pick
  const isSommelierPick = selectedWine?.tags?.some(
    t => t.tag_type === 'destaque' && t.tag_value === 'sommelier_pick'
  ) ?? false;

  // Share wine selection
  const handleShare = useCallback(async (wine: WineProduct) => {
    const shareData = {
      title: `Vinho: ${wine.name}`,
      text: `Confira este vinho: ${wine.name} - ${wine.description || ''}`,
      url: window.location.href,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Compartilhado com sucesso!');
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        toast.success('Link copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }, []);

  // Add wine to comparison
  const handleAddToComparison = useCallback((wine: WineProduct) => {
    if (comparisonWines.length >= 3) {
      toast.error('Máximo de 3 vinhos para comparação');
      return;
    }
    if (comparisonWines.some(w => w.id === wine.id)) {
      toast.info('Este vinho já está na comparação');
      return;
    }
    setComparisonWines(prev => [...prev, wine]);
    toast.success(`${wine.name} adicionado à comparação`);
  }, [comparisonWines]);

  // Rate a wine
  const handleRateWine = useCallback((wineId: string, rating: number) => {
    setWineRatings(prev => ({ ...prev, [wineId]: rating }));
    toast.success(`Avaliação salva: ${rating} estrelas`);
    // TODO: Save to database
  }, []);

  const handleAddToCart = useCallback((items: { productId: string; quantity: number }[]) => {
    if (onAddToCart) {
      onAddToCart(items);
    } else {
      toast.success(`${items.length} item(s) adicionado(s) ao pedido!`);
    }
    session.reset();
    onClose?.();
  }, [onAddToCart, onClose, session]);

  // Handler to proceed to checkout instead of directly adding to cart
  const handleProceedToCheckout = useCallback((
    cartItems: SommelierCartItem[], 
    allPairings: PairingProduct[], 
    grandTotal: number, 
    discount: number
  ) => {
    session.goToCheckout(cartItems, allPairings, grandTotal, discount);
  }, [session]);

  // Handler when checkout completes
  const handleCheckoutComplete = useCallback(() => {
    session.reset();
    onClose?.();
  }, [session, onClose]);

  // Comparison mode toggle
  if (showComparison && comparisonWines.length > 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom duration-500">
        <WineComparison
          wines={comparisonWines}
          onRemoveWine={(id) => setComparisonWines(prev => prev.filter(w => w.id !== id))}
          onClose={() => setShowComparison(false)}
        />
      </div>
    );
  }

  // Floating comparison button
  const ComparisonButton = comparisonWines.length > 0 && !showComparison ? (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <Button
        onClick={() => setShowComparison(true)}
        className="shadow-lg gap-2"
      >
        <GitCompare className="w-4 h-4" />
        Comparar ({comparisonWines.length})
      </Button>
    </div>
  ) : null;

  // Action buttons for wine detail
  const WineActions = selectedWine ? (
    <div className="flex gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare(selectedWine)}
        className="gap-1.5"
      >
        <Share2 className="w-4 h-4" />
        Compartilhar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAddToComparison(selectedWine)}
        className="gap-1.5"
      >
        <GitCompare className="w-4 h-4" />
        Comparar
      </Button>
    </div>
  ) : null;

  // Star rating component
  const StarRating = ({ wineId }: { wineId: string }) => {
    const currentRating = wineRatings[wineId] || 0;
    return (
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRateWine(wineId, star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-5 h-5 transition-colors",
                star <= currentRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-400"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  // Handle customer identification
  const handleCustomerIdentified = (customer: IdentifiedCustomer | { phone: string; name: string }) => {
    const customerInfo: SommelierCustomerInfo = {
      id: 'id' in customer ? customer.id : undefined,
      phone: customer.phone,
      name: customer.name,
      has_gluten_intolerance: 'has_gluten_intolerance' in customer ? customer.has_gluten_intolerance : false,
      has_lactose_intolerance: 'has_lactose_intolerance' in customer ? customer.has_lactose_intolerance : false,
      dietary_restrictions: 'dietary_restrictions' in customer ? customer.dietary_restrictions : [],
      allergy_notes: 'allergy_notes' in customer ? customer.allergy_notes : undefined,
    };
    session.setCustomer(customerInfo);
  };

  // Check if customer has dietary restrictions
  const hasDietaryRestrictions = session.customer && (
    session.customer.has_gluten_intolerance ||
    session.customer.has_lactose_intolerance ||
    (session.customer.dietary_restrictions && session.customer.dietary_restrictions.length > 0) ||
    session.customer.allergy_notes
  );

  // Render based on current step with animations
  const renderStep = () => {
    switch (session.step) {
      case 'identification':
        return (
          <div className="animate-in fade-in duration-500">
            <CustomerIdentificationScreen
              companyId={companyId}
              companyName={companyName}
              logoUrl={logoUrl}
              title="Sommelier Virtual"
              subtitle="Vamos personalizar suas recomendações de vinhos"
              onContinue={handleCustomerIdentified}
              showDietarySection={true}
            />
          </div>
        );

      case 'welcome':
        return (
          <div className="animate-in fade-in duration-500">
            {hasDietaryRestrictions && session.customer && (
              <div className="fixed top-0 left-0 right-0 z-50">
                <DietaryAlertBanner
                  hasGlutenIntolerance={session.customer.has_gluten_intolerance}
                  hasLactoseIntolerance={session.customer.has_lactose_intolerance}
                  dietaryRestrictions={session.customer.dietary_restrictions || []}
                  allergyNotes={session.customer.allergy_notes}
                  variant="compact"
                />
              </div>
            )}
            <WelcomeScreen
              settings={settings}
              companyName={companyName}
              logoUrl={logoUrl}
              onStart={session.goToApproach}
            />
          </div>
        );

      case 'approach':
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <ApproachScreen
              settings={settings}
              onSelectApproach={session.setApproach}
              onBack={session.reset}
            />
          </div>
        );

      case 'context':
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <ContextScreen
              settings={settings}
              onSelectContext={session.setContext}
              onBack={session.reset}
            />
          </div>
        );

      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <EnhancedProfileScreen
              onSubmit={session.setEnhancedProfile}
              onSkip={session.skipProfile}
              onBack={() => session.reset()}
            />
          </div>
        );

      case 'food_selection':
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <FoodSelectionScreen
              context={session.context!}
              onSubmit={session.setFoodSelection}
              onBack={() => session.reset()}
            />
          </div>
        );

      case 'wines':
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <WineSelectionScreen
              companyId={companyId}
              context={session.context!}
              profile={session.profile}
              foodSelection={session.foodSelection}
              approach={session.approach}
              customer={session.customer}
              onSelectWine={session.selectWine}
              onBack={() => session.reset()}
            />
            {ComparisonButton}
          </div>
        );

      case 'wine_detail':
        if (isLoadingWines) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-background animate-pulse">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          );
        }
        if (!selectedWine) {
          session.goBackToWines();
          return null;
        }
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <WineDetailScreen
              wine={selectedWine}
              isSommelierPick={isSommelierPick}
              onSeePairings={session.goToPairing}
              onBack={session.goBackToWines}
            />
            <div className="px-4 pb-4">
              {WineActions}
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Avalie este vinho:</p>
                <StarRating wineId={selectedWine.id} />
              </div>
            </div>
            {ComparisonButton}
          </div>
        );

      case 'pairing':
        if (isLoadingWines) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-background animate-pulse">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          );
        }
        if (!selectedWine || !session.context) {
          session.goBackToWines();
          return null;
        }
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <PairingScreen
              companyId={companyId}
              wine={selectedWine}
              context={session.context}
              onProceedToCheckout={handleProceedToCheckout}
              onBack={session.goBackToDetail}
            />
            {ComparisonButton}
          </div>
        );

      case 'checkout':
        if (!selectedWine) {
          session.goBackToWines();
          return null;
        }
        return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <CheckoutScreen
              companyId={companyId}
              wine={selectedWine}
              cartItems={session.cartItems}
              allPairings={session.allPairings}
              grandTotal={session.grandTotal}
              discount={session.discount}
              customer={session.customer}
              onBack={session.goBackToPairing}
              onComplete={handleCheckoutComplete}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return renderStep();
}
