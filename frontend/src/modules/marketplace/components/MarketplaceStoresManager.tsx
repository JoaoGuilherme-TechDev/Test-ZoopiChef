import { useState } from 'react';
import { useMarketplaceIntegrations } from '../hooks/useMarketplaceIntegrations';
import { useVirtualBrands } from '@/hooks/useVirtualBrands';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Store, Link2, Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const providerLogos: Record<string, string> = {
  ifood: '🔴',
  rappi: '🟠',
  ubereats: '🟢',
  aiqfome: '🟣',
};

const providerNames: Record<string, string> = {
  ifood: 'iFood',
  rappi: 'Rappi',
  ubereats: 'Uber Eats',
  aiqfome: 'AiQFome',
};

export function MarketplaceStoresManager() {
  const { integrations, updateSettings, isLoading } = useMarketplaceIntegrations();
  const { brands } = useVirtualBrands();
  const [editingIntegration, setEditingIntegration] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    store_name: '',
    virtual_brand_id: '',
  });

  const openEditDialog = (integration: any) => {
    setEditingIntegration(integration);
    setFormData({
      store_name: integration.store_name || '',
      virtual_brand_id: integration.virtual_brand_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingIntegration) return;

    try {
      await updateSettings.mutateAsync({
        integrationId: editingIntegration.id,
        settings: {
          store_name: formData.store_name || null,
          virtual_brand_id: formData.virtual_brand_id || null,
        },
      });
      setDialogOpen(false);
      toast.success('Configurações salvas');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  const connectedIntegrations = integrations.filter(i => i.status === 'connected');

  if (isLoading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lojas de Marketplace</h2>
        <p className="text-muted-foreground">
          Gerencie suas lojas conectadas e associe cada uma a uma marca virtual.
          Você pode conectar múltiplas lojas do mesmo marketplace.
        </p>
      </div>

      {connectedIntegrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja conectada</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Conecte suas lojas de marketplace na aba "Configurações" para gerenciá-las aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectedIntegrations.map((integration) => {
            const linkedBrand = brands.find(b => b.id === integration.virtual_brand_id);
            
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {providerLogos[integration.provider] || '📦'}
                      </span>
                      <div>
                        <CardTitle className="text-lg">
                          {integration.store_name || providerNames[integration.provider] || integration.provider}
                        </CardTitle>
                        <CardDescription>
                          {providerNames[integration.provider] || integration.provider}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Conectado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {linkedBrand ? (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: linkedBrand.color }}
                      >
                        {linkedBrand.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium flex-1">{linkedBrand.name}</span>
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Store className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        Nenhuma marca vinculada
                      </span>
                    </div>
                  )}

                  {integration.merchant_id && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Merchant ID:</span> {integration.merchant_id}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openEditDialog(integration)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Loja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Nome da Loja</Label>
              <Input
                id="store_name"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder="Ex: Pizzaria Centro"
              />
              <p className="text-xs text-muted-foreground">
                Este nome aparecerá no Kanban para identificar os pedidos desta loja
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="virtual_brand">Marca Virtual (Opcional)</Label>
              <Select
                value={formData.virtual_brand_id}
                onValueChange={(value) => setFormData({ ...formData, virtual_brand_id: value })}
              >
                <SelectTrigger id="virtual_brand">
                  <SelectValue placeholder="Selecione uma marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: brand.color }}
                        />
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vincule esta loja a uma marca virtual para organizar os pedidos
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={updateSettings.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
