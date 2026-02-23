import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { usePublicPrizes } from '@/hooks/usePrizes';
import { useCompanyAccessBySlug } from '@/hooks/useCompanyAccessBySlug';
import { PrizeWheelEnhanced as Wheel } from '@/components/prizes/PrizeWheelEnhanced';
import { AIChatWidget } from '@/components/chat/AIChatWidget';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Gift, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function PrizeWheelPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [customerPhone, setCustomerPhone] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessBySlug(slug);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { prizes, isLoading: prizesLoading, spinWheel } = usePublicPrizes(company?.id);

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerPhone(formatPhoneInput(e.target.value));
  };

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }
    setShowForm(false);
  };

  const handleSpin = async () => {
    if (hasPlayed) {
      toast.error('Você já jogou! Volte outro dia para jogar novamente.');
      return null;
    }
    // Use phone last 4 digits as customer name
    const phoneDigits = customerPhone.replace(/\D/g, '');
    const customerName = `Cliente ${phoneDigits.slice(-4)}`;
    const result = await spinWheel(customerName, customerPhone);
    if (result) {
      setHasPlayed(true);
    }
    return result;
  };

  // Handle close - navigate back to delivery
  const handleClose = useCallback(() => {
    if (slug) {
      // Navigate to delivery menu for this company
      navigate(`/${slug}`, { replace: true });
    } else {
      // Fallback - just go back
      navigate(-1);
    }
  }, [slug, navigate]);

  if (companyLoading || prizesLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  // Check access status
  if (accessStatus && !accessStatus.hasAccess) {
    return <StoreUnavailable companyName={accessStatus.companyName} />;
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold">Empresa não encontrada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Gift className="h-12 w-12 mx-auto text-white mb-4" />
          <h1 className="text-3xl font-bold text-white">{company.name}</h1>
          <p className="text-white/80 mt-2">Gire a roleta e ganhe prêmios!</p>
        </div>

        {/* Form or Wheel */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-6 shadow-2xl">
          {showForm ? (
            <form onSubmit={handleStartGame} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Seu WhatsApp
                </label>
                <Input
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  required
                  className="text-lg h-12 text-center font-medium"
                  maxLength={16}
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                <Gift className="mr-2 h-5 w-5" />
                Participar
              </Button>
            </form>
          ) : (
            <Wheel 
              prizes={prizes} 
              onSpin={handleSpin} 
              disabled={hasPlayed} 
              companyName={company.name}
              onClose={handleClose}
            />
          )}
        </div>

        {hasPlayed && (
          <p className="text-center text-white/80 mt-4 text-sm">
            Apresente este prêmio no estabelecimento para resgatar!
          </p>
        )}
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget companyName={company.name} />
    </div>
  );
}
