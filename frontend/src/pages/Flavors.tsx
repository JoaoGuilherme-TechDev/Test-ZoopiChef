import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  useFlavors,
  useCreateFlavor,
  useUpdateFlavor,
  useDeleteFlavor,
  useFlavorPrices,
  useUpsertFlavorPrice,
  parseIngredients,
  Flavor,
  FlavorPrice,
} from '@/hooks/useFlavors';
import { useActiveFlavorHighlightGroups } from '@/hooks/useFlavorHighlightGroups';
import { useActiveFlavorGroups } from '@/hooks/useFlavorGroups';
import { CreateFlavorGroupDialog } from '@/components/flavors/CreateFlavorGroupDialog';
import { useCompanyPizzaSettings } from '@/hooks/useCompanyPizzaSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Pizza, Plus, Pencil, Trash2, Building2, DollarSign, Tag, X, Check, Settings, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-shim';

const flavorSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
});

const DEFAULT_SIZES = ['broto', 'média', 'grande'];

interface FlavorFormState {
  name: string;
  highlight_group: string;
  flavor_group_id: string;
  description: string;
  ingredients_raw: string;
  active: boolean;
  usage_type: 'pizza' | 'marmita' | 'ambos';
}

const defaultFormState: FlavorFormState = {
  name: '',
  highlight_group: '',
  flavor_group_id: '',
  description: '',
  ingredients_raw: '',
  active: true,
  usage_type: 'ambos',
};

interface PriceFormState {
  [size: string]: {
    price_base: string; // Only base price - other values are calculated
  };
}

export default function Flavors() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { data: flavors, isLoading: flavorsLoading } = useFlavors();
  const { data: highlightGroups = [] } = useActiveFlavorHighlightGroups();
  const { data: flavorGroups = [] } = useActiveFlavorGroups();
  const { data: pizzaSettings } = useCompanyPizzaSettings();
  const createFlavor = useCreateFlavor();
  const updateFlavor = useUpdateFlavor();
  const deleteFlavor = useDeleteFlavor();
  const upsertPrice = useUpsertFlavorPrice();

  // Filter state for flavor group
  const [filterFlavorGroup, setFilterFlavorGroup] = useState<string>('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [form, setForm] = useState<FlavorFormState>(defaultFormState);
  const [priceForm, setPriceForm] = useState<PriceFormState>({});
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterUsage, setFilterUsage] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'info' | 'prices'>('info');

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';
  const isLoading = companyLoading || flavorsLoading;
  
  // Use groups from database, fallback to unique groups from existing flavors
  const availableGroups = highlightGroups.length > 0 
    ? highlightGroups.map(g => ({ name: g.name, color: g.color }))
    : [...new Set(flavors?.map(f => f.highlight_group).filter(Boolean))].map(name => ({ name: name!, color: '#6B7280' }));

  const filteredFlavors = flavors?.filter(flavor => {
    if (filterFlavorGroup !== 'all' && flavor.flavor_group_id !== filterFlavorGroup) return false;
    if (filterGroup !== 'all' && flavor.highlight_group !== filterGroup) return false;
    if (filterUsage !== 'all' && flavor.usage_type !== filterUsage && flavor.usage_type !== 'ambos') return false;
    return true;
  });

  const uniqueGroups = [...new Set(flavors?.map(f => f.highlight_group).filter(Boolean))];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const resetForm = () => {
    setForm(defaultFormState);
    setPriceForm({});
    setEditingFlavor(null);
    setActiveTab('info');
  };

  const handleOpenDialog = async (flavor?: Flavor) => {
    if (flavor) {
      setEditingFlavor(flavor);
      setForm({
        name: flavor.name,
        highlight_group: flavor.highlight_group || '',
        flavor_group_id: flavor.flavor_group_id || '',
        description: flavor.description || '',
        ingredients_raw: flavor.ingredients_raw || '',
        active: flavor.active,
        usage_type: flavor.usage_type,
      });
      
      // Load prices for this flavor
      const { data: prices } = await supabase
        .from('flavor_prices')
        .select('*')
        .eq('flavor_id', flavor.id);
      
      const priceMap: PriceFormState = {};
      DEFAULT_SIZES.forEach(size => {
        const existing = prices?.find(p => p.size_name === size);
        priceMap[size] = {
          price_base: existing?.price_full?.toString() || '0', // price_full is our base price
        };
      });
      setPriceForm(priceMap);
    } else {
      resetForm();
      const priceMap: PriceFormState = {};
      DEFAULT_SIZES.forEach(size => {
        priceMap[size] = { price_base: '0' };
      });
      setPriceForm(priceMap);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = flavorSchema.safeParse({ name: form.name });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      let flavorId: string;

      if (editingFlavor) {
        await updateFlavor.mutateAsync({ id: editingFlavor.id, ...form });
        flavorId = editingFlavor.id;
        toast.success('Sabor atualizado!');
      } else {
        const created = await createFlavor.mutateAsync(form);
        flavorId = created.id;
        toast.success('Sabor criado!');
      }

      // Save prices - only store base price, others are derived
      for (const sizeName of DEFAULT_SIZES) {
        const priceData = priceForm[sizeName];
        if (priceData) {
          const basePrice = parseFloat(priceData.price_base.replace(',', '.')) || 0;
          await upsertPrice.mutateAsync({
            flavor_id: flavorId,
            size_name: sizeName,
            price_full: basePrice, // Base price stored as price_full
            price_per_part: basePrice / 2, // Auto-calculated example for 2 parts
            price_avg: basePrice, // Same as base for average calculation
          });
        }
      }

      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar sabor');
    }
  };

  const handleToggleActive = async (flavor: Flavor) => {
    try {
      await updateFlavor.mutateAsync({ id: flavor.id, active: !flavor.active });
      toast.success(flavor.active ? 'Sabor desativado' : 'Sabor ativado');
    } catch (error) {
      toast.error('Erro ao atualizar sabor');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFlavor.mutateAsync(id);
      toast.success('Sabor excluído!');
    } catch (error) {
      toast.error('Erro ao excluir sabor');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Sabores">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Sabores">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro para gerenciar sabores.
            </p>
            <Button onClick={() => navigate('/company')}>
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sabores">
      <div className="space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Pizza className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <CardTitle className="font-display">Cadastro de Sabores</CardTitle>
                <CardDescription>
                  Você cria os sabores e define o preço por tamanho • {filteredFlavors?.length || 0} cadastrado(s)
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Select value={filterFlavorGroup} onValueChange={setFilterFlavorGroup}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Grupo de Sabor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Grupos</SelectItem>
                  {flavorGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Destaque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Destaques</SelectItem>
                  {uniqueGroups.map((group) => (
                    <SelectItem key={group} value={group!}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterUsage} onValueChange={setFilterUsage}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Uso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pizza">Pizza</SelectItem>
                  <SelectItem value="marmita">Marmita</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Sabor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingFlavor ? 'Editar Sabor' : 'Novo Sabor'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingFlavor ? 'Atualize os dados do sabor' : 'Preencha os dados para criar um novo sabor'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'info' | 'prices')}>
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="info">Informações</TabsTrigger>
                          <TabsTrigger value="prices">Preços por Tamanho</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="name">Nome do Sabor *</Label>
                              <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Calabresa Especial"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="flavor_group_id">Grupo de Sabor</Label>
                              <div className="flex gap-2">
                                <Select 
                                  value={form.flavor_group_id} 
                                  onValueChange={(v) => setForm(prev => ({ ...prev, flavor_group_id: v }))}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Ex: Pizza Salgada, Proteínas..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {flavorGroups.map((group) => (
                                      <SelectItem key={group.id} value={group.id}>
                                        {group.name}
                                      </SelectItem>
                                    ))}
                                    {flavorGroups.length === 0 && (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        Nenhum grupo cadastrado
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <CreateFlavorGroupDialog
                                  triggerLabel="Criar"
                                  onCreated={(id) => setForm(prev => ({ ...prev, flavor_group_id: id }))}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Agrupa sabores por tipo (ex: Pizza Salgada, Pizza Doce, Proteínas)
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="highlight_group">Destaque</Label>
                              <Select 
                                value={form.highlight_group} 
                                onValueChange={(v) => setForm(prev => ({ ...prev, highlight_group: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Ex: Frango, Peixe, Frios..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableGroups.map((group) => (
                                    <SelectItem key={group.name} value={group.name}>
                                      <span className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                                        {group.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                  {availableGroups.length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      <Link to="/flavor-highlight-groups" className="text-primary hover:underline">
                                        Cadastrar grupos de destaque
                                      </Link>
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Tag visual para agrupar sabores (ex: Frango, Calabresa)
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                              id="description"
                              value={form.description}
                              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Descrição opcional do sabor"
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ingredients">Ingredientes</Label>
                            <Textarea
                              id="ingredients"
                              value={form.ingredients_raw}
                              onChange={(e) => setForm(prev => ({ ...prev, ingredients_raw: e.target.value }))}
                              placeholder="Separe por vírgula (removíveis) ou ponto-vírgula (fixos). Ex: Mussarela, Calabresa, Cebola; Molho de tomate"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                              <strong>Vírgula (,):</strong> cliente pode remover • <strong>Ponto-vírgula (;):</strong> ingrediente fixo
                            </p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Tipo de Uso</Label>
                              <Select 
                                value={form.usage_type} 
                                onValueChange={(v) => setForm(prev => ({ ...prev, usage_type: v as any }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pizza">Apenas Pizza</SelectItem>
                                  <SelectItem value="marmita">Apenas Marmita</SelectItem>
                                  <SelectItem value="ambos">Ambos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-3 pt-7">
                              <Switch
                                id="active"
                                checked={form.active}
                                onCheckedChange={(checked) => setForm(prev => ({ ...prev, active: checked }))}
                              />
                              <Label htmlFor="active">Sabor ativo</Label>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="prices" className="space-y-4">
                          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">Como funciona:</p>
                            <p>Informe apenas o <strong>Preço Base</strong> de cada tamanho. O sistema calcula automaticamente conforme o modelo de cobrança configurado no produto (Maior/Média/Parte).</p>
                          </div>

                          {DEFAULT_SIZES.map((size) => {
                            const basePrice = parseFloat(priceForm[size]?.price_base?.replace(',', '.') || '0');
                            const halfPrice = basePrice / 2;
                            
                            return (
                              <Card key={size} className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium capitalize">{size}</h4>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <Label className="text-sm font-medium">Preço Base (R$)</Label>
                                    <Input
                                      type="text"
                                      value={priceForm[size]?.price_base || '0'}
                                      onChange={(e) => setPriceForm(prev => ({
                                        ...prev,
                                        [size]: { price_base: e.target.value }
                                      }))}
                                      placeholder="0,00"
                                      className="text-lg font-medium"
                                    />
                                  </div>
                                  
                                  {basePrice > 0 && (
                                    <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                                      <p>📊 <strong>Modelo PARTE:</strong> {formatCurrency(halfPrice)}/metade</p>
                                      <p>📊 <strong>Modelo MAIOR:</strong> Cobra {formatCurrency(basePrice)} se for o maior</p>
                                      <p>📊 <strong>Modelo MÉDIA:</strong> Calculado na seleção de sabores</p>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </TabsContent>
                      </Tabs>

                      <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createFlavor.isPending || updateFlavor.isPending}>
                          {editingFlavor ? 'Salvar' : 'Criar'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredFlavors?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pizza className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum sabor encontrado</p>
                    {isAdmin && (
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => handleOpenDialog()}
                      >
                        Criar primeiro sabor
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredFlavors?.map((flavor) => {
                    const { removable, fixed } = parseIngredients(flavor.ingredients_raw);
                    
                    return (
                      <div
                        key={flavor.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          flavor.active 
                            ? 'bg-card hover:bg-muted/50' 
                            : 'bg-muted/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Botão de toggle rápido - Joinha */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(flavor)}
                            className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors shrink-0 ${
                              flavor.active 
                                ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30' 
                                : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                            }`}
                            title={flavor.active ? 'Ativo - Clique para desativar' : 'Inativo - Clique para ativar'}
                          >
                            {flavor.active ? (
                              <ThumbsUp className="w-5 h-5" />
                            ) : (
                              <ThumbsDown className="w-5 h-5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{flavor.name}</h3>
                              {flavor.highlight_group && (
                                <Badge variant="outline" className="text-xs">
                                  {flavor.highlight_group}
                                </Badge>
                              )}
                              <Badge 
                                variant={flavor.usage_type === 'pizza' ? 'default' : flavor.usage_type === 'marmita' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {flavor.usage_type === 'pizza' ? 'Pizza' : flavor.usage_type === 'marmita' ? 'Marmita' : 'Ambos'}
                              </Badge>
                              {!flavor.active && (
                                <Badge variant="destructive" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                            </div>

                            {flavor.description && (
                              <p className="text-sm text-muted-foreground mb-2">{flavor.description}</p>
                            )}

                            {(removable.length > 0 || fixed.length > 0) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {removable.map((ing, i) => (
                                  <Badge key={`r-${i}`} variant="secondary" className="text-xs">
                                    <X className="w-3 h-3 mr-1 opacity-50" />
                                    {ing}
                                  </Badge>
                                ))}
                                {fixed.map((ing, i) => (
                                  <Badge key={`f-${i}`} variant="outline" className="text-xs bg-muted">
                                    {ing}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(flavor)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir sabor?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação removerá o sabor "{flavor.name}" de todos os produtos vinculados.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(flavor.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
