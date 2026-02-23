import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBanners, Banner } from '@/hooks/useBanners';
import { useTVScreens } from '@/hooks/useTVScreens';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Image, ExternalLink, Tv, Copy, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function Banners() {
  const { banners, isLoading, createBanner, updateBanner, deleteBanner, uploadBannerImage } = useBanners();
  const { tvScreens } = useTVScreens();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    tv_screen_id: '',
    description_font: 'Inter',
    description_color: '#FFFFFF'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FONT_OPTIONS = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Comic Sans MS', label: 'Comic Sans' },
  ];

  const tvLink = company?.slug ? `${window.location.origin}/tv/s/${company.slug}` : '';

  const resetForm = () => {
    setFormData({ 
      title: '', 
      description: '', 
      tv_screen_id: '',
      description_font: 'Inter',
      description_color: '#FFFFFF'
    });
    setEditingBanner(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.company_id) return;

    setUploading(true);
    try {
      const imageUrl = await uploadBannerImage(file, profile.company_id);
      await createBanner.mutateAsync({
        title: formData.title || undefined,
        description: formData.description || undefined,
        image_url: imageUrl,
        company_id: profile.company_id,
        tv_screen_id: formData.tv_screen_id || null,
        description_font: formData.description_font || 'Inter',
        description_color: formData.description_color || '#FFFFFF',
      } as any);
      toast.success('Banner adicionado com sucesso');
      resetForm();
      setIsCreateOpen(false);
    } catch {
      toast.error('Erro ao adicionar banner');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      description: banner.description || '',
      tv_screen_id: banner.tv_screen_id || '',
      description_font: banner.description_font || 'Inter',
      description_color: banner.description_color || '#FFFFFF',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBanner) return;
    try {
      await updateBanner.mutateAsync({
        id: editingBanner.id,
        title: formData.title || null,
        description: formData.description || null,
        tv_screen_id: formData.tv_screen_id || null,
        description_font: formData.description_font || 'Inter',
        description_color: formData.description_color || '#FFFFFF',
      } as any);
      toast.success('Banner atualizado');
      setIsEditOpen(false);
      resetForm();
    } catch {
      toast.error('Erro ao atualizar banner');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBanner.mutateAsync({
        id: banner.id,
        active: !banner.active,
      });
      toast.success(banner.active ? 'Banner desativado' : 'Banner ativado');
    } catch {
      toast.error('Erro ao atualizar banner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    try {
      await deleteBanner.mutateAsync(id);
      toast.success('Banner excluído com sucesso');
    } catch {
      toast.error('Erro ao excluir banner');
    }
  };

  const copyTVLink = () => {
    navigator.clipboard.writeText(tvLink);
    toast.success('Link copiado!');
  };

  const getTVName = (tvScreenId: string | null) => {
    if (!tvScreenId) return 'Todas as TVs';
    const tv = tvScreens.find(t => t.id === tvScreenId);
    return tv?.name || 'TV específica';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Banners TV</h1>
          <div className="flex gap-2">
            {tvLink && (
              <>
                <Button variant="outline" onClick={copyTVLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Link
                </Button>
                <Button variant="outline" asChild>
                  <a href={tvLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir TV Menu
                  </a>
                </Button>
              </>
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Banner
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Banner</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título (opcional)</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Título do banner"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição da Promoção</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Texto que aparecerá abaixo do banner na TV (com efeito de rolagem)"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fonte da Descrição</Label>
                      <Select
                        value={formData.description_font}
                        onValueChange={(v) => setFormData({ ...formData, description_font: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a fonte" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <span style={{ fontFamily: font.value }}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cor do Texto</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={formData.description_color}
                          onChange={(e) => setFormData({ ...formData, description_color: e.target.value })}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.description_color}
                          onChange={(e) => setFormData({ ...formData, description_color: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Exibir em</Label>
                    <Select
                      value={formData.tv_screen_id || 'all'}
                      onValueChange={(v) => setFormData({ ...formData, tv_screen_id: v === 'all' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as TVs (Global)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as TVs (Global)</SelectItem>
                        {tvScreens.map((tv) => (
                          <SelectItem key={tv.id} value={tv.id}>
                            {tv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Escolha uma TV específica ou deixe em branco para todas
                    </p>
                  </div>
                  <div>
                    <Label>Imagem</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Enviando...' : 'Escolher Imagem'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Banners Grid */}
        {isLoading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : banners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum banner cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione banners para exibir na TV
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner: any) => (
              <Card key={banner.id} className={!banner.active ? 'opacity-50' : ''}>
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{banner.title || 'Sem título'}</p>
                        {banner.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{banner.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Tv className="w-3 h-3 mr-1" />
                      {getTVName(banner.tv_screen_id)}
                    </Badge>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={banner.active}
                          onCheckedChange={() => handleToggleActive(banner)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(banner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do banner"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição da Promoção</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Texto que aparecerá abaixo do banner na TV (com efeito de rolagem)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fonte da Descrição</Label>
                <Select
                  value={formData.description_font}
                  onValueChange={(v) => setFormData({ ...formData, description_font: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor do Texto</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={formData.description_color}
                    onChange={(e) => setFormData({ ...formData, description_color: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.description_color}
                    onChange={(e) => setFormData({ ...formData, description_color: e.target.value })}
                    placeholder="#FFFFFF"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Exibir em</Label>
              <Select
                value={formData.tv_screen_id || 'all'}
                onValueChange={(v) => setFormData({ ...formData, tv_screen_id: v === 'all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as TVs (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as TVs (Global)</SelectItem>
                  {tvScreens.map((tv) => (
                    <SelectItem key={tv.id} value={tv.id}>
                      {tv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateBanner.isPending}>
                {updateBanner.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
