import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ban, Plus, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VoidedNumber {
  id: string;
  document_type: 'nfe' | 'nfce';
  series: number;
  number_start: number;
  number_end: number;
  reason: string;
  protocol_number: string | null;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  error_message: string | null;
  voided_at: string;
  created_at: string;
}

export function FiscalVoidNumbers() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    document_type: 'nfce' as 'nfe' | 'nfce',
    series: 1,
    number_start: 1,
    number_end: 1,
    reason: '',
  });

  // Fetch voided numbers
  const { data: voidedNumbers = [], isLoading } = useQuery({
    queryKey: ['fiscal-voided-numbers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('fiscal_voided_numbers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as VoidedNumber[];
    },
    enabled: !!company?.id,
  });

  // Create void request mutation
  const createVoidMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Validate
      if (data.number_end < data.number_start) {
        throw new Error('Número final deve ser maior ou igual ao inicial');
      }
      if (!data.reason.trim()) {
        throw new Error('Motivo é obrigatório');
      }
      if (data.reason.length < 15) {
        throw new Error('Motivo deve ter pelo menos 15 caracteres');
      }

      const { error } = await supabase
        .from('fiscal_voided_numbers')
        .insert({
          company_id: company.id,
          document_type: data.document_type,
          series: data.series,
          number_start: data.number_start,
          number_end: data.number_end,
          reason: data.reason.trim(),
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Inutilização registrada', description: 'A solicitação será processada pela SEFAZ.' });
      queryClient.invalidateQueries({ queryKey: ['fiscal-voided-numbers'] });
      setShowDialog(false);
      setFormData({ document_type: 'nfce', series: 1, number_start: 1, number_end: 1, reason: '' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar inutilização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Process void (call SEFAZ) mutation
  const processVoidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('fiscal-void-numbers', {
        body: { voidId: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Inutilização processada' });
      queryClient.invalidateQueries({ queryKey: ['fiscal-voided-numbers'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao processar inutilização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Processando</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Inutilização de Numeração
            </CardTitle>
            <CardDescription>
              Inutilize números de NF-e/NFC-e que tiveram erros de transmissão
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Inutilização
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : voidedNumbers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ban className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma numeração inutilizada</p>
            <p className="text-sm">Inutilize números que não puderam ser transmitidos</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Números</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voidedNumbers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {item.document_type === 'nfe' ? 'NF-e' : 'NFC-e'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.series}</TableCell>
                  <TableCell>
                    {item.number_start === item.number_end 
                      ? item.number_start 
                      : `${item.number_start} - ${item.number_end}`
                    }
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.reason}>
                    {item.reason}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {item.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => processVoidMutation.mutate(item.id)}
                        disabled={processVoidMutation.isPending}
                      >
                        Processar
                      </Button>
                    )}
                    {item.error_message && (
                      <p className="text-xs text-destructive mt-1">{item.error_message}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog para nova inutilização */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Inutilização de Numeração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select 
                value={formData.document_type} 
                onValueChange={(v) => setFormData({ ...formData, document_type: v as 'nfe' | 'nfce' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nfce">NFC-e</SelectItem>
                  <SelectItem value="nfe">NF-e</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Série</Label>
              <Input 
                type="number"
                min={1}
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número Inicial</Label>
                <Input 
                  type="number"
                  min={1}
                  value={formData.number_start}
                  onChange={(e) => setFormData({ ...formData, number_start: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Número Final</Label>
                <Input 
                  type="number"
                  min={1}
                  value={formData.number_end}
                  onChange={(e) => setFormData({ ...formData, number_end: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo da Inutilização *</Label>
              <Textarea 
                placeholder="Descreva o motivo da inutilização (mínimo 15 caracteres)"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.reason.length}/15 caracteres (mínimo)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createVoidMutation.mutate(formData)}
              disabled={createVoidMutation.isPending || formData.reason.length < 15}
            >
              Registrar Inutilização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
