/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChefHat } from 'lucide-react';
import { useFlavors, FlavorSizePrice, Flavor } from '@/modules/products/hooks/useFlavors';
import { useSizes } from '@/modules/products/hooks/useSizes';
import { useDoughTypes } from '@/modules/products/hooks/useDoughTypes';
import { useBorderTypes } from '@/modules/products/hooks/useBorderTypes';
import { SizeManagerCard } from '@/modules/products/components/SizeManagerCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

export default function Flavors() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'sizes'>('info');
  const [flavorName, setFlavorName] = useState('');
  const [flavorGroup, setFlavorGroup] = useState('');
  const [flavorDescription, setFlavorDescription] = useState('');
  const [flavorIngredients, setFlavorIngredients] = useState('');
  const [flavorType, setFlavorType] = useState<'pizza' | 'border'>('pizza');
  const [sizeSelections, setSizeSelections] = useState<FlavorSizePrice[]>([]);
  const [sizeSearch, setSizeSearch] = useState('');
  const { flavors, isLoading, createFlavor, updateFlavor, deleteFlavor } = useFlavors();
  const { sizes, isLoading: isLoadingSizes } = useSizes();
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const { doughTypes, createType: createDoughType, deleteType: deleteDoughType } = useDoughTypes();
  const { borderTypes, createType: createBorderType, deleteType: deleteBorderType } = useBorderTypes();
  const [doughName, setDoughName] = useState('');
  const [borderName, setBorderName] = useState('');

  const filteredSizes = useMemo(() => {
    if (!sizeSearch.trim()) return sizes;
    const term = sizeSearch.trim().toLowerCase();
    return sizes.filter((s) => s.name.toLowerCase().includes(term));
  }, [sizes, sizeSearch]);

  const toggleSizeSelection = (sizeId: string, basePrice: string) => {
    setSizeSelections((prev) => {
      const exists = prev.find((s) => s.sizeId === sizeId);
      if (exists) {
        return prev.filter((s) => s.sizeId !== sizeId);
      }
      const price = basePrice || '0';
      return [...prev, { sizeId, price }];
    });
  };

  const updateSizePrice = (sizeId: string, price: string) => {
    setSizeSelections((prev) =>
      prev.map((s) => (s.sizeId === sizeId ? { ...s, price } : s))
    );
  };

  const handleSubmit = () => {
    if (!flavorName.trim()) return;
    const validSizes = sizeSelections.filter((s) => {
      const parsed = parseFloat(s.price.replace(',', '.'));
      return Number.isFinite(parsed) && parsed > 0;
    });
    const payload = {
      name: flavorName.trim(),
      group: flavorGroup.trim() || undefined,
      description: flavorDescription.trim() || undefined,
      ingredients: flavorIngredients.trim() || undefined,
      sizes: validSizes,
      type: flavorType,
    };
    if (editingFlavor) {
      updateFlavor.mutate(
        { id: editingFlavor.id, data: payload },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingFlavor(null);
            setActiveTab('info');
            setFlavorName('');
            setFlavorGroup('');
            setFlavorDescription('');
            setFlavorIngredients('');
            setFlavorType('pizza');
            setSizeSelections([]);
            setSizeSearch('');
          },
        }
      );
    } else {
      createFlavor.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setActiveTab('info');
          setFlavorName('');
          setFlavorGroup('');
          setFlavorDescription('');
          setFlavorIngredients('');
          setFlavorType('pizza');
          setSizeSelections([]);
          setSizeSearch('');
        },
      });
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingFlavor(null);
    setActiveTab('info');
  };

  const openEditFlavor = (flavor: Flavor) => {
    setEditingFlavor(flavor);
    setFlavorName(flavor.name);
    setFlavorGroup(flavor.group || '');
    setFlavorDescription(flavor.description || '');
    setFlavorIngredients(flavor.ingredients || '');
    setFlavorType(flavor.type);
    setSizeSelections(flavor.sizes);
    setIsDialogOpen(true);
    setActiveTab('info');
  };

  const handleDeleteFlavor = (id: string) => {
    deleteFlavor.mutate(id);
  };

  return (
    <DashboardLayout title="Sabores">
      <div className="flex flex-col gap-6 ">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 ">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                Sabores de Pizza
              </h1>
              <p className="text-xs text-muted-foreground">
                Cadastre combinações de sabores que serão usadas na montagem das pizzas.
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-[96vw] sm:w-[90vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                  <ChefHat className="h-5 w-5 text-primary" />
                  Novo sabor
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do sabor e os preços por tamanho.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 ">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'info' | 'sizes')}>
                  <TabsList className="grid w-full grid-cols-2 ">
                    <TabsTrigger value="info">
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="sizes">
                      Preços por tamanho
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 pt-2 ">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Nome do sabor *
                        </Label>
                        <Input
                          className="h-9 border border-primary/50"
                          placeholder="Ex: Calabresa Especial"
                          value={flavorName}
                          onChange={(e) => setFlavorName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Grupo de sabor
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            className="h-9 border border-primary/50"
                            placeholder="Ex: Pizza Salgada, Proteínas..."
                            value={flavorGroup}
                            onChange={(e) => setFlavorGroup(e.target.value)}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Agrupa sabores por tipo, como Pizza Salgada, Pizza Doce, Proteínas
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tipo do sabor</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={flavorType === 'pizza' ? 'default' : 'outline'}
                          className="h-9 px-4 rounded-full text-xs font-medium"
                          onClick={() => setFlavorType('pizza')}
                        >
                          Pizza
                        </Button>
                        <Button
                          type="button"
                          variant={flavorType === 'border' ? 'default' : 'outline'}
                          className="h-9 px-4 rounded-full text-xs font-medium"
                          onClick={() => setFlavorType('border')}
                        >
                          Borda
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Descrição
                        </Label>
                        <Textarea
                          placeholder="Descrição opcional do sabor"
                          className="min-h-[96px] border border-primary"
                          value={flavorDescription}
                          onChange={(e) => setFlavorDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Ingredientes
                        </Label>
                        <Textarea
                          placeholder="Separe por vírgula (removíveis) ou ponto-vírgula (fixos). Ex: Mussarela, Calabresa; Cebola; Molho de tomate"
                          className="min-h-[96px] border border-primary"
                          value={flavorIngredients}
                          onChange={(e) => setFlavorIngredients(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Vírgula (,): cliente pode remover • Ponto-vírgula (;): ingrediente fixo
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="sizes" className="space-y-4 pt-2">
                    <div className="rounded-lg border border-primary/50 bg-muted/40 p-3 ">
                      <p className="text-xs font-medium">
                        Como funciona
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Selecione os tamanhos globais que este sabor suporta e defina o preço de cada combinação.
                      </p>
                    </div>

                    {isLoadingSizes ? (
                      <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
                        Carregando tamanhos...
                      </div>
                    ) : sizes.length === 0 ? (
                      <div className="h-24 flex items-center justify-center text-xs text-muted-foreground text-center">
                        Nenhum tamanho global cadastrado ainda. Crie tamanhos na seção abaixo antes de vincular ao sabor.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Buscar tamanho..."
                              className="h-8 text-xs"
                              value={sizeSearch}
                              onChange={(e) => setSizeSearch(e.target.value)}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {sizeSelections.length} selecionado(s)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredSizes.map((size) => {
                            const selected = sizeSelections.some((s) => s.sizeId === size.id);
                            const currentPrice =
                              sizeSelections.find((s) => s.sizeId === size.id)?.price ||
                              size.basePrice ||
                              '0';
                            return (
                              <div
                                key={size.id}
                                className="rounded-lg border border-primary/50 bg-card p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium">{size.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {size.slices} fatia(s) • até {size.maxFlavors} sabor(es)
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant={selected ? 'default' : 'outline'}
                                    className="h-7 px-3 text-[10px] rounded-full"
                                    onClick={() => toggleSizeSelection(size.id, size.basePrice)}
                                  >
                                    {selected ? 'Selecionado' : 'Selecionar'}
                                  </Button>
                                </div>
                                {selected && (
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-medium">
                                      Preço deste sabor neste tamanho
                                    </Label>
                                    <Input
                                      value={currentPrice}
                                      onChange={(e) =>
                                        updateSizePrice(size.id, e.target.value)
                                      }
                                      className="h-8 text-xs"
                                      placeholder={size.basePrice}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                      Preço base do tamanho: R$ {size.basePrice}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="w-full sm:w-auto"
                  disabled={createFlavor.isPending || updateFlavor.isPending}
                >
                  {editingFlavor ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SizeManagerCard />

        <Card className="panel border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)]">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="section-header">
                Tipos de Massa e Borda
              </CardTitle>
              <p className="section-subtitle">
                Crie e gerencie tipos de massa e de borda usados na configuração de pizzas.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-xs">Novo tipo de massa</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ex: Tradicional"
                    value={doughName}
                    onChange={(e) => setDoughName(e.target.value)}
                    className="h-9 border border-primary/50"
                  />
                  <Button
                    onClick={() => {
                      if (!doughName.trim()) return;
                      createDoughType.mutate(doughName, { onSuccess: () => setDoughName('') });
                    }}
                    className="h-9"
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {doughTypes.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhum tipo de massa ainda.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {doughTypes.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/10 px-2 py-1 border border-[hsla(270,100%,65%,0.22)]">
                          <span className="text-[11px] font-medium">{t.name}</span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              >
                                ✕
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover tipo de massa</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá o tipo de massa. Deseja continuar?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDoughType.mutate(t.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs">Novo tipo de borda</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ex: Recheada"
                    value={borderName}
                    onChange={(e) => setBorderName(e.target.value)}
                    className="h-9 border border-primary/50"
                  />
                  <Button
                    onClick={() => {
                      if (!borderName.trim()) return;
                      createBorderType.mutate(borderName, { onSuccess: () => setBorderName('') });
                    }}
                    className="h-9"
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {borderTypes.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhum tipo de borda ainda.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {borderTypes.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/10 px-2 py-1 border border-[hsla(270,100%,65%,0.22)]">
                          <span className="text-[11px] font-medium">{t.name}</span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              >
                                ✕
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover tipo de borda</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá o tipo de borda. Deseja continuar?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBorderType.mutate(t.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="panel border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)]">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                Sabores cadastrados
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Em breve você verá aqui todos os sabores configurados para pizzas.
              </p>
            </div>
            <Button
              onClick={() => {
                setActiveTab('info');
                setIsDialogOpen(true);
              }}
              className="w-full sm:w-auto h-10 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-medium bg-primary text-white hover:bg-primary/90"
            >
              Novo Sabor
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : flavors.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Nenhum sabor cadastrado ainda. Clique em <span className="mx-1 font-medium">Novo sabor</span> para começar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {flavors.map((f) => (
                  <div key={f.id} className="p-3 rounded-lg border border-primary/50 bg-card flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.group || 'Sem grupo'}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] border border-[hsla(270,100%,65%,0.22)]">
                          {(f as any).type === 'border' ? 'Borda' : 'Pizza'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {f.sizes.length} tamanho(s)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditFlavor(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover sabor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação removerá o sabor do sistema. Deseja continuar?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteFlavor(f.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

