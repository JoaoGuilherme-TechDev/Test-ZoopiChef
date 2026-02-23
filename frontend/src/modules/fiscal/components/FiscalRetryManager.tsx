import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FiscalDocument {
  id: string;
  document_type: string;
  status: string;
  number: number | null;
  series: number | null;
  recipient_name: string | null;
  total_cents: number;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  can_retry: boolean;
  last_retry_at: string | null;
  created_at: string;
}

interface PDVConfig {
  id: string;
  pdv_name: string;
  pdv_identifier: string;
  nfe_series: number;
  nfce_series: number;
  is_active: boolean;
}

export function FiscalRetryManager() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null);
  const [newPDV, setNewPDV] = useState({ name: '', identifier: '', nfe_series: 1, nfce_series: 1 });
  const [showPDVDialog, setShowPDVDialog] = useState(false);

  // Fetch failed documents
  const { data: failedDocs = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['fiscal-failed-docs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('company_id', company.id)
        .in('status', ['error', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as FiscalDocument[];
    },
    enabled: !!company?.id,
  });

  // Fetch PDV configs
  const { data: pdvConfigs = [], isLoading: isLoadingPDV } = useQuery({
    queryKey: ['pdv-fiscal-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('pdv_fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .order('pdv_name');
      if (error) throw error;
      return (data || []) as PDVConfig[];
    },
    enabled: !!company?.id,
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (docId: string) => {
      // Call edge function to retry
      const { data, error } = await supabase.functions.invoke('fiscal-emit', {
        body: { documentId: docId, isRetry: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Reprocessamento iniciado',
        description: 'O documento está sendo reprocessado na SEFAZ.',
      });
      queryClient.invalidateQueries({ queryKey: ['fiscal-failed-docs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reprocessar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add PDV mutation
  const addPDVMutation = useMutation({
    mutationFn: async (pdv: typeof newPDV) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      const { error } = await supabase
        .from('pdv_fiscal_config')
        .insert({
          company_id: company.id,
          pdv_name: pdv.name,
          pdv_identifier: pdv.identifier,
          nfe_series: pdv.nfe_series,
          nfce_series: pdv.nfce_series,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'PDV adicionado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['pdv-fiscal-config'] });
      setShowPDVDialog(false);
      setNewPDV({ name: '', identifier: '', nfe_series: 1, nfce_series: 1 });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar PDV',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete PDV mutation
  const deletePDVMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pdv_fiscal_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'PDV removido' });
      queryClient.invalidateQueries({ queryKey: ['pdv-fiscal-config'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Erro</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      case 'authorized':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Autorizado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'nfe': return 'NF-e';
      case 'nfce': return 'NFC-e';
      case 'nfse': return 'NFS-e';
      case 'cupom_controle': return 'Cupom';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* PDV Series Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Série por PDV
              </CardTitle>
              <CardDescription>
                Configure qual série cada ponto de venda deve utilizar
              </CardDescription>
            </div>
            <Dialog open={showPDVDialog} onOpenChange={setShowPDVDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo PDV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar PDV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome do PDV</Label>
                    <Input 
                      placeholder="Ex: Caixa 01"
                      value={newPDV.name}
                      onChange={(e) => setNewPDV({ ...newPDV, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Identificador</Label>
                    <Input 
                      placeholder="Ex: PDV001"
                      value={newPDV.identifier}
                      onChange={(e) => setNewPDV({ ...newPDV, identifier: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Série NF-e</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={newPDV.nfe_series}
                        onChange={(e) => setNewPDV({ ...newPDV, nfe_series: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Série NFC-e</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={newPDV.nfce_series}
                        onChange={(e) => setNewPDV({ ...newPDV, nfce_series: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPDVDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => addPDVMutation.mutate(newPDV)}
                    disabled={!newPDV.name || !newPDV.identifier || addPDVMutation.isPending}
                  >
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPDV ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : pdvConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum PDV configurado</p>
              <p className="text-sm">Adicione PDVs para definir séries específicas por caixa</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PDV</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Série NF-e</TableHead>
                  <TableHead>Série NFC-e</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdvConfigs.map((pdv) => (
                  <TableRow key={pdv.id}>
                    <TableCell className="font-medium">{pdv.pdv_name}</TableCell>
                    <TableCell>{pdv.pdv_identifier}</TableCell>
                    <TableCell>{pdv.nfe_series}</TableCell>
                    <TableCell>{pdv.nfce_series}</TableCell>
                    <TableCell>
                      <Badge variant={pdv.is_active ? 'default' : 'secondary'}>
                        {pdv.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deletePDVMutation.mutate(pdv.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Failed Documents for Retry */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Documentos com Erro</CardTitle>
          </div>
          <CardDescription>
            Reprocesse documentos que falharam na emissão junto à SEFAZ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : failedDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p>Nenhum documento com erro</p>
              <p className="text-sm">Todos os documentos foram emitidos com sucesso</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">{getDocTypeLabel(doc.document_type)}</Badge>
                    </TableCell>
                    <TableCell>{doc.recipient_name || '-'}</TableCell>
                    <TableCell>
                      {(doc.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {doc.retry_count}/{doc.max_retries}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(doc.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {doc.can_retry && doc.retry_count < doc.max_retries && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => retryMutation.mutate(doc.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reprocessar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Detalhes do Erro SEFAZ
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{getDocTypeLabel(selectedDoc.document_type)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Destinatário:</span>
                  <p className="font-medium">{selectedDoc.recipient_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>
                  <p className="font-medium">
                    {(selectedDoc.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tentativas:</span>
                  <p className="font-medium">{selectedDoc.retry_count} de {selectedDoc.max_retries}</p>
                </div>
              </div>
              
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <h4 className="font-medium text-destructive mb-2">Mensagem da SEFAZ:</h4>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedDoc.error_message || 'Nenhuma mensagem de erro disponível'}
                </p>
              </div>

              {selectedDoc.last_retry_at && (
                <p className="text-xs text-muted-foreground">
                  Última tentativa: {format(new Date(selectedDoc.last_retry_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
