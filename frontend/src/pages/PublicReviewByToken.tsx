import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, Loader2, Check, Gift, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrderInfo {
  id: string;
  order_number: number;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  primary_color: string | null;
  already_reviewed: boolean;
}

export default function PublicReviewByToken() {
  const { token } = useParams<{ token: string }>();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [rating, setRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [wheelUrl, setWheelUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrderInfo() {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }

      try {
        // Buscar notificação pelo token
        const { data: notification, error: notifError } = await supabase
          .from('review_notifications')
          .select('order_id, company_id, customer_name')
          .eq('review_token', token)
          .single();

        if (notifError || !notification) {
          setError('Link de avaliação inválido ou expirado');
          setLoading(false);
          return;
        }

        // Buscar pedido
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, company_id')
          .eq('id', notification.order_id)
          .single();

        if (orderError || !order) {
          setError('Pedido não encontrado');
          setLoading(false);
          return;
        }

        // Buscar empresa
        const { data: company } = await supabase
          .from('companies')
          .select('name, logo_url, primary_color')
          .eq('id', order.company_id)
          .single();

        // Verificar se já avaliou
        const { count } = await supabase
          .from('order_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id);

        setOrderInfo({
          id: order.id,
          order_number: order.order_number,
          company_id: order.company_id,
          company_name: company?.name || 'Estabelecimento',
          company_logo: company?.logo_url,
          primary_color: company?.primary_color,
          already_reviewed: (count || 0) > 0,
        });
      } catch (err) {
        setError('Erro ao carregar informações');
      } finally {
        setLoading(false);
      }
    }

    loadOrderInfo();
  }, [token]);

  const handleSubmit = async () => {
    if (!orderInfo || rating === 0) {
      toast.error('Por favor, selecione uma nota geral');
      return;
    }

    setIsSubmitting(true);

    try {
      // Inserir avaliação
      const { error: insertError } = await supabase
        .from('order_reviews')
        .insert({
          company_id: orderInfo.company_id,
          order_id: orderInfo.id,
          rating,
          food_rating: foodRating || null,
          delivery_rating: deliveryRating || null,
          comment: comment.trim() || null,
          review_token: token,
        });

      if (insertError) throw insertError;

      // Buscar link da roleta
      const { data: publicLinks } = await supabase
        .from('company_public_links')
        .select('roleta_token')
        .eq('company_id', orderInfo.company_id)
        .single();

      if (publicLinks?.roleta_token) {
        setWheelUrl(`${window.location.origin}/roleta/${publicLinks.roleta_token}`);
      }

      setSubmitted(true);
      toast.success('Obrigado pela sua avaliação!');
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderInfo?.already_reviewed || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Obrigado pela avaliação!</h2>
            <p className="text-muted-foreground">
              Sua opinião é muito importante para nós.
            </p>
            
            {wheelUrl && (
              <div className="pt-4 space-y-3">
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                  <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Você ganhou uma chance na roleta!</p>
                  <p className="text-sm text-muted-foreground">Gire e ganhe prêmios exclusivos</p>
                </div>
                <Button asChild className="w-full" size="lg">
                  <a href={wheelUrl}>
                    <Gift className="h-4 w-4 mr-2" />
                    Girar a Roleta
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {orderInfo?.company_logo && (
            <img 
              src={orderInfo.company_logo} 
              alt={orderInfo.company_name}
              className="h-16 w-16 object-contain mx-auto mb-2"
            />
          )}
          <CardTitle>{orderInfo?.company_name}</CardTitle>
          <CardDescription>
            Avalie seu pedido #{orderInfo?.order_number}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <StarRating
            value={rating}
            onChange={setRating}
            label="Nota geral *"
          />
          
          <StarRating
            value={foodRating}
            onChange={setFoodRating}
            label="Qualidade da comida (opcional)"
          />
          
          <StarRating
            value={deliveryRating}
            onChange={setDeliveryRating}
            label="Entrega (opcional)"
          />
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Comentário (opcional)</p>
            <Textarea
              placeholder="Conte-nos sobre sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Avaliação
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Após avaliar, você receberá um link para girar nossa roleta de prêmios!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
