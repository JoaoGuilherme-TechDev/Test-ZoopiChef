import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Plus, 
  QrCode, 
  Copy, 
  Trash2, 
  Loader2, 
  History,
  ScanLine,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock
} from 'lucide-react';
import { useComandaValidatorTokens, useComandaValidationLogs } from '@/hooks/useComandaValidator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ComandaValidatorSettings() {
  const navigate = useNavigate();
  const [newTokenName, setNewTokenName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { tokens, isLoading, createToken, updateToken, deleteToken } = useComandaValidatorTokens();
  const { logs, isLoading: isLoadingLogs } = useComandaValidationLogs();

  const baseUrl = window.location.origin;

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Digite um nome para o validador');
      return;
    }

    setIsCreating(true);
    try {
      await createToken.mutateAsync(newTokenName.trim());
      toast.success('Validador criado com sucesso!');
      setNewTokenName('');
    } catch (error) {
      toast.error('Erro ao criar validador');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${baseUrl}/validar-comanda/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateToken.mutateAsync({ id, updates: { is_active: !isActive } });
      toast.success(isActive ? 'Validador desativado' : 'Validador ativado');
    } catch (error) {
      toast.error('Erro ao atualizar validador');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este validador?')) return;
    
    try {
      await deleteToken.mutateAsync(id);
      toast.success('Validador excluído');
    } catch (error) {
      toast.error('Erro ao excluir validador');
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'livre':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'com_consumo':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'fechada':
        return <Lock className="w-4 h-4 text-gray-500" />;
      case 'nao_encontrada':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'livre': return 'Livre';
      case 'com_consumo': return 'Com Consumo';
      case 'fechada': return 'Fechada';
      case 'nao_encontrada': return 'Não Encontrada';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Validador de Comandas</h1>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs defaultValue="tokens">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tokens" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Links de Acesso
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="space-y-4 mt-4">
            {/* Criar novo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Criar Novo Validador</CardTitle>
                <CardDescription>
                  Cada validador gera um link único que pode ser usado em diferentes dispositivos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do validador (ex: Entrada Principal)"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateToken()}
                  />
                  <Button onClick={handleCreateToken} disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de tokens */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tokens.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ScanLine className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum validador criado ainda
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie um validador para gerar um link de acesso
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => (
                  <Card key={token.id} className={!token.is_active ? 'opacity-60' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-primary" />
                          <span className="font-medium">{token.name}</span>
                          {!token.is_active && (
                            <Badge variant="secondary">Desativado</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={token.is_active}
                            onCheckedChange={() => handleToggleActive(token.id, token.is_active)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(token.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={`${baseUrl}/validar-comanda/${token.token}`}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyLink(token.token)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(`/validar-comanda/${token.token}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Criado em {format(new Date(token.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico de Validações
                </CardTitle>
                <CardDescription>
                  Todas as consultas realizadas são registradas para auditoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma validação registrada ainda</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div 
                          key={log.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(log.status)}
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  #{log.comanda_number}
                                </Badge>
                                <span className="text-sm">{getStatusLabel(log.status)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.validated_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {log.status === 'com_consumo' && (
                              <div>
                                <span className="text-sm font-medium text-yellow-600">
                                  {formatCurrency(log.total_amount)}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {log.items_count} itens
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
