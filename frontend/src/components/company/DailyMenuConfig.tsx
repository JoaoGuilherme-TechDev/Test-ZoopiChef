import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { UtensilsCrossed, Save, Loader2 } from 'lucide-react';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

/**
 * DailyMenuConfig - Seção de configuração do "Menu do Dia" no painel admin.
 * Permite ativar/desativar, fazer upload de imagem ou inserir URL, e adicionar descrição.
 */
export function DailyMenuConfig() {
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();

  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [useUrlMode, setUseUrlMode] = useState(false);

  // Sync from company data
  useEffect(() => {
    if (company) {
      setEnabled((company as any).daily_menu_enabled ?? false);
      setImageUrl((company as any).daily_menu_image_url ?? '');
      setDescription((company as any).daily_menu_description ?? '');
      // Detect if user previously set a URL manually (not from storage)
      const url = (company as any).daily_menu_image_url ?? '';
      setUseUrlMode(url !== '' && !url.includes('supabase.co/storage'));
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        daily_menu_enabled: enabled,
        daily_menu_image_url: imageUrl.trim() || null,
        daily_menu_description: description.trim() || null,
      });
      toast.success('Menu do Dia atualizado!');
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error?.message || 'Tente novamente'}`);
    }
  };

  const handleImageUpload = (url: string | null) => {
    setImageUrl(url || '');
  };

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-display">Menu do Dia</CardTitle>
            <CardDescription>Exiba uma imagem do menu diário no Delivery</CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* Toggle: Upload vs URL */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium flex-1">Usar URL externa</Label>
            <Switch
              checked={useUrlMode}
              onCheckedChange={(checked) => {
                setUseUrlMode(checked);
                if (checked) setImageUrl('');
              }}
            />
          </div>

          {/* Image input */}
          {useUrlMode ? (
            <div className="space-y-2">
              <Label htmlFor="daily-menu-url">URL da imagem</Label>
              <Input
                id="daily-menu-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/menu-do-dia.jpg"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, WEBP. Máximo recomendado: 5MB
              </p>
              {imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border aspect-video relative bg-muted">
                  <img
                    src={imageUrl}
                    alt="Preview do Menu do Dia"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <ImageUpload
              value={imageUrl || null}
              onChange={handleImageUpload}
              bucket="rodizio-images"
              folder="daily-menu"
              label="Imagem do Menu do Dia"
              aspectRatio="video"
              maxSizeMB={5}
            />
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="daily-menu-desc">Descrição curta (opcional)</Label>
            <Input
              id="daily-menu-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Prato executivo especial de hoje!"
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground">
              Exibida abaixo do botão no delivery. Máx: 150 caracteres
            </p>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={updateCompany.isPending}
            className="w-full"
          >
            {updateCompany.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {updateCompany.isPending ? 'Salvando...' : 'Salvar Menu do Dia'}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
