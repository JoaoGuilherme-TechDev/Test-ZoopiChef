import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  Leaf, 
  Wine, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings,
  Loader2
} from 'lucide-react';
import { 
  useAllergens, 
  useDietaryTags, 
  useFoodPairings, 
  useAdvancedMenuSettings,
  Allergen,
  DietaryTag,
  FoodPairing
} from '@/hooks/useAdvancedMenu';
import { useProducts, Product } from '@/hooks/useProducts';

// Helper function
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Color picker options
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Emoji options for icons
const ALLERGEN_ICONS = ['🥜', '🥛', '🌾', '🥚', '🐟', '🦐', '🌰', '🫘', '🍯', '⚠️'];
const DIETARY_ICONS = ['🌱', '🥬', '🚫🌾', '🚫🥛', '🚫🥩', '💪', '❤️', '✨'];
const PAIRING_TYPES = [
  { value: 'recommended', label: 'Recomendado' },
  { value: 'perfect_match', label: 'Combinação Perfeita' },
  { value: 'sommelier_choice', label: 'Escolha do Sommelier' },
];

export default function AdvancedMenu() {
  const [activeTab, setActiveTab] = useState('allergens');
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Cardápio Avançado</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie alérgenos, informações dietéticas e harmonizações
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="allergens" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alérgenos
            </TabsTrigger>
            <TabsTrigger value="dietary" className="flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Tags Dietéticas
            </TabsTrigger>
            <TabsTrigger value="pairings" className="flex items-center gap-2">
              <Wine className="h-4 w-4" />
              Harmonizações
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allergens" className="mt-6">
            <AllergensTab />
          </TabsContent>

          <TabsContent value="dietary" className="mt-6">
            <DietaryTagsTab />
          </TabsContent>

          <TabsContent value="pairings" className="mt-6">
            <PairingsTab />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Allergens Tab
function AllergensTab() {
  const { allergens, isLoading, createAllergen, updateAllergen, deleteAllergen } = useAllergens();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);
  const [form, setForm] = useState({ name: '', icon: '⚠️', color: '#ef4444', description: '', active: true });

  const handleSubmit = async () => {
    if (editingAllergen) {
      await updateAllergen.mutateAsync({ id: editingAllergen.id, ...form });
    } else {
      await createAllergen.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditingAllergen(null);
    setForm({ name: '', icon: '⚠️', color: '#ef4444', description: '', active: true });
  };

  const openEdit = (allergen: Allergen) => {
    setEditingAllergen(allergen);
    setForm({
      name: allergen.name,
      icon: allergen.icon || '⚠️',
      color: allergen.color || '#ef4444',
      description: allergen.description || '',
      active: allergen.active,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Alérgenos</h2>
          <p className="text-sm text-muted-foreground">
            Defina alérgenos para informar seus clientes
          </p>
        </div>
        <Button onClick={() => { setEditingAllergen(null); setForm({ name: '', icon: '⚠️', color: '#ef4444', description: '', active: true }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Alérgeno
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allergens.map((allergen) => (
          <Card key={allergen.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${allergen.color}20` }}
                  >
                    {allergen.icon || '⚠️'}
                  </div>
                  <div>
                    <p className="font-medium">{allergen.name}</p>
                    {allergen.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{allergen.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={allergen.active ? 'default' : 'secondary'}>
                    {allergen.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(allergen)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAllergen.mutate(allergen.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {allergens.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum alérgeno cadastrado. Clique em "Novo Alérgeno" para começar.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAllergen ? 'Editar Alérgeno' : 'Novo Alérgeno'}</DialogTitle>
            <DialogDescription>
              Defina as informações do alérgeno
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Glúten, Lactose, Amendoim..."
              />
            </div>

            <div>
              <Label>Ícone</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {ALLERGEN_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-colors ${
                      form.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      form.color === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição adicional sobre o alérgeno..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>
              {editingAllergen ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dietary Tags Tab
function DietaryTagsTab() {
  const { dietaryTags, isLoading, createDietaryTag, updateDietaryTag, deleteDietaryTag } = useDietaryTags();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<DietaryTag | null>(null);
  const [form, setForm] = useState({ name: '', icon: '🌱', color: '#22c55e', description: '', active: true });

  const handleSubmit = async () => {
    if (editingTag) {
      await updateDietaryTag.mutateAsync({ id: editingTag.id, ...form });
    } else {
      await createDietaryTag.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditingTag(null);
    setForm({ name: '', icon: '🌱', color: '#22c55e', description: '', active: true });
  };

  const openEdit = (tag: DietaryTag) => {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      icon: tag.icon || '🌱',
      color: tag.color || '#22c55e',
      description: tag.description || '',
      active: tag.active,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Tags Dietéticas</h2>
          <p className="text-sm text-muted-foreground">
            Vegano, vegetariano, sem glúten e outras opções
          </p>
        </div>
        <Button onClick={() => { setEditingTag(null); setForm({ name: '', icon: '🌱', color: '#22c55e', description: '', active: true }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Tag
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dietaryTags.map((tag) => (
          <Card key={tag.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    {tag.icon || '🌱'}
                  </div>
                  <div>
                    <p className="font-medium">{tag.name}</p>
                    {tag.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{tag.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tag.active ? 'default' : 'secondary'}>
                    {tag.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tag)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteDietaryTag.mutate(tag.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {dietaryTags.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma tag dietética cadastrada. Clique em "Nova Tag" para começar.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag Dietética'}</DialogTitle>
            <DialogDescription>
              Defina as informações da tag dietética
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Vegano, Sem Glúten, Low Carb..."
              />
            </div>

            <div>
              <Label>Ícone</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {DIETARY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-colors ${
                      form.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      form.color === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição adicional sobre a tag..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>
              {editingTag ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Pairings Tab
function PairingsTab() {
  const { pairings, isLoading, createPairing, updatePairing, deletePairing } = useFoodPairings();
  const productsQuery = useProducts();
  const products = productsQuery.data || [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPairing, setEditingPairing] = useState<FoodPairing | null>(null);
  const [form, setForm] = useState({ 
    product_id: '', 
    paired_product_id: '', 
    pairing_type: 'recommended', 
    reason: '', 
    discount_percent: 0, 
    active: true 
  });

  const handleSubmit = async () => {
    if (editingPairing) {
      await updatePairing.mutateAsync({ id: editingPairing.id, ...form });
    } else {
      await createPairing.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditingPairing(null);
    setForm({ product_id: '', paired_product_id: '', pairing_type: 'recommended', reason: '', discount_percent: 0, active: true });
  };

  const openEdit = (pairing: FoodPairing) => {
    setEditingPairing(pairing);
    setForm({
      product_id: pairing.product_id,
      paired_product_id: pairing.paired_product_id,
      pairing_type: pairing.pairing_type || 'recommended',
      reason: pairing.reason || '',
      discount_percent: pairing.discount_percent || 0,
      active: pairing.active,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Harmonizações</h2>
          <p className="text-sm text-muted-foreground">
            Sugira combinações perfeitas de produtos
          </p>
        </div>
        <Button onClick={() => { 
          setEditingPairing(null); 
          setForm({ product_id: '', paired_product_id: '', pairing_type: 'recommended', reason: '', discount_percent: 0, active: true }); 
          setDialogOpen(true); 
        }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Harmonização
        </Button>
      </div>

      <div className="grid gap-4">
        {pairings.map((pairing) => {
          const product = products?.find(p => p.id === pairing.product_id);
          return (
            <Card key={pairing.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {product?.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Wine className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium">{product?.name || 'Produto'}</span>
                    </div>
                    <span className="text-muted-foreground">+</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {pairing.paired_product?.image_url ? (
                          <img src={pairing.paired_product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Wine className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium">{pairing.paired_product?.name || 'Produto'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {PAIRING_TYPES.find(t => t.value === pairing.pairing_type)?.label || pairing.pairing_type}
                    </Badge>
                    {pairing.discount_percent > 0 && (
                      <Badge variant="secondary">-{pairing.discount_percent}%</Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(pairing)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deletePairing.mutate(pairing.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {pairing.reason && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{pairing.reason}"</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {pairings.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma harmonização cadastrada. Clique em "Nova Harmonização" para começar.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPairing ? 'Editar Harmonização' : 'Nova Harmonização'}</DialogTitle>
            <DialogDescription>
              Defina uma combinação de produtos para sugerir aos clientes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Produto Principal</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products?.filter(p => p.active).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Harmoniza com</Label>
              <Select value={form.paired_product_id} onValueChange={(v) => setForm({ ...form, paired_product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products?.filter(p => p.active && p.id !== form.product_id).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Harmonização</Label>
              <Select value={form.pairing_type} onValueChange={(v) => setForm({ ...form, pairing_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAIRING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Motivo da Harmonização (opcional)</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Ex: O tanino do vinho complementa perfeitamente a gordura do corte..."
              />
            </div>

            <div>
              <Label>Desconto quando comprados juntos (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.product_id || !form.paired_product_id}>
              {editingPairing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  const { settings, isLoading, updateSettings } = useAdvancedMenuSettings();

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exibição no Cardápio</CardTitle>
          <CardDescription>Configure como as informações aparecem no cardápio público</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mostrar Alérgenos</p>
              <p className="text-sm text-muted-foreground">Exibir ícones de alérgenos nos produtos</p>
            </div>
            <Switch
              checked={settings?.show_allergens ?? true}
              onCheckedChange={(checked) => updateSettings.mutate({ show_allergens: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mostrar Tags Dietéticas</p>
              <p className="text-sm text-muted-foreground">Exibir tags como Vegano, Sem Glúten, etc.</p>
            </div>
            <Switch
              checked={settings?.show_dietary_tags ?? true}
              onCheckedChange={(checked) => updateSettings.mutate({ show_dietary_tags: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mostrar Harmonizações</p>
              <p className="text-sm text-muted-foreground">Exibir sugestões de produtos que combinam</p>
            </div>
            <Switch
              checked={settings?.show_pairings ?? true}
              onCheckedChange={(checked) => updateSettings.mutate({ show_pairings: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mostrar Calorias</p>
              <p className="text-sm text-muted-foreground">Exibir informações calóricas dos produtos</p>
            </div>
            <Switch
              checked={settings?.show_calories ?? false}
              onCheckedChange={(checked) => updateSettings.mutate({ show_calories: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modo de Exibição</CardTitle>
          <CardDescription>Personalize a aparência das informações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Exibição de Alérgenos</Label>
            <Select 
              value={settings?.allergen_display_mode || 'icons'} 
              onValueChange={(v) => updateSettings.mutate({ allergen_display_mode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icons">Apenas Ícones</SelectItem>
                <SelectItem value="text">Apenas Texto</SelectItem>
                <SelectItem value="both">Ícones e Texto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Exibição de Harmonizações</Label>
            <Select 
              value={settings?.pairing_display_mode || 'carousel'} 
              onValueChange={(v) => updateSettings.mutate({ pairing_display_mode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carrossel</SelectItem>
                <SelectItem value="grid">Grade</SelectItem>
                <SelectItem value="list">Lista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
