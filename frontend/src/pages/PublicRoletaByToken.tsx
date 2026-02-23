import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useCompanyByToken } from '@/hooks/useCompanyPublicLinks';
import { useCompanyAccessByToken } from '@/hooks/useCompanyAccess';
import { usePublicPrizes, Prize } from '@/hooks/usePrizes';
import { usePublicWheelSettings } from '@/hooks/useWheelSettings';
import { 
  checkWheelEligibility, 
  findOrCreateCustomer, 
  recordWheelSpin,
  normalizePhone 
} from '@/hooks/useWheelEligibility';
import { PrizeWheelEnhanced } from '@/components/prizes/PrizeWheelEnhanced';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Phone, AlertTriangle, Gift, CheckCircle, Ban, Sparkles, User, ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { validateTokenPrefix, isLegacyToken } from '@/utils/tokenValidation';
import { supabase } from '@/lib/supabase-shim';

export default function PublicRoletaByToken() {
  const { token } = useParams<{ token: string }>();
  
  // Validate token prefix (allow legacy tokens without prefix)
  const isValidToken = token && (validateTokenPrefix(token, 'roleta') || isLegacyToken(token));
  
  const { data: company, isLoading: companyLoading } = useCompanyByToken(isValidToken ? token : undefined, 'roleta');
  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessByToken(company?.id);
  const { prizes, isLoading: prizesLoading } = usePublicPrizes(company?.id || '');
  const { settings: wheelSettings, isLoading: settingsLoading } = usePublicWheelSettings(company?.id);
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState(''); // Auto-filled if exists
  const [step, setStep] = useState<'phone' | 'confirm' | 'wheel' | 'won'>('phone');
  const [isChecking, setIsChecking] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Format phone as user types
  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setCustomerPhone(formatted);
    setEligibilityError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = customerPhone.replace(/\D/g, '');
    
    if (phoneDigits.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }

    if (!company?.id || !wheelSettings) {
      toast.error('Erro ao carregar configurações');
      return;
    }

    setIsChecking(true);
    setEligibilityError(null);

    try {
      // 1. Check if customer exists and get their name
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', company.id)
        .or(`whatsapp.eq.${phoneDigits},whatsapp.eq.55${phoneDigits}`)
        .maybeSingle();

      if (existingCustomer) {
        setCustomerName(existingCustomer.name);
        setCustomerId(existingCustomer.id);
      }

      // 2. Check eligibility
      const eligibility = await checkWheelEligibility(company.id, customerPhone, wheelSettings);
      
      if (!eligibility.canSpin) {
        setEligibilityError(eligibility.reason || 'Você não está elegível para girar a roleta.');
        setIsChecking(false);
        return;
      }

      // Store eligibility data for spin recording
      setOrdersCount(eligibility.ordersCount || 0);
      setTotalSpent(eligibility.totalSpentSinceLastSpin || 0);
      setIsEligible(true);

      // 3. If customer doesn't exist, mark as new
      if (!existingCustomer) {
        const phoneForName = phoneDigits.slice(-4);
        setCustomerName(`Cliente ${phoneForName}`);
        setIsNewCustomer(true);
      } else {
        setIsNewCustomer(false);
      }

      // 4. User is eligible - show confirmation step
      setStep('confirm');
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Erro ao verificar elegibilidade');
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmAndSpin = () => {
    setStep('wheel');
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setCustomerPhone('');
    setCustomerName('');
    setEligibilityError(null);
    setIsEligible(false);
    setCustomerId(null);
  };

  const sendWhatsAppNotification = useCallback(async (prizeName: string) => {
    if (!company?.id || !customerPhone) return;
    
    try {
      await supabase.functions.invoke('send-whatsapp-direct', {
        body: {
          company_id: company.id,
          phone: customerPhone.replace(/\D/g, ''),
          message: `🎉 *Parabéns!* Você ganhou na roleta!\n\n🎁 *Prêmio:* ${prizeName}\n\n✅ Seu desconto já está salvo automaticamente!\n\n💡 Para usar: basta informar seu telefone no próximo pedido.\n\n_${company.name}_`,
        },
      });
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      // Don't show error to user - WhatsApp is optional
    }
  }, [company?.id, company?.name, customerPhone]);

  const handleSpin = async (): Promise<Prize | null> => {
    if (prizes.length === 0 || !company?.id || !wheelSettings) return null;

    // Ensure customer exists
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const customerResult = await findOrCreateCustomer(company.id, customerName, customerPhone);
      if (!customerResult) {
        toast.error('Erro ao registrar participação');
        return null;
      }
      finalCustomerId = customerResult.id;
      setCustomerId(finalCustomerId);
    }

    // Weighted random selection
    const totalWeight = prizes.reduce((sum, p) => sum + Number(p.probability), 0);
    let random = Math.random() * totalWeight;
    
    let selectedPrize: Prize | null = null;
    for (const prize of prizes) {
      random -= Number(prize.probability);
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }
    
    if (!selectedPrize) selectedPrize = prizes[0];

    // Record the spin and create reward
    try {
      const prizeType = (selectedPrize as any).prize_type || 'percentage';
      const prizeValue = (selectedPrize as any).prize_value || 10;
      
      const result = await recordWheelSpin({
        companyId: company.id,
        customerId: finalCustomerId,
        phone: customerPhone,
        prizeName: selectedPrize.name,
        prizeType: prizeType,
        prizeValue: prizeValue,
        validityDays: wheelSettings.prize_validity_days,
        ordersCount: ordersCount,
        totalSpent: totalSpent,
      });

      if (result) {
        setRewardSaved(true);
        // Send WhatsApp notification
        sendWhatsAppNotification(selectedPrize.name);
      }
    } catch (error) {
      console.error('Error recording spin:', error);
    }

    setWonPrize(selectedPrize);
    return selectedPrize;
  };

  if (!token || (!isValidToken && !isLegacyToken(token))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Token inválido</h1>
          <p className="text-white/70">Este token não é válido para a roleta.</p>
        </div>
      </div>
    );
  }

  if (companyLoading || prizesLoading || accessLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-yellow-400" />
          <p className="text-white/80">Carregando roleta...</p>
        </div>
      </div>
    );
  }

  // Check company access after loading
  if (company && accessStatus && !accessStatus.hasAccess) {
    return <StoreUnavailable companyName={company.name} />;
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Link inválido</h1>
          <p className="text-white/70">Este link de roleta não existe ou foi desativado.</p>
        </div>
      </div>
    );
  }

  if (!wheelSettings?.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <div className="text-center p-8">
          <Ban className="w-12 h-12 text-white/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Roleta desativada</h1>
          <p className="text-white/70">A roleta de prêmios não está disponível no momento.</p>
        </div>
      </div>
    );
  }

  if (prizes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <div className="text-center p-8">
          <Gift className="w-12 h-12 text-white/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Roleta indisponível</h1>
          <p className="text-white/70">Nenhum prêmio configurado no momento.</p>
        </div>
      </div>
    );
  }

  // Show success message after winning
  if (wonPrize && rewardSaved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex flex-col">
        <header className="py-6 px-4">
          <div className="container max-w-2xl mx-auto text-center">
            <Gift className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          </div>
        </header>

        <main className="flex-1 container max-w-md mx-auto px-4 py-8 flex items-center">
          <Card className="w-full bg-white/95 backdrop-blur shadow-2xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-3xl">🎉 Parabéns!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Você ganhou: <strong className="text-primary">{wonPrize.name}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Gift className="w-6 h-6 text-orange-500" />
                  <span className="font-semibold text-orange-700">Prêmio Registrado!</span>
                </div>
                <p className="text-sm text-center text-gray-600">
                  Seu desconto foi salvo automaticamente e estará disponível no seu próximo pedido.
                </p>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  ✅ Enviamos uma confirmação para seu WhatsApp
                </p>
                <p className="text-xs text-gray-500">
                  Válido por {wheelSettings.prize_validity_days} dias. 
                  Basta informar seu telefone no próximo pedido.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <Gift className="w-10 h-10 mx-auto text-yellow-400 mb-2 animate-bounce" />
          <h1 className="text-3xl font-bold text-white">{company.name}</h1>
          <p className="text-white/80 mt-1 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gire a roleta e ganhe prêmios!
            <Sparkles className="w-4 h-4" />
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
        {step === 'phone' && (
          <Card className="max-w-sm w-full bg-white/95 backdrop-blur shadow-2xl border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Participe da Roleta</CardTitle>
              <CardDescription>
                Digite seu telefone para verificar sua elegibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4" />
                    Seu WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    required
                    disabled={isChecking}
                    className="text-lg h-12 text-center font-medium"
                    maxLength={16}
                  />
                </div>

                {eligibilityError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700 space-y-2">
                        <p className="font-medium">{eligibilityError}</p>
                        <div className="pt-2 border-t border-red-200">
                          <p className="font-semibold text-red-800 mb-1">📋 Regras para participar:</p>
                          <ul className="text-xs space-y-1 text-red-600">
                          <li>• Mínimo de <strong>{wheelSettings?.min_orders_first_spin || 2} pedidos</strong> para primeira participação</li>
                          <li>• Após girar, gastar <strong>R$ {((wheelSettings?.min_value_to_spin_again || 5000) / 100).toFixed(0)}</strong> para girar novamente</li>
                          <li>• Máximo de <strong>{wheelSettings?.max_pending_rewards || 1} prêmio(s)</strong> pendentes por vez</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Verificar Elegibilidade
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  Você precisa ter pelo menos {wheelSettings?.min_orders_first_spin || 2} pedidos 
                  realizados para participar pela primeira vez.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && (
          <Card className="max-w-sm w-full bg-white/95 backdrop-blur shadow-2xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-green-600">Você está elegível!</CardTitle>
              <CardDescription className="text-base mt-2">
                Confirme seus dados para girar a roleta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer info */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{customerName}</p>
                    <p className="text-sm text-gray-600">{customerPhone}</p>
                  </div>
                </div>
                
                {!isNewCustomer && (
                  <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-100 px-3 py-2 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      <strong>{ordersCount}</strong> pedidos realizados
                    </span>
                  </div>
                )}
              </div>

              {/* Eligibility confirmation */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Verificação concluída!</span>
                </div>
                <ul className="text-sm text-green-600 space-y-1 pl-7">
                  <li>✓ Cliente identificado</li>
                  <li>✓ Regras de elegibilidade atendidas</li>
                  <li>✓ Pronto para girar a roleta</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBackToPhone}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmAndSpin}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Girar Roleta!
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'wheel' && (
          <div className="py-4">
            <PrizeWheelEnhanced
              prizes={prizes}
              onSpin={handleSpin}
              companyName={company.name}
            />
          </div>
        )}
      </main>
    </div>
  );
}
