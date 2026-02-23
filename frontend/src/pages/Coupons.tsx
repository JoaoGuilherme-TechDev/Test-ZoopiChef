import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCoupons, Coupon } from '@/hooks/useCoupons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Ticket, Percent, DollarSign, Truck, Copy, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function Coupons() {
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon, isCreating } = useCoupons();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'free_delivery',
    discount_value: 0,
    min_order_value: 0,
    max_discount: undefined as number | undefined,
    usage_limit: undefined as number | undefined,
    per_customer_limit: 1,
    valid_until: '',
    first_order_only: false,
  });

  const handleCreate = () => {
    createCoupon({
      code: newCoupon.code,
      name: newCoupon.name,
      description: newCoupon.description || undefined,
      discount_type: newCoupon.discount_type,
      discount_value: newCoupon.discount_value,
      min_order_value: newCoupon.min_order_value,
      max_discount: newCoupon.max_discount,
      usage_limit: newCoupon.usage_limit,
      per_customer_limit: newCoupon.per_customer_limit,
      valid_until: newCoupon.valid_until || undefined,
      first_order_only: newCoupon.first_order_only,
    });
    setDialogOpen(false);
    setNewCoupon({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_value: 0,
      max_discount: undefined,
      usage_limit: undefined,
      per_customer_limit: 1,
      valid_until: '',
      first_order_only: false,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'free_delivery': return <Truck className="w-4 h-4" />;
      default: return null;
    }
  };

  const getDiscountText = (coupon: Coupon) => {
    switch (coupon.discount_type) {
      case 'percentage': return `${coupon.discount_value}%`;
      case 'fixed': return `R$ ${coupon.discount_value.toFixed(2)}`;
      case 'free_delivery': return 'Frete Grátis';
      default: return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cupons Promocionais</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cupom
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cupons Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coupons.filter(c => c.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Usos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coupons.reduce((acc, c) => acc + c.usage_count, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cupons Expirados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum cupom cadastrado.</p>
                <Button onClick={() => setDialogOpen(true)} className="mt-4">
                  Criar primeiro cupom
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => {
                    const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono">
                              {coupon.code}
                            </code>
                            <Button size="icon" variant="ghost" onClick={() => copyCode(coupon.code)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{coupon.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getDiscountIcon(coupon.discount_type)}
                            {getDiscountText(coupon)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {coupon.min_order_value > 0 
                            ? `R$ ${coupon.min_order_value.toFixed(2)}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {coupon.usage_count}
                          {coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                        </TableCell>
                        <TableCell>
                          {coupon.valid_until
                            ? format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR })
                            : 'Sem limite'
                          }
                        </TableCell>
                        <TableCell>
                          {!coupon.is_active ? (
                            <Badge variant="secondary">Inativo</Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive">Expirado</Badge>
                          ) : (
                            <Badge className="bg-green-500">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Switch
                              checked={coupon.is_active}
                              onCheckedChange={(checked) => 
                                updateCoupon({ id: coupon.id, is_active: checked })
                              }
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteCoupon(coupon.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cupom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Código *</Label>
              <Input
                value={newCoupon.code}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PROMO10"
                className="uppercase"
              />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={newCoupon.name}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: 10% de desconto"
              />
            </div>
            <div>
              <Label>Tipo de Desconto</Label>
              <Select
                value={newCoupon.discount_type}
                onValueChange={(v) => setNewCoupon(prev => ({ ...prev, discount_type: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  <SelectItem value="free_delivery">Frete Grátis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCoupon.discount_type !== 'free_delivery' && (
              <div>
                <Label>Valor do Desconto</Label>
                <Input
                  type="number"
                  step={newCoupon.discount_type === 'percentage' ? '1' : '0.01'}
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCoupon.min_order_value || ''}
                  placeholder="0"
                  onChange={(e) => setNewCoupon(prev => ({ ...prev, min_order_value: e.target.value === '' ? 0 : Number(e.target.value) }))}
                />
              </div>
              {newCoupon.discount_type === 'percentage' && (
                <div>
                  <Label>Desconto Máximo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newCoupon.max_discount || ''}
                    onChange={(e) => setNewCoupon(prev => ({ 
                      ...prev, 
                      max_discount: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    placeholder="Sem limite"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Limite de Usos</Label>
                <Input
                  type="number"
                  value={newCoupon.usage_limit || ''}
                  onChange={(e) => setNewCoupon(prev => ({ 
                    ...prev, 
                    usage_limit: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <Label>Limite por Cliente</Label>
                <Input
                  type="number"
                  value={newCoupon.per_customer_limit}
                  onChange={(e) => setNewCoupon(prev => ({ ...prev, per_customer_limit: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>Válido Até</Label>
              <Input
                type="date"
                value={newCoupon.valid_until}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, valid_until: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newCoupon.first_order_only}
                onCheckedChange={(checked) => setNewCoupon(prev => ({ ...prev, first_order_only: checked }))}
              />
              <Label>Apenas primeira compra</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newCoupon.code || !newCoupon.name || isCreating}
            >
              Criar Cupom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
