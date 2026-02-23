import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany, useCreateCompany, useUpdateCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useTVScreens } from '@/hooks/useTVScreens';
import { getBestToken, useCompanyPublicLinks } from '@/hooks/useCompanyPublicLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Pencil, Save, X, MapPin, Phone, Volume2, Link2, Tv, Copy, ExternalLink, Gift, UserRoundCheck, Printer, Globe, LayoutGrid, FileText, MessageCircle, Ticket } from 'lucide-react';
import { ModulesConfig } from '@/components/company/ModulesConfig';
import { DailyMenuConfig } from '@/components/company/DailyMenuConfig';
import { TicketSystemConfig } from '@/components/company/TicketSystemConfig';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
  slug: z.string().min(2, 'O slug deve ter pelo menos 2 caracteres').max(50)
    .regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens'),
});

const settingsSchema = z.object({
  address: z.string().max(500).optional(),
  whatsapp: z.string().max(20).optional(),
});

// Helper component for link rows
function LinkRow({
  icon,
  label,
  path,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  path?: string;
  description: string;
}) {
  const fullUrl = path ? `${window.location.origin}${path}` : '';
  const disabled = !path;

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="font-medium">{label}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={disabled ? 'Token não gerado / link indisponível' : fullUrl}
          className="font-mono text-sm"
        />
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            navigator.clipboard.writeText(fullUrl);
            toast.success('Link copiado!');
          }}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => {
            if (!path) return;
            window.open(path, '_blank');
          }}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Company() {
  const { data: company, isLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { isSuperAdmin } = useUserRoles();
  const { tvScreens } = useTVScreens();
  const { data: publicLinks } = useCompanyPublicLinks();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  
  // Company info state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  
  // Settings state
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [orderSoundEnabled, setOrderSoundEnabled] = useState(true);
  
  // Print footer state
  const [printFooterSite, setPrintFooterSite] = useState('');
  const [printFooterPhone, setPrintFooterPhone] = useState('');
  
  // System footer state (exibido no rodapé do sistema)
  const [footerText, setFooterText] = useState('');
  const [supportPhone, setSupportPhone] = useState('');

  // Super admin tem acesso total, ou admin da empresa
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  const handleEdit = () => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
    }
    setIsEditing(true);
  };

  const handleEditSettings = () => {
    if (company) {
      setAddress(company.address || '');
      setWhatsapp(company.whatsapp || '');
      setOrderSoundEnabled(company.order_sound_enabled ?? true);
      setPrintFooterSite(company.print_footer_site || 'www.zoopi.app.br');
      setPrintFooterPhone(company.print_footer_phone || '(16) 98258.6199');
      // System footer
      setFooterText((company as any).footer_text || '');
      setSupportPhone((company as any).support_phone || '');
    }
    setIsEditingSettings(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setName('');
    setSlug('');
  };

  const handleCancelSettings = () => {
    setIsEditingSettings(false);
    setAddress('');
    setWhatsapp('');
    setOrderSoundEnabled(true);
    setPrintFooterSite('');
    setPrintFooterPhone('');
    setFooterText('');
    setSupportPhone('');
  };

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!company) {
      setSlug(generateSlug(value));
    }
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (value: string) => {
    setWhatsapp(formatWhatsApp(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = companySchema.safeParse({ name, slug });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      if (company) {
        await updateCompany.mutateAsync({ id: company.id, name, slug });
        toast.success('Empresa atualizada com sucesso!');
      } else {
        await createCompany.mutateAsync({ name, slug });
        toast.success('Empresa criada com sucesso!');
      }
      setIsEditing(false);
    } catch (error: any) {
      const msg = error?.message || 'Erro desconhecido';
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
        toast.error('Este slug já está em uso');
      } else if (msg.toLowerCase().includes('already has a company')) {
        toast.error('Você já possui uma empresa. Recarregue a página.');
      } else {
        toast.error(`Erro ao salvar empresa: ${msg}`);
      }
    }
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = settingsSchema.safeParse({ address, whatsapp });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      if (company) {
        console.log('[Company] Saving settings...', { 
          id: company.id, 
          address, 
          whatsapp, 
          orderSoundEnabled 
        });
        
        const result = await updateCompany.mutateAsync({ 
          id: company.id, 
          address: address || null,
          whatsapp: whatsapp || null,
          order_sound_enabled: orderSoundEnabled,
          print_footer_site: printFooterSite || 'www.zoopi.app.br',
          print_footer_phone: printFooterPhone || '(16) 98258.6199',
          footer_text: footerText.trim() || null,
          support_phone: supportPhone.trim() || null,
        });
        
        console.log('[Company] Settings saved successfully:', result);
        toast.success('Configurações atualizadas!');
        setIsEditingSettings(false);
      }
    } catch (error: any) {
      console.error('[Company] Error saving settings:', error);
      toast.error(`Erro ao salvar: ${error?.message || 'Tente novamente'}`);
    }
  };

  const handleToggleSound = async (enabled: boolean) => {
    if (!company || !isAdmin) return;
    
    try {
      await updateCompany.mutateAsync({ 
        id: company.id, 
        order_sound_enabled: enabled,
      });
      toast.success(enabled ? 'Som de pedido ativado' : 'Som de pedido desativado');
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Empresa">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Show create company form if no company exists
  if (!company) {
    return (
      <DashboardLayout title="Empresa">
        <div className="max-w-2xl animate-fade-in">
          <Card className="border-border/50 shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                  <Building2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="font-display">Criar Empresa</CardTitle>
                  <CardDescription>Configure sua empresa para começar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da empresa</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Minha Empresa Ltda"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador único)</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="minha-empresa"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para identificar sua empresa no sistema
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createCompany.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createCompany.isPending ? 'Salvando...' : 'Criar Empresa'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Empresa">
      <div className="max-w-3xl animate-fade-in">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="links">Links Públicos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="modules">
            <ModulesConfig />
          </TabsContent>

          <TabsContent value="info">
            <Card className="border-border/50 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                    <Building2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Dados da Empresa</CardTitle>
                    <CardDescription>Informações básicas</CardDescription>
                  </div>
                </div>
                {isAdmin && !isEditing && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </CardHeader>

              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da empresa</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Minha Empresa Ltda"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => setSlug(generateSlug(e.target.value))}
                        placeholder="minha-empresa"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateCompany.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateCompany.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Nome</p>
                        <p className="font-medium">{company.name}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Slug</p>
                        <p className="font-medium font-mono text-sm">{company.slug}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Criada em</p>
                      <p className="font-medium">
                        {new Date(company.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-6">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                      <Link2 className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <CardTitle className="font-display">Meus Links</CardTitle>
                      <CardDescription>Links públicos usando slug: /{company.slug}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => (window.location.href = '/meus-links')}>
                    Ver todos os links
                    <ExternalLink className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Links usando slug (novo formato padronizado) */}
                <LinkRow icon={<Link2 className="w-4 h-4 text-primary" />} label="Cardápio Delivery" path={`/${company.slug}/delivery`} description="Link para delivery via WhatsApp" />
                <LinkRow icon={<Globe className="w-4 h-4 text-primary" />} label="Cardápio Web" path={`/${company.slug}/web`} description="Link para divulgação em redes sociais" />
                <LinkRow icon={<Tv className="w-4 h-4 text-primary" />} label="TV / Menu Digital" path={`/${company.slug}/tv`} description="Link para exibição em TVs" />
                <LinkRow icon={<LayoutGrid className="w-4 h-4 text-primary" />} label="Autoatendimento" path={`/${company.slug}/autoatendimento`} description="Tablets de autoatendimento" />
                <LinkRow icon={<Gift className="w-4 h-4 text-primary" />} label="Roleta de Prêmios" path={`/${company.slug}/roleta`} description="Link para roleta de prêmios" />
                <LinkRow icon={<UserRoundCheck className="w-4 h-4 text-primary" />} label="App Garçom" path={`/${company.slug}/garcom`} description="Link para o app do garçom (celular/PWA)" />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display">Links por Token</CardTitle>
                <CardDescription>
                  Formato antigo/compatibilidade (ex.: /m/:token). Se aparecer “indisponível”, gere em “Meus Links”.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const menuToken = getBestToken(publicLinks, 'menu');
                  const tvToken = getBestToken(publicLinks, 'tv');
                  const roletaToken = getBestToken(publicLinks, 'roleta');
                  const kdsToken = getBestToken(publicLinks, 'kds');
                  const scaleToken = getBestToken(publicLinks, 'scale');

                  return (
                    <>
                      <LinkRow icon={<Link2 className="w-4 h-4 text-primary" />} label="Cardápio (token)" path={menuToken ? `/m/${menuToken}` : undefined} description="Link de cardápio por token (compatibilidade)" />
                      <LinkRow icon={<Tv className="w-4 h-4 text-primary" />} label="TV (token)" path={tvToken ? `/tv/${tvToken}` : undefined} description="Link da TV por token (compatibilidade)" />
                      <LinkRow icon={<Gift className="w-4 h-4 text-primary" />} label="Roleta (token)" path={roletaToken ? `/r/${roletaToken}` : undefined} description="Link da roleta por token (compatibilidade)" />
                      <LinkRow icon={<Printer className="w-4 h-4 text-primary" />} label="KDS (token)" path={kdsToken ? `/kds/${kdsToken}` : undefined} description="Link do KDS por token" />
                      <LinkRow icon={<LayoutGrid className="w-4 h-4 text-primary" />} label="Autoatendimento (token)" path={menuToken ? `/ss/${menuToken}` : undefined} description="Autoatendimento via token (usa o token do cardápio)" />
                      <LinkRow icon={<Link2 className="w-4 h-4 text-primary" />} label="Balança (token)" path={scaleToken ? `/balanca/${scaleToken}` : undefined} description="Terminal de balança por token" />
                      <LinkRow icon={<Tv className="w-4 h-4 text-primary" />} label="Painel de Chamada" path={tvToken ? `/painel-chamada/t/${tvToken}` : undefined} description="Painel estilo TV para chamar pedidos prontos" />
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Daily Menu Config */}
            {isAdmin && <DailyMenuConfig />}

            {/* Ticket System Config */}
            {isAdmin && <TicketSystemConfig />}

            {/* Settings Card */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-info" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Configurações Gerais</CardTitle>
                    <CardDescription>Endereço, contato e preferências</CardDescription>
                  </div>
                </div>
                {isAdmin && !isEditingSettings && (
                  <Button variant="outline" size="sm" onClick={handleEditSettings}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </CardHeader>

              <CardContent>
                {isEditingSettings ? (
                  <form onSubmit={handleSubmitSettings} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Endereço base
                      </Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua Example, 123 - Centro"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        WhatsApp
                      </Label>
                      <Input
                        id="whatsapp"
                        value={whatsapp}
                        onChange={(e) => handleWhatsAppChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        maxLength={16}
                      />
                    </div>

                    {/* Impressora removida - agora centralizado em Configurações > Impressão */}

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Som de pedido</p>
                          <p className="text-sm text-muted-foreground">Tocar som ao receber novo pedido</p>
                        </div>
                      </div>
                      <Switch
                        checked={orderSoundEnabled}
                        onCheckedChange={setOrderSoundEnabled}
                      />
                    </div>

                    {/* Print Footer Settings */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-muted-foreground" />
                        <Label className="font-medium">Rodapé das Impressões</Label>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="printFooterSite" className="flex items-center gap-2 text-sm">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            Site
                          </Label>
                          <Input
                            id="printFooterSite"
                            value={printFooterSite}
                            onChange={(e) => setPrintFooterSite(e.target.value)}
                            placeholder="www.seusite.com.br"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="printFooterPhone" className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            Telefone
                          </Label>
                          <Input
                            id="printFooterPhone"
                            value={printFooterPhone}
                            onChange={(e) => setPrintFooterPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estas informações aparecerão no rodapé de todos os tickets impressos
                      </p>
                    </div>

                    {/* System Footer Settings */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <Label className="font-medium">Rodapé do Sistema</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Exibido no rodapé de todos os apps (Web, Delivery, Totem, PDV, etc.)
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="footerText" className="text-sm">
                            Texto do Rodapé
                          </Label>
                          <Input
                            id="footerText"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder="Zoopi Tecnologia"
                          />
                          <p className="text-xs text-muted-foreground">
                            Se vazio, exibe "Zoopi Tecnologia – www.zoopi.app.br"
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supportPhone" className="flex items-center gap-2 text-sm">
                            <MessageCircle className="w-3 h-3 text-muted-foreground" />
                            Telefone de Suporte
                          </Label>
                          <Input
                            id="supportPhone"
                            value={supportPhone}
                            onChange={(e) => setSupportPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                          />
                          <p className="text-xs text-muted-foreground">
                            Será exibido como link para ligação e WhatsApp
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateCompany.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateCompany.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelSettings}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Endereço</p>
                        </div>
                        <p className="font-medium">{company.address || '—'}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">WhatsApp</p>
                        </div>
                        <p className="font-medium">{company.whatsapp || '—'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Som de pedido</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {company.order_sound_enabled ? 'Ativado' : 'Desativado'}
                        </p>
                        {isAdmin && (
                          <Switch
                            checked={company.order_sound_enabled ?? true}
                            onCheckedChange={handleToggleSound}
                            disabled={updateCompany.isPending}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Print Footer Display */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Printer className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Rodapé das Impressões</p>
                      </div>
                      <p className="font-medium text-sm">
                        {company.print_footer_site || 'www.zoopi.app.br'} / Tel {company.print_footer_phone || '(16) 98258.6199'}
                      </p>
                    </div>
                    
                    {/* System Footer Display */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Rodapé do Sistema</p>
                      </div>
                      <p className="font-medium text-sm">
                        {(company as any).footer_text || 'Zoopi Tecnologia'}
                        {(company as any).support_phone && ` • ${(company as any).support_phone}`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
