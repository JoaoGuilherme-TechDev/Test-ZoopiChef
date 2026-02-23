import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFiscalDocuments } from '../hooks/useFiscalDocuments';
import { 
  DOCUMENT_TYPE_LABELS, 
  DOCUMENT_STATUS_LABELS,
  DocumentType,
  DocumentStatus 
} from '../types';
import { 
  FileText, 
  Plus, 
  Search,
  Download,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  FileDown,
  Settings
} from 'lucide-react';

const STATUS_CONFIG: Record<DocumentStatus, { color: string; icon: any }> = {
  draft: { color: 'bg-gray-500', icon: FileText },
  processing: { color: 'bg-yellow-500', icon: Clock },
  authorized: { color: 'bg-green-500', icon: CheckCircle },
  cancelled: { color: 'bg-red-500', icon: XCircle },
  denied: { color: 'bg-orange-500', icon: AlertCircle },
  error: { color: 'bg-red-600', icon: AlertCircle },
};

export function FiscalDocumentsPage() {
  const { documents, config, isLoading, authorizeDocument, downloadPdf, downloadXml } = useFiscalDocuments();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<DocumentType | 'all'>('all');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.recipient_document.includes(searchTerm) ||
      doc.access_key?.includes(searchTerm);
    
    const matchesType = activeTab === 'all' || doc.document_type === activeTab;
    
    return matchesSearch && matchesType;
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  // KPIs
  const totalDocuments = documents.length;
  const authorizedCount = documents.filter(d => d.status === 'authorized').length;
  const pendingCount = documents.filter(d => d.status === 'draft' || d.status === 'processing').length;
  const errorCount = documents.filter(d => d.status === 'error' || d.status === 'denied').length;

  if (isLoading) {
    return (
      <DashboardLayout title="Documentos Fiscais">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!config) {
    return (
      <DashboardLayout title="Documentos Fiscais">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuração Necessária</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure sua integração fiscal para começar a emitir notas.
            </p>
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Configurar Integração
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Documentos Fiscais">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Documentos Fiscais</h1>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Nota
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Autorizadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{authorizedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Erros</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ ou chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentType | 'all')}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="nfe">NF-e</TabsTrigger>
            <TabsTrigger value="nfce">NFC-e</TabsTrigger>
            <TabsTrigger value="nfse">NFS-e</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum documento encontrado
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredDocuments.map((doc) => {
                      const statusConfig = STATUS_CONFIG[doc.status];
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {DOCUMENT_TYPE_LABELS[doc.document_type]} #{doc.number}
                                  </span>
                                  <Badge className={statusConfig.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {DOCUMENT_STATUS_LABELS[doc.status]}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {doc.recipient_name} • {doc.recipient_document}
                                </p>
                                {doc.access_key && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {doc.access_key}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(doc.total_cents)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(doc.created_at)}
                                </p>
                              </div>

                              <div className="flex gap-1">
                                {doc.status === 'draft' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => authorizeDocument.mutate(doc.id)}
                                    disabled={authorizeDocument.isPending}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Emitir
                                  </Button>
                                )}
                                {doc.status === 'authorized' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => downloadPdf(doc)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => downloadXml(doc)}
                                    >
                                      <FileDown className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {doc.error_message && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-600 dark:text-red-400">
                              {doc.error_message}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
