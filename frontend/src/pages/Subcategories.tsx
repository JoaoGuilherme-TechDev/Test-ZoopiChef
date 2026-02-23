import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSubcategories, useCreateSubcategory, useUpdateSubcategory, useDeleteSubcategory, Subcategory } from '@/hooks/useSubcategories';
import { useActiveCategories } from '@/hooks/useCategories';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PRODUCTION_LOCATIONS } from '@/lib/productionLocations';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { Layers, Plus, Pencil, Trash2, Building2, Tags, ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const subcategorySchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
  category_id: z.string().min(1, 'Selecione uma categoria'),
});

export default function Subcategories() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { data: subcategories, isLoading: subcategoriesLoading } = useSubcategories();
  const { data: categories } = useActiveCategories();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productionLocation, setProductionLocation] = useState<string>('default');
  const [categoryType, setCategoryType] = useState<'alacart' | 'bebida' | 'inherit'>('inherit');
  const [active, setActive] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';
  const isLoading = companyLoading || subcategoriesLoading;

  const filteredSubcategories = subcategories?.filter(sub => 
    filterCategory === 'all' || sub.category_id === filterCategory
  );

  const resetForm = () => {
    setName('');
    setCategoryId('');
    setProductionLocation('default');
    setCategoryType('inherit');
    setActive(true);
    setEditingSubcategory(null);
    setImageUrl(null);
    setImageFile(null);
  };

  const handleOpenDialog = (subcategory?: Subcategory) => {
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setName(subcategory.name);
      setCategoryId(subcategory.category_id);
      setActive(subcategory.active);
      setProductionLocation(subcategory.production_location || 'default');
      setCategoryType(subcategory.category_type || 'inherit');
      setImageUrl(subcategory.image_url || null);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Imagem deve ter no máximo 2MB');
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (subcategoryId: string): Promise<string | null> => {
    if (!imageFile || !company?.id) return imageUrl;

    const fileExt = imageFile.name.split('.').pop();
    const filePath = `${company.id}/subcategories/${subcategoryId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, imageFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl + `?t=${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = subcategorySchema.safeParse({ name, category_id: categoryId });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsUploading(true);

    try {
      if (editingSubcategory) {
        let finalImageUrl = imageUrl;
        
        if (imageFile) {
          finalImageUrl = await uploadImage(editingSubcategory.id);
        }

        await updateSubcategory.mutateAsync({
          id: editingSubcategory.id,
          name,
          category_id: categoryId,
          active,
          production_location: productionLocation === 'default' ? null : productionLocation,
          category_type: categoryType === 'inherit' ? null : categoryType,
          image_url: finalImageUrl,
        });
        toast.success('Subcategoria atualizada!');
      } else {
        const result = await createSubcategory.mutateAsync({
          name,
          category_id: categoryId,
          active,
          production_location: productionLocation === 'default' ? null : productionLocation,
          category_type: categoryType === 'inherit' ? null : categoryType,
        });

        if (imageFile && result?.id) {
          const uploadedUrl = await uploadImage(result.id);
          if (uploadedUrl) {
            await updateSubcategory.mutateAsync({
              id: result.id,
              image_url: uploadedUrl,
            });
          }
        }

        toast.success('Subcategoria criada!');
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error('Erro ao salvar subcategoria');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (subcategory: Subcategory) => {
    try {
      await updateSubcategory.mutateAsync({ id: subcategory.id, active: !subcategory.active });
      toast.success(subcategory.active ? 'Subcategoria desativada' : 'Subcategoria ativada');
    } catch (error) {
      toast.error('Erro ao atualizar subcategoria');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubcategory.mutateAsync(id);
      toast.success('Subcategoria excluída!');
    } catch (error) {
      toast.error('Erro ao excluir subcategoria');
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Subcategorias">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Subcategorias">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro para gerenciar subcategorias.
            </p>
            <Button onClick={() => navigate('/company')}>
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <DashboardLayout title="Subcategorias">
        <Card className="max-w-lg mx-auto border-info/30 bg-info/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Tags className="w-5 h-5 text-info" />
              Nenhuma categoria ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Cadastre pelo menos uma categoria ativa para criar subcategorias.
            </p>
            <Button onClick={() => navigate('/categories')}>
              Gerenciar categorias
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Subcategorias">
      <div className="space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-accent" />
              </div>
              <div>
                <CardTitle className="font-display">Subcategorias</CardTitle>
                <CardDescription>
                  {filteredSubcategories?.length || 0} subcategoria(s) {filterCategory !== 'all' ? 'nesta categoria' : 'cadastrada(s)'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Subcategoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingSubcategory ? 'Atualize os dados da subcategoria' : 'Preencha os dados para criar uma nova subcategoria'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label>Imagem</Label>
                        <div className="flex items-center gap-4">
                          {imageUrl ? (
                            <div className="relative">
                              <img 
                                src={imageUrl} 
                                alt="Preview" 
                                className="w-20 h-20 rounded-lg object-cover border"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={removeImage}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Escolher Imagem
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">
                              Máximo 2MB
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Refrigerantes"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Local de produção</Label>
                        <Select value={productionLocation} onValueChange={setProductionLocation}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCTION_LOCATIONS.map((loc) => (
                              <SelectItem key={loc.value} value={loc.value}>
                                {loc.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo da subcategoria</Label>
                        <Select value={categoryType} onValueChange={(v) => setCategoryType(v as 'alacart' | 'bebida' | 'inherit')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">Herdar da categoria</SelectItem>
                            <SelectItem value="alacart">À la carte</SelectItem>
                            <SelectItem value="bebida">Bebida</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Se "Herdar", usa o tipo da categoria pai.
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Ativa</p>
                          <p className="text-sm text-muted-foreground">Subcategoria visível no sistema</p>
                        </div>
                        <Switch checked={active} onCheckedChange={setActive} />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          type="submit" 
                          disabled={createSubcategory.isPending || updateSubcategory.isPending || isUploading}
                          className="flex-1"
                        >
                          {(createSubcategory.isPending || updateSubcategory.isPending || isUploading) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {isUploading ? 'Enviando...' : 'Salvar'}
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
            {filteredSubcategories && filteredSubcategories.length > 0 ? (
              <div className="space-y-2">
                {filteredSubcategories.map((subcategory) => (
                  <div
                    key={subcategory.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {subcategory.image_url ? (
                        <img 
                          src={subcategory.image_url} 
                          alt={subcategory.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Layers className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className={`w-2 h-2 rounded-full ${subcategory.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="font-medium">{subcategory.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {subcategory.category?.name || 'Categoria'} • {subcategory.active ? 'Ativa' : 'Inativa'}
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={subcategory.active}
                          onCheckedChange={() => handleToggleActive(subcategory)}
                          disabled={updateSubcategory.isPending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(subcategory)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A subcategoria "{subcategory.name}" será excluída permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(subcategory.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Nenhuma subcategoria {filterCategory !== 'all' ? 'nesta categoria' : 'cadastrada'}</p>
                {isAdmin && (
                  <p className="text-sm">Clique em "Nova Subcategoria" para começar</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}