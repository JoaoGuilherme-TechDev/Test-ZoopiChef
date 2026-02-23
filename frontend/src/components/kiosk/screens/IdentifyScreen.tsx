/**
 * IdentifyScreen - Customer identification with AI assistant
 * 
 * Asks for phone number to identify customer and personalize experience.
 * Shows AI assistant greeting and detects returning customers.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskState, kioskActions } from '@/stores/kioskStore';
import { useKioskCustomerLookup, getCustomerGreeting } from '@/hooks/useKioskCustomer';
import { DietaryAlertBanner } from '@/components/customer/DietaryAlertBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bot, 
  Phone, 
  ArrowRight, 
  SkipForward, 
  Sparkles, 
  Gift, 
  Crown,
  Loader2,
  CheckCircle2,
  ScanBarcode
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function IdentifyScreen() {
  const device = useKioskState(s => s.device);
  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const companyId = device?.company_id || null;

  // Lookup customer
  const { data: customer, isFetching } = useKioskCustomerLookup(
    phone.replace(/\D/g, '').length >= 10 ? phone : null, 
    companyId
  );

  // Time of day for greeting
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }, []);

  // Format phone as user types
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Handle phone input
  const handlePhoneChange = (digits: string) => {
    const currentDigits = phone.replace(/\D/g, '');
    if (currentDigits.length < 11 || digits === 'backspace') {
      if (digits === 'backspace') {
        setPhone(formatPhone(currentDigits.slice(0, -1)));
      } else if (digits === 'clear') {
        setPhone('');
      } else {
        setPhone(formatPhone(currentDigits + digits));
      }
    }
  };

  // Search effect
  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
        setShowResult(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowResult(false);
    }
  }, [phone]);

  // Continue to menu
  const handleContinue = () => {
    if (customer) {
      // Store customer info in kiosk state
      kioskActions.setCustomerInfo(customer.name, customer.phone);
      // Store identified customer with favorites, discount, and dietary info
      kioskActions.setIdentifiedCustomer({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        isVIP: customer.isVIP,
        favoriteProductIds: customer.favoriteProducts.map(p => p.productId),
        availableDiscount: customer.availableDiscount ? {
          type: customer.availableDiscount.type,
          value: customer.availableDiscount.value,
          prizeName: customer.availableDiscount.prizeName,
          rewardId: customer.availableDiscount.rewardId,
        } : null,
        dietaryInfo: customer.dietaryInfo,
      });
    }
    kioskActions.setState('MENU');
  };

  // Skip identification
  const handleSkip = () => {
    kioskActions.setIdentifiedCustomer(null);
    kioskActions.setState('MENU');
  };

  // Go to comanda screen
  const handleComanda = () => {
    kioskActions.setState('COMANDA');
  };

  // Numpad keys
  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Header with AI Assistant */}
      <div className="flex-shrink-0 p-8 pb-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-center gap-4"
        >
          <div className="relative">
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bot className="w-10 h-10 text-white" />
            </motion.div>
            {/* Pulse effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-orange-500"
              animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* AI Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {customer && showResult 
              ? getCustomerGreeting(customer, timeOfDay)
              : 'Olá! Sou seu assistente virtual'}
          </h1>
          <p className="text-gray-400 text-lg">
            {customer && showResult
              ? 'Encontrei seus dados! Preparei sugestões especiais para você.'
              : 'Me diga seu telefone para uma experiência personalizada'}
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <div className="w-full max-w-md space-y-6">
          {/* Phone Input */}
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <Input
              type="tel"
              value={phone}
              readOnly
              placeholder="(00) 00000-0000"
              className={cn(
                "h-16 text-2xl text-center pl-14 bg-gray-800 border-gray-700 text-white",
                "focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                customer && showResult && "ring-2 ring-green-500 border-green-500"
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-orange-500 animate-spin" />
            )}
            {customer && showResult && (
              <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />
            )}
          </div>

          {/* Customer Found Card */}
          <AnimatePresence>
            {customer && showResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-2xl p-5 border border-gray-700 space-y-4"
              >
                {/* Customer name and VIP badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-white flex items-center gap-2">
                      {customer.name}
                      {customer.isVIP && (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      )}
                    </p>
                    <p className="text-sm text-gray-400">
                      {customer.totalOrders} pedidos • Cliente desde {new Date(customer.memberSince).getFullYear()}
                    </p>
                  </div>
                </div>

                {/* Available discount */}
                {customer.availableDiscount && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-green-400 font-semibold">Você tem um prêmio!</p>
                      <p className="text-sm text-green-300/80">
                        {customer.availableDiscount.type === 'percentage' 
                          ? `${customer.availableDiscount.value}% de desconto`
                          : `R$ ${customer.availableDiscount.value.toFixed(2)} de desconto`}
                      </p>
                    </div>
                    <Sparkles className="w-6 h-6 text-green-400 animate-pulse" />
                  </motion.div>
                )}

                {/* Dietary restrictions alert */}
                {customer.dietaryInfo && (
                  customer.dietaryInfo.hasGlutenIntolerance || 
                  customer.dietaryInfo.hasLactoseIntolerance || 
                  (customer.dietaryInfo.dietaryRestrictions && customer.dietaryInfo.dietaryRestrictions.length > 0) || 
                  customer.dietaryInfo.allergyNotes
                ) && (
                  <DietaryAlertBanner
                    hasGlutenIntolerance={customer.dietaryInfo.hasGlutenIntolerance}
                    hasLactoseIntolerance={customer.dietaryInfo.hasLactoseIntolerance}
                    dietaryRestrictions={customer.dietaryInfo.dietaryRestrictions || []}
                    allergyNotes={customer.dietaryInfo.allergyNotes}
                    variant="compact"
                  />
                )}
                {customer.favoriteProducts.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Seus favoritos:</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {customer.favoriteProducts.slice(0, 3).map((p) => (
                        <div
                          key={p.productId}
                          className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-700 overflow-hidden"
                        >
                          {p.productImage ? (
                            <img src={p.productImage} alt={p.productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {numpadKeys.map((key) => (
              <Button
                key={key}
                variant="outline"
                className="h-16 text-2xl font-bold bg-gray-800 border-gray-700 hover:bg-gray-700"
                onClick={() => {
                  if (key === 'C') handlePhoneChange('clear');
                  else if (key === '⌫') handlePhoneChange('backspace');
                  else handlePhoneChange(key);
                }}
              >
                {key}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-6 space-y-3">
        <Button
          size="lg"
          className={cn(
            "w-full h-16 text-xl font-bold transition-all",
            customer && showResult
              ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          )}
          onClick={handleContinue}
          disabled={isSearching}
        >
          {customer && showResult ? (
            <>
              Continuar como {customer.name.split(' ')[0]}
              <ArrowRight className="w-6 h-6 ml-2" />
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="w-6 h-6 ml-2" />
            </>
          )}
        </Button>

        {/* Comanda Button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-14 text-lg border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
          onClick={handleComanda}
        >
          <ScanBarcode className="w-6 h-6 mr-2" />
          Tenho Comanda
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-full h-12 text-gray-400 hover:text-white"
          onClick={handleSkip}
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Continuar sem identificação
        </Button>
      </div>
    </div>
  );
}
