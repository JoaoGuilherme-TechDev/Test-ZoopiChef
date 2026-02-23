import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Send, Download, Calendar, FileText, CheckCircle2, Clock, XCircle, FileArchive, AlertTriangle, TestTube, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyTableSettings } from '@/hooks/useCompanyTableSettings';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface AccountantConfig {
  id: string;
  accountant_name: string | null;
  accountant_email: string;
  send_nfce_xml: boolean;
  send_nfe_xml: boolean;
  auto_send_enabled: boolean;
  send_day_of_month: number;
  last_sent_at: string | null;
  last_sent_period: string | null;
}

interface XmlExport {
  id: string;
  export_type: 'nfce' | 'nfe' | 'all';
  period_start: string;
  period_end: string;
  documents_count: number;
  sent_to_email: string | null;
  sent_at: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

export function FiscalAccountantConfig() {
  const { data: company } = useCompany();
  const { data: smtpSettings, isLoading: isLoadingSmtp } = useCompanyTableSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState<Partial<AccountantConfig>>({
    accountant_name: '',
    accountant_email: '',
    send_nfce_xml: true,
    send_nfe_xml: true,
    auto_send_enabled: false,
    send_day_of_month: 1,
  });

  // Check if SMTP is configured
  const isSmtpConfigured = smtpSettings?.smtp_enabled && 
    smtpSettings?.smtp_host && 
    smtpSettings?.smtp_user && 
    smtpSettings?.smtp_password;

  // Fetch config
  const { data: savedConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['fiscal-accountant-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('fiscal_accountant_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as AccountantConfig | null;
    },
    enabled: !!company?.id,
  });

  // Fetch export history
  const { data: exports = [], isLoading: isLoadingExports } = useQuery({
    queryKey: ['fiscal-xml-exports', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('fiscal_xml_exports')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as XmlExport[];
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, [savedConfig]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      if (!config.accountant_email) throw new Error('Email do contador é obrigatório');

      const payload = {
        company_id: company.id,
        accountant_name: config.accountant_name || null,
        accountant_email: config.accountant_email,
        send_nfce_xml: config.send_nfce_xml ?? true,
        send_nfe_xml: config.send_nfe_xml ?? true,
        auto_send_enabled: config.auto_send_enabled ?? false,
        send_day_of_month: config.send_day_of_month || 1,
      };

      if (savedConfig?.id) {
        const { error } = await supabase
          .from('fiscal_accountant_config')
          .update(payload)
          .eq('id', savedConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fiscal_accountant_config')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Configurações salvas com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['fiscal-accountant-config'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Export XML mutation
  const exportXmlMutation = useMutation({
    mutationFn: async ({ exportType, sendEmail }: { exportType: 'nfce' | 'nfe' | 'all'; sendEmail: boolean }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      // Get last month period
      const lastMonth = subMonths(new Date(), 1);
      const periodStart = startOfMonth(lastMonth);
      const periodEnd = endOfMonth(lastMonth);

      // Create export record
      const { data: exportRecord, error: insertError } = await supabase
        .from('fiscal_xml_exports')
        .insert({
          company_id: company.id,
          export_type: exportType,
          period_start: format(periodStart, 'yyyy-MM-dd'),
          period_end: format(periodEnd, 'yyyy-MM-dd'),
          sent_to_email: sendEmail ? config.accountant_email : null,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call edge function to generate and optionally send XML
      const { data, error } = await supabase.functions.invoke('fiscal-export-xml', {
        body: {
          exportId: exportRecord.id,
          companyId: company.id,
          exportType,
          periodStart: format(periodStart, 'yyyy-MM-dd'),
          periodEnd: format(periodEnd, 'yyyy-MM-dd'),
          sendEmail,
          accountantEmail: sendEmail ? config.accountant_email : null,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.sendEmail ? 'XML enviado para o contador' : 'XML gerado com sucesso',
        description: 'O arquivo está sendo processado.',
      });
      queryClient.invalidateQueries({ queryKey: ['fiscal-xml-exports'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao exportar XML',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test SMTP mutation
  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      if (!config.accountant_email) throw new Error('Email do contador não configurado');

      setIsTesting(true);
      
      const { data, error } = await supabase.functions.invoke('fiscal-test-smtp', {
        body: {
          companyId: company.id,
          testEmail: config.accountant_email,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Falha no teste');
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Teste de envio realizado!',
        description: `Email de teste enviado para ${config.accountant_email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Falha no teste de envio',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsTesting(false);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Processando</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getExportTypeLabel = (type: string) => {
    switch (type) {
      case 'nfce': return 'NFC-e';
      case 'nfe': return 'NF-e';
      case 'all': return 'Todos';
      default: return type;
    }
  };

  if (isLoadingConfig || isLoadingSmtp) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SMTP Status Alert */}
      {!isSmtpConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuração SMTP necessária</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Para enviar emails é necessário configurar o servidor SMTP nas configurações da empresa.
            </span>
            <Button variant="outline" size="sm" asChild className="ml-4">
              <Link to="/settings/table">
                <Settings className="h-4 w-4 mr-2" />
                Configurar SMTP
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isSmtpConfigured && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>SMTP Configurado</AlertTitle>
          <AlertDescription>
            Servidor: <strong>{smtpSettings.smtp_host}</strong> | 
            Remetente: <strong>{smtpSettings.smtp_from_email || smtpSettings.smtp_user}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuração do Contador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envio de XML para Contador
          </CardTitle>
          <CardDescription>
            Configure o envio automático de arquivos XML para sua contabilidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Contador</Label>
              <Input
                placeholder="Nome do escritório ou contador"
                value={config.accountant_name || ''}
                onChange={(e) => setConfig({ ...config, accountant_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email do Contador *</Label>
              <Input
                type="email"
                placeholder="contador@escritorio.com.br"
                value={config.accountant_email || ''}
                onChange={(e) => setConfig({ ...config, accountant_email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Envio Automático Mensal</p>
              <p className="text-sm text-muted-foreground">
                Envia os XMLs automaticamente no primeiro dia de cada mês
              </p>
            </div>
            <Switch
              checked={config.auto_send_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, auto_send_enabled: checked })}
            />
          </div>

          {config.auto_send_enabled && (
            <div className="space-y-2">
              <Label>Dia do Mês para Envio</Label>
              <Select 
                value={String(config.send_day_of_month || 1)}
                onValueChange={(v) => setConfig({ ...config, send_day_of_month: parseInt(v) })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">NFC-e (Cupom Fiscal)</p>
                <p className="text-sm text-muted-foreground">Incluir XMLs de NFC-e</p>
              </div>
              <Switch
                checked={config.send_nfce_xml}
                onCheckedChange={(checked) => setConfig({ ...config, send_nfce_xml: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">NF-e (Nota Fiscal)</p>
                <p className="text-sm text-muted-foreground">Incluir XMLs de NF-e</p>
              </div>
              <Switch
                checked={config.send_nfe_xml}
                onCheckedChange={(checked) => setConfig({ ...config, send_nfe_xml: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline"
              onClick={() => testSmtpMutation.mutate()}
              disabled={!isSmtpConfigured || !config.accountant_email || isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Testar Envio
            </Button>
            <Button 
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending || !config.accountant_email}
            >
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ações de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Exportar XMLs
          </CardTitle>
          <CardDescription>
            Exporte os XMLs do mês anterior para download ou envio ao contador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={() => exportXmlMutation.mutate({ exportType: 'nfce', sendEmail: false })}
              disabled={exportXmlMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar NFC-e
            </Button>
            <Button 
              variant="outline"
              onClick={() => exportXmlMutation.mutate({ exportType: 'nfe', sendEmail: false })}
              disabled={exportXmlMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar NF-e
            </Button>
            <Button 
              variant="outline"
              onClick={() => exportXmlMutation.mutate({ exportType: 'all', sendEmail: false })}
              disabled={exportXmlMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Todos
            </Button>
            
            {config.accountant_email && (
              <>
                <div className="w-px bg-border h-8" />
                <Button 
                  onClick={() => exportXmlMutation.mutate({ exportType: 'nfce', sendEmail: true })}
                  disabled={exportXmlMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar NFC-e
                </Button>
                <Button 
                  onClick={() => exportXmlMutation.mutate({ exportType: 'nfe', sendEmail: true })}
                  disabled={exportXmlMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar NF-e
                </Button>
                <Button 
                  onClick={() => exportXmlMutation.mutate({ exportType: 'all', sendEmail: true })}
                  disabled={exportXmlMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Todos
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Exportações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Exportações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingExports ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : exports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma exportação realizada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Enviado para</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <Badge variant="outline">{getExportTypeLabel(exp.export_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(exp.period_start), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                      {format(new Date(exp.period_end), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{exp.documents_count}</TableCell>
                    <TableCell className="text-sm">{exp.sent_to_email || '-'}</TableCell>
                    <TableCell>{getStatusBadge(exp.status)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(exp.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
