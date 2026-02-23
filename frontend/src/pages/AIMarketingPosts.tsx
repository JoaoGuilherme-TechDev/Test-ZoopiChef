import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCompanyIntegrations } from '@/hooks/useCompanySettings';
import { LowMovementAlert } from '@/components/ai/LowMovementAlert';
import { PostPreviewModal } from '@/components/marketing/PostPreviewModal';
import { MessageTemplates } from '@/components/marketing/MessageTemplates';
import { CampaignCalendar } from '@/components/marketing/CampaignCalendar';
import { 
  Instagram,
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  Check,
  X,
  Image,
  Users,
  RefreshCw,
  Zap,
  ExternalLink,
  AlertTriangle,
  Clock,
  Settings,
  Info,
  Eye
} from 'lucide-react';
import {
  useAIMarketingPosts,
  useGenerateMarketingPosts,
  useApproveMarketingPost,
  useDismissMarketingPost,
  useSendWhatsAppBlast,
  useGetInstagramContent,
  AIMarketingPost
} from '@/hooks/useAIMarketingPosts';

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Todos os clientes',
  vip: 'Clientes VIP',
  inactive: 'Clientes inativos',
  reactivation: 'Clientes dormindo',
};

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  approved: { label: 'Aprovado', variant: 'default' },
  posted: { label: 'Enviado', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  dismissed: { label: 'Ignorado', variant: 'outline' },
};

function MarketingPostCard({ 
  post, 
  onApprove, 
  onDismiss, 
  onSendWhatsApp,
  onCopyInstagram,
  isApproving,
  isSending 
}: {
  post: AIMarketingPost;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onSendWhatsApp: (id: string) => void;
  onCopyInstagram: (id: string) => void;
  isApproving: boolean;
  isSending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const statusInfo = STATUS_BADGES[post.status] || STATUS_BADGES.pending;

  const handleCopy = async () => {
    const fullCaption = `${post.caption}\n\n${(post.hashtags || []).map(h => `#${h}`).join(' ')}`;
    await navigator.clipboard.writeText(fullCaption);
    setCopied(true);
    toast.success('Legenda copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-l-pink-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {post.product_image_url ? (
              <img 
                src={post.product_image_url} 
                alt={post.product_name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{post.product_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {post.sale_price ? (
                  <>
                    <span className="text-sm line-through text-muted-foreground">
                      R$ {post.product_price?.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      R$ {post.sale_price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium">
                    R$ {post.product_price?.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            <div className="flex items-center gap-1">
              {(post.channel === 'instagram' || post.channel === 'both') && (
                <Instagram className="w-4 h-4 text-pink-500" />
              )}
              {(post.channel === 'whatsapp' || post.channel === 'both') && (
                <MessageSquare className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instagram Caption */}
        {post.caption && (
          <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-lg p-3 border border-pink-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-medium text-pink-600">Legenda Instagram</span>
            </div>
            <p className="text-sm">{post.caption}</p>
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Message */}
        {post.whatsapp_message && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-lg p-3 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">Mensagem WhatsApp</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{post.whatsapp_target_count} clientes</span>
                {post.whatsapp_audience_type && (
                  <Badge variant="outline" className="text-xs ml-1">
                    {AUDIENCE_LABELS[post.whatsapp_audience_type] || post.whatsapp_audience_type}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm">{post.whatsapp_message}</p>
            {post.whatsapp_sent_count > 0 && (
              <p className="text-xs text-emerald-600 mt-2">
                ✓ Enviado para {post.whatsapp_sent_count} clientes
              </p>
            )}
          </div>
        )}

        {/* AI Reason */}
        {post.ai_reason && (
          <p className="text-xs text-muted-foreground italic">
            <Sparkles className="w-3 h-3 inline mr-1" />
            {post.ai_reason}
          </p>
        )}

        {/* Actions */}
        {post.status === 'pending' && (
          <div className="flex flex-wrap gap-2">
            <PostPreviewModal
              productName={post.product_name}
              productImage={post.product_image_url}
              productPrice={post.product_price}
              salePrice={post.sale_price}
              caption={post.caption}
              hashtags={post.hashtags}
              whatsappMessage={post.whatsapp_message}
              trigger={
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              }
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDismiss(post.id)}
            >
              <X className="w-4 h-4 mr-1" />
              Ignorar
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              variant="outline"
              className="text-pink-600 border-pink-500/50"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              Copiar Legenda
            </Button>
            <Button
              size="sm"
              onClick={() => onSendWhatsApp(post.id)}
              disabled={isSending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Disparar WhatsApp
            </Button>
          </div>
        )}

        {post.status === 'approved' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCopy}
              variant="outline"
              className="text-pink-600 border-pink-500/50"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              Copiar Legenda
            </Button>
            <Button
              size="sm"
              onClick={() => onSendWhatsApp(post.id)}
              disabled={isSending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Disparar WhatsApp
            </Button>
          </div>
        )}

        {post.error_message && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{post.error_message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function AIMarketingPosts() {
  const { data: allPosts, isLoading } = useAIMarketingPosts();
  const { data: integrations } = useCompanyIntegrations();
  const generatePosts = useGenerateMarketingPosts();
  const approveMutation = useApproveMarketingPost();
  const dismissMutation = useDismissMarketingPost();
  const sendWhatsAppMutation = useSendWhatsAppBlast();

  const [generateDialog, setGenerateDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('both');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [sendingPostId, setSendingPostId] = useState<string | null>(null);

  const instagramEnabled = (integrations as any)?.instagram_enabled;
  const whatsappEnabled = (integrations as any)?.whatsapp_enabled;

  const pendingPosts = allPosts?.filter(p => p.status === 'pending') || [];
  const postedPosts = allPosts?.filter(p => p.status === 'posted') || [];
  const otherPosts = allPosts?.filter(p => !['pending', 'posted'].includes(p.status)) || [];

  const handleGenerate = async () => {
    await generatePosts.mutateAsync({
      channel: selectedChannel,
      audience_type: selectedAudience,
    });
    setGenerateDialog(false);
  };

  const handleSendWhatsApp = async (postId: string) => {
    setSendingPostId(postId);
    try {
      await sendWhatsAppMutation.mutateAsync(postId);
    } finally {
      setSendingPostId(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Marketing Automático">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Marketing Automático">
      <div className="space-y-6 animate-fade-in">
        {/* Low Movement Alert - Detecção Automática */}
        <LowMovementAlert />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-pink-500" />
              Marketing Automático com IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere conteúdo para Instagram e dispare no WhatsApp automaticamente
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MessageTemplates />
            <CampaignCalendar />
            <Button
              onClick={() => setGenerateDialog(true)}
              disabled={generatePosts.isPending}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {generatePosts.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Gerar Posts de Promoções
            </Button>
          </div>
        </div>

        {/* Integration Status Alerts */}
        {(!instagramEnabled || !whatsappEnabled) && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Info className="w-4 h-4 text-amber-500" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                {!instagramEnabled && !whatsappEnabled && (
                  <span>Instagram e WhatsApp não estão configurados. Configure as integrações para publicar automaticamente.</span>
                )}
                {!instagramEnabled && whatsappEnabled && (
                  <span>Instagram não está configurado. Você pode disparar no WhatsApp, mas precisa copiar manualmente para o Instagram.</span>
                )}
                {instagramEnabled && !whatsappEnabled && (
                  <span>WhatsApp não está configurado. Configure para disparar mensagens em massa.</span>
                )}
              </div>
              <Button variant="outline" size="sm" asChild className="ml-4">
                <Link to="/settings/integrations">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-pink-500/50 bg-pink-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-400">{pendingPosts.length}</p>
                  <p className="text-xs font-semibold">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{postedPosts.length}</p>
                  <p className="text-xs font-semibold">Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/50 bg-purple-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">
                    {allPosts?.filter(p => p.channel === 'instagram' || p.channel === 'both').length || 0}
                  </p>
                  <p className="text-xs font-semibold">Instagram</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {allPosts?.reduce((acc, p) => acc + (p.whatsapp_sent_count || 0), 0) || 0}
                  </p>
                  <p className="text-xs font-semibold">Msgs Enviadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendingPosts.length})
            </TabsTrigger>
            <TabsTrigger value="posted" className="gap-2">
              <Check className="w-4 h-4" />
              Enviados ({postedPosts.length})
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-2">
              Outros ({otherPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingPosts.length === 0 ? (
              <Alert>
                <Sparkles className="w-4 h-4" />
                <AlertDescription>
                  Nenhum post pendente. Clique em "Gerar Posts de Promoções" para criar conteúdo 
                  baseado nos produtos em destaque ou promoção.
                </AlertDescription>
              </Alert>
            ) : (
              pendingPosts.map(post => (
                <MarketingPostCard
                  key={post.id}
                  post={post}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onDismiss={(id) => dismissMutation.mutate(id)}
                  onSendWhatsApp={handleSendWhatsApp}
                  onCopyInstagram={() => {}}
                  isApproving={approveMutation.isPending}
                  isSending={sendingPostId === post.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="posted" className="space-y-4 mt-4">
            {postedPosts.length === 0 ? (
              <Alert>
                <Check className="w-4 h-4" />
                <AlertDescription>
                  Nenhum post enviado ainda.
                </AlertDescription>
              </Alert>
            ) : (
              postedPosts.map(post => (
                <MarketingPostCard
                  key={post.id}
                  post={post}
                  onApprove={() => {}}
                  onDismiss={() => {}}
                  onSendWhatsApp={() => {}}
                  onCopyInstagram={() => {}}
                  isApproving={false}
                  isSending={false}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="other" className="space-y-4 mt-4">
            {otherPosts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhum post nesta categoria.
                </AlertDescription>
              </Alert>
            ) : (
              otherPosts.map(post => (
                <MarketingPostCard
                  key={post.id}
                  post={post}
                  onApprove={() => {}}
                  onDismiss={() => {}}
                  onSendWhatsApp={() => {}}
                  onCopyInstagram={() => {}}
                  isApproving={false}
                  isSending={false}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Generate Dialog */}
        <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Gerar Posts de Marketing
              </DialogTitle>
              <DialogDescription>
                A IA vai analisar seus produtos em destaque/promoção e criar conteúdo para 
                Instagram e WhatsApp.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Canais</label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Instagram + WhatsApp</SelectItem>
                    <SelectItem value="instagram">Apenas Instagram</SelectItem>
                    <SelectItem value="whatsapp">Apenas WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Público WhatsApp</label>
                <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    <SelectItem value="vip">Clientes VIP</SelectItem>
                    <SelectItem value="inactive">Clientes inativos (reativação)</SelectItem>
                    <SelectItem value="reactivation">Clientes dormindo (30-60 dias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pré-requisito:</strong> Marque produtos como "Destaque" ou "Em promoção" 
                  no cadastro de produtos para que a IA crie conteúdo para eles.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={generatePosts.isPending}
                className="bg-gradient-to-r from-pink-500 to-purple-500"
              >
                {generatePosts.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Gerar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
