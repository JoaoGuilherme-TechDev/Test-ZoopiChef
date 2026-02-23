import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Tag, Clock, ShoppingCart, Percent, Megaphone, Loader2 } from 'lucide-react';
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, useTogglePromotion, Promotion } from '@/hooks/usePromotions';
import { PromotionForm } from '@/components/promotions/PromotionForm';
import { PromotionCard } from '@/components/promotions/PromotionCard';
import { toast } from 'sonner';

export default function Promotions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [deletePromotion, setDeletePromotion] = useState<Promotion | null>(null);

  const { data: promotions = [], isLoading } = usePromotions();
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();
  const toggleMutation = useTogglePromotion();

  const filteredPromotions = promotions.filter((promo) => {
    const matchesSearch = promo.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || promo.promotion_type === filterType;
    return matchesSearch && matchesType;
  });

  const activePromotions = filteredPromotions.filter(p => p.is_active);
  const inactivePromotions = filteredPromotions.filter(p => !p.is_active);

  const handleSubmit = async (data: any) => {
    if (editingPromotion) {
      await updateMutation.mutateAsync({ id: editingPromotion.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setIsFormOpen(false);
    setEditingPromotion(null);
  };

  const handleDelete = async () => {
    if (deletePromotion) {
      await deleteMutation.mutateAsync(deletePromotion.id);
      setDeletePromotion(null);
    }
  };

  const handleSendWhatsApp = (promo: Promotion) => {
    toast.info('Disparo de WhatsApp em desenvolvimento');
  };

  const handlePostInstagram = (promo: Promotion) => {
    toast.info('Post no Instagram em desenvolvimento');
  };

  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.is_active).length,
    buyXPayY: promotions.filter(p => p.promotion_type === 'buy_x_pay_y').length,
    happyHour: promotions.filter(p => p.promotion_type === 'happy_hour').length,
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-primary" />
                Promoções
              </h1>
            </div>
            <Button onClick={() => { setEditingPromotion(null); setIsFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Promoção
            </Button>
          </header>

          <main className="flex-1 p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">{stats.buyXPayY}</div>
                  <p className="text-xs text-muted-foreground">Compre X Pague Y</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">{stats.happyHour}</div>
                  <p className="text-xs text-muted-foreground">Happy Hour</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar promoções..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterType('all')}
                >
                  Todas
                </Badge>
                <Badge
                  variant={filterType === 'buy_x_pay_y' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterType('buy_x_pay_y')}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Compre X Pague Y
                </Badge>
                <Badge
                  variant={filterType === 'buy_x_pay_quantity' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterType('buy_x_pay_quantity')}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Compre X Pague Qtd
                </Badge>
                <Badge
                  variant={filterType === 'happy_hour' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterType('happy_hour')}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Happy Hour
                </Badge>
                <Badge
                  variant={filterType === 'quantity_tiers' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterType('quantity_tiers')}
                >
                  <Percent className="h-3 w-3 mr-1" />
                  Faixas Qtd
                </Badge>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPromotions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma promoção encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Tente outra busca' : 'Crie sua primeira promoção'}
                  </p>
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Promoção
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="active">
                <TabsList>
                  <TabsTrigger value="active">
                    Ativas ({activePromotions.length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    Inativas ({inactivePromotions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activePromotions.map((promo) => (
                      <PromotionCard
                        key={promo.id}
                        promotion={promo}
                        onEdit={() => { setEditingPromotion(promo); setIsFormOpen(true); }}
                        onDelete={() => setDeletePromotion(promo)}
                        onToggle={(active) => toggleMutation.mutate({ id: promo.id, is_active: active })}
                        onSendWhatsApp={() => handleSendWhatsApp(promo)}
                        onPostInstagram={() => handlePostInstagram(promo)}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="inactive" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {inactivePromotions.map((promo) => (
                      <PromotionCard
                        key={promo.id}
                        promotion={promo}
                        onEdit={() => { setEditingPromotion(promo); setIsFormOpen(true); }}
                        onDelete={() => setDeletePromotion(promo)}
                        onToggle={(active) => toggleMutation.mutate({ id: promo.id, is_active: active })}
                        onSendWhatsApp={() => handleSendWhatsApp(promo)}
                        onPostInstagram={() => handlePostInstagram(promo)}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </main>
        </SidebarInset>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
            </DialogTitle>
          </DialogHeader>
          <PromotionForm
            initialData={editingPromotion || undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingPromotion(null); }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePromotion} onOpenChange={() => setDeletePromotion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Promoção?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletePromotion?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
