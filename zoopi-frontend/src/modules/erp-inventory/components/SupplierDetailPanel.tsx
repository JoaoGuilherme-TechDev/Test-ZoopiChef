import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Phone, Mail, MapPin, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SupplierRatingDialog } from './SupplierRatingDialog';
import { SupplierPaymentsPanel } from './SupplierPaymentsPanel';
import { useSupplierRatings } from '../hooks/useSupplierRatings';
import { useSupplierPriceHistory } from '../hooks/useSupplierPriceHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  payment_terms?: string;
  credit_limit_cents?: number;
  tax_id?: string;
  avg_rating?: number;
  total_purchases_cents?: number;
  last_purchase_at?: string;
}

interface SupplierDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground'
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

export function SupplierDetailPanel({ open, onOpenChange, supplier }: SupplierDetailPanelProps) {
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const { ratings, avgRatings } = useSupplierRatings(supplier?.id);
  const { priceHistory } = useSupplierPriceHistory(supplier?.id);

  if (!supplier) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">{supplier.name}</SheetTitle>
                {supplier.avg_rating && (
                  <RatingStars rating={Number(supplier.avg_rating)} />
                )}
              </div>
              <Button size="sm" onClick={() => setRatingDialogOpen(true)}>
                <Star className="w-4 h-4 mr-1" />
                Avaliar
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {supplier.address}
                    </div>
                  )}
                  {supplier.tax_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      CNPJ: {supplier.tax_id}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Condição Pagamento</p>
                    <p className="font-medium">{supplier.payment_terms || '30 dias'}</p>
                  </div>
                  {supplier.credit_limit_cents && (
                    <div>
                      <p className="text-sm text-muted-foreground">Limite de Crédito</p>
                      <p className="font-medium">{formatCurrency(supplier.credit_limit_cents)}</p>
                    </div>
                  )}
                  {supplier.total_purchases_cents && (
                    <div>
                      <p className="text-sm text-muted-foreground">Total Comprado</p>
                      <p className="font-medium">{formatCurrency(supplier.total_purchases_cents)}</p>
                    </div>
                  )}
                  {supplier.last_purchase_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Última Compra</p>
                      <p className="font-medium">
                        {format(new Date(supplier.last_purchase_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ratings Summary */}
              {avgRatings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Avaliações ({ratings?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Geral</p>
                      <RatingStars rating={avgRatings.overall} />
                    </div>
                    {avgRatings.delivery > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Entrega</p>
                        <RatingStars rating={avgRatings.delivery} />
                      </div>
                    )}
                    {avgRatings.quality > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Qualidade</p>
                        <RatingStars rating={avgRatings.quality} />
                      </div>
                    )}
                    {avgRatings.price > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Preço</p>
                        <RatingStars rating={avgRatings.price} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {supplier.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{supplier.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments">
              <SupplierPaymentsPanel supplierId={supplier.id} />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Preços</CardTitle>
                </CardHeader>
                <CardContent>
                  {!priceHistory?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum histórico de preços
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {priceHistory.slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <div>
                            <p className="font-medium">{formatCurrency(entry.price_cents)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.recorded_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="outline">{entry.unit}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <SupplierRatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        supplierId={supplier.id}
        supplierName={supplier.name}
      />
    </>
  );
}
