import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useUploadProductImage, Product } from '@/hooks/useProducts';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useManageOptionGroups, useManageOptionItems, CALC_MODE_LABELS, type OptionalCalcMode } from '@/hooks/useProductOptions';
import { useERPUnits } from '@/modules/erp-inventory/hooks/useERPUnits';
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
import { Package, Plus, Pencil, Trash2, Building2, Layers, Truck, Tv, Star, Upload, Clock, Tag, Image as ImageIcon, Settings2, X, Weight, Gauge, ListChecks, Wine, FileText, Barcode, Scale, UserRoundCheck, Monitor, Tablet, UtensilsCrossed, Receipt, Percent, Gift, Pizza } from 'lucide-react';
import { ProductOptionalsTab } from '@/components/products/ProductOptionalsTab';
import { ProductLoyaltyPointsTab } from '@/components/products/ProductLoyaltyPointsTab';
import { PizzaConfigTabV3 } from '@/components/products/PizzaConfigTabV3';
// PizzaIngredientsDialog removed - ingredient editing is done in customer-facing pizza configurator
import { ProductSommelierTagsTab } from '@/modules/sommelier/components/admin/ProductSommelierTagsTab';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const productSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
  subcategory_id: z.string().min(1, 'Selecione uma subcategoria'),
  price: z.number().min(0, 'O preço deve ser maior ou igual a zero'),
});

const visibilityOptions = [
  { key: 'aparece_delivery', label: 'Delivery', icon: Truck },
  { key: 'aparece_garcom', label: 'App Garçom', icon: UserRoundCheck },
  { key: 'aparece_totem', label: 'Totem', icon: Monitor },
  { key: 'aparece_tablet', label: 'Tablet', icon: Tablet },
  { key: 'aparece_mesa', label: 'Mesa', icon: UtensilsCrossed },
  { key: 'aparece_comanda', label: 'Comanda', icon: Receipt },
  { key: 'aparece_tv', label: 'TV', icon: Tv },
  { key: 'aparece_selfservice', label: 'Self-Service', icon: Scale },
] as const;

type VisibilityKey = typeof visibilityOptions[number]['key'];

interface ProductFormState {
  name: string;
  title: string;
  description: string;
  composition: string;
  subcategoryId: string;
  price: string;
  active: boolean;
  visibility: Record<VisibilityKey, boolean>;
  imageUrl: string;
  isOnSale: boolean;
  salePrice: string;
  saleHours: string[];
  isFeatured: boolean;
  productionWeight: string;
  productionStation: string;
  eanCode: string;
  internalCode: string;
  ncmCode: string;
  taxStatus: 'tributado' | 'nao_tributado' | 'servico' | 'isento';
  isWeighted: boolean;
  geraComissao: boolean;
  unitId: string;
}

const TAX_STATUS_OPTIONS = [
  { value: 'tributado', label: 'Tributado' },
  { value: 'nao_tributado', label: 'Não Tributado' },
  { value: 'servico', label: 'Serviço' },
  { value: 'isento', label: 'Isento' },
] as const;

const PRODUCTION_STATIONS = [
  { value: '', label: 'Nenhuma' },
  { value: 'chapa', label: 'Chapa' },
  { value: 'fritadeira', label: 'Fritadeira' },
  { value: 'forno', label: 'Forno' },
  { value: 'bar', label: 'Bar / Bebidas' },
  { value: 'frio', label: 'Frio / Saladas' },
  { value: 'montagem', label: 'Montagem' },
];

const defaultFormState: ProductFormState = {
  name: '',
  title: '',
  description: '',
  composition: '',
  subcategoryId: '',
  price: '',
  active: true,
  visibility: {
    aparece_delivery: true,
    aparece_garcom: true,
    aparece_totem: true,
    aparece_tablet: true,
    aparece_mesa: true,
    aparece_comanda: true,
    aparece_tv: true,
    aparece_selfservice: true,
  },
  imageUrl: '',
  isOnSale: false,
  salePrice: '',
  saleHours: [],
  isFeatured: false,
  productionWeight: '1.0',
  productionStation: '',
  eanCode: '',
  internalCode: '',
  ncmCode: '',
  taxStatus: 'tributado',
  isWeighted: false,
  geraComissao: true,
  unitId: '',
};

export default function Products() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { isSuperAdmin } = useUserRoles();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: subcategories } = useSubcategories();
  const { units } = useERPUnits();
  // Setor de impressão agora centralizado em Configurações > Impressão
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadImage = useUploadProductImage();

  const { groups, createGroup, updateGroup, deleteGroup } = useManageOptionGroups();
  const { createItem, updateItem, deleteItem } = useManageOptionItems();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(defaultFormState);
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Options state
  const [mainTab, setMainTab] = useState<'products' | 'options'>('products');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [newGroupForm, setNewGroupForm] = useState<{
    name: string;
    min_select: number;
    max_select: number;
    required: boolean;
    type: 'single' | 'multiple';
    calc_mode: OptionalCalcMode;
  }>({
    name: '',
    min_select: 0,
    max_select: 1,
    required: false,
    type: 'single',
    calc_mode: 'sum_each_part',
  });
  const [newItemForm, setNewItemForm] = useState({
    label: '',
    price_delta: 0,
  });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  
  // Pizza ingredients dialog removed - ingredient editing is now only in customer-facing pizza configurator

  // SUPER_ADMIN has full access, company admin also has access
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';
  const isLoading = companyLoading || productsLoading;

  const activeSubcategories = subcategories?.filter(sub => sub.active) || [];
  // Setor de impressão agora centralizado em Configurações > Impressão

  // Check if the selected subcategory belongs to a Pizza category
  const getSelectedCategoryName = (subcategoryId: string): string => {
    const sub = activeSubcategories.find(s => s.id === subcategoryId);
    return sub?.category?.name || '';
  };

  const isPizzaCategory = (subcategoryId: string): boolean => {
    const categoryName = getSelectedCategoryName(subcategoryId);
    return categoryName.toLowerCase().includes('pizza');
  };

  const isCurrentProductPizza = editingProduct 
    ? isPizzaCategory(editingProduct.subcategory_id) 
    : isPizzaCategory(form.subcategoryId);

  const filteredProducts = products?.filter(product => 
    filterSubcategory === 'all' || product.subcategory_id === filterSubcategory
  );

  // Extract size name from product name
  const extractSizeFromProductName = (name: string): string => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('grande') || lower.includes('gigante')) return 'grande';
    if (lower.includes('média') || lower.includes('media')) return 'média';
    if (lower.includes('pequena') || lower.includes('pequeno')) return 'pequena';
    if (lower.includes('broto')) return 'broto';
    return 'grande';
  };

  const zeroProducts = useMemo(() => (products || []).filter((p) => Number(p.price) === 0), [products]);
  const zeroProductIds = useMemo(() => zeroProducts.map((p) => p.id), [zeroProducts]);

  const { data: startingPricesByProduct = {} } = useQuery({
    queryKey: ['products-starting-prices', company?.id, zeroProductIds],
    enabled: !!company?.id && zeroProducts.length > 0,
    queryFn: async () => {
      if (!company?.id || zeroProducts.length === 0) return {} as Record<string, number>;

      // Get all products with price 0 to calculate starting prices
      const { data: productOptionalLinks } = await supabase
        .from('product_optional_groups')
        .select('product_id, optional_group_id')
        .eq('company_id', company.id)
        .in('product_id', zeroProductIds)
        .or('active.is.null,active.eq.true');

      const productMinPrices: Record<string, number> = {};
      const optionalGroupIds = [...new Set(productOptionalLinks?.map((pog: any) => pog.optional_group_id) || [])];

      if (optionalGroupIds.length === 0) return productMinPrices;

      const { data: optionalGroups } = await supabase
        .from('optional_groups')
        .select('id, source_type, flavor_group_id')
        .in('id', optionalGroupIds)
        .or('active.is.null,active.eq.true');

      const flavorGroupIds = (optionalGroups || [])
        .filter((og: any) => og.source_type === 'flavors' && og.flavor_group_id)
        .map((og: any) => og.flavor_group_id);

      // Map flavor_group_id to optional_group_id
      const flavorGroupToOptGroup: Record<string, string> = {};
      (optionalGroups || []).forEach((og: any) => {
        if (og.source_type === 'flavors' && og.flavor_group_id) {
          flavorGroupToOptGroup[og.flavor_group_id] = og.id;
        }
      });

      // Get all flavor prices for all sizes
      let allFlavorPrices: any[] = [];
      if (flavorGroupIds.length > 0) {
        const { data: flavorsInGroups } = await supabase
          .from('flavors')
          .select('id, flavor_group_id')
          .in('flavor_group_id', flavorGroupIds)
          .eq('active', true);

        const flavorIds = (flavorsInGroups || []).map((f: any) => f.id);

        if (flavorIds.length > 0) {
          const { data: flavorPrices } = await supabase
            .from('flavor_prices')
            .select('flavor_id, price_full, size_name')
            .in('flavor_id', flavorIds);

          // Map flavor_id to flavor_group_id
          const flavorToGroup: Record<string, string> = {};
          (flavorsInGroups || []).forEach((f: any) => {
            flavorToGroup[f.id] = f.flavor_group_id;
          });

          allFlavorPrices = (flavorPrices || []).map((fp: any) => ({
            ...fp,
            flavor_group_id: flavorToGroup[fp.flavor_id],
          }));
        }
      }

      const itemGroupIds = (optionalGroups || [])
        .filter((og: any) => og.source_type !== 'flavors')
        .map((og: any) => og.id);

      const minItemPricesByGroup: Record<string, number> = {};
      if (itemGroupIds.length > 0) {
        const { data: optionalItems } = await supabase
          .from('optional_group_items')
          .select('optional_group_id, price_delta, price_override')
          .in('optional_group_id', itemGroupIds)
          .eq('active', true);

        (optionalItems || []).forEach((item: any) => {
          const price = Number(item.price_override ?? item.price_delta) || 0;
          if (price <= 0) return;
          if (!minItemPricesByGroup[item.optional_group_id] || price < minItemPricesByGroup[item.optional_group_id]) {
            minItemPricesByGroup[item.optional_group_id] = price;
          }
        });
      }

      // For each product, calculate min price based on its size.
      // IMPORTANT: if the product has flavor-based groups (pizza flavors), we prioritize the minimum flavor price
      // (base price) over any add-on optional items (e.g. refrigerante, borda, extra) so we don't show "A partir de R$ 6,00".
      const productFlavorMinPrices: Record<string, number> = {};
      const productItemMinPrices: Record<string, number> = {};

      (productOptionalLinks || []).forEach((pog: any) => {
        const product = products.find(p => p.id === pog.product_id);
        if (!product || Number(product.price) !== 0) return;

        const optGroup = (optionalGroups || []).find((og: any) => og.id === pog.optional_group_id);
        if (!optGroup) return;

        if (optGroup.source_type === 'flavors' && optGroup.flavor_group_id) {
          const sizeName = extractSizeFromProductName(product.name);
          const relevantPrices = allFlavorPrices.filter(
            (fp: any) => fp.flavor_group_id === optGroup.flavor_group_id && fp.size_name === sizeName
          );

          const validPrices = relevantPrices.filter((fp: any) => Number(fp.price_full) > 0);
          if (validPrices.length > 0) {
            const minFlavorPrice = Math.min(...validPrices.map((fp: any) => Number(fp.price_full)));
            if (!productFlavorMinPrices[pog.product_id] || minFlavorPrice < productFlavorMinPrices[pog.product_id]) {
              productFlavorMinPrices[pog.product_id] = minFlavorPrice;
            }
          }

          return;
        }

        const itemMin = minItemPricesByGroup[optGroup.id] || 0;
        if (itemMin > 0) {
          if (!productItemMinPrices[pog.product_id] || itemMin < productItemMinPrices[pog.product_id]) {
            productItemMinPrices[pog.product_id] = itemMin;
          }
        }
      });

      // Final price: prefer flavors (pizza base) if present, otherwise fall back to item-based groups.
      Object.keys({ ...productFlavorMinPrices, ...productItemMinPrices }).forEach((productId) => {
        productMinPrices[productId] = productFlavorMinPrices[productId] || productItemMinPrices[productId];
      });

      return productMinPrices;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePriceChange = (value: string, field: 'price' | 'salePrice') => {
    const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
    setForm(prev => ({ ...prev, [field]: cleanValue }));
  };

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingProduct(null);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      // Cast to access new columns not in types yet
      const p = product as Product & { 
        production_weight?: number; 
        production_station?: string;
        ean_code?: string;
        internal_code?: string;
        ncm_code?: string;
        tax_status?: 'tributado' | 'nao_tributado' | 'servico' | 'isento';
        is_weighted?: boolean;
        unit_id?: string;
      };
      setForm({
        name: product.name,
        title: product.title || '',
        description: product.description || '',
        composition: product.composition || '',
        subcategoryId: product.subcategory_id,
        price: product.price.toString().replace('.', ','),
        active: product.active,
        visibility: {
          aparece_delivery: product.aparece_delivery ?? true,
          aparece_garcom: (product as any).aparece_garcom ?? true,
          aparece_totem: (product as any).aparece_totem ?? true,
          aparece_tablet: (product as any).aparece_tablet ?? true,
          aparece_mesa: (product as any).aparece_mesa ?? true,
          aparece_comanda: (product as any).aparece_comanda ?? true,
          aparece_tv: product.aparece_tv ?? true,
          aparece_selfservice: (product as any).aparece_selfservice ?? true,
        },
        imageUrl: product.image_url || '',
        isOnSale: product.is_on_sale || false,
        salePrice: product.sale_price?.toString().replace('.', ',') || '',
        saleHours: product.sale_hours || [],
        isFeatured: product.is_featured || false,
        productionWeight: (p.production_weight ?? 1.0).toString(),
        productionStation: p.production_station || '',
        eanCode: p.ean_code || '',
        internalCode: p.internal_code || '',
        ncmCode: p.ncm_code || '',
        taxStatus: p.tax_status || 'tributado',
        isWeighted: p.is_weighted || false,
        geraComissao: (product as any).gera_comissao ?? true,
        unitId: p.unit_id || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleVisibilityChange = (key: VisibilityKey, checked: boolean) => {
    setForm(prev => ({ 
      ...prev, 
      visibility: { ...prev.visibility, [key]: checked } 
    }));
  };

  const handleSaleHoursChange = (value: string) => {
    const hours = value.split(',').map(h => h.trim()).filter(h => h);
    setForm(prev => ({ ...prev, saleHours: hours }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    setUploading(true);
    try {
      const url = await uploadImage.mutateAsync({ file, companyId: company.id });
      setForm(prev => ({ ...prev, imageUrl: url }));
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNumber = parseFloat(form.price.replace(',', '.')) || 0;
    const salePriceNumber = form.salePrice ? parseFloat(form.salePrice.replace(',', '.')) : null;
    
    const validation = productSchema.safeParse({ 
      name: form.name, 
      subcategory_id: form.subcategoryId,
      price: priceNumber 
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      const productionWeightNum = parseFloat(form.productionWeight.replace(',', '.')) || 1.0;
      
      const productData = {
        name: form.name,
        title: form.title || null,
        description: form.description || null,
        composition: form.composition || null,
        subcategory_id: form.subcategoryId,
        price: priceNumber,
        active: form.active,
        ...form.visibility,
        // print_sector_id removido - agora centralizado em Configurações > Impressão
        image_url: form.imageUrl || null,
        is_on_sale: form.isOnSale,
        sale_price: salePriceNumber,
        sale_hours: form.saleHours.length > 0 ? form.saleHours : null,
        is_featured: form.isFeatured,
        production_weight: productionWeightNum,
        production_station: form.productionStation || null,
        ean_code: form.eanCode || null,
        internal_code: form.internalCode || null,
        ncm_code: form.ncmCode || null,
        tax_status: form.taxStatus,
        is_weighted: form.isWeighted,
        gera_comissao: form.geraComissao,
        unit_id: form.unitId || null,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({ 
          id: editingProduct.id, 
          ...productData,
        });
        toast.success('Produto atualizado!');
      } else {
        await createProduct.mutateAsync(productData);
        toast.success('Produto criado!');
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, active: !product.active });
      toast.success(product.active ? 'Produto desativado' : 'Produto ativado');
    } catch (error) {
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Produto excluído!');
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const getActiveVisibilityCount = (product: Product) => {
    return visibilityOptions.filter(opt => product[opt.key]).length;
  };

  const productGroups = groups.filter(g => g.product_id === selectedProductId);

  const handleCreateGroup = async () => {
    if (!selectedProductId || !company?.id || !newGroupForm.name) return;

    try {
      await createGroup.mutateAsync({
        company_id: company.id,
        product_id: selectedProductId,
        ...newGroupForm,
        active: true,
        sort_order: groups.filter(g => g.product_id === selectedProductId).length,
      });
      setNewGroupForm({ name: '', min_select: 0, max_select: 1, required: false, type: 'single', calc_mode: 'sum_each_part' });
      toast.success('Grupo de opcionais criado!');
    } catch (error) {
      toast.error('Erro ao criar grupo');
    }
  };

  const handleCreateItem = async (groupId: string) => {
    if (!company?.id || !newItemForm.label) return;

    try {
      const group = groups.find(g => g.id === groupId);
      await createItem.mutateAsync({
        company_id: company.id,
        group_id: groupId,
        label: newItemForm.label,
        price_delta: newItemForm.price_delta,
        active: true,
        sort_order: group?.items?.length || 0,
      });
      setNewItemForm({ label: '', price_delta: 0 });
      toast.success('Opção adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar opção');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Produtos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Produtos">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro para gerenciar produtos.
            </p>
            <Button onClick={() => navigate('/company')}>
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!activeSubcategories || activeSubcategories.length === 0) {
    return (
      <DashboardLayout title="Produtos">
        <Card className="max-w-lg mx-auto border-info/30 bg-info/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Layers className="w-5 h-5 text-info" />
              Nenhuma subcategoria ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Cadastre pelo menos uma subcategoria ativa para criar produtos.
            </p>
            <Button onClick={() => navigate('/subcategories')}>
              Gerenciar subcategorias
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Produtos">
      <div className="space-y-6 animate-fade-in">
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'products' | 'options')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="options" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Opcionais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card className="border-border/50 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Produtos</CardTitle>
                    <CardDescription>
                      {filteredProducts?.length || 0} produto(s) {filterSubcategory !== 'all' ? 'nesta subcategoria' : 'cadastrado(s)'}
                    </CardDescription>
                  </div>
                </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={filterSubcategory} onValueChange={setFilterSubcategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas subcategorias</SelectItem>
                  {activeSubcategories?.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.category?.name} → {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingProduct ? 'Atualize os dados do produto' : 'Preencha os dados para criar um novo produto'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <Tabs defaultValue="info" className="w-full">
                        <TabsList className={cn("grid w-full mb-4", isCurrentProductPizza ? "grid-cols-9" : "grid-cols-8")}>
                          <TabsTrigger value="info">Info</TabsTrigger>
                          <TabsTrigger value="details">Detalhes</TabsTrigger>
                          <TabsTrigger value="fiscal">
                            <FileText className="w-3 h-3 mr-1" />
                            Fiscal
                          </TabsTrigger>
                          <TabsTrigger value="pricing">Preços</TabsTrigger>
                          <TabsTrigger value="visibility">Canais</TabsTrigger>
                          {isCurrentProductPizza && (
                            <TabsTrigger value="pizza" disabled={!editingProduct}>
                              <Pizza className="w-3 h-3 mr-1" />
                              Pizza
                            </TabsTrigger>
                          )}
                          <TabsTrigger value="loyalty" disabled={!editingProduct}>
                            <Gift className="w-3 h-3 mr-1" />
                            Fidelidade
                          </TabsTrigger>
                          <TabsTrigger value="sommelier" disabled={!editingProduct}>
                            <Wine className="w-3 h-3 mr-1" />
                            Enólogo
                          </TabsTrigger>
                          <TabsTrigger value="optionals" disabled={!editingProduct}>
                            <ListChecks className="w-3 h-3 mr-1" />
                            Opcionais
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="subcategory">Subcategoria</Label>
                            <Select value={form.subcategoryId} onValueChange={(v) => setForm(prev => ({ ...prev, subcategoryId: v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a subcategoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeSubcategories?.map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    {sub.category?.name} → {sub.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="name">Nome (interno)</Label>
                            <Input
                              id="name"
                              value={form.name}
                              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Ex: Coca-Cola 350ml"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="title">Título (exibido ao cliente)</Label>
                            <Input
                              id="title"
                              value={form.title}
                              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Ex: Coca-Cola Gelada 350ml"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="unit">Unidade de Medida</Label>
                            <Select value={form.unitId || "none"} onValueChange={(v) => setForm(prev => ({ ...prev, unitId: v === "none" ? "" : v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhuma</SelectItem>
                                {units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.symbol})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Ex: Quilograma, Litro, Unidade
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Imagem do Produto</Label>
                            <div className="flex items-center gap-4">
                              {form.imageUrl && (
                                <img src={form.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                              )}
                              <div className="flex-1">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={uploading}
                                  className="w-full"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  {uploading ? 'Enviando...' : 'Escolher Imagem'}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">Ativo</p>
                              <p className="text-sm text-muted-foreground">Produto disponível para venda</p>
                            </div>
                            <Switch
                              checked={form.active}
                              onCheckedChange={(v) => setForm(prev => ({ ...prev, active: v }))}
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-warning" />
                              <div>
                                <p className="font-medium">Destaque</p>
                                <p className="text-sm text-muted-foreground">Produto em destaque no cardápio</p>
                              </div>
                            </div>
                            <Switch
                              checked={form.isFeatured}
                              onCheckedChange={(v) => setForm(prev => ({ ...prev, isFeatured: v }))}
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-l-4 border-l-success">
                            <div className="flex items-center gap-2">
                              <Percent className="w-4 h-4 text-success" />
                              <div>
                                <p className="font-medium">Gera Comissão</p>
                                <p className="text-sm text-muted-foreground">Este produto compõe a comissão dos garçons/operadores</p>
                              </div>
                            </div>
                            <Switch
                              checked={form.geraComissao}
                              onCheckedChange={(v) => setForm(prev => ({ ...prev, geraComissao: v }))}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="details" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                              id="description"
                              value={form.description}
                              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Descrição detalhada do produto..."
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="composition">Composição / Ingredientes</Label>
                            <Textarea
                              id="composition"
                              value={form.composition}
                              onChange={(e) => setForm(prev => ({ ...prev, composition: e.target.value }))}
                              placeholder="Lista de ingredientes ou composição do produto..."
                              rows={3}
                            />
                          </div>
                          {/* Setor de Impressão removido - agora centralizado em Configurações > Impressão */}
                          <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-border/50">
                            <h4 className="font-medium flex items-center gap-2">
                              <Gauge className="w-4 h-4 text-primary" />
                              Produção / Cozinha
                            </h4>
                            
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="productionWeight" className="flex items-center gap-2">
                                  <Weight className="w-3 h-3" />
                                  Peso de Produção
                                </Label>
                                <Input
                                  id="productionWeight"
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={form.productionWeight}
                                  onChange={(e) => setForm(prev => ({ ...prev, productionWeight: e.target.value }))}
                                  placeholder="1.0"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Complexidade do preparo. Ex: Pizza=2.0, Bebida=0.2
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Estação de Preparo</Label>
                                <Select 
                                  value={form.productionStation || "none"} 
                                  onValueChange={(v) => setForm(prev => ({ ...prev, productionStation: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a estação" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRODUCTION_STATIONS.map((station) => (
                                      <SelectItem key={station.value || 'none'} value={station.value || 'none'}>
                                        {station.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Onde o produto é preparado (opcional)
                                </p>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-border/50">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                                <div className="flex items-center gap-3">
                                  <Scale className="w-5 h-5 text-amber-600" />
                                  <div>
                                    <Label htmlFor="isWeighted" className="text-sm font-medium cursor-pointer">
                                      Produto Pesado (Balança)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Captura peso automaticamente da balança no PDV
                                    </p>
                                  </div>
                                </div>
                                <Switch
                                  id="isWeighted"
                                  checked={form.isWeighted}
                                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, isWeighted: checked }))}
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="fiscal" className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                            <h4 className="font-medium flex items-center gap-2 mb-4">
                              <Barcode className="w-4 h-4 text-primary" />
                              Códigos e Classificação Fiscal
                            </h4>
                            
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="eanCode">Código EAN (Barras)</Label>
                                <Input
                                  id="eanCode"
                                  value={form.eanCode}
                                  onChange={(e) => setForm(prev => ({ ...prev, eanCode: e.target.value }))}
                                  placeholder="7891234567890"
                                  maxLength={14}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Código de barras do produto (13 dígitos)
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="internalCode">Código Interno</Label>
                                <Input
                                  id="internalCode"
                                  value={form.internalCode}
                                  onChange={(e) => setForm(prev => ({ ...prev, internalCode: e.target.value }))}
                                  placeholder="PROD-001"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Código interno da empresa
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="ncmCode">Código NCM (Fiscal)</Label>
                                <Input
                                  id="ncmCode"
                                  value={form.ncmCode}
                                  onChange={(e) => setForm(prev => ({ ...prev, ncmCode: e.target.value }))}
                                  placeholder="2106.90.10"
                                  maxLength={10}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Nomenclatura Comum do Mercosul
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Status Tributário</Label>
                                <Select 
                                  value={form.taxStatus} 
                                  onValueChange={(v) => setForm(prev => ({ ...prev, taxStatus: v as ProductFormState['taxStatus'] }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TAX_STATUS_OPTIONS.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Classificação fiscal do produto
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="pricing" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="price">Preço Normal</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                              <Input
                                id="price"
                                value={form.price}
                                onChange={(e) => handlePriceChange(e.target.value, 'price')}
                                placeholder="0,00"
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-destructive" />
                              <div>
                                <p className="font-medium">Produto em Oferta</p>
                                <p className="text-sm text-muted-foreground">Ativar preço promocional</p>
                              </div>
                            </div>
                            <Switch
                              checked={form.isOnSale}
                              onCheckedChange={(v) => setForm(prev => ({ ...prev, isOnSale: v }))}
                            />
                          </div>

                          {form.isOnSale && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="salePrice">Preço Promocional</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                  <Input
                                    id="salePrice"
                                    value={form.salePrice}
                                    onChange={(e) => handlePriceChange(e.target.value, 'salePrice')}
                                    placeholder="0,00"
                                    className="pl-10"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="saleHours" className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Horários da Promoção (Happy Hour)
                                </Label>
                                <Input
                                  id="saleHours"
                                  value={form.saleHours.join(', ')}
                                  onChange={(e) => handleSaleHoursChange(e.target.value)}
                                  placeholder="Ex: 18:00-20:00, 22:00-00:00"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Separe múltiplos horários por vírgula. Deixe vazio para promoção o dia todo.
                                </p>
                              </div>
                            </>
                          )}
                        </TabsContent>

                        <TabsContent value="visibility" className="space-y-3">
                          <p className="text-sm text-muted-foreground mb-4">
                            Defina onde este produto aparecerá
                          </p>
                          {visibilityOptions.map((option) => (
                            <div 
                              key={option.key} 
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <option.icon className="w-5 h-5 text-muted-foreground" />
                                <span className="font-medium">{option.label}</span>
                              </div>
                              <Switch
                                checked={form.visibility[option.key]}
                                onCheckedChange={(checked) => handleVisibilityChange(option.key, checked)}
                              />
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="loyalty" className="space-y-4">
                          {editingProduct ? (
                            <ProductLoyaltyPointsTab 
                              productId={editingProduct.id} 
                              productName={editingProduct.title || editingProduct.name}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">Salve o produto para configurar pontos de fidelidade.</p>
                          )}
                        </TabsContent>

                        <TabsContent value="sommelier" className="space-y-4">
                          {editingProduct ? (
                            <ProductSommelierTagsTab 
                              productId={editingProduct.id} 
                              productName={editingProduct.name}
                              productDescription={editingProduct.description}
                              categoryName={editingProduct.subcategory?.category?.name || editingProduct.subcategory?.name}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">Salve o produto para configurar tags do Enólogo.</p>
                          )}
                        </TabsContent>

                        <TabsContent value="optionals" className="space-y-4">
                          {editingProduct && (
                            <ProductOptionalsTab 
                              productId={editingProduct.id} 
                              productName={editingProduct.title || editingProduct.name} 
                            />
                          )}
                        </TabsContent>

                        {isCurrentProductPizza && (
                          <TabsContent value="pizza" className="space-y-4">
                            {editingProduct ? (
                              <PizzaConfigTabV3 
                                productId={editingProduct.id} 
                                productName={editingProduct.title || editingProduct.name}
                                companyId={company?.id || ''}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">Salve o produto para configurar opções de pizza.</p>
                            )}
                          </TabsContent>
                        )}
                      </Tabs>

                      <div className="flex gap-2 pt-6">
                        <Button 
                          type="submit" 
                          disabled={createProduct.isPending || updateProduct.isPending}
                          className="flex-1"
                        >
                          {(createProduct.isPending || updateProduct.isPending) ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {filteredProducts && filteredProducts.length > 0 ? (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${product.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{product.title || product.name}</p>
                          {product.is_featured && <Star className="w-4 h-4 text-warning shrink-0" />}
                          {product.is_on_sale && <Tag className="w-4 h-4 text-destructive shrink-0" />}
                          {(product as any).gera_comissao === false && (
                            <Badge variant="outline" className="text-xs border-muted-foreground/50 text-muted-foreground">
                              <Percent className="w-3 h-3 mr-1" />
                              Sem comissão
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-muted-foreground">
                            {product.subcategory?.category?.name} → {product.subcategory?.name}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {getActiveVisibilityCount(product)}/{visibilityOptions.length} canais
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {product.is_on_sale && product.sale_price ? (
                          <>
                            <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                            <p className="font-semibold text-destructive">{formatCurrency(product.sale_price)}</p>
                          </>
                        ) : Number(product.price) === 0 && startingPricesByProduct[product.id] ? (
                          <p className="font-semibold text-primary">A partir de {formatCurrency(startingPricesByProduct[product.id])}</p>
                        ) : (
                          <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {product.active ? 'Ativo' : 'Inativo'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pizza ingredients button removed - ingredient editing is now in customer-facing pizza configurator */}

                        {isAdmin && (
                          <>
                            <Switch
                              checked={product.active}
                              onCheckedChange={() => handleToggleActive(product)}
                              disabled={updateProduct.isPending}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(product)}
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
                                <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O produto "{product.name}" será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id)}
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
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum produto cadastrado</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => handleOpenDialog()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeiro produto
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab Opcionais */}
      <TabsContent value="options">
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Settings2 className="w-5 h-5 text-primary" />
              Opcionais e Modificadores
            </CardTitle>
            <CardDescription>Configure grupos de opcionais para seus produtos (ex: Escolha a carne, Adicionais)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione um produto</Label>
                <Select value={selectedProductId || ''} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProductId && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Grupos de Opcionais</h4>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Grupo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Grupo de Opcionais</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nome do Grupo</Label>
                            <Input
                              value={newGroupForm.name}
                              onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })}
                              placeholder="Ex: Escolha a carne"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Mínimo</Label>
                              <Input
                                type="number"
                                min={0}
                                value={newGroupForm.min_select}
                                onChange={(e) => setNewGroupForm({ ...newGroupForm, min_select: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Máximo</Label>
                              <Input
                                type="number"
                                min={1}
                                value={newGroupForm.max_select}
                                onChange={(e) => setNewGroupForm({ ...newGroupForm, max_select: parseInt(e.target.value) || 1 })}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Obrigatório</Label>
                            <Switch
                              checked={newGroupForm.required}
                              onCheckedChange={(v) => setNewGroupForm({ ...newGroupForm, required: v })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de Seleção</Label>
                            <Select
                              value={newGroupForm.type}
                              onValueChange={(v: 'single' | 'multiple') => setNewGroupForm({ ...newGroupForm, type: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Única (radio)</SelectItem>
                                <SelectItem value="multiple">Múltipla (checkbox)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Cálculo Pizza</Label>
                            <Select
                              value={newGroupForm.calc_mode}
                              onValueChange={(v: OptionalCalcMode) => setNewGroupForm({ ...newGroupForm, calc_mode: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CALC_MODE_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Modo de cálculo para pizzas com múltiplos sabores
                            </p>
                          </div>
                          <Button onClick={handleCreateGroup} disabled={!newGroupForm.name}>
                            Criar Grupo
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {productGroups.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum grupo de opcionais para este produto</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {productGroups.map((group) => (
                          <div key={group.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium">{group.name}</h5>
                                <p className="text-sm text-muted-foreground">
                                  {group.required ? 'Obrigatório' : 'Opcional'} • 
                                  Min: {group.min_select} • Max: {group.max_select} • 
                                  {group.type === 'single' ? 'Única' : 'Múltipla'}
                                  {group.calc_mode && group.calc_mode !== 'sum_each_part' && (
                                    <> • {CALC_MODE_LABELS[group.calc_mode as OptionalCalcMode]?.split(' ')[0] || group.calc_mode}</>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={group.active}
                                  onCheckedChange={(v) => updateGroup.mutate({ id: group.id, active: v })}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Excluir grupo?')) deleteGroup.mutate(group.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="pl-4 space-y-2">
                              {group.items?.map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-1 border-b last:border-0">
                                  <span>{item.label}</span>
                                  <div className="flex items-center gap-2">
                                    {item.price_delta > 0 && (
                                      <Badge variant="secondary">+R$ {item.price_delta.toFixed(2)}</Badge>
                                    )}
                                    <Switch
                                      checked={item.active}
                                      onCheckedChange={(v) => updateItem.mutate({ id: item.id, active: v })}
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        if (confirm('Excluir opção?')) deleteItem.mutate(item.id);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}

                              {/* Add item form */}
                              <div className="flex items-center gap-2 pt-2">
                                <Input
                                  placeholder="Nova opção"
                                  value={editingGroupId === group.id ? newItemForm.label : ''}
                                  onChange={(e) => {
                                    setEditingGroupId(group.id);
                                    setNewItemForm({ ...newItemForm, label: e.target.value });
                                  }}
                                  onFocus={() => setEditingGroupId(group.id)}
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  placeholder="+R$"
                                  value={editingGroupId === group.id ? newItemForm.price_delta : ''}
                                  onChange={(e) => {
                                    setEditingGroupId(group.id);
                                    setNewItemForm({ ...newItemForm, price_delta: parseFloat(e.target.value) || 0 });
                                  }}
                                  onFocus={() => setEditingGroupId(group.id)}
                                  className="w-24"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleCreateItem(group.id)}
                                  disabled={editingGroupId !== group.id || !newItemForm.label}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      {/* Pizza Ingredients Dialog removed - ingredient editing is now in customer-facing pizza configurator */}
      </div>
    </DashboardLayout>
  );
}
