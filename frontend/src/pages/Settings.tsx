import { useState, forwardRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useCompanyPublicLinks, getBestToken } from '@/hooks/useCompanyPublicLinks';
import { useTVScreens } from '@/hooks/useTVScreens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, User, Link2, Copy, ExternalLink, Tv, UserRoundCheck, Shield, Scale, Monitor, Smartphone } from 'lucide-react';
import { z } from 'zod';
import { DataExportLGPD } from '@/components/settings/DataExportLGPD';

const profileSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
});

interface LinkRowProps {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

const LinkRow = forwardRef<HTMLDivElement, LinkRowProps>(({ label, path, icon }, ref) => {
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}${path}`;

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copiado!');
  };

  const openLink = () => {
    window.open(fullUrl, '_blank');
  };

  return (
    <div ref={ref} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{path}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={openLink}>
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

LinkRow.displayName = 'LinkRow';

export default function Settings() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: publicLinks, isLoading: publicLinksLoading } = useCompanyPublicLinks();
  const { tvScreens } = useTVScreens();

  const [fullName, setFullName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const isLoadingLinks = publicLinksLoading;

  const handleEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = profileSchema.safeParse({ fullName });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      await updateProfile.mutateAsync({ full_name: fullName });
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Seu Perfil</CardTitle>
                <CardDescription>Gerencie suas informações pessoais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email || ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfile.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Nome</p>
                    <p className="font-medium">{profile?.full_name}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleEdit}>
                  Editar perfil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meus Links Section */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <Link2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Meus Links</CardTitle>
                <CardDescription>Links públicos da sua empresa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingLinks ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-muted rounded" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-3 bg-muted rounded w-32" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-muted rounded" />
                      <div className="w-8 h-8 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {publicLinks ? (
                  <>
                    <LinkRow 
                      label="Delivery" 
                      path={`/m/${getBestToken(publicLinks, 'menu')}`}
                    />
                    <LinkRow 
                      label="TV" 
                      path={`/tv/${getBestToken(publicLinks, 'tv')}`}
                    />
                    <LinkRow 
                      label="Roleta" 
                      path={`/r/${getBestToken(publicLinks, 'roleta')}`}
                    />
                    {getBestToken(publicLinks, 'menu') && (
                      <LinkRow 
                        label="Enólogo Virtual" 
                        path={`/enologo/${getBestToken(publicLinks, 'menu')}`}
                      />
                    )}
                    <LinkRow 
                      label="Self-Service (Balança)" 
                      path={`/ss/${getBestToken(publicLinks, 'menu')}`}
                      icon={<Scale className="w-4 h-4 text-muted-foreground" />}
                    />
                    <LinkRow 
                      label="Terminal Balança Automática" 
                      path={`/balanca/${getBestToken(publicLinks, 'menu')}`}
                      icon={<Scale className="w-4 h-4 text-muted-foreground" />}
                    />

                    {/* TV Screens */}
                    {tvScreens.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Tv className="w-4 h-4" />
                          Telas de TV
                        </p>
                        <div className="space-y-2">
                          {tvScreens.map((tv) => (
                            <LinkRow 
                              key={tv.id}
                              label={tv.name}
                              path={`/tv/${tv.token}`}
                              icon={<Tv className="w-4 h-4 text-muted-foreground" />}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhum link público disponível (empresa não configurada)
                  </p>
                )}

                {/* App Garçom: sempre fixo */}
                <LinkRow
                  label="App Garçom"
                  path="/waiter"
                  icon={<UserRoundCheck className="w-4 h-4 text-muted-foreground" />}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Preferências</CardTitle>
                <CardDescription>Configure suas preferências do sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/settings/sounds'}
            >
              <span className="mr-2">🔊</span>
              Configurações de Som
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/settings/printing'}
            >
              <span className="mr-2">🖨️</span>
              Configurações de Impressão
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/settings/branding'}
            >
              <span className="mr-2">🎨</span>
              Identidade Visual
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/settings/kiosk'}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Totem de Autoatendimento
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/settings/smartpos'}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Maquininhas Smart POS
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/settings/integrations'}
            >
              <span className="mr-2">🔗</span>
              Integrações (WhatsApp, Pix, etc)
            </Button>
          </CardContent>
        </Card>

        {/* LGPD Data Export */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Privacidade e Dados</CardTitle>
                <CardDescription>Exporte seus dados em conformidade com a LGPD</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Você pode exportar todos os dados da sua empresa a qualquer momento.
                Os dados são baixados em formato JSON compactado (ZIP).
              </p>
              <DataExportLGPD />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
