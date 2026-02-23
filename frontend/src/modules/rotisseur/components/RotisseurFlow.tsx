import { useState } from 'react';
import { useRotisseurSettingsPublic, useRotisseurSession, useRotisseurProducts } from '../hooks';
import { RotisseurWelcomeScreen } from './WelcomeScreen';
import { CookingMethodScreen } from './CookingMethodScreen';
import { PreferencesScreen } from './PreferencesScreen';
import { OccasionScreen } from './OccasionScreen';
import { QuantityScreen } from './QuantityScreen';
import { MeatSelectionScreen } from './MeatSelectionScreen';
import { ProductSelectionScreen } from './ProductSelectionScreen';
import { SmartProductSelectionScreen } from './SmartProductSelectionScreen';
import { SummaryScreen } from './SummaryScreen';
import { TicketScreen } from './TicketScreen';
import { CustomerIdentificationScreen, DietaryAlertBanner } from '@/components/customer';
import type { RotisseurCustomerInfo } from '../types';
import type { IdentifiedCustomer } from '@/hooks/usePublicCustomerIdentification';

interface RotisseurFlowProps {
  companyId: string;
  companyName: string;
  logoUrl?: string | null;
}

export function RotisseurFlow({ companyId, companyName, logoUrl }: RotisseurFlowProps) {
  const { data: settings } = useRotisseurSettingsPublic(companyId);
  const session = useRotisseurSession(companyId);
  const { data: products } = useRotisseurProducts(companyId, settings);
  
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  // Handle ticket completion
  const handleComplete = (ticket: string) => {
    setTicketNumber(ticket);
  };

  // Show ticket screen after completion
  if (ticketNumber) {
    return (
      <TicketScreen
        ticketNumber={ticketNumber}
        companyName={companyName}
        onNewOrder={() => {
          setTicketNumber(null);
          session.reset();
        }}
      />
    );
  }

  // Handle customer identification
  const handleCustomerIdentified = (customer: IdentifiedCustomer | { phone: string; name: string }) => {
    const customerInfo: RotisseurCustomerInfo = {
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

  // Render based on step
  switch (session.step) {
    case 'identification':
      return (
        <CustomerIdentificationScreen
          companyId={companyId}
          companyName={companyName}
          logoUrl={logoUrl}
          title="Maître Rôtisseur"
          subtitle="Vamos personalizar suas recomendações de carnes"
          onContinue={handleCustomerIdentified}
          showDietarySection={true}
        />
      );

    case 'welcome':
      return (
        <>
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
          <RotisseurWelcomeScreen
            settings={settings}
            companyName={companyName}
            logoUrl={logoUrl}
            onStart={session.goToCookingMethod}
            customerName={session.customer?.name}
          />
        </>
      );

    case 'cooking_method':
      return (
        <CookingMethodScreen
          onSelectMethod={session.setCookingMethod}
          onBack={session.reset}
        />
      );

    case 'preferences':
      return (
        <PreferencesScreen
          onSubmit={session.setPreferences}
          onBack={session.goBack}
        />
      );

    case 'occasion':
      return (
        <OccasionScreen
          onSelectOccasion={session.setOccasion}
          onBack={session.goBack}
        />
      );

    case 'quantity':
      return (
        <QuantityScreen
          onSubmit={session.setNumberOfPeople}
          onBack={session.goBack}
        />
      );

    case 'meat_selection':
      return (
        <MeatSelectionScreen
          companyId={companyId}
          meats={products?.meats || []}
          numberOfPeople={session.numberOfPeople}
          cookingMethod={session.cookingMethod!}
          preferences={session.preferences}
          occasion={session.occasion!}
          customer={session.customer}
          selectedMeats={session.selectedMeats}
          onSelectMeat={session.selectMeat}
          onRemoveMeat={session.removeMeat}
          onContinue={session.goToAccompaniments}
          onBack={session.goBack}
        />
      );

    case 'accompaniments':
      return (
        <SmartProductSelectionScreen
          title="Acompanhamentos"
          subtitle="Linguiças, tulipas, corações..."
          products={products?.accompaniments || []}
          selectedItems={session.selectedAccompaniments}
          onSelectItem={session.selectAccompaniment}
          onRemoveItem={(id) => session.selectAccompaniment({ product: { id } as any, quantity: 0 })}
          onContinue={session.goToExtras}
          onSkip={session.goToExtras}
          onBack={session.goBack}
          continueLabel="Extras"
          skipLabel="Pular para extras"
          companyId={companyId}
          selectedMeats={session.selectedMeats.map(m => ({ id: m.product.id, name: m.product.name, quantity: m.quantity }))}
          numberOfPeople={session.numberOfPeople}
          occasion={session.occasion!}
          cookingMethod={session.cookingMethod!}
          enableAI={true}
        />
      );

    case 'extras':
      return (
        <ProductSelectionScreen
          title="Extras"
          subtitle="Molhos, pão de alho, temperos..."
          products={products?.extras || []}
          selectedItems={session.selectedExtras}
          onSelectItem={session.selectExtra}
          onRemoveItem={(id) => session.selectExtra({ product: { id } as any, quantity: 0 })}
          onContinue={session.goToBeverages}
          onSkip={session.goToBeverages}
          onBack={session.goBack}
          continueLabel="Bebidas"
          skipLabel="Pular para bebidas"
        />
      );

    case 'beverages':
      return (
        <ProductSelectionScreen
          title="Bebidas"
          subtitle="Cervejas, refrigerantes, água..."
          products={products?.beverages || []}
          selectedItems={session.selectedBeverages}
          onSelectItem={session.selectBeverage}
          onRemoveItem={(id) => session.selectBeverage({ product: { id } as any, quantity: 0 })}
          onContinue={session.goToSummary}
          onSkip={session.goToSummary}
          onBack={session.goBack}
          continueLabel="Finalizar"
          skipLabel="Finalizar sem bebidas"
        />
      );

    case 'summary':
      return (
        <SummaryScreen
          companyId={companyId}
          cartItems={session.cartItems}
          grandTotal={session.grandTotal}
          numberOfPeople={session.numberOfPeople}
          cookingMethod={session.cookingMethod!}
          occasion={session.occasion!}
          customer={session.customer}
          onBack={session.goBack}
          onComplete={handleComplete}
        />
      );

    default:
      return null;
  }
}
