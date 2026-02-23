/**
 * WaiterPINEntryScreen
 * 
 * 4-digit PIN entry screen for waiter app authentication.
 * Shows an ATM-style keypad for entering the restaurant's PIN.
 */

import { useState, useEffect } from 'react';
import { Loader2, Lock, Delete, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WaiterPINEntryScreenProps {
  restaurantName: string;
  restaurantLogo?: string | null;
  onPINValidated: () => void;
  onBack?: () => void;
  validatePIN: (pin: string) => Promise<boolean>;
}

export function WaiterPINEntryScreen({
  restaurantName,
  restaurantLogo,
  onPINValidated,
  onBack,
  validatePIN
}: WaiterPINEntryScreenProps) {
  const [pin, setPin] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    
    setIsValidating(true);
    setError(null);

    try {
      const isValid = await validatePIN(pin);
      
      if (isValid) {
        // Store PIN in localStorage for session persistence
        localStorage.setItem('waiterPin', pin);
        onPINValidated();
      } else {
        setError('PIN inválido');
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin('');
        }, 500);
      }
    } catch (err) {
      setError('Erro ao validar PIN');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 500);
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4 && !isValidating) {
      setPin(prev => prev + digit);
      setError(null);
    }
  };

  const handleDelete = () => {
    if (!isValidating) {
      setPin(prev => prev.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    if (!isValidating) {
      setPin('');
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex flex-col items-center justify-center p-4">
      {/* Back Button */}
      {onBack && (
        <Button
          variant="ghost"
          className="absolute top-4 left-4"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
      )}

      <Card className={cn(
        "w-full max-w-sm border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.15)]",
        shake && "animate-shake"
      )}>
        <CardHeader className="text-center space-y-4">
          {/* Restaurant Logo */}
          {restaurantLogo ? (
            <img 
              src={restaurantLogo} 
              alt={restaurantName} 
              className="h-16 w-auto mx-auto object-contain"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          )}
          
          <div>
            <CardTitle className="text-xl">Digite seu PIN</CardTitle>
            <CardDescription>{restaurantName}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all",
                  pin.length > index 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-muted-foreground/30 bg-muted/30"
                )}
              >
                {pin.length > index ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center text-destructive text-sm font-medium animate-pulse">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isValidating && (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Numeric Keypad */}
          {!isValidating && (
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleKeyPress(digit)}
                >
                  {digit}
                </Button>
              ))}
              
              <Button
                variant="outline"
                className="h-14 text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive"
                onClick={handleClear}
              >
                Limpar
              </Button>
              
              <Button
                variant="outline"
                className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleKeyPress('0')}
              >
                0
              </Button>
              
              <Button
                variant="outline"
                className="h-14 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Delete className="w-5 h-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>Zoopi Tecnologia © {new Date().getFullYear()}</p>
      </footer>

      {/* Add shake animation CSS */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
