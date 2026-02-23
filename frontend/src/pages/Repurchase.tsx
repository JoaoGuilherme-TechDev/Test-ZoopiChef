import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  Sparkles,
  Send,
  Trash2,
  Eye,
  Loader2,
  Clock,
  User,
  ShoppingBag,
  TrendingUp,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  SendHorizonal,
} from "lucide-react";
import { AIModuleHeader, AI_MODULE_DESCRIPTIONS } from "@/components/ai/AIModuleHeader";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useRepurchaseSuggestions,
  useAnalyzeRepurchase,
  useSendRepurchase,
  useSendAllRepurchase,
  useUpdateRepurchaseStatus,
  useDeleteRepurchaseSuggestion,
  useRepurchaseStats,
  type RepurchaseSuggestion,
} from "@/hooks/useRepurchase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Repurchase() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedSuggestion, setSelectedSuggestion] = useState<RepurchaseSuggestion | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState("1"); // Default to 1 day for better testing
  const [lastAnalysisResult, setLastAnalysisResult] = useState<{
    message?: string;
    customers_analyzed?: number;
    eligible_customers?: number;
    suggestions?: number;
  } | null>(null);

  const { data: suggestions = [], isLoading, refetch } = useRepurchaseSuggestions();
  const stats = useRepurchaseStats();
  const hasAutoAnalyzed = useRef(false);

  const analyzeRepurchase = useAnalyzeRepurchase();
  const sendRepurchase = useSendRepurchase();
  const sendAllRepurchase = useSendAllRepurchase();
  const updateStatus = useUpdateRepurchaseStatus();
  const deleteSuggestion = useDeleteRepurchaseSuggestion();

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  const handleSendAll = () => {
    const pendingIds = pendingSuggestions.map(s => s.id);
    if (pendingIds.length > 0) {
      sendAllRepurchase.mutate(pendingIds);
    }
  };

  // Auto-analyze on page load if no pending suggestions
  useEffect(() => {
    if (!isLoading && !hasAutoAnalyzed.current && suggestions.filter(s => s.status === 'pending').length === 0) {
      hasAutoAnalyzed.current = true;
      console.log('[Repurchase] Auto-analyzing with threshold:', daysThreshold);
      analyzeRepurchase.mutate(parseInt(daysThreshold), {
        onSuccess: (data) => {
          setLastAnalysisResult(data);
          refetch();
        }
      });
    }
  }, [isLoading, suggestions]);

  const filteredSuggestions = suggestions.filter((s) => {
    if (activeTab === "pending") return s.status === "pending";
    if (activeTab === "sent") return s.status === "sent";
    if (activeTab === "dismissed") return s.status === "dismissed";
    return true;
  });

  const handleSend = (suggestion: RepurchaseSuggestion) => {
    sendRepurchase.mutate(suggestion.id);
  };

  const handleDismiss = (suggestion: RepurchaseSuggestion) => {
    updateStatus.mutate({ id: suggestion.id, status: "dismissed" });
  };

  const handleDelete = (suggestion: RepurchaseSuggestion) => {
    deleteSuggestion.mutate(suggestion.id);
  };

  const handleViewDetails = (suggestion: RepurchaseSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowDetailsDialog(true);
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

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return confidence;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com descrição clara */}
        <AIModuleHeader
          title={AI_MODULE_DESCRIPTIONS.repurchase.title}
          icon={RefreshCw}
          description={AI_MODULE_DESCRIPTIONS.repurchase.description}
          purpose={AI_MODULE_DESCRIPTIONS.repurchase.purpose}
          whenToUse={AI_MODULE_DESCRIPTIONS.repurchase.whenToUse}
          doesNot={AI_MODULE_DESCRIPTIONS.repurchase.doesNot}
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={daysThreshold} onValueChange={setDaysThreshold}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+ dia</SelectItem>
                <SelectItem value="3">3+ dias</SelectItem>
                <SelectItem value="7">7+ dias</SelectItem>
                <SelectItem value="14">14+ dias</SelectItem>
                <SelectItem value="30">30+ dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                analyzeRepurchase.mutate(parseInt(daysThreshold), {
                  onSuccess: (data) => {
                    setLastAnalysisResult(data);
                    refetch();
                  }
                });
              }}
              disabled={analyzeRepurchase.isPending}
              className="gap-2"
            >
              {analyzeRepurchase.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analisar Clientes
            </Button>
            {pendingSuggestions.length > 0 && (
              <Button
                onClick={handleSendAll}
                disabled={sendAllRepurchase.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {sendAllRepurchase.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizonal className="w-4 h-4" />
                )}
                Enviar Todos ({pendingSuggestions.length})
              </Button>
            )}
          </div>
        </div>

        {/* Analysis Result Alert */}
        {lastAnalysisResult && (
          <Alert className={lastAnalysisResult.suggestions && lastAnalysisResult.suggestions > 0 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}>
            {lastAnalysisResult.suggestions && lastAnalysisResult.suggestions > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <AlertTitle>Resultado da Análise</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{lastAnalysisResult.message}</p>
              {lastAnalysisResult.customers_analyzed !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Clientes analisados: {lastAnalysisResult.customers_analyzed} | 
                  Elegíveis: {lastAnalysisResult.eligible_customers || 0} | 
                  Sugestões: {lastAnalysisResult.suggestions || 0}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
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
              <Send className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.highConfidence}</p>
                <p className="text-xs text-muted-foreground">Alta Confiança</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50 border-muted">
            <CardContent className="p-4 flex items-center gap-3">
              <Trash2 className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.dismissed}</p>
                <p className="text-xs text-muted-foreground">Descartadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({suggestions.filter((s) => s.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-4 h-4" />
              Enviadas
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Descartadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCw className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma sugestão {activeTab === "pending" ? "pendente" : ""}
                  </h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    Clique em "Analisar Clientes" para gerar sugestões de recompra.
                    Use o filtro para ajustar o período mínimo sem compra.
                  </p>
                  <Button onClick={() => {
                    analyzeRepurchase.mutate(parseInt(daysThreshold), {
                      onSuccess: (data) => {
                        setLastAnalysisResult(data);
                        refetch();
                      }
                    });
                  }} className="gap-2" disabled={analyzeRepurchase.isPending}>
                    {analyzeRepurchase.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Analisar Clientes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="gap-1">
                              <User className="w-3 h-3" />
                              {suggestion.customer_name}
                            </Badge>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(
                                suggestion.confidence
                              )}`}
                            >
                              {getConfidenceLabel(suggestion.confidence)} confiança
                            </span>
                            {suggestion.status === "sent" && (
                              <Badge className="bg-green-100 text-green-800">Enviada</Badge>
                            )}
                          </div>
                          <CardTitle className="text-base">
                            {suggestion.product_names?.join(", ") || "Produtos favoritos"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Última compra há {suggestion.days_since_last_order} dias
                            {suggestion.avg_order_frequency &&
                              ` • Frequência média: ${suggestion.avg_order_frequency} dias`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-primary">
                            {suggestion.predicted_products?.[0]?.probability || 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">probabilidade</p>
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
                            <p className="text-sm text-foreground">{suggestion.message_template}</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Reason */}
                      {suggestion.ai_reason && (
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-purple-600 mb-1">Análise da IA</p>
                              <p className="text-sm text-foreground">{suggestion.ai_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Predicted Products */}
                      {suggestion.predicted_products && suggestion.predicted_products.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          {suggestion.predicted_products.map((p: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {p.name} ({p.probability}%)
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Send Window */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Envio: {suggestion.send_window_start} - {suggestion.send_window_end}
                        </span>
                        {suggestion.preferred_hour && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Horário preferido: {suggestion.preferred_hour}h
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        {suggestion.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSend(suggestion)}
                              disabled={sendRepurchase.isPending}
                              className="gap-1"
                            >
                              {sendRepurchase.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismiss(suggestion)}
                              className="gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Descartar
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(suggestion)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Detalhes
                        </Button>
                        {suggestion.status !== "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(suggestion)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remover
                          </Button>
                        )}
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
              <DialogTitle>Detalhes da Sugestão</DialogTitle>
              <DialogDescription>
                Análise detalhada do cliente e sugestão de recompra
              </DialogDescription>
            </DialogHeader>

            {selectedSuggestion && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedSuggestion.customer_name}</Badge>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(
                      selectedSuggestion.confidence
                    )}`}
                  >
                    {getConfidenceLabel(selectedSuggestion.confidence)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p>{selectedSuggestion.customer_phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dias sem pedido</Label>
                    <p>{selectedSuggestion.days_since_last_order} dias</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Frequência média</Label>
                    <p>{selectedSuggestion.avg_order_frequency || "N/A"} dias</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Horário preferido</Label>
                    <p>{selectedSuggestion.preferred_hour ? `${selectedSuggestion.preferred_hour}h` : "N/A"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Produtos previstos</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedSuggestion.predicted_products?.map((p: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {p.name} - {p.count}x ({p.probability}%)
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Mensagem</Label>
                  <p className="text-sm bg-muted/50 p-3 rounded mt-1">
                    {selectedSuggestion.message_template}
                  </p>
                </div>

                {selectedSuggestion.ai_reason && (
                  <div>
                    <Label className="text-xs text-purple-600">Análise da IA</Label>
                    <p className="text-sm">{selectedSuggestion.ai_reason}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>
                    Criado em:{" "}
                    {format(new Date(selectedSuggestion.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  {selectedSuggestion.sent_at && (
                    <p>
                      Enviado em:{" "}
                      {format(new Date(selectedSuggestion.sent_at), "dd/MM/yyyy 'às' HH:mm", {
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
      </div>
    </DashboardLayout>
  );
}
