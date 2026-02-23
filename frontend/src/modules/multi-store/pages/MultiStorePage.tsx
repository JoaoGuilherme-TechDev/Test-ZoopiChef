import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMultiStore } from '../hooks/useMultiStore';
import { 
  STORE_TYPE_LABELS, 
  STORE_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
  StoreStatus,
  StoreType,
  Store
} from '../types';
import { 
  Store as StoreIcon, 
  Plus, 
  Search,
  MapPin,
  Phone,
  Users,
  Package,
  ArrowRightLeft,
  Power,
  PowerOff,
  Settings,
  TrendingUp,
  FileText,
  ExternalLink,
  Building2,
  ChefHat,
  Globe,
  Link2,
  Copy,
  Menu,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<StoreStatus, { color: string; icon: any }> = {
  active: { color: 'bg-green-500', icon: Power },
  inactive: { color: 'bg-gray-500', icon: PowerOff },
  maintenance: { color: 'bg-yellow-500', icon: Settings },
};

export function MultiStorePage() {
  const navigate = useNavigate();
  const { 
    stores, 
    transfers,
    isLoading,
    activeStores,
    acceptingOrders,
    pendingTransfers,
    toggleOrderAcceptance,
    toggleStoreStatus,
    createStore,
    updateStore,
  } = useMultiStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedStoreForStock, setSelectedStoreForStock] = useState<Store | null>(null);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [selectedStoreForMenus, setSelectedStoreForMenus] = useState<Store | null>(null);
  const [newStore, setNewStore] = useState({
    name: '',
    code: '',
    type: 'branch' as StoreType,
    address: '',
    city: '',
    state: '',
    phone: '',
    is_dark_kitchen: false,
    menu_slug: '',
    menu_enabled: true,
  });

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const darkKitchensCount = stores.filter(s => s.is_dark_kitchen).length;

  const handleCreateStore = () => {
    if (!newStore.name || !newStore.code) return;
    
    if (editingStore) {
      // Modo edição
      updateStore.mutate({
        id: editingStore.id,
        ...newStore,
      }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingStore(null);
          resetForm();
        },
      });
    } else {
      // Modo criação
      createStore.mutate(newStore, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setNewStore({
      name: '',
      code: '',
      type: 'branch' as StoreType,
      address: '',
      city: '',
      state: '',
      phone: '',
      is_dark_kitchen: false,
      menu_slug: '',
      menu_enabled: true,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const copyMenuLink = (slug: string) => {
    const url = `${window.location.origin}/m/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const openMenusDialog = (store: Store) => {
    setSelectedStoreForMenus(store);
    setIsMenuDialogOpen(true);
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setNewStore({
      name: store.name,
      code: store.code,
      type: store.type,
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      phone: store.phone || '',
      is_dark_kitchen: store.is_dark_kitchen || false,
      menu_slug: store.menu_slug || '',
      menu_enabled: store.menu_enabled ?? true,
    });
    setIsDialogOpen(true);
  };

  const openStockDialog = (store: Store) => {
    setSelectedStoreForStock(store);
    setIsStockDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Multi-Loja">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Multi-Loja">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestão Multi-Loja</h1>
            <p className="text-muted-foreground">Gerencie todas as suas unidades</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingStore(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingStore(null); resetForm(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Loja
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingStore ? 'Editar Loja' : 'Criar Nova Loja'}</DialogTitle>
                <DialogDescription>
                  {editingStore ? 'Atualize os dados da unidade' : 'Adicione uma nova unidade à sua rede'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Loja *</Label>
                    <Input
                      placeholder="Ex: Loja Centro"
                      value={newStore.name}
                      onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código *</Label>
                    <Input
                      placeholder="Ex: LOJA-001"
                      value={newStore.code}
                      onChange={(e) => setNewStore({ ...newStore, code: e.target.value.toUpperCase() })}
                      disabled={!!editingStore}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newStore.type}
                    onValueChange={(value) => setNewStore({ ...newStore, type: value as StoreType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STORE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Ex: Rua das Flores, 123"
                    value={newStore.address}
                    onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="Ex: São Paulo"
                      value={newStore.city}
                      onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      placeholder="Ex: SP"
                      value={newStore.state}
                      onChange={(e) => setNewStore({ ...newStore, state: e.target.value.toUpperCase() })}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                  />
                </div>

                {/* Dark Kitchen Toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <ChefHat className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="is_dark_kitchen" className="cursor-pointer">Dark Kitchen</Label>
                      <p className="text-xs text-muted-foreground">Opera apenas para delivery, sem salão físico</p>
                    </div>
                  </div>
                  <Switch
                    id="is_dark_kitchen"
                    checked={newStore.is_dark_kitchen}
                    onCheckedChange={(checked) => setNewStore({ ...newStore, is_dark_kitchen: checked })}
                  />
                </div>

                {/* Menu Online */}
                <div className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="menu_enabled" className="cursor-pointer">Cardápio Online</Label>
                        <p className="text-xs text-muted-foreground">Ativar cardápio digital para esta loja</p>
                      </div>
                    </div>
                    <Switch
                      id="menu_enabled"
                      checked={newStore.menu_enabled}
                      onCheckedChange={(checked) => setNewStore({ ...newStore, menu_enabled: checked })}
                    />
                  </div>
                  
                  {newStore.menu_enabled && (
                    <div className="space-y-2">
                      <Label>Slug do Cardápio (URL)</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="ex: loja-centro"
                          value={newStore.menu_slug}
                          onChange={(e) => setNewStore({ ...newStore, menu_slug: generateSlug(e.target.value) })}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setNewStore({ ...newStore, menu_slug: generateSlug(newStore.name) })}
                          title="Gerar do nome"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {newStore.menu_slug && (
                        <p className="text-xs text-muted-foreground">
                          Link: {window.location.origin}/m/{newStore.menu_slug}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateStore} 
                  disabled={(editingStore ? updateStore.isPending : createStore.isPending) || !newStore.name || !newStore.code}
                >
                  {editingStore 
                    ? (updateStore.isPending ? 'Salvando...' : 'Salvar') 
                    : (createStore.isPending ? 'Criando...' : 'Criar Loja')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <Power className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeStores}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dark Kitchens</CardTitle>
              <ChefHat className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{darkKitchensCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aceitando Pedidos</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{acceptingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transferências</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTransfers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Atalhos Fiscais */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Configurações Fiscais Multi-CNPJ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Para configurar perfil fiscal, certificado digital, CSC, numeração NFe/NFCe, inutilização e download de XML, acesse as Configurações Fiscais.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/fiscal/settings')}
              >
                <FileText className="h-4 w-4 mr-2" />
                CNPJs / Filiais Fiscais
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/fiscal/settings?tab=certificate')}
              >
                Certificado Digital
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/fiscal/settings?tab=numeration')}
              >
                Numeração NFe/NFCe
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/fiscal/settings?tab=void')}
              >
                Inutilização
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/fiscal/settings?tab=reports')}
              >
                Download XML
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar loja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Nova Transferência
          </Button>
        </div>

        {/* Stores Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma loja encontrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredStores.map((store) => {
              const statusConfig = STATUS_CONFIG[store.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <Card key={store.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{store.code}</Badge>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STORE_STATUS_LABELS[store.status]}
                        </Badge>
                        {store.is_dark_kitchen && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                            <ChefHat className="h-3 w-3 mr-1" />
                            Dark Kitchen
                          </Badge>
                        )}
                      </div>
                      <Switch 
                        checked={store.is_accepting_orders}
                        onCheckedChange={(checked) => 
                          toggleOrderAcceptance.mutate({ id: store.id, accepting: checked })
                        }
                      />
                    </div>
                    <CardTitle className="text-lg mt-2">{store.name}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{STORE_TYPE_LABELS[store.type]}</Badge>
                      {store.menu_slug && store.menu_enabled && (
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => copyMenuLink(store.menu_slug!)}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          /m/{store.menu_slug}
                          <Copy className="h-3 w-3 ml-1" />
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {store.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{store.address}, {store.city} - {store.state}</span>
                        </div>
                      )}
                      {store.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                      {store.manager && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Gerente: {store.manager.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openStockDialog(store)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Estoque
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openMenusDialog(store)}
                      >
                        <Menu className="h-4 w-4 mr-1" />
                        Cardápios
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(store)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Recent Transfers */}
        {transfers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transferências Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transfers.slice(0, 5).map((transfer: any) => (
                  <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {transfer.from_store?.name} → {transfer.to_store?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transfer.items?.length || 0} itens
                        </p>
                      </div>
                    </div>
                    <Badge>
                      {TRANSFER_STATUS_LABELS[transfer.status as keyof typeof TRANSFER_STATUS_LABELS]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Estoque - {selectedStoreForStock?.name}
              </DialogTitle>
              <DialogDescription>
                Visualize e gerencie o estoque desta unidade
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="text-center text-muted-foreground py-8">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Funcionalidade de estoque por loja em desenvolvimento.</p>
                <p className="text-sm mt-2">Em breve você poderá gerenciar o estoque de cada unidade separadamente.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Menus Dialog */}
        <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Cardápios - {selectedStoreForMenus?.name}
              </DialogTitle>
              <DialogDescription>
                Gerencie os cardápios online desta loja
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Link Principal */}
              {selectedStoreForMenus?.menu_slug && selectedStoreForMenus?.menu_enabled && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Link Principal do Cardápio
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {window.location.origin}/m/{selectedStoreForMenus.menu_slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyMenuLink(selectedStoreForMenus.menu_slug!)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/m/${selectedStoreForMenus.menu_slug}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Múltiplos Cardápios */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Cardápios Adicionais</h4>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Cardápio
                  </Button>
                </div>
                
                <div className="text-center text-muted-foreground py-8 border rounded-lg">
                  <Menu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cardápio adicional cadastrado.</p>
                  <p className="text-sm mt-2">
                    Crie cardápios diferentes para horários específicos, 
                    promoções ou segmentos de clientes.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMenuDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
