import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  CalendarDays, 
  Clock, 
  Users, 
  Phone, 
  User, 
  UtensilsCrossed, 
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  MapPin,
  Mail,
  FileText,
  Accessibility,
  Baby,
  PartyPopper,
  ArrowLeft,
  ArrowRight,
  Shield,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isAfter, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePublicFloorPlan } from '@/hooks/useFloorPlan';
import { FloorPlanViewer } from '@/components/floor-plan/FloorPlanViewer';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// Reservation reason options
const RESERVATION_REASONS = [
  { value: 'confraternizacao', label: 'Confraternização' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'ocasiao_especial', label: 'Ocasião Especial' },
  { value: 'outro', label: 'Outro' },
];

interface ReservationFormData {
  // Date/Time
  selectedDate: Date | undefined;
  selectedTime: string;
  guestCount: string;
  selectedTableId: string | null;
  
  // Customer info
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCpf: string;
  
  // Special needs
  needsWheelchairAccess: boolean;
  needsDisabilityAccess: boolean;
  needsBabyChair: boolean;
  otherNeeds: string;
  
  // Reason
  reservationReason: string;
  reservationReasonOther: string;
  
  // Notes
  notes: string;
}

export default function PublicReservationBySlug() {
  const { slug } = useParams<{ slug: string }>();
  
  // Step management
  const [step, setStep] = useState<'form' | 'review' | 'verification' | 'payment' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<ReservationFormData>({
    selectedDate: undefined,
    selectedTime: '',
    guestCount: '2',
    selectedTableId: null,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCpf: '',
    needsWheelchairAccess: false,
    needsDisabilityAccess: false,
    needsBabyChair: false,
    otherNeeds: '',
    reservationReason: '',
    reservationReasonOther: '',
    notes: '',
  });

  // Fetch company by slug
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['public-company-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, phone, whatsapp, address')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch reservation settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['public-reservation-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Floor plan data
  const { layout: floorPlanLayout, elements: floorPlanElements, tables: floorPlanTables } = usePublicFloorPlan(company?.id);

  // Format phone as user types
  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Format CPF as user types
  const formatCpfInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const updateFormData = <K extends keyof ReservationFormData>(
    field: K, 
    value: ReservationFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate available time slots
  const timeSlots = useMemo(() => {
    if (!settings) return [];
    
    const slots: string[] = [];
    const startHour = parseInt(settings.opening_time?.split(':')[0] || '11');
    const endHour = parseInt(settings.closing_time?.split(':')[0] || '22');
    const interval = settings.slot_interval_minutes || 30;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += interval) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [settings]);

  // Generate guest count options
  const guestOptions = useMemo(() => {
    const max = settings?.max_party_size || 20;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [settings]);

  // Validate form
  const validateForm = () => {
    if (!formData.selectedDate || !formData.selectedTime) {
      toast.error('Selecione data e horário');
      return false;
    }
    if (!formData.customerName.trim()) {
      toast.error('Informe o nome do responsável');
      return false;
    }
    const phoneDigits = formData.customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Informe um telefone válido');
      return false;
    }
    if (settings?.require_email && !formData.customerEmail.trim()) {
      toast.error('Informe o e-mail');
      return false;
    }
    if (settings?.require_cpf) {
      const cpfDigits = formData.customerCpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        toast.error('Informe um CPF válido');
        return false;
      }
    }
    if (!formData.reservationReason) {
      toast.error('Selecione o motivo da reserva');
      return false;
    }
    if (formData.reservationReason === 'outro' && !formData.reservationReasonOther.trim()) {
      toast.error('Informe o motivo da reserva');
      return false;
    }
    return true;
  };

  // Go to review step
  const handleGoToReview = () => {
    if (!validateForm()) return;
    setStep('review');
  };

  // Send verification code
  const sendVerificationCode = async () => {
    const phoneDigits = formData.customerPhone.replace(/\D/g, '');
    setIsSendingCode(true);
    
    try {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      // Store verification code
      const { error } = await supabase
        .from('phone_verification_codes')
        .insert({
          phone: phoneDigits,
          code: code,
          company_id: company!.id,
          reservation_data: formData as any,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      // In a real scenario, you would send SMS here
      // For demo, show the code in a toast
      toast.success(`Código de verificação: ${code}`, { duration: 10000 });
      setVerificationSent(true);
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error('Erro ao enviar código');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify code
  const verifyCode = async () => {
    const phoneDigits = formData.customerPhone.replace(/\D/g, '');
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase
        .from('phone_verification_codes')
        .select('*')
        .eq('phone', phoneDigits)
        .eq('code', verificationCode)
        .eq('company_id', company!.id)
        .gt('expires_at', new Date().toISOString())
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Código inválido ou expirado');
        return;
      }

      // Mark as verified
      await supabase
        .from('phone_verification_codes')
        .update({ verified: true })
        .eq('id', data.id);

      // Check if payment is required
      if (settings?.require_advance_payment && (settings?.advance_payment_amount_cents || 0) > 0) {
        setStep('payment');
      } else {
        await submitReservation(true);
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Erro ao verificar código');
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit reservation
  const submitReservation = async (phoneVerified: boolean = false) => {
    if (!company?.id || !formData.selectedDate) return;
    
    setIsSubmitting(true);

    try {
      const phoneDigits = formData.customerPhone.replace(/\D/g, '');
      const cpfDigits = formData.customerCpf.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          company_id: company.id,
          customer_name: formData.customerName.trim(),
          customer_phone: phoneDigits,
          customer_email: formData.customerEmail.trim() || null,
          customer_cpf: cpfDigits || null,
          reservation_date: format(formData.selectedDate, 'yyyy-MM-dd'),
          reservation_time: formData.selectedTime,
          party_size: parseInt(formData.guestCount),
          table_id: formData.selectedTableId,
          reservation_reason: formData.reservationReason,
          reservation_reason_other: formData.reservationReasonOther || null,
          needs_wheelchair_access: formData.needsWheelchairAccess,
          needs_disability_access: formData.needsDisabilityAccess,
          needs_baby_chair: formData.needsBabyChair,
          other_needs: formData.otherNeeds || null,
          notes: formData.notes.trim() || null,
          status: 'pending',
          source: 'online',
          phone_verified: phoneVerified,
        })
        .select('id, confirmation_token')
        .single();

      if (error) throw error;

      setReservationId(data.id);
      setConfirmationToken(data.confirmation_token);
      
      // Send WhatsApp confirmation notification
      try {
        await supabase.functions.invoke('reservation-notifications', {
          body: {
            reservation_id: data.id,
            notification_type: 'confirmation',
          },
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the reservation if notification fails
      }

      setStep('success');
      toast.success('Reserva solicitada com sucesso!');
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Erro ao criar reserva. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle confirm from review
  const handleConfirmReservation = async () => {
    if (settings?.require_phone_verification) {
      setStep('verification');
      await sendVerificationCode();
    } else {
      await submitReservation(false);
    }
  };

  if (companyLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300" />
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Estabelecimento não encontrado</h1>
          <p className="text-white/70">Verifique se o link está correto.</p>
        </div>
      </div>
    );
  }

  if (!settings?.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900">
        <div className="text-center p-8">
          <UtensilsCrossed className="w-12 h-12 text-purple-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Reservas Online Indisponíveis</h1>
          <p className="text-white/70 mb-4">
            As reservas online não estão disponíveis no momento.
          </p>
          {company.phone && (
            <p className="text-white/80">
              Entre em contato: <a href={`tel:${company.phone}`} className="text-purple-300 underline">{company.phone}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900 flex flex-col">
        <header className="py-6 px-4">
          <div className="container max-w-2xl mx-auto text-center">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-3 rounded-lg" />
            ) : (
              <UtensilsCrossed className="w-12 h-12 mx-auto text-purple-300 mb-3" />
            )}
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          </div>
        </header>

        <main className="flex-1 container max-w-md mx-auto px-4 py-8 flex items-center">
          <Card className="w-full bg-white/95 backdrop-blur shadow-2xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-green-600">Reserva Solicitada!</CardTitle>
              <CardDescription className="text-base mt-2">
                Sua solicitação foi enviada com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium text-gray-900">{formData.selectedDate && format(formData.selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horário:</span>
                    <span className="font-medium text-gray-900">{formData.selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pessoas:</span>
                    <span className="font-medium text-gray-900">{formData.guestCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Responsável:</span>
                    <span className="font-medium text-gray-900">{formData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Motivo:</span>
                    <span className="font-medium text-gray-900">
                      {RESERVATION_REASONS.find(r => r.value === formData.reservationReason)?.label || formData.reservationReasonOther}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirmation Token */}
              {confirmationToken && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <p className="text-xs text-purple-600 mb-1">Código da Reserva</p>
                  <p className="text-2xl font-mono font-bold text-purple-700 tracking-widest">
                    {confirmationToken}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    Guarde este código para consultar sua reserva
                  </p>
                </div>
              )}

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">Aguardando confirmação</p>
                    <p className="text-xs mt-1">
                      Você receberá uma confirmação via WhatsApp assim que sua reserva for aprovada.
                    </p>
                  </div>
                </div>
              </div>

              {/* Portal Link */}
              <Button
                variant="default"
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600"
                asChild
              >
                <a href={`/reserva/${slug}/minha-reserva?token=${confirmationToken}`}>
                  📋 Ver Minha Reserva
                </a>
              </Button>

              {company.whatsapp && (
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a 
                    href={`https://wa.me/55${company.whatsapp.replace(/\D/g, '')}?text=Olá! Acabei de solicitar uma reserva para o dia ${formData.selectedDate ? format(formData.selectedDate, 'dd/MM') : ''} às ${formData.selectedTime}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contatar via WhatsApp
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Verification screen
  if (step === 'verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900 flex flex-col">
        <header className="py-6 px-4">
          <div className="container max-w-2xl mx-auto text-center">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-3 rounded-lg" />
            ) : (
              <UtensilsCrossed className="w-12 h-12 mx-auto text-purple-300 mb-3" />
            )}
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          </div>
        </header>

        <main className="flex-1 container max-w-md mx-auto px-4 py-4 pb-8">
          <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Verificação de Telefone</CardTitle>
              <CardDescription>
                Enviamos um código para {formData.customerPhone}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('review')}
                  disabled={isVerifying}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600"
                  onClick={verifyCode}
                  disabled={verificationCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Verificar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={sendVerificationCode}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? 'Enviando...' : 'Reenviar código'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Review screen
  if (step === 'review') {
    const selectedTable = floorPlanTables.find(t => t.id === formData.selectedTableId);
    const reasonLabel = RESERVATION_REASONS.find(r => r.value === formData.reservationReason)?.label;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900 flex flex-col">
        <header className="py-6 px-4">
          <div className="container max-w-2xl mx-auto text-center">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-3 rounded-lg" />
            ) : (
              <UtensilsCrossed className="w-12 h-12 mx-auto text-purple-300 mb-3" />
            )}
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          </div>
        </header>

        <main className="flex-1 container max-w-md mx-auto px-4 py-4 pb-8">
          <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Confirme sua Reserva
              </CardTitle>
              <CardDescription>
                Verifique se todos os dados estão corretos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date/Time/Guests */}
              <div className="p-4 bg-purple-50 rounded-lg space-y-2 border border-purple-100">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Data e Horário
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-purple-600 text-xs">Data:</span>
                    <p className="font-medium text-gray-900">{formData.selectedDate && format(formData.selectedDate, "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <span className="text-purple-600 text-xs">Horário:</span>
                    <p className="font-medium text-gray-900">{formData.selectedTime}</p>
                  </div>
                  <div>
                    <span className="text-purple-600 text-xs">Pessoas:</span>
                    <p className="font-medium text-gray-900">{formData.guestCount}</p>
                  </div>
                  {selectedTable && (
                    <div>
                      <span className="text-purple-600 text-xs">Mesa:</span>
                      <p className="font-medium text-gray-900">{selectedTable.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer info */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2 border border-blue-100">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dados do Responsável
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2">
                    <span className="text-blue-600 text-xs">Nome:</span>
                    <p className="font-medium text-gray-900">{formData.customerName}</p>
                  </div>
                  <div>
                    <span className="text-blue-600 text-xs">Telefone:</span>
                    <p className="font-medium text-gray-900">{formData.customerPhone}</p>
                  </div>
                  {formData.customerEmail && (
                    <div>
                      <span className="text-blue-600 text-xs">E-mail:</span>
                      <p className="font-medium text-gray-900 text-xs break-all">{formData.customerEmail}</p>
                    </div>
                  )}
                  {formData.customerCpf && (
                    <div>
                      <span className="text-blue-600 text-xs">CPF:</span>
                      <p className="font-medium text-gray-900">{formData.customerCpf}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="p-4 bg-green-50 rounded-lg space-y-2 border border-green-100">
                <h3 className="font-semibold text-green-900 flex items-center gap-2">
                  <PartyPopper className="w-4 h-4" />
                  Motivo da Reserva
                </h3>
                <p className="font-medium text-sm text-gray-900">
                  {reasonLabel}
                  {formData.reservationReason === 'outro' && `: ${formData.reservationReasonOther}`}
                </p>
              </div>

              {/* Special needs */}
              {(formData.needsWheelchairAccess || formData.needsDisabilityAccess || formData.needsBabyChair || formData.otherNeeds) && (
                <div className="p-4 bg-orange-50 rounded-lg space-y-2 border border-orange-100">
                  <h3 className="font-semibold text-orange-900 flex items-center gap-2">
                    <Accessibility className="w-4 h-4" />
                    Necessidades Especiais
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.needsWheelchairAccess && (
                      <span className="px-3 py-1 bg-orange-100 border border-orange-200 rounded-full text-xs font-medium text-orange-800">♿ Cadeirante</span>
                    )}
                    {formData.needsDisabilityAccess && (
                      <span className="px-3 py-1 bg-orange-100 border border-orange-200 rounded-full text-xs font-medium text-orange-800">🧑‍🦯 PCD</span>
                    )}
                    {formData.needsBabyChair && (
                      <span className="px-3 py-1 bg-orange-100 border border-orange-200 rounded-full text-xs font-medium text-orange-800">👶 Cadeira de bebê</span>
                    )}
                  </div>
                  {formData.otherNeeds && (
                    <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formData.otherNeeds}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {formData.notes && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
                  <h3 className="font-semibold text-gray-900">Observações</h3>
                  <p className="text-sm text-gray-800">{formData.notes}</p>
                </div>
              )}

              {/* Tolerance Warning */}
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">Política de Reserva</p>
                    <ul className="text-amber-700 space-y-1 mt-1 list-disc list-inside text-xs">
                      <li>Tolerância: <strong>10 minutos</strong> após o horário marcado</li>
                      <li>Cancelamento: mínimo <strong>5 horas antes</strong></li>
                      <li>Sem reembolso após esse prazo</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Payment info */}
              {settings?.require_advance_payment && (settings?.advance_payment_amount_cents || 0) > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Pagamento Antecipado</p>
                      <p className="text-sm text-yellow-700">
                        Valor: R$ {((settings.advance_payment_amount_cents || 0) / 100).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('form')}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600"
                  onClick={handleConfirmReservation}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Confirmar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Form screen
  return (
    <div className="light min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-purple-900 flex flex-col">
      <header className="py-6 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-3 rounded-lg" />
          ) : (
            <UtensilsCrossed className="w-12 h-12 mx-auto text-purple-300 mb-3" />
          )}
          <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          <p className="text-white/80 mt-1">Reserve sua mesa online</p>
        </div>
      </header>

      <main className="flex-1 container max-w-md mx-auto px-4 py-4 pb-8">
        <Card className="bg-white/95 text-gray-900 backdrop-blur shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-600" />
              Fazer Reserva
            </CardTitle>
            <CardDescription>
              Preencha os dados abaixo para solicitar sua reserva
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tolerance Warning Banner */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-amber-800">⚠️ Política de Reserva</p>
                  <ul className="text-amber-700 space-y-1 list-disc list-inside">
                    <li>Tolerância de <strong>10 minutos</strong> após o horário marcado. Após esse prazo, a mesa será liberada automaticamente.</li>
                    <li>Cancelamentos devem ser feitos com no mínimo <strong>5 horas de antecedência</strong>.</li>
                    <li>Cancelamentos após esse prazo <strong>não terão reembolso</strong> do valor da reserva.</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleGoToReview(); }} className="space-y-6">
              {/* Section: Data e Horário */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-purple-700 border-b pb-2">📅 Data e Horário</h3>
                
                {/* Date picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Data da Reserva *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {formData.selectedDate ? format(formData.selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.selectedDate}
                        onSelect={(date) => updateFormData('selectedDate', date)}
                        disabled={(date) => 
                          isBefore(date, startOfToday()) || 
                          isAfter(date, addDays(new Date(), settings?.max_advance_days || 30))
                        }
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horário *
                  </Label>
                  <Select value={formData.selectedTime} onValueChange={(v) => updateFormData('selectedTime', v)}>
                    <SelectTrigger className="bg-white text-gray-900 [&>span[data-placeholder]]:text-gray-500">
                      <SelectValue placeholder="Selecione o horário" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-900">
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time} className="text-gray-900 focus:text-gray-900">
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Guest count */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Quantidade de Lugares *
                  </Label>
                  <Select value={formData.guestCount} onValueChange={(v) => updateFormData('guestCount', v)}>
                    <SelectTrigger className="bg-white text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-900">
                      {guestOptions.map((num) => (
                        <SelectItem key={num} value={num.toString()} className="text-gray-900 focus:text-gray-900">
                          {num} {num === 1 ? 'pessoa' : 'pessoas'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Floor Plan - Table Selection */}
              {floorPlanLayout && floorPlanTables.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Escolha sua Mesa (opcional)
                  </Label>
                  <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <FloorPlanViewer
                      layout={floorPlanLayout}
                      elements={floorPlanElements}
                      tables={floorPlanTables.filter(t => t.capacity >= parseInt(formData.guestCount))}
                      selectedTableId={formData.selectedTableId}
                      onTableSelect={(id) => updateFormData('selectedTableId', id)}
                    />
                    {formData.selectedTableId && (
                      <div className="mt-3 p-2 bg-green-100 rounded-lg border border-green-300 text-center">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ Mesa selecionada: {floorPlanTables.find(t => t.id === formData.selectedTableId)?.name || 'Mesa'}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Toque em uma mesa disponível para selecioná-la
                  </p>
                </div>
              )}

              {/* Section: Dados do Responsável */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-purple-700 border-b pb-2">👤 Dados do Responsável</h3>
                
                {/* Customer name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-purple-600" />
                    Nome Completo *
                  </Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => updateFormData('customerName', e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                    className="bg-white text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Customer phone */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-purple-600" />
                    Telefone/WhatsApp *
                  </Label>
                  <Input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => updateFormData('customerPhone', formatPhoneInput(e.target.value))}
                    placeholder="(00) 00000-0000"
                    required
                    maxLength={16}
                    className="bg-white text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Customer email */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-purple-600" />
                    E-mail {settings?.require_email ? '*' : '(opcional)'}
                  </Label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => updateFormData('customerEmail', e.target.value)}
                    placeholder="seu@email.com"
                    required={settings?.require_email}
                    className="bg-white text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Customer CPF */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700">
                    <FileText className="w-4 h-4 text-purple-600" />
                    CPF {settings?.require_cpf ? '*' : '(opcional)'}
                  </Label>
                  <Input
                    value={formData.customerCpf}
                    onChange={(e) => updateFormData('customerCpf', formatCpfInput(e.target.value))}
                    placeholder="000.000.000-00"
                    required={settings?.require_cpf}
                    maxLength={14}
                    className="bg-white text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Section: Motivo da Reserva */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-purple-700 border-b pb-2">🎉 Motivo da Reserva</h3>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700">
                    <PartyPopper className="w-4 h-4 text-purple-600" />
                    Qual o motivo? *
                  </Label>
                  <Select value={formData.reservationReason} onValueChange={(v) => updateFormData('reservationReason', v)}>
                    <SelectTrigger className="bg-white text-gray-900 [&>span[data-placeholder]]:text-gray-500">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-900">
                      {RESERVATION_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value} className="text-gray-900 focus:text-gray-900">
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.reservationReason === 'outro' && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Especifique o motivo *</Label>
                    <Input
                      value={formData.reservationReasonOther}
                      onChange={(e) => updateFormData('reservationReasonOther', e.target.value)}
                      placeholder="Descreva o motivo da reserva"
                      required
                      className="bg-white text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                )}
              </div>

              {/* Section: Necessidades Especiais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-purple-700 border-b pb-2">♿ Necessidades Especiais</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="wheelchair"
                      checked={formData.needsWheelchairAccess}
                      onCheckedChange={(checked) => updateFormData('needsWheelchairAccess', checked === true)}
                    />
                    <label
                      htmlFor="wheelchair"
                      className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2 text-gray-900"
                    >
                      <Accessibility className="w-4 h-4 text-purple-600" />
                      Lugar para cadeirante
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="disability"
                      checked={formData.needsDisabilityAccess}
                      onCheckedChange={(checked) => updateFormData('needsDisabilityAccess', checked === true)}
                    />
                    <label
                      htmlFor="disability"
                      className="text-sm font-medium leading-none cursor-pointer text-gray-900"
                    >
                      Pessoa com deficiência (PCD)
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="baby"
                      checked={formData.needsBabyChair}
                      onCheckedChange={(checked) => updateFormData('needsBabyChair', checked === true)}
                    />
                    <label
                      htmlFor="baby"
                      className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2 text-gray-900"
                    >
                      <Baby className="w-4 h-4 text-purple-600" />
                      Cadeira para bebê
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Outras necessidades (opcional)</Label>
                    <Input
                      value={formData.otherNeeds}
                      onChange={(e) => updateFormData('otherNeeds', e.target.value)}
                      placeholder="Ex: mesa próxima ao banheiro, etc."
                      className="bg-white text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-gray-700">Observações adicionais (opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData('notes', e.target.value)}
                  placeholder="Algum pedido especial ou informação adicional?"
                  rows={3}
                  className="bg-white text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-6 text-lg"
              >
                Continuar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
