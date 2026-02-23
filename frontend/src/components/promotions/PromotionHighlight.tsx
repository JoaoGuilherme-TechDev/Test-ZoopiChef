/**
 * PromotionHighlight - Banner component to display active promotions
 * Used across modules (menu, kiosk, TV, etc.)
 */

import { useActivePromotions, Promotion } from '@/hooks/usePromotions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Tag, Clock, Percent, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromotionHighlightProps {
  companyId: string;
  module: 'delivery' | 'online' | 'mesa' | 'totem' | 'tablet' | 'comanda' | 'selfservice' | 'tv';
  variant?: 'banner' | 'card' | 'badge' | 'ticker';
  className?: string;
}

const TYPE_ICONS = {
  buy_x_pay_y: ShoppingCart,
  buy_x_pay_quantity: Tag,
  happy_hour: Clock,
  quantity_tiers: Percent,
};

const MODULE_KEYS: Record<string, keyof Promotion> = {
  delivery: 'applies_to_delivery',
  online: 'applies_to_online',
  mesa: 'applies_to_mesa',
  totem: 'applies_to_totem',
  tablet: 'applies_to_tablet',
  comanda: 'applies_to_comanda',
  selfservice: 'applies_to_selfservice',
  tv: 'show_on_tv',
};

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getPromoText(promo: Promotion): string {
  switch (promo.promotion_type) {
    case 'buy_x_pay_y':
      return `COMPRE ${promo.buy_quantity} PAGUE ${promo.pay_quantity}`;
    case 'buy_x_pay_quantity':
      return `LEVE ${promo.buy_quantity} PAGUE ${promo.pay_quantity}`;
    case 'happy_hour':
      const discountText = promo.discount_type === 'percentage' 
        ? `${promo.discount_value}% OFF`
        : promo.discount_type === 'fixed_value'
        ? `R$ ${promo.discount_value} OFF`
        : `POR R$ ${promo.discount_value}`;
      return `HAPPY HOUR ${discountText} • ${promo.start_time} às ${promo.end_time}`;
    case 'quantity_tiers':
      const firstTier = promo.quantity_tiers?.[0];
      return firstTier ? `${firstTier.quantity}+ UNID. = R$ ${firstTier.price}` : 'DESCONTO POR QUANTIDADE';
    default:
      return promo.name;
  }
}

export function PromotionHighlight({ companyId, module, variant = 'banner', className }: PromotionHighlightProps) {
  const { data: promotions = [] } = useActivePromotions(companyId);

  const moduleKey = MODULE_KEYS[module];
  const relevantPromos = promotions.filter(p => p[moduleKey as keyof Promotion] === true);

  if (relevantPromos.length === 0) return null;

  if (variant === 'ticker') {
    return (
      <div className={cn('overflow-hidden bg-primary text-primary-foreground', className)}>
        <div className="animate-marquee whitespace-nowrap py-2">
          {relevantPromos.map((promo, i) => (
            <span key={promo.id} className="mx-8 inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {getPromoText(promo)}
              {i < relevantPromos.length - 1 && <span className="mx-4">•</span>}
            </span>
          ))}
          {/* Duplicate for continuous scroll */}
          {relevantPromos.map((promo, i) => (
            <span key={`dup-${promo.id}`} className="mx-8 inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {getPromoText(promo)}
              {i < relevantPromos.length - 1 && <span className="mx-4">•</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {relevantPromos.slice(0, 3).map((promo) => {
          const Icon = TYPE_ICONS[promo.promotion_type];
          return (
            <Badge 
              key={promo.id} 
              style={{ backgroundColor: promo.highlight_color }}
              className="text-white"
            >
              <Icon className="h-3 w-3 mr-1" />
              {getPromoText(promo)}
            </Badge>
          );
        })}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('space-y-2', className)}>
        {relevantPromos.map((promo) => {
          const Icon = TYPE_ICONS[promo.promotion_type];
          return (
            <Card 
              key={promo.id}
              className="border-l-4"
              style={{ borderLeftColor: promo.highlight_color }}
            >
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg text-white"
                  style={{ backgroundColor: promo.highlight_color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{promo.name}</p>
                  <p className="text-sm text-muted-foreground">{getPromoText(promo)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Default: banner
  return (
    <div className={cn('space-y-2', className)}>
      {relevantPromos.map((promo) => (
        <div 
          key={promo.id}
          className="relative overflow-hidden rounded-lg p-4 text-white"
          style={{ 
            background: promo.banner_image_url 
              ? `url(${promo.banner_image_url}) center/cover`
              : `linear-gradient(135deg, ${promo.highlight_color}, ${promo.highlight_color}dd)`
          }}
        >
          {promo.banner_image_url && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className="relative z-10 flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <div>
              <h3 className="font-bold text-lg">{promo.name}</h3>
              <p className="text-sm opacity-90">{getPromoText(promo)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PromotionTVBanner({ companyId }: { companyId: string }) {
  const { data: promotions = [] } = useActivePromotions(companyId);
  const tvPromos = promotions.filter(p => p.show_on_tv);

  if (tvPromos.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-3 text-xl font-bold">
          {tvPromos.map((promo) => (
            <span key={promo.id} className="mx-12 inline-flex items-center gap-3">
              <Sparkles className="h-6 w-6" />
              {getPromoText(promo)}
            </span>
          ))}
          {tvPromos.map((promo) => (
            <span key={`dup-${promo.id}`} className="mx-12 inline-flex items-center gap-3">
              <Sparkles className="h-6 w-6" />
              {getPromoText(promo)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
