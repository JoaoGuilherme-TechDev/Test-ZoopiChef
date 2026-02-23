import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, MapPin, ArrowRightLeft, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import { CategorySubcategorySelector } from '../components/CategorySubcategorySelector';
import { ProductSelectionTable } from '../components/ProductSelectionTable';
import { BatchFieldsEditor } from '../components/BatchFieldsEditor';
import { BatchPreviewDialog } from '../components/BatchPreviewDialog';
import { BatchPriceEditor } from '../components/BatchPriceEditor';
import { BatchNeighborhoodEditor } from '../components/BatchNeighborhoodEditor';
import { BatchMoveProducts } from '../components/BatchMoveProducts';
import { useBatchProducts, useBatchUpdateProducts } from '../hooks/useBatchOperations';
import type { BatchProductUpdate } from '../types';

export default function BatchOperationsPage() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  const [activeTab, setActiveTab] = useState('products');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [updateValues, setUpdateValues] = useState<BatchProductUpdate>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);

  const { data: products = [], isLoading } = useBatchProducts(
    categoryId || undefined, 
    subcategoryId || undefined
  );
  const batchUpdate = useBatchUpdateProducts();

  const handleFieldToggle = (key: string, enabled: boolean) => {
    setEnabledFields(prev => ({ ...prev, [key]: enabled }));
    if (!enabled) {
      setUpdateValues(prev => {
        const next = { ...prev };
        delete next[key as keyof BatchProductUpdate];
        return next;
      });
    }
  };

  const handleValueChange = (key: keyof BatchProductUpdate, value: any) => {
    setUpdateValues(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    const activeUpdates = Object.fromEntries(
      Object.entries(updateValues).filter(([key]) => enabledFields[key])
    ) as BatchProductUpdate;

    batchUpdate.mutate(
      { productIds: selectedProductIds, updates: activeUpdates },
      {
        onSuccess: () => {
          setShowPreview(false);
          setSelectedProductIds([]);
          setUpdateValues({});
          setEnabledFields({});
        },
      }
    );
  };

  const hasChanges = Object.values(enabledFields).some(Boolean) && selectedProductIds.length > 0;

  if (companyLoading) {
    return (
      <DashboardLayout title="Alterações em Lote">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Alterações em Lote">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro.
            </p>
            <Button onClick={() => navigate('/company')}>
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Alterações em Lote">
        <Card className="max-w-lg mx-auto border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Apenas administradores podem executar alterações em lote.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Alterações em Lote">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Altere múltiplos itens de uma vez: produtos, preços, bairros e subcategorias
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="h-4 w-4" />
              Bairros
            </TabsTrigger>
            <TabsTrigger value="move" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Mover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Alteração em Lote de Produtos
                </CardTitle>
                <CardDescription>
                  Selecione produtos por categoria/subcategoria e altere campos fiscais e operacionais (NCM, CFOP, CEST, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Seletor de categoria */}
                <CategorySubcategorySelector
                  categoryId={categoryId}
                  subcategoryId={subcategoryId}
                  onCategoryChange={setCategoryId}
                  onSubcategoryChange={setSubcategoryId}
                />

                {/* Tabela de produtos */}
                <ProductSelectionTable
                  products={products}
                  selectedIds={selectedProductIds}
                  onSelectionChange={setSelectedProductIds}
                  isLoading={isLoading}
                />

                {/* Editor de campos */}
                {selectedProductIds.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <h3 className="font-semibold">
                        Campos a alterar ({selectedProductIds.length} produtos selecionados)
                      </h3>
                    </div>

                    <BatchFieldsEditor
                      values={updateValues}
                      enabledFields={enabledFields}
                      onValueChange={handleValueChange}
                      onFieldToggle={handleFieldToggle}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedProductIds([]);
                          setUpdateValues({});
                          setEnabledFields({});
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => setShowPreview(true)}
                        disabled={!hasChanges}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Pré-visualizar Alterações
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prices" className="space-y-6">
            <BatchPriceEditor />
          </TabsContent>

          <TabsContent value="neighborhoods" className="space-y-6">
            <BatchNeighborhoodEditor />
          </TabsContent>

          <TabsContent value="move" className="space-y-6">
            <BatchMoveProducts />
          </TabsContent>
        </Tabs>

        <BatchPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          onConfirm={handleConfirm}
          isLoading={batchUpdate.isPending}
          productCount={selectedProductIds.length}
          updates={updateValues}
          enabledFields={enabledFields}
        />
      </div>
    </DashboardLayout>
  );
}
