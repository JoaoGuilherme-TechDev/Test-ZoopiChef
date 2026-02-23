import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  ShoppingCart, Tag, Clock, Percent, Calendar, Tv, 
  Edit, Trash2, MessageCircle, Instagram, Send 
} from 'lucide-react';
import { Promotion } from '@/hooks/usePromotions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PromotionCardProps {
  promotion: Promotion;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  onSendWhatsApp?: () => void;
  onPostInstagram?: () => void;
}

const TYPE_CONFIG = {
  buy_x_pay_y: { icon: ShoppingCart, label: 'Compre X Pague Y', color: 'bg-blue-500' },
  buy_x_pay_quantity: { icon: Tag, label: 'Compre X Pague Qtd', color: 'bg-purple-500' },
  happy_hour: { icon: Clock, label: 'Happy Hour', color: 'bg-orange-500' },
  quantity_tiers: { icon: Percent, label: 'Faixas de Qtd', color: 'bg-green-500' },
};

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function PromotionCard({ 
  promotion, 
  onEdit, 
  onDelete, 
  onToggle,
  onSendWhatsApp,
  onPostInstagram 
}: PromotionCardProps) {
  const typeConfig = TYPE_CONFIG[promotion.promotion_type];
  const Icon = typeConfig.icon;

  const getPromoDescription = () => {
    switch (promotion.promotion_type) {
      case 'buy_x_pay_y':
        return `Compre ${promotion.buy_quantity} e pague ${promotion.pay_quantity}`;
      case 'buy_x_pay_quantity':
        return `Compre ${promotion.buy_quantity} pelo preço de ${promotion.pay_quantity}`;
      case 'happy_hour':
        const discountText = promotion.discount_type === 'percentage' 
          ? `${promotion.discount_value}% OFF`
          : promotion.discount_type === 'fixed_value'
          ? `R$ ${promotion.discount_value} OFF`
          : `Por R$ ${promotion.discount_value}`;
        const days = promotion.valid_days?.map(d => DAYS_SHORT[d]).join(', ');
        return `${discountText} • ${promotion.start_time} às ${promotion.end_time} • ${days}`;
      case 'quantity_tiers':
        const tiers = promotion.quantity_tiers || [];
        return tiers.map(t => `${t.quantity}+ = R$ ${t.price}`).join(' | ');
      default:
        return '';
    }
  };

  const getActiveModules = () => {
    const modules = [];
    if (promotion.applies_to_delivery) modules.push('Delivery');
    if (promotion.applies_to_online) modules.push('Online');
    if (promotion.applies_to_mesa) modules.push('Mesa');
    if (promotion.applies_to_totem) modules.push('Totem');
    if (promotion.applies_to_tablet) modules.push('Tablet');
    if (promotion.applies_to_comanda) modules.push('Comanda');
    if (promotion.applies_to_selfservice) modules.push('Self-Service');
    return modules;
  };

  return (
    <Card className={`relative overflow-hidden ${!promotion.is_active ? 'opacity-60' : ''}`}>
      <div 
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: promotion.highlight_color }}
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeConfig.color} text-white`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{promotion.name}</CardTitle>
              <Badge variant="secondary" className="mt-1">
                {typeConfig.label}
              </Badge>
            </div>
          </div>
          <Switch
            checked={promotion.is_active}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-primary">
          {getPromoDescription()}
        </p>

        {promotion.description && (
          <p className="text-sm text-muted-foreground">
            {promotion.description}
          </p>
        )}

        {/* Date validity */}
        {(promotion.start_date || promotion.end_date) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {promotion.start_date && format(new Date(promotion.start_date), 'dd/MM/yyyy', { locale: ptBR })}
            {promotion.start_date && promotion.end_date && ' até '}
            {promotion.end_date && format(new Date(promotion.end_date), 'dd/MM/yyyy', { locale: ptBR })}
          </div>
        )}

        {/* Active modules */}
        <div className="flex flex-wrap gap-1">
          {getActiveModules().map((module) => (
            <Badge key={module} variant="outline" className="text-xs">
              {module}
            </Badge>
          ))}
          {promotion.show_on_tv && (
            <Badge variant="outline" className="text-xs">
              <Tv className="h-3 w-3 mr-1" />
              TV
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          
          {promotion.whatsapp_message && onSendWhatsApp && (
            <Button variant="ghost" size="sm" onClick={onSendWhatsApp} className="text-green-600">
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
          )}
          
          {promotion.instagram_caption && onPostInstagram && (
            <Button variant="ghost" size="sm" onClick={onPostInstagram} className="text-pink-600">
              <Instagram className="h-4 w-4 mr-1" />
              Instagram
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive ml-auto">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
