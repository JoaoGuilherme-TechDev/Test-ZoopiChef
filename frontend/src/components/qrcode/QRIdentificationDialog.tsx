import { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase-shim';

interface QRIdentificationDialogProps {
  open: boolean;
  onIdentify: (name: string, phone: string) => Promise<boolean>;
  isLoading?: boolean;
  tableNumber?: number | null;
  comandaNumber?: number | null;
  companyName?: string;
  companyLogo?: string | null;
  companyId?: string;
}

export function QRIdentificationDialog({
  open,
  onIdentify,
  isLoading = false,
  tableNumber,
  comandaNumber,
  companyName,
  companyLogo,
  companyId,
}: QRIdentificationDialogProps) {
  const [phone, setPhone] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string }>({});

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setErrors({});
  };

  const validate = () => {
    const newErrors: { phone?: string } = {};
    const phoneNumbers = phone.replace(/\D/g, '');
    
    if (!phoneNumbers) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.phone = 'Telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLookingUp(true);
    const phoneDigits = phone.replace(/\D/g, '');
    
    try {
      // Try to find existing customer by phone
      let customerName = `Cliente ${phoneDigits.slice(-4)}`;
      
      if (companyId) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('name')
          .eq('company_id', companyId)
          .or(`whatsapp.eq.${phoneDigits},whatsapp.eq.55${phoneDigits}`)
          .maybeSingle();
        
        if (existingCustomer?.name) {
          customerName = existingCustomer.name;
        }
      }

      const success = await onIdentify(customerName, phone);
      if (success) {
        setPhone('');
        setErrors({});
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const locationLabel = tableNumber 
    ? `Mesa ${tableNumber}` 
    : comandaNumber 
      ? `Comanda ${comandaNumber}` 
      : '';

  const loading = isLoading || isLookingUp;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          {companyLogo && (
            <div className="flex justify-center mb-4">
              <img 
                src={companyLogo} 
                alt={companyName || 'Logo'} 
                className="h-16 object-contain"
              />
            </div>
          )}
          <DialogTitle className="text-xl">
            {companyName && <span className="block text-lg text-muted-foreground mb-1">{companyName}</span>}
            Bem-vindo! {locationLabel}
          </DialogTitle>
          <DialogDescription>
            Para fazer seu pedido, informe seu telefone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Seu WhatsApp
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              autoComplete="tel"
              disabled={loading}
              className={`text-lg h-12 text-center font-medium ${errors.phone ? 'border-destructive' : ''}`}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              'Começar a Pedir'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
