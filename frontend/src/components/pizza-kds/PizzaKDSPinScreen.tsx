import React, { useState } from 'react';
import { usePizzaKDSSession } from '@/contexts/PizzaKDSSessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Pizza, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export function PizzaKDSPinScreen() {
  const { login, restaurantName, restaurantLogo } = usePizzaKDSSession();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get slug from localStorage
  const storedSlug = localStorage.getItem('pizza_kds_slug');
  const slug = storedSlug ? JSON.parse(storedSlug).companyId : '';

  const handleSubmit = async () => {
    if (pin.length !== 4) return;

    setIsLoading(true);
    setError(null);

    // Get the actual slug from the stored company info
    const parsedStored = storedSlug ? JSON.parse(storedSlug) : null;

    const result = await login(parsedStored?.companyId || slug, pin);

    if (!result.success) {
      setError(result.error || 'PIN inválido');
      setPin('');
    }

    setIsLoading(false);
  };

  const handleBack = () => {
    localStorage.removeItem('pizza_kds_slug');
    window.location.reload();
  };

  // Auto-submit when PIN is complete
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt={restaurantName || 'Logo'}
              className="w-20 h-20 mx-auto rounded-full object-cover mb-4"
            />
          ) : (
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Pizza className="w-10 h-10 text-orange-600" />
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
            <div className="flex items-center justify-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
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
