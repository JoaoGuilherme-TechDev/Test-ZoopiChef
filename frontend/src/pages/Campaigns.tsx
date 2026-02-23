import { useState } from "react";
import {
  Megaphone,
  Sparkles,
  Send,
  Check,
  X,
  Eye,
  Loader2,
  Settings,
  Users,
  MessageSquare,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Play,
  Pause,
} from "lucide-react";
import { AIModuleHeader, AI_MODULE_DESCRIPTIONS } from "@/components/ai/AIModuleHeader";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCampaigns,
  useCampaignSettings,
  useUpdateCampaignSettings,
  useAnalyzeCampaigns,
  useUpdateCampaignStatus,
  useExecuteCampaign,
  useCampaignStats,
  useCampaignMessages,
  type Campaign,
} from "@/hooks/useCampaigns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Campaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: settings } = useCampaignSettings();
  const { data: messages = [] } = useCampaignMessages(selectedCampaign?.id);
  const stats = useCampaignStats();

  const analyzeCampaigns = useAnalyzeCampaigns();
  const updateStatus = useUpdateCampaignStatus();
  const executeCampaign = useExecuteCampaign();
  const updateSettings = useUpdateCampaignSettings();

  const [settingsForm, setSettingsForm] = useState({
    enabled: settings?.enabled || false,
    send_window_start: settings?.send_window_start || "10:00",
    send_window_end: settings?.send_window_end || "20:00",
    max_messages_per_customer_per_day: settings?.max_messages_per_customer_per_day || 1,
    days_inactive_trigger: settings?.days_inactive_trigger || 30,
  });

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === "pending") return c.status === "pending";
    if (activeTab === "approved") return c.status === "approved" || c.status === "sending";
    if (activeTab === "completed") return c.status === "completed";
    if (activeTab === "cancelled") return c.status === "cancelled";
    return true;
  });

  const handleApprove = (campaign: Campaign) => {
    updateStatus.mutate({ id: campaign.id, status: "approved", campaignType: campaign.type });
  };

  const handleReject = (campaign: Campaign) => {
    updateStatus.mutate({ id: campaign.id, status: "cancelled", campaignType: campaign.type });
  };

  const handleExecute = (campaign: Campaign) => {
    executeCampaign.mutate(campaign.id);
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsDialog(true);
  };

  const handleSaveSettings = () => {
    updateSettings.mutate(settingsForm);
    setShowSettingsDialog(false);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reativacao: "Reativação",
      promocao: "Promoção",
      aniversario: "Aniversário",
      upsell: "Upsell",
      cross_sell: "Cross-sell",
      vip: "VIP",
      carrinho_abandonado: "Carrinho Abandonado",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      reativacao: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      promocao: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      aniversario: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      upsell: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      cross_sell: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      vip: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      carrinho_abandonado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[type] || "";
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800">Aprovada</Badge>;
      case "sending":
        return <Badge className="bg-amber-100 text-amber-800">Enviando</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Concluída</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com descrição clara */}
        <AIModuleHeader
          title={AI_MODULE_DESCRIPTIONS.campaigns.title}
          icon={Megaphone}
          description={AI_MODULE_DESCRIPTIONS.campaigns.description}
          purpose={AI_MODULE_DESCRIPTIONS.campaigns.purpose}
          whenToUse={AI_MODULE_DESCRIPTIONS.campaigns.whenToUse}
          doesNot={AI_MODULE_DESCRIPTIONS.campaigns.doesNot}
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(true)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Button>
            <Button
              onClick={() => analyzeCampaigns.mutate()}
              disabled={analyzeCampaigns.isPending}
              className="gap-2"
            >
              {analyzeCampaigns.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Gerar Campanhas
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Campanhas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalAudience}</p>
                <p className="text-xs text-muted-foreground">Clientes Alcançados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({campaigns.filter((c) => c.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <Play className="w-4 h-4" />
              Em Execução
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <Check className="w-4 h-4" />
              Concluídas
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <X className="w-4 h-4" />
              Canceladas
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Megaphone className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma campanha {activeTab === "pending" ? "pendente" : ""}
                  </h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    Clique em "Gerar Campanhas" para a IA analisar seus clientes e sugerir campanhas personalizadas.
                  </p>
                  <Button onClick={() => analyzeCampaigns.mutate()} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Gerar Campanhas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(
                                campaign.type
                              )}`}
                            >
                              {getTypeLabel(campaign.type)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(
                                campaign.confidence
                              )}`}
                            >
                              {campaign.confidence === "high"
                                ? "Alta confiança"
                                : campaign.confidence === "medium"
                                ? "Média confiança"
                                : "Baixa confiança"}
                            </span>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <CardTitle className="text-lg">{campaign.audience_rule}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{campaign.audience_count}</p>
                          <p className="text-xs text-muted-foreground">clientes</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Message Preview */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-primary mb-1">Mensagem</p>
                            <p className="text-sm text-foreground">{campaign.message_template}</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Reason */}
                      {campaign.ai_reason && (
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-purple-600 mb-1">Por que a IA sugere</p>
                              <p className="text-sm text-foreground">{campaign.ai_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Send Window */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Envio: {campaign.send_window_start} - {campaign.send_window_end}
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="w-4 h-4" />
                          Canal: {campaign.channel}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        {campaign.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleExecute(campaign)}
                              disabled={executeCampaign.isPending}
                              className="gap-1"
                            >
                              {executeCampaign.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              Aprovar e Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(campaign)}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(campaign)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Campanha</DialogTitle>
            </DialogHeader>

            {selectedCampaign && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(
                      selectedCampaign.type
                    )}`}
                  >
                    {getTypeLabel(selectedCampaign.type)}
                  </span>
                  {getStatusBadge(selectedCampaign.status)}
                </div>

                <div>
                  <h4 className="font-semibold text-lg">{selectedCampaign.audience_rule}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCampaign.audience_count} clientes elegíveis
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">Mensagem</p>
                    <p className="text-sm bg-muted/50 p-3 rounded">{selectedCampaign.message_template}</p>
                  </div>

                  {selectedCampaign.cta && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Call to Action</p>
                      <p className="text-sm">{selectedCampaign.cta}</p>
                    </div>
                  )}

                  {selectedCampaign.ai_reason && (
                    <div>
                      <p className="text-xs font-medium text-purple-600 mb-1">Razão da IA</p>
                      <p className="text-sm">{selectedCampaign.ai_reason}</p>
                    </div>
                  )}
                </div>

                {messages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Mensagens Enviadas ({messages.length})
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {messages.slice(0, 5).map((msg) => (
                        <div key={msg.id} className="text-xs bg-muted/30 p-2 rounded flex justify-between">
                          <span>{msg.customer_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {msg.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>
                    Criado em:{" "}
                    {format(new Date(selectedCampaign.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  {selectedCampaign.completed_at && (
                    <p>
                      Concluído em:{" "}
                      {format(new Date(selectedCampaign.completed_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações de Campanhas</DialogTitle>
              <DialogDescription>
                Configure as regras de envio automático de campanhas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Campanhas Automáticas</Label>
                  <p className="text-xs text-muted-foreground">
                    Permitir envio automático de campanhas aprovadas
                  </p>
                </div>
                <Switch
                  checked={settingsForm.enabled}
                  onCheckedChange={(checked) =>
                    setSettingsForm((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horário Inicial</Label>
                  <Input
                    type="time"
                    value={settingsForm.send_window_start}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, send_window_start: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Horário Final</Label>
                  <Input
                    type="time"
                    value={settingsForm.send_window_end}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, send_window_end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Máximo de mensagens por cliente/dia</Label>
                <Select
                  value={String(settingsForm.max_messages_per_customer_per_day)}
                  onValueChange={(v) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      max_messages_per_customer_per_day: parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mensagem</SelectItem>
                    <SelectItem value="2">2 mensagens</SelectItem>
                    <SelectItem value="3">3 mensagens</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dias de inatividade para reativação</Label>
                <Select
                  value={String(settingsForm.days_inactive_trigger)}
                  onValueChange={(v) =>
                    setSettingsForm((prev) => ({ ...prev, days_inactive_trigger: parseInt(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
