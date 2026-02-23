import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyPublicLinks, getBestToken } from '@/hooks/useCompanyPublicLinks';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase-shim';
import { useRegenerateToken, TokenType } from '@/hooks/useRegenerateToken';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Link2, Tv, Gift, Copy, ExternalLink, Loader2, RefreshCw, ChefHat, Bike, UserRoundCheck, Tablet, Monitor, Globe, Printer, Scale, Megaphone, Package, Star, Crown, Users } from 'lucide-react';
import { ReviewSettingsSection } from '@/components/reviews/ReviewSettingsSection';
import { UniversalQRCodeSection } from '@/components/links/UniversalQRCodeSection';

interface LinkCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  currentPath: string;
  tokenType: TokenType;
  onRegenerate: (tokenType: TokenType) => void;
  isRegenerating: boolean;
}

function LinkCard({ icon, iconBg, title, description, currentPath, tokenType, onRegenerate, isRegenerating }: LinkCardProps) {
  const isPathValid = (path: string) => {
    if (!path) return false;
    if (path.includes('undefined') || path.includes('null')) return false;
    if (path.endsWith('/')) return false;
    return true;
  };

  const isCurrentValid = isPathValid(currentPath);
  const fullUrl = `${window.location.origin}${currentPath}`;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  return (
    <Card className="border-border/50 shadow-soft hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerate(tokenType)}
                disabled={isRegenerating}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title="Regenerar token (invalida link atual)"
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  isCurrentValid
                    ? fullUrl
                    : `Token não gerado - gere/regenere os links públicos acima (${TOKEN_LABELS[tokenType]})`
                }
                className="font-mono text-sm bg-muted/50"
              />
              <Button
                variant="outline"
                size="icon"
                disabled={!isCurrentValid}
                onClick={() => {
                  if (!isCurrentValid) return;
                  handleCopy(fullUrl);
                }}
                title="Copiar link"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={!isCurrentValid}
                onClick={() => {
                  if (!isCurrentValid) return;
                  window.open(fullUrl, '_blank');
                }}
                title="Abrir em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PrintLinksSection() {
  const printingUrl = `${window.location.origin}/settings/printing`;
  const stationUrl = `${window.location.origin}/print-station`;

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  return (
    <Card className="border-border/50 shadow-soft border-2 border-accent/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Printer className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Impressão</CardTitle>
            <CardDescription>
              Links internos para configurar e rodar a estação de impressão (precisa login)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Central de Impressão (Configurações)</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={printingUrl} className="font-mono text-sm bg-muted/50" />
            <Button variant="outline" size="icon" onClick={() => copy(printingUrl)} title="Copiar link">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.open('/settings/printing', '_blank')} title="Abrir em nova aba">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Estação de Impressão</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={stationUrl} className="font-mono text-sm bg-muted/50" />
            <Button variant="outline" size="icon" onClick={() => copy(stationUrl)} title="Copiar link">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.open('/print-station', '_blank')} title="Abrir em nova aba">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💾 Para baixar o agente (Windows): abra a Central de Impressão e clique em <strong>Agente de Impressão → Baixar</strong>.
        </p>
      </CardContent>
    </Card>
  );
}

// Kiosk (Totem de Autoatendimento) Links Section
function KioskLinksSection() {
  const { data: company } = useCompany();
  
  // Fetch kiosk devices
  const { data: kioskDevices = [], isLoading } = useQuery({
    queryKey: ['kiosk_devices_links', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('id, name, device_code, is_active, access_token')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  if (isLoading) return null;
  if (kioskDevices.length === 0) {
    return (
      <Card className="border-border/50 shadow-soft border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Totem Autoatendimento (PWA)</CardTitle>
              <CardDescription>
                Nenhum totem configurado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Configure seus totens de autoatendimento para gerar os links de acesso.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/settings/kiosk'}>
            Configurar Totens
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-soft border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Totem Autoatendimento (PWA)</CardTitle>
            <CardDescription>
              Links para acesso aos totens ({kioskDevices.length} {kioskDevices.length === 1 ? 'ativo' : 'ativos'})
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Single slug-only URL for all totems */}
        {company?.slug && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Acesso por Slug</span>
              <Badge variant="secondary" className="text-xs">Recomendado</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={`${window.location.origin}/${company.slug}/totem`} 
                className="font-mono text-sm bg-muted/50" 
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${company.slug}/totem`);
                  toast.success('Link copiado!');
                }}
                title="Copiar link"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(`/${company.slug}/totem`, '_blank')}
                title="Abrir totem em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este link abrirá o totem diretamente. Se houver múltiplos totens, será mostrada uma tela de seleção.
            </p>
          </div>
        )}

        {/* List of configured devices (informational) */}
        {kioskDevices.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Totens configurados ({kioskDevices.length}):</p>
            <div className="flex flex-wrap gap-2">
              {kioskDevices.map((device) => (
                <Badge key={device.id} variant="outline">
                  {device.name} ({device.device_code})
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground pt-2">
          💡 PWA isolado - SEM LOGIN. Acesso via: <code>/{company?.slug || 'slug'}/totem</code>
        </p>
      </CardContent>
    </Card>
  );
}

// Entregador PWA Links Section - Uses unified /:slug/entregador pattern
function EntregadorPWASection({ slug }: { slug?: string }) {
  // NEW: Use unified /:slug/entregador pattern (same as totem and tablet)
  const entregadorUrl = slug 
    ? `${window.location.origin}/${slug}/entregador`
    : '';
  const isValid = !!slug;

  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bike className="w-4 h-4 text-green-500" />
        <span className="font-medium">App Entregador (PWA)</span>
        <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">NOVO</span>
      </div>
      <div className="flex items-center gap-2">
        <Input 
          readOnly 
          value={isValid ? entregadorUrl : 'Configure o slug da empresa primeiro'}
          className="font-mono text-sm bg-background"
        />
        <Button
          variant="outline"
          size="icon"
          disabled={!isValid}
          onClick={() => {
            if (!isValid) return;
            navigator.clipboard.writeText(entregadorUrl);
            toast.success('Link copiado!');
          }}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={!isValid}
          onClick={() => {
            if (!isValid) return;
            window.open(entregadorUrl, '_blank');
          }}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        🛵 PWA isolado para entregadores. Padrão: <code>/{slug || 'slug'}/entregador</code>. Login via PIN (configure em Entregadores → Gerar PIN).
      </p>
    </div>
  );
}

// Garçom (Waiter) PWA Links Section - Now uses /pwa/garcom entry point
function WaiterLinksSection() {
  const { data: company } = useCompany();
  const waiterUrl = company?.slug 
    ? `${window.location.origin}/${company.slug}/garcom`
    : `${window.location.origin}/pwa/garcom`;

  return (
    <Card className="border-border/50 shadow-soft border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <UserRoundCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">App Garçom (PWA)</CardTitle>
            <CardDescription>
              Acesso via celular para garçons lançarem pedidos em mesas e comandas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input readOnly value={waiterUrl} className="font-mono text-sm bg-muted/50" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(waiterUrl);
              toast.success('Link copiado!');
            }}
            title="Copiar link"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(company?.slug ? `/${company.slug}/garcom` : '/pwa/garcom', '_blank')}
            title="Abrir em nova aba"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 PWA isolado com login próprio. Padrão: <code>/{company?.slug || 'slug'}/garcom</code>. Configure permissões em Perfis → Permissões do Garçom.
        </p>
      </CardContent>
    </Card>
  );
}

// Waitlist Links Section - Receptionist and KDS Waitlist
function WaitlistLinksSection({ publicLinks }: { publicLinks: any }) {
  const kdsWaitlistToken = publicLinks?.kds_waitlist_token_v2 || publicLinks?.kds_waitlist_token || '';
  const kdsWaitlistUrl = kdsWaitlistToken ? `${window.location.origin}/kds-fila/${kdsWaitlistToken}` : '';
  
  return (
    <Card className="border-border/50 shadow-soft border-2 border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Fila de Espera</CardTitle>
            <CardDescription>
              Links para gerenciamento e visualização da fila de espera
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Receptionist Waitlist - Internal access with login */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Fila de Espera (Recepcionista)</p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/waitlist`}
              className="font-mono text-sm bg-muted/50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/waitlist`);
                toast.success('Link copiado!');
              }}
              title="Copiar link"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open('/waitlist', '_blank')}
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            👋 Gerenciamento completo da fila. Requer login (Recepcionista ou Garçom).
          </p>
        </div>

        {/* KDS Waitlist - Public display */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">KDS Fila (Painel)</p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={kdsWaitlistUrl || 'Token não gerado - aguarde regeneração'}
              className="font-mono text-sm bg-muted/50"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!kdsWaitlistToken}
              onClick={() => {
                if (!kdsWaitlistToken) return;
                navigator.clipboard.writeText(kdsWaitlistUrl);
                toast.success('Link copiado!');
              }}
              title="Copiar link"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!kdsWaitlistToken}
              onClick={() => {
                if (!kdsWaitlistToken) return;
                window.open(kdsWaitlistUrl, '_blank');
              }}
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            📺 Painel read-only para TV/Monitor. Exibe fila e mesas disponíveis em tempo real. SEM LOGIN.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Tablet Autoatendimento PWA Links Section - NO AUTH REQUIRED
function TabletLinksSection() {
  const { data: company } = useCompany();
  
  // Fetch tablet devices
  const { data: tabletDevices = [], isLoading } = useQuery({
    queryKey: ['tablet_devices_links', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('tablet_devices')
        .select('id, device_name, access_token, is_active')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('device_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  if (isLoading) return null;
  
  if (tabletDevices.length === 0) {
    return (
      <Card className="border-border/50 shadow-soft border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Tablet className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Tablet Autoatendimento (PWA)</CardTitle>
              <CardDescription>
                Nenhum tablet configurado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Configure seus tablets de autoatendimento para gerar os links de acesso.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/settings/tablet-autoatendimento'}>
            Configurar Tablets
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-soft border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <Tablet className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Tablet Autoatendimento (PWA)</CardTitle>
            <CardDescription>
              Links para acesso aos tablets ({tabletDevices.length} {tabletDevices.length === 1 ? 'ativo' : 'ativos'})
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* NEW: Unified slug-based tablet link */}
        {company?.slug && (
          <div className="space-y-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Link Principal (Recomendado)</span>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">NOVO</span>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={`${window.location.origin}/${company.slug}/tablet`} 
                className="font-mono text-sm bg-muted/50" 
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${company.slug}/tablet`);
                  toast.success('Link copiado!');
                }}
                title="Copiar link"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(`/${company.slug}/tablet`, '_blank')}
                title="Abrir tablet em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Legacy device-specific links */}
        {tabletDevices.map((device) => {
          const tabletUrl = `${window.location.origin}/tablet-autoatendimento/${device.access_token}`;
          return (
            <div key={device.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{device.device_name}</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{device.access_token?.slice(0, 8)}...</code>
                <span className="text-xs text-muted-foreground">(legado)</span>
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={tabletUrl} className="font-mono text-sm bg-muted/50" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(tabletUrl);
                    toast.success('Link copiado!');
                  }}
                  title="Copiar link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(tabletUrl, '_blank')}
                  title="Abrir tablet em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-2">
          💡 PWA isolado - SEM LOGIN. Padrão recomendado: <code>/{company?.slug || 'slug'}/tablet</code>
        </p>
      </CardContent>
    </Card>
  );
}

const TOKEN_LABELS: Record<TokenType, string> = {
  menu: 'Cardápio Delivery',
  tv: 'TV / Menu Digital',
  roleta: 'Roleta de Prêmios',
  kds: 'KDS (Cozinha)',
  scale: 'Terminal Balança',
};

// Production routes use slug-based URLs
const SLUG_ROUTES: Record<TokenType, string> = {
  menu: '', // /:slug - root slug for menu
  tv: '/tv',
  roleta: '/r',
  kds: '/kds',
  scale: '/balanca',
};

export default function MyLinks() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: publicLinks, isLoading: linksLoading } = useCompanyPublicLinks();
  const regenerateToken = useRegenerateToken();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; tokenType: TokenType | null }>({
    open: false,
    tokenType: null,
  });

  const isLoading = companyLoading || linksLoading;

  const handleRegenerateClick = (tokenType: TokenType) => {
    setConfirmDialog({ open: true, tokenType });
  };

  const handleConfirmRegenerate = () => {
    if (confirmDialog.tokenType) {
      regenerateToken.mutate(confirmDialog.tokenType);
    }
    setConfirmDialog({ open: false, tokenType: null });
  };

  const getTokenPath = (tokenType: TokenType): string => {
    // For menu, use slug-based URL (/:slug). For others, use token-based
    if (tokenType === 'menu' && company?.slug) {
      return `/${company.slug}`;
    }
    
    const route = SLUG_ROUTES[tokenType];
    const currentToken = getBestToken(publicLinks, tokenType);
    return `${route}/${currentToken}`;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Meus Links">
        <div className="max-w-3xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Meus Links">
        <div className="max-w-3xl space-y-6 animate-fade-in">
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Configure sua empresa primeiro para ver os links públicos.</p>
              <Button className="mt-4" onClick={() => (window.location.href = '/company')}>
                Configurar Empresa
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Renderiza sempre o WaiterLinksSection, mesmo sem publicLinks
  const hasPublicLinks = !!publicLinks;

  const menuPath = hasPublicLinks ? getTokenPath('menu') : '';
  const tvPath = hasPublicLinks ? getTokenPath('tv') : '';
  const roletaPath = hasPublicLinks ? getTokenPath('roleta') : '';
  const kdsPath = hasPublicLinks ? getTokenPath('kds') : '';

  return (
    <DashboardLayout title="Meus Links">
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <Link2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Meus Links Públicos</CardTitle>
                <CardDescription>
                  Link principal usa o slug da empresa: zoopicheff.com.br/{company?.slug || 'nome-empresa'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* UNIVERSAL QR CODE - One QR for all PWAs */}
        <UniversalQRCodeSection />

        {/* NOVOS LINKS NO FORMATO /:tenantSlug/:app */}
        <Card className="border-border/50 shadow-soft border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">🆕 Links Padronizados (Novo Formato)</CardTitle>
                <CardDescription>
                  Formato: zoopi.app.br/{company?.slug}/[app]
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Autoatendimento */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tablet className="w-4 h-4 text-primary" />
                <span className="font-medium">Autoatendimento (Tablet)</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/autoatendimento`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/autoatendimento`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/autoatendimento`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                📱 Link único para todos os tablets. Configure a mesa dentro do tablet (pressione a logo por 5s).
              </p>
            </div>

            {/* Delivery */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="font-medium">Cardápio Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/delivery`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/delivery`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/delivery`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tv className="w-4 h-4 text-destructive" />
                <span className="font-medium">TV / Menu Digital</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/tv`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/tv`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/tv`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* KDS */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <ChefHat className="w-4 h-4 text-amber-500" />
                <span className="font-medium">KDS (Cozinha)</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/kds`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/kds`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/kds`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Balança */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Terminal Balança</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/balanca`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/balanca`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/balanca`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⚖️ Terminal para pesagem automática. Configure em Ajustes → Balança.
              </p>
            </div>

            {/* Roleta */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-green-500" />
                <span className="font-medium">Roleta de Prêmios</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/roleta`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/roleta`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/roleta`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
             </div>

             {/* Pedidos Agendados */}
             <div className="bg-muted/50 rounded-lg p-3">
               <div className="flex items-center gap-2 mb-2">
                 <Package className="w-4 h-4 text-emerald-500" />
                 <span className="font-medium">Pedidos Agendados</span>
                 <span className="text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">NOVO</span>
               </div>
               <div className="flex items-center gap-2">
                 <Input 
                   readOnly 
                   value={`${window.location.origin}/${company?.slug}/scheduled-orders`} 
                   className="font-mono text-sm bg-background"
                 />
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => {
                     navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/scheduled-orders`);
                     toast.success('Link copiado!');
                   }}
                 >
                   <Copy className="w-4 h-4" />
                 </Button>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => window.open(`/${company?.slug}/scheduled-orders`, '_blank')}
                 >
                   <ExternalLink className="w-4 h-4" />
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground mt-2">
                 📅 PWA isolado para agendamento de pedidos. Permite clientes agendar compras com data e horário específicos.
               </p>
             </div>

             {/* PDV Loja */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">PDV Loja</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">NOVO</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/pdv-loja`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/pdv-loja`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open('/pdv-loja', '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💰 PDV para lojas e padarias. Cada estação pode configurar logo, cores e impressora local (F9).
              </p>
            </div>

            {/* Entregador PWA - Nova seção com link único */}
            <EntregadorPWASection slug={company?.slug} />

            {/* Painel de Chamada (Estilo McDonald's) */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-green-500" />
                <span className="font-medium">Painel de Chamada</span>
                <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">NOVO</span>
              </div>
              {(() => {
                const tvToken = getBestToken(publicLinks, 'tv');
                const painelUrl = tvToken ? `${window.location.origin}/painel-chamada/t/${tvToken}` : '';
                const painelPath = tvToken ? `/painel-chamada/t/${tvToken}` : '';
                const isDisabled = !tvToken;

                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Input 
                        readOnly 
                        value={isDisabled ? 'Token TV não gerado - gere primeiro acima' : painelUrl} 
                        className="font-mono text-sm bg-background"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          navigator.clipboard.writeText(painelUrl);
                          toast.success('Link copiado!');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          window.open(painelPath, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      📺 Painel estilo McDonald's para TVs. Exibe pedidos prontos automaticamente quando KDS marca como PRONTO.
                    </p>
                  </>
                );
              })()}
            </div>

            {/* Fidelidade */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Portal Fidelidade</span>
                <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">NOVO</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/fidelidade`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/fidelidade`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/fidelidade`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                🎁 Portal PWA para clientes consultarem pontos e recompensas.
              </p>
            </div>

            {/* KDS Expedição */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-cyan-500" />
                <span className="font-medium">KDS Expedição</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-600 px-2 py-0.5 rounded-full">NOVO</span>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/${company?.slug}/kds-expedicao`} 
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${company?.slug}/kds-expedicao`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/${company?.slug}/kds-expedicao`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                📦 Painel de Expedição. Recebe pedidos PRONTOS da cozinha para finalização e entrega.
              </p>
            </div>
        </CardContent>
        </Card>

        {/* Review Settings Section */}
        <ReviewSettingsSection />

        {/* App Garçom - PWA Isolado */}
        <WaiterLinksSection />

        {/* Fila de Espera - Links para Recepcionista e KDS */}
        <WaitlistLinksSection publicLinks={publicLinks} />

        {/* Totem Autoatendimento - PWA Isolado SEM LOGIN (lista totens individuais) */}
        <KioskLinksSection />

        {/* Tablet Autoatendimento - PWA Isolado SEM LOGIN */}
        <TabletLinksSection />


        <PrintLinksSection />

        {/* Maître Rôtisseur (Especialista em Carnes) */}
        <Card className="border-border/50 shadow-soft border-2 border-orange-600/20 bg-gradient-to-br from-orange-600/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600/10 rounded-lg flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Maître Rôtisseur</CardTitle>
                <CardDescription>
                  Especialista em carnes com IA para boutiques
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Link Público (por slug)</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/rotisseur/${company?.slug}`}
                  className="font-mono text-sm bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/rotisseur/${company?.slug}`);
                    toast.success('Link copiado!');
                  }}
                  title="Copiar link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/rotisseur/${company?.slug}`, '_blank')}
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              🥩 Assistente IA para recomendar cortes de carne. Configure em <strong>Configurações → Rotisseur</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Enólogo Virtual (QR / Totem) */}
        {hasPublicLinks && (
          <Card className="border-border/50 shadow-soft border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Enólogo Virtual</CardTitle>
                  <CardDescription>
                    Links públicos por QR (usa o mesmo token do Delivery)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Enólogo (QR)</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      getBestToken(publicLinks, 'menu')
                        ? `${window.location.origin}/enologo/${getBestToken(publicLinks, 'menu')}`
                        : 'Configure o token do Delivery para gerar este link'
                    }
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const token = getBestToken(publicLinks, 'menu');
                      if (!token) {
                        toast.error('Token do Delivery não encontrado. Gere/regenere os links públicos primeiro.');
                        return;
                      }
                      navigator.clipboard.writeText(`${window.location.origin}/enologo/${token}`);
                      toast.success('Link copiado!');
                    }}
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const token = getBestToken(publicLinks, 'menu');
                      if (!token) {
                        toast.error('Token do Delivery não encontrado. Gere/regenere os links públicos primeiro.');
                        return;
                      }
                      window.open(`/enologo/${token}`, '_blank');
                    }}
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Enólogo Totem</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      getBestToken(publicLinks, 'menu')
                        ? `${window.location.origin}/enologo-totem/${getBestToken(publicLinks, 'menu')}`
                        : 'Configure o token do Delivery para gerar este link'
                    }
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const token = getBestToken(publicLinks, 'menu');
                      if (!token) {
                        toast.error('Token do Delivery não encontrado. Gere/regenere os links públicos primeiro.');
                        return;
                      }
                      navigator.clipboard.writeText(`${window.location.origin}/enologo-totem/${token}`);
                      toast.success('Link copiado!');
                    }}
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const token = getBestToken(publicLinks, 'menu');
                      if (!token) {
                        toast.error('Token do Delivery não encontrado. Gere/regenere os links públicos primeiro.');
                        return;
                      }
                      window.open(`/enologo-totem/${token}`, '_blank');
                    }}
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ative o modo Totem em <strong>Configurações → Enólogo Virtual</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        )}


        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Novo formato padrão:</strong> zoopi.app.br/{company?.slug || 'slug'}/[autoatendimento | delivery | tv | kds | roleta | garcom | entregador]
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, tokenType: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Token?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a regenerar o token do canal <strong>{confirmDialog.tokenType ? TOKEN_LABELS[confirmDialog.tokenType] : ''}</strong>.
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Isso invalidará o link atual.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Regenerar Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
