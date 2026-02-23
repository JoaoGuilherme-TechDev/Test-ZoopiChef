/**
 * TabletFeedbackDialog - Customer feedback/rating dialog
 * Allows customers to rate service, food, ambiance and provide contact info
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { Star, ThumbsUp, ThumbsDown, Send, User, Phone, Mail, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TabletFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  deviceId?: string;
  tableSessionId?: string;
  tableNumber?: string;
  primaryColor: string;
}

type HeardFromOption = 'instagram' | 'google' | 'friend' | 'walk_by' | 'other';

const heardFromOptions: { value: HeardFromOption; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'google', label: 'Google', icon: '🔍' },
  { value: 'friend', label: 'Amigo/Familiar', icon: '👥' },
  { value: 'walk_by', label: 'Passando na frente', icon: '🚶' },
  { value: 'other', label: 'Outro', icon: '💬' },
];

function StarRating({ 
  value, 
  onChange, 
  label, 
  primaryColor 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  label: string;
  primaryColor: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                star <= value ? 'fill-current' : 'text-muted-foreground/30'
              )}
              style={{ color: star <= value ? primaryColor : undefined }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function TabletFeedbackDialog({
  open,
  onOpenChange,
  companyId,
  deviceId,
  tableSessionId,
  tableNumber,
  primaryColor,
}: TabletFeedbackDialogProps) {
  const [step, setStep] = useState<'rating' | 'info' | 'success'>(open ? 'rating' : 'rating');
  
  // Ratings
  const [ratingService, setRatingService] = useState(0);
  const [ratingFood, setRatingFood] = useState(0);
  const [ratingAmbiance, setRatingAmbiance] = useState(0);
  
  // Recommendation
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  
  // How heard about
  const [heardFrom, setHeardFrom] = useState<HeardFromOption | null>(null);
  const [heardFromDetail, setHeardFromDetail] = useState('');
  
  // Contact info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [comments, setComments] = useState('');

  const resetForm = () => {
    setStep('rating');
    setRatingService(0);
    setRatingFood(0);
    setRatingAmbiance(0);
    setWouldRecommend(null);
    setHeardFrom(null);
    setHeardFromDetail('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setComments('');
  };

  const submitFeedback = useMutation({
    mutationFn: async () => {
      const overallRating = Math.round((ratingService + ratingFood + ratingAmbiance) / 3);
      
      const { error } = await supabase.from('tablet_customer_feedback').insert({
        company_id: companyId,
        tablet_device_id: deviceId || null,
        table_session_id: tableSessionId || null,
        table_number: tableNumber || null,
        rating_service: ratingService || null,
        rating_food: ratingFood || null,
        rating_ambiance: ratingAmbiance || null,
        overall_rating: overallRating || null,
        would_recommend: wouldRecommend,
        heard_from: heardFrom,
        heard_from_detail: heardFromDetail || null,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
        comments: comments || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (err) => {
      console.error('Feedback error:', err);
      toast.error('Erro ao enviar avaliação');
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const canProceedStep1 = ratingService > 0 || ratingFood > 0 || ratingAmbiance > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'rating' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Avalie sua experiência</DialogTitle>
              <DialogDescription>
                Sua opinião é muito importante para nós!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <StarRating
                value={ratingService}
                onChange={setRatingService}
                label="Atendimento"
                primaryColor={primaryColor}
              />
              
              <StarRating
                value={ratingFood}
                onChange={setRatingFood}
                label="Comida"
                primaryColor={primaryColor}
              />
              
              <StarRating
                value={ratingAmbiance}
                onChange={setRatingAmbiance}
                label="Ambiente"
                primaryColor={primaryColor}
              />

              {/* Would recommend */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Você indicaria para um amigo?</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={wouldRecommend === true ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    style={wouldRecommend === true ? { backgroundColor: primaryColor } : {}}
                    onClick={() => setWouldRecommend(true)}
                  >
                    <ThumbsUp className="h-5 w-5" />
                    Sim!
                  </Button>
                  <Button
                    type="button"
                    variant={wouldRecommend === false ? 'destructive' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setWouldRecommend(false)}
                  >
                    <ThumbsDown className="h-5 w-5" />
                    Não
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Agora não
              </Button>
              <Button
                onClick={() => setStep('info')}
                disabled={!canProceedStep1}
                className="flex-1"
                style={{ backgroundColor: primaryColor }}
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {step === 'info' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Mais sobre você</DialogTitle>
              <DialogDescription>
                Deixe seu contato para novidades (opcional)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* How did you hear about us */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Como nos conheceu?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {heardFromOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={heardFrom === opt.value ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-3 text-xs"
                      style={heardFrom === opt.value ? { backgroundColor: primaryColor } : {}}
                      onClick={() => setHeardFrom(opt.value)}
                    >
                      <span className="text-lg mb-1">{opt.icon}</span>
                      {opt.label}
                    </Button>
                  ))}
                </div>
                {heardFrom === 'other' && (
                  <Input
                    placeholder="Especifique..."
                    value={heardFromDetail}
                    onChange={(e) => setHeardFromDetail(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Seu nome"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Deixe um comentário
                </Label>
                <Textarea
                  placeholder="O que você gostou? O que podemos melhorar?"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('rating')} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => submitFeedback.mutate()}
                disabled={submitFeedback.isPending}
                className="flex-1 gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-4 w-4" />
                {submitFeedback.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div 
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <ThumbsUp className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua avaliação foi enviada com sucesso. Agradecemos seu feedback!
            </p>
            <Button onClick={handleClose} className="mt-4" style={{ backgroundColor: primaryColor }}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
