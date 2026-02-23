import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Star, 
  RotateCcw, 
  Tag, 
  Sparkles,
  Clock,
  ShoppingBag,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerData {
  id: string;
  name: string;
  phone?: string;
  lastOrderDate?: string;
  orderCount?: number;
  favoriteProduct?: string;
  isVip?: boolean;
}

interface CustomerGreetingBannerProps {
  customer: CustomerData;
  onRepeatLastOrder?: () => void;
  onViewPromotions?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function CustomerGreetingBanner({
  customer,
  onRepeatLastOrder,
  onViewPromotions,
  onDismiss,
  className = ''
}: CustomerGreetingBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const firstName = customer.name.split(' ')[0];

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <Card className={`bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Greeting Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  {getGreeting()}, {firstName}!
                  {customer.isVip && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                      VIP
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Que bom te ver por aqui novamente!
                </p>
              </div>
            </div>

            {/* Customer Info Pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {customer.orderCount && customer.orderCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  <ShoppingBag className="h-3 w-3 mr-1" />
                  {customer.orderCount} pedidos
                </Badge>
              )}
              {customer.lastOrderDate && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Último pedido {getTimeAgo(customer.lastOrderDate)}
                </Badge>
              )}
              {customer.favoriteProduct && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Favorito: {customer.favoriteProduct}
                </Badge>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {onRepeatLastOrder && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onRepeatLastOrder}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Repetir último pedido
                </Button>
              )}
              {onViewPromotions && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onViewPromotions}
                  className="text-xs"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Ver promoções
                </Button>
              )}
            </div>

            {/* Suggestion Text */}
            <p className="text-sm text-muted-foreground mt-3 italic">
              O que você vai pedir hoje? Posso ajudar a escolher! 
              {customer.favoriteProduct && ` Seu favorito "${customer.favoriteProduct}" está disponível.`}
            </p>
          </div>

          {/* Dismiss Button */}
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 shrink-0"
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
