import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { useUploadLogo } from '@/hooks/useCompanySettings';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Palette, Upload, Save, Image as ImageIcon } from 'lucide-react';

export default function SettingsBranding() {
  const { data: company, isLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const updateCompany = useUpdateCompany();
  const uploadLogo = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  const handleEdit = () => {
    if (company) {
      setPrimaryColor((company as any).primary_color || '#6366f1');
      setSecondaryColor((company as any).secondary_color || '#8b5cf6');
      setBackgroundColor((company as any).background_color || '#ffffff');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!company) return;

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
      } as any);
      toast.success('Cores atualizadas!');
      setIsEditing(false);
    } catch {
      toast.error('Erro ao salvar cores');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadLogo.mutateAsync(file);
      toast.success('Logo atualizado!');
    } catch {
      toast.error('Erro ao fazer upload do logo');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Branding">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Branding">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Configure sua empresa primeiro.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Branding">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        {/* Logo */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Logo da Empresa</CardTitle>
                <CardDescription>Aparece no cardápio e páginas públicas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                {(company as any).logo_url ? (
                  <img 
                    src={(company as any).logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin || uploadLogo.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadLogo.isPending ? 'Enviando...' : 'Enviar Logo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG ou JPG, máximo 2MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cores */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Palette className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <CardTitle className="font-display">Cores do Tema</CardTitle>
                <CardDescription>Personalize as cores do seu cardápio</CardDescription>
              </div>
            </div>
            {isAdmin && !isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Cor Principal</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border" style={{ backgroundColor }}>
                  <p className="font-semibold" style={{ color: primaryColor }}>
                    Preview do Tema
                  </p>
                  <p className="text-sm" style={{ color: secondaryColor }}>
                    Texto secundário
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={updateCompany.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {updateCompany.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Principal</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: (company as any).primary_color || '#6366f1' }}
                    />
                    <span className="font-mono text-sm">{(company as any).primary_color || '#6366f1'}</span>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Secundária</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: (company as any).secondary_color || '#8b5cf6' }}
                    />
                    <span className="font-mono text-sm">{(company as any).secondary_color || '#8b5cf6'}</span>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Fundo</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: (company as any).background_color || '#ffffff' }}
                    />
                    <span className="font-mono text-sm">{(company as any).background_color || '#ffffff'}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
