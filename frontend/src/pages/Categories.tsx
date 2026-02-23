import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from '@/hooks/useCategories';
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
import { Tags, Plus, Pencil, Trash2, Building2, ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
});

export default function Categories() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [productionLocation, setProductionLocation] = useState<string>('default');
  const [categoryType, setCategoryType] = useState<'alacart' | 'bebida'>('alacart');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';
  const isLoading = companyLoading || categoriesLoading;

  const resetForm = () => {
    setName('');
    setProductionLocation('default');
    setCategoryType('alacart');
    setActive(true);
    setEditingCategory(null);
    setImageUrl(null);
    setImageFile(null);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setActive(category.active);
      setProductionLocation(category.production_location || 'default');
      setCategoryType(category.category_type || 'alacart');
      setImageUrl(category.image_url || null);
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

  const uploadImage = async (categoryId: string): Promise<string | null> => {
    if (!imageFile || !company?.id) return imageUrl;

    const fileExt = imageFile.name.split('.').pop();
    const filePath = `${company.id}/categories/${categoryId}.${fileExt}`;

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

    const validation = categorySchema.safeParse({ name });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsUploading(true);

    try {
      if (editingCategory) {
        let finalImageUrl = imageUrl;
        
        if (imageFile) {
          finalImageUrl = await uploadImage(editingCategory.id);
        }

        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name,
          active,
          production_location: productionLocation === 'default' ? null : productionLocation,
          category_type: categoryType,
          image_url: finalImageUrl,
        });
        toast.success('Categoria atualizada!');
      } else {
        const result = await createCategory.mutateAsync({
          name,
          active,
          production_location: productionLocation === 'default' ? null : productionLocation,
          category_type: categoryType,
        });

        if (imageFile && result?.id) {
          const uploadedUrl = await uploadImage(result.id);
          if (uploadedUrl) {
            await updateCategory.mutateAsync({
              id: result.id,
              image_url: uploadedUrl,
            });
          }
        }

        toast.success('Categoria criada!');
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error('Erro ao salvar categoria');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory.mutateAsync({ id: category.id, active: !category.active });
      toast.success(category.active ? 'Categoria desativada' : 'Categoria ativada');
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Categoria excluída!');
    } catch (error) {
      toast.error('Erro ao excluir categoria');
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
      <DashboardLayout title="Categorias">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Categorias">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro para gerenciar categorias.
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
    <DashboardLayout title="Categorias">
      <div className="space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Tags className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Categorias</CardTitle>
                <CardDescription>
                  {categories?.length || 0} categoria(s) cadastrada(s)
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">
                      {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategory ? 'Atualize os dados da categoria' : 'Preencha os dados para criar uma nova categoria'}
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
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Bebidas"
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
                      <Label>Tipo da categoria</Label>
                      <Select value={categoryType} onValueChange={(v) => setCategoryType(v as 'alacart' | 'bebida')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alacart">À la carte</SelectItem>
                          <SelectItem value="bebida">Bebida</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Bebidas aparecem no menu de Rodízio. À la carte ficam ocultas.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Ativa</p>
                        <p className="text-sm text-muted-foreground">Categoria visível no sistema</p>
                      </div>
                      <Switch checked={active} onCheckedChange={setActive} />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="submit" 
                        disabled={createCategory.isPending || updateCategory.isPending || isUploading}
                        className="flex-1"
                      >
                        {(createCategory.isPending || updateCategory.isPending || isUploading) && (
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
          </CardHeader>

          <CardContent>
            {categories && categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Tags className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className={`w-2 h-2 rounded-full ${category.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.active ? 'Ativa' : 'Inativa'}
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.active}
                          onCheckedChange={() => handleToggleActive(category)}
                          disabled={updateCategory.isPending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(category)}
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
                              <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A categoria "{category.name}" será excluída permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(category.id)}
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
                <Tags className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Nenhuma categoria cadastrada</p>
                {isAdmin && (
                  <p className="text-sm">Clique em "Nova Categoria" para começar</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}