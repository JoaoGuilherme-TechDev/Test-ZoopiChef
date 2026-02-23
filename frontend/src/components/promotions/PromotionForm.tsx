import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Tag, ShoppingCart, Percent, Calendar, Tv, MessageCircle, Instagram } from 'lucide-react';
import { Promotion, QuantityTier } from '@/hooks/usePromotions';

interface PromotionFormProps {
  initialData?: Partial<Promotion>;
  onSubmit: (data: Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const PROMOTION_TYPES = [
  { value: 'buy_x_pay_y', label: 'Compre X Pague Y', icon: ShoppingCart, description: 'Ex: Compre 2 pague 1' },
  { value: 'buy_x_pay_quantity', label: 'Compre X Pague Qtd', icon: Tag, description: 'Ex: Compre 12 pague 10' },
  { value: 'happy_hour', label: 'Happy Hour', icon: Clock, description: 'Desconto por horário' },
  { value: 'quantity_tiers', label: 'Desconto por Quantidade', icon: Percent, description: 'Preços escalonados' },
];

export function PromotionForm({ initialData, onSubmit, onCancel, isLoading }: PromotionFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    promotion_type: initialData?.promotion_type || 'buy_x_pay_y',
    is_active: initialData?.is_active ?? true,
    
    // Buy X Pay Y
    buy_quantity: initialData?.buy_quantity || 2,
    pay_quantity: initialData?.pay_quantity || 1,
    
    // Happy Hour
    discount_type: initialData?.discount_type || 'percentage',
    discount_value: initialData?.discount_value || 10,
    start_time: initialData?.start_time || '17:00',
    end_time: initialData?.end_time || '19:00',
    valid_days: initialData?.valid_days || [0, 1, 2, 3, 4, 5, 6],
    
    // Quantity tiers
    quantity_tiers: initialData?.quantity_tiers || [{ quantity: 5, price: 10 }],
    
    // Dates
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    
    // Module visibility
    applies_to_delivery: initialData?.applies_to_delivery ?? true,
    applies_to_mesa: initialData?.applies_to_mesa ?? true,
    applies_to_totem: initialData?.applies_to_totem ?? true,
    applies_to_tablet: initialData?.applies_to_tablet ?? true,
    applies_to_comanda: initialData?.applies_to_comanda ?? true,
    applies_to_online: initialData?.applies_to_online ?? true,
    applies_to_selfservice: initialData?.applies_to_selfservice ?? true,
    
    // Products
    applies_to_all_products: initialData?.applies_to_all_products ?? true,
    product_ids: initialData?.product_ids || [],
    category_ids: initialData?.category_ids || [],
    
    // Display
    banner_image_url: initialData?.banner_image_url || '',
    highlight_color: initialData?.highlight_color || '#FF6B35',
    show_on_tv: initialData?.show_on_tv ?? true,
    
    // Marketing
    whatsapp_message: initialData?.whatsapp_message || '',
    instagram_caption: initialData?.instagram_caption || '',
    instagram_hashtags: initialData?.instagram_hashtags || [],
    auto_post_instagram: initialData?.auto_post_instagram ?? false,
    auto_send_whatsapp: initialData?.auto_send_whatsapp ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as any);
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      valid_days: prev.valid_days.includes(day)
        ? prev.valid_days.filter(d => d !== day)
        : [...prev.valid_days, day].sort(),
    }));
  };

  const addTier = () => {
    setFormData(prev => ({
      ...prev,
      quantity_tiers: [...(prev.quantity_tiers || []), { quantity: 10, price: 8 }],
    }));
  };

  const removeTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      quantity_tiers: (prev.quantity_tiers || []).filter((_, i) => i !== index),
    }));
  };

  const updateTier = (index: number, field: keyof QuantityTier, value: number) => {
    setFormData(prev => ({
      ...prev,
      quantity_tiers: (prev.quantity_tiers || []).map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nome da Promoção *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Happy Hour de Sexta"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada da promoção..."
              />
            </div>

            <div>
              <Label>Tipo de Promoção *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {PROMOTION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all ${
                        formData.promotion_type === type.value
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, promotion_type: type.value as any }))}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <Icon className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data Fim</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Promoção Ativa</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 mt-4">
          {/* Buy X Pay Y */}
          {formData.promotion_type === 'buy_x_pay_y' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Compre X Pague Y
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Compre (quantidade)</Label>
                    <Input
                      type="number"
                      min={2}
                      value={formData.buy_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, buy_quantity: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Pague (quantidade)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.pay_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, pay_quantity: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliente compra {formData.buy_quantity} unidades e paga apenas {formData.pay_quantity}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Buy X Pay Quantity */}
          {formData.promotion_type === 'buy_x_pay_quantity' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Compre X Pague Quantidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Compre (quantidade)</Label>
                    <Input
                      type="number"
                      min={2}
                      value={formData.buy_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, buy_quantity: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Pague por (quantidade)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.pay_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, pay_quantity: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliente compra {formData.buy_quantity} unidades e paga o preço de {formData.pay_quantity}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Happy Hour */}
          {formData.promotion_type === 'happy_hour' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Happy Hour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de Desconto</Label>
                    <Select
                      value={formData.discount_type || 'percentage'}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, discount_type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed_value">Valor Fixo (R$)</SelectItem>
                        <SelectItem value="fixed_price">Preço Final (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Horário Início</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Horário Fim</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Badge
                        key={day.value}
                        variant={formData.valid_days.includes(day.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantity Tiers */}
          {formData.promotion_type === 'quantity_tiers' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Faixas de Quantidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(formData.quantity_tiers || []).map((tier, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>A partir de (qtd)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={tier.quantity}
                        onChange={(e) => updateTier(index, 'quantity', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Preço Unitário (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={tier.price}
                        onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value))}
                      />
                    </div>
                    {(formData.quantity_tiers || []).length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6"
                        onClick={() => removeTier(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTier}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Faixa
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="modules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Módulos Aplicáveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione em quais módulos essa promoção será válida
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'applies_to_delivery', label: 'Delivery' },
                  { key: 'applies_to_online', label: 'Pedido Online' },
                  { key: 'applies_to_mesa', label: 'Mesa' },
                  { key: 'applies_to_totem', label: 'Totem' },
                  { key: 'applies_to_tablet', label: 'Tablet' },
                  { key: 'applies_to_comanda', label: 'Comanda' },
                  { key: 'applies_to_selfservice', label: 'Self-Service' },
                ].map((module) => (
                  <div key={module.key} className="flex items-center gap-3">
                    <Switch
                      checked={(formData as any)[module.key]}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [module.key]: checked }))}
                    />
                    <Label>{module.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tv className="h-5 w-5" />
                Exibição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.show_on_tv}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_on_tv: checked }))}
                />
                <Label>Exibir na TV Menu</Label>
              </div>

              <div>
                <Label htmlFor="highlight_color">Cor de Destaque</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="highlight_color"
                    type="color"
                    value={formData.highlight_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, highlight_color: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.highlight_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, highlight_color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="banner_url">URL do Banner (opcional)</Label>
                <Input
                  id="banner_url"
                  value={formData.banner_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, banner_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsapp_message">Mensagem para Disparo</Label>
                <Textarea
                  id="whatsapp_message"
                  value={formData.whatsapp_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_message: e.target.value }))}
                  placeholder="🎉 PROMOÇÃO ESPECIAL! Compre 2 e leve 3..."
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.auto_send_whatsapp}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_send_whatsapp: checked }))}
                />
                <Label>Disparo Automático ao Ativar</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagram_caption">Legenda do Post</Label>
                <Textarea
                  id="instagram_caption"
                  value={formData.instagram_caption}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram_caption: e.target.value }))}
                  placeholder="🔥 Promoção imperdível! ..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="hashtags">Hashtags (separadas por vírgula)</Label>
                <Input
                  id="hashtags"
                  value={(formData.instagram_hashtags || []).join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    instagram_hashtags: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                  }))}
                  placeholder="#promoção, #desconto, #oferta"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.auto_post_instagram}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_post_instagram: checked }))}
                />
                <Label>Post Automático com IA</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : initialData?.name ? 'Atualizar' : 'Criar Promoção'}
        </Button>
      </div>
    </form>
  );
}
