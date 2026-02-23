import React, { useState, useEffect } from 'react';
import { usePizzaKdsV2Session } from '@/contexts/PizzaKdsV2SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Pizza, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Pizza KDS V2 - PIN Entry Screen
 * 
 * Second step of authentication: enter operator PIN
 */
export function PizzaKdsV2PinScreen() {
  const { login, restaurantName, restaurantLogo, restaurantSlug } = usePizzaKdsV2Session();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (pin.length !== 4 || !restaurantSlug) return;

    setIsLoading(true);
    setError(null);

    const result = await login(restaurantSlug, pin);

    if (!result.success) {
      setError(result.error || 'PIN inválido');
      setPin('');
    }

    setIsLoading(false);
  };

  const handleBack = () => {
    localStorage.removeItem('pizza_kds_v2_slug');
    window.location.reload();
  };

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>

        <CardHeader className="text-center pt-12">
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt={restaurantName || 'Logo'}
              className="w-20 h-20 mx-auto rounded-full object-cover mb-4 shadow-lg"
            />
          ) : (
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Pizza className="w-12 h-12 text-white" />
            </div>
          )}
          <CardTitle className="text-2xl">{restaurantName}</CardTitle>
          <p className="text-muted-foreground mt-2">
            Digite seu PIN de operador
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              value={pin}
              onChange={setPin}
              maxLength={4}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
                <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
                <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
                <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            O PIN identifica você e determina qual etapa da produção você opera.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
