import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Printer, 
  Download, 
  Settings,
  Wifi,
  Usb,
  FileText,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { PrinterConfigManager } from '@/components/settings/printing/PrinterConfigManager';
import { PrintJobMonitor } from '@/components/settings/printing/PrintJobMonitor';
import { createSimpleAgentZipBlob } from '@/lib/print/downloadSimpleAgentZip';

export default function SettingsPrinting() {
  const { data: company } = useCompany();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const installSteps = `ZOOPI SIMPLE PRINT AGENT - INSTRUÇÕES

1) Baixe o arquivo .zip clicando no botão abaixo
2) Extraia os arquivos em uma pasta no computador com a impressora
3) Instale o Node.js 20+ (https://nodejs.org)
4) Abra o terminal/CMD na pasta e execute:
   npm install
   npm start
5) O agente vai conectar automaticamente e aguardar jobs de impressão

CONFIGURAÇÃO (config.json):
- printerName: nome exato da impressora no Windows (ex: "EPSON TM-T20")
- encoding: cp860 (padrão para português)

Para iniciar rápido no Windows, use o arquivo INICIAR.bat`;

  const handleDownloadAgent = () => {
    setCopied(false);
    setDownloadError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setDownloadDialogOpen(true);
  };

  const handleCopySteps = async () => {
    try {
      await navigator.clipboard.writeText(installSteps);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!company?.id) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      // Gera o ZIP e tenta disparar o download automaticamente no clique.
      // Mantemos um link de fallback caso o navegador/iframe bloqueie o download programático.
      const blob = await createSimpleAgentZipBlob({ companyId: company.id });
      const url = URL.createObjectURL(blob);

       // Tenta baixar automaticamente
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zoopi-simple-print-agent.zip';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      setDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao gerar o ZIP.';
      // Loga para diagnóstico (sem toast, pois é suprimido globalmente)
      console.error('[SimpleAgentZip] erro ao gerar ZIP:', e);
      setDownloadError(
        `${msg}\n\nSe você estiver no Preview embutido, abra o app em uma nova aba e tente novamente.`
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout title="Central de Impressão">
      <div className="space-y-6">
        <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
          <DialogContent accessibilityTitle="Baixar Agente de Impressão">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Baixar Agente de Impressão
              </DialogTitle>
              <DialogDescription>
                Agente simples para Windows com impressoras USB. Roda via Node.js.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {downloadError && (
                <Alert>
                  <AlertDescription className="whitespace-pre-wrap">{downloadError}</AlertDescription>
                </Alert>
              )}

              {downloadUrl && (
                <Alert>
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">ZIP pronto.</p>
                    <a
                      className="underline"
                      href={downloadUrl}
                      download="zoopi-simple-print-agent.zip"
                      rel="noopener"
                    >
                      Clique aqui para baixar o zoopi-simple-print-agent.zip
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {/* Botão principal de download */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleDownloadZip}
                disabled={!company?.id || downloading}
              >
                <Download className="h-5 w-5 mr-2" />
                {downloading
                  ? 'Gerando ZIP...'
                  : downloadUrl
                    ? 'Gerar novamente'
                    : 'Baixar ZIP agora'}
              </Button>

              <Separator />

              {/* Instruções */}
              <div className="rounded-md border bg-muted/40 p-4 text-sm whitespace-pre-wrap font-mono text-xs">
                {installSteps}
              </div>

              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={handleCopySteps}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar instruções
                  </>
                )}
              </Button>

              <Separator />
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>O que vem no ZIP:</strong></p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>agent.js - código do agente</li>
                  <li>config.json - configurações (já preenchido com seu Company ID)</li>
                  <li>package.json - dependências</li>
                  <li>INICIAR.bat - atalho para Windows</li>
                  <li>LEIAME.txt - instruções</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Área de Download */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Agente de Impressão Local
                </CardTitle>
                <CardDescription>
                  Aplicativo que roda no computador com as impressoras conectadas
                </CardDescription>
              </div>
              <Button onClick={handleDownloadAgent}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Agente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                O agente de impressão roda no computador local conectado à impressora. 
                Baixe, configure e mantenha rodando para receber os jobs de impressão automaticamente.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Usb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">USB / Local</p>
                      <p className="text-xs text-muted-foreground">Impressoras conectadas ao PC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Wifi className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Rede / IP</p>
                      <p className="text-xs text-muted-foreground">Impressoras com IP fixo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">ESC/POS</p>
                      <p className="text-xs text-muted-foreground">Formatação profissional</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Configuração */}
        <Tabs defaultValue="printers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="printers" className="gap-2">
              <Printer className="h-4 w-4" />
              Impressoras
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <FileText className="h-4 w-4" />
              Fila de Impressão
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="printers">
            <PrinterConfigManager companyId={company?.id} />
          </TabsContent>

          <TabsContent value="queue">
            <PrintJobMonitor companyId={company?.id} />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
                <CardDescription>
                  Opções de integração e comportamento do sistema de impressão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Dados de Conexão para o Agente</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">URL:</span>
                      <code className="bg-background px-2 py-0.5 rounded text-xs">
                        {import.meta.env.VITE_SUPABASE_URL || 'Não configurado'}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company ID:</span>
                      <code className="bg-background px-2 py-0.5 rounded text-xs">
                        {company?.id || 'N/A'}
                      </code>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    O ZIP já vem com esses dados preenchidos automaticamente.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Precisa de Ajuda?</p>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com o suporte técnico
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="mailto:suporte@zoopi.com.br" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Contato
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
