import { useState, useEffect } from 'react';
import { useCompanyIntegrations } from '@/hooks/useCompanySettings';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, Clock, Eye, Send, Loader2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function ReviewSettingsSection() {
  const { data: company } = useCompany();
  const { data: integrations, isLoading, upsert, isPending } = useCompanyIntegrations();

  const [reviewEnabled, setReviewEnabled] = useState(true);
  const [autoSend, setAutoSend] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [defaultPublic, setDefaultPublic] = useState(true);
  const [requireComment, setRequireComment] = useState(false);

  // Sync local state with integrations data
  useEffect(() => {
    if (integrations) {
      setReviewEnabled((integrations as any).review_enabled ?? true);
      setAutoSend((integrations as any).review_auto_send ?? true);
      setDelayMinutes((integrations as any).review_delay_minutes ?? 30);
      setDefaultPublic((integrations as any).review_default_public ?? true);
      setRequireComment((integrations as any).review_require_comment ?? false);
    }
  }, [integrations]);

  const handleSave = async () => {
    try {
      await upsert({
        review_enabled: reviewEnabled,
        review_auto_send: autoSend,
        review_delay_minutes: delayMinutes,
        review_default_public: defaultPublic,
        review_require_comment: requireComment,
      } as any);
      toast.success('Configurações de avaliação salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  // Build review link based on company public links
  const reviewExampleUrl = company?.slug 
    ? `${window.location.origin}/${company.slug}/avaliar` 
    : '';

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-soft border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-soft border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Avaliações</CardTitle>
            <CardDescription>
              Configure como clientes avaliam seus pedidos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-500" />
            <div>
              <Label className="font-medium">Ativar Sistema de Avaliações</Label>
              <p className="text-xs text-muted-foreground">
                Permite que clientes avaliem pedidos
              </p>
            </div>
          </div>
          <Switch checked={reviewEnabled} onCheckedChange={setReviewEnabled} />
        </div>

        {reviewEnabled && (
          <>
            {/* Auto send toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-blue-500" />
                <div>
                  <Label className="font-medium">Envio Automático via WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">
                    Envia convite automaticamente após pedido entregue
                  </p>
                </div>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>

            {/* Delay minutes */}
            {autoSend && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <Label className="font-medium">Tempo de Espera (minutos)</Label>
                    <p className="text-xs text-muted-foreground">
                      Aguardar antes de enviar o convite
                    </p>
                  </div>
                </div>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-20 text-center"
                />
              </div>
            )}

            {/* Default public */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-green-500" />
                <div>
                  <Label className="font-medium">Avaliações Públicas por Padrão</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibe avaliações no cardápio digital
                  </p>
                </div>
              </div>
              <Switch checked={defaultPublic} onCheckedChange={setDefaultPublic} />
            </div>

            {/* Require comment */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <div>
                  <Label className="font-medium">Comentário Obrigatório</Label>
                  <p className="text-xs text-muted-foreground">
                    Exige que cliente escreva um comentário
                  </p>
                </div>
              </div>
              <Switch checked={requireComment} onCheckedChange={setRequireComment} />
            </div>

            {/* Example Link */}
            {reviewExampleUrl && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <Label className="font-medium">Link de Avaliação</Label>
                <p className="text-xs text-muted-foreground">
                  Cada pedido gera um link único. Exemplo de formato:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/avaliar/[TOKEN]`}
                    className="font-mono text-sm bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 O link único é enviado automaticamente via WhatsApp ou você pode copiar da página de Avaliações.
                </p>
              </div>
            )}
          </>
        )}

        {/* Save button */}
        <Button onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>

        {/* How it works explanation */}
        <div className="bg-blue-500/10 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Como funciona?
          </h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Cliente faz um pedido no sistema</li>
            <li>Quando o pedido é <strong>entregue/finalizado</strong>, o sistema agenda o envio</li>
            <li>Após {delayMinutes} minutos, o cliente recebe um link pelo WhatsApp</li>
            <li>O cliente clica e avalia com estrelas e comentário</li>
            <li>Se configurado, cliente ganha acesso à Roleta de Prêmios</li>
            <li>Você visualiza todas as avaliações em <strong>Menu → Avaliações</strong></li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
