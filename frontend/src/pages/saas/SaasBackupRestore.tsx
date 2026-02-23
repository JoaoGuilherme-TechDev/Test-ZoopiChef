import { useState, useRef } from 'react';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileJson,
  Shield,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';

interface RestoreResult {
  success: boolean;
  results: { table: string; action: string; count: number }[];
  errors?: string[];
  summary: {
    tablesRestored: number;
    totalRecords: number;
    errorsCount: number;
  };
}

interface BackupMetadata {
  version: string;
  type: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  created_at: string;
  tables_included: string[];
  total_tables: number;
  errors?: string[];
}

export default function SaasBackupRestore() {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupMetadata | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [backupProgress, setBackupProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all companies
  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['saas-all-companies-backup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);

  const handleBackup = async () => {
    if (!selectedCompanyId) {
      toast.error('Selecione uma empresa para backup');
      return;
    }

    setIsBackingUp(true);
    setBackupProgress('Coletando dados da empresa...');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/saas-company-backup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ companyId: selectedCompanyId }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao gerar backup');
      }

      setBackupProgress('Gerando arquivo de download...');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${selectedCompany?.slug || selectedCompanyId}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup gerado e download iniciado!');
    } catch (err) {
      toast.error(`Erro no backup: ${(err as Error).message}`);
    } finally {
      setIsBackingUp(false);
      setBackupProgress('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Apenas arquivos .json são aceitos');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data._metadata || data._metadata.type !== 'saas_company_backup') {
        toast.error('Arquivo de backup inválido');
        return;
      }

      setRestoreFile(file);
      setRestorePreview(data._metadata);
      setRestoreResult(null);
    } catch {
      toast.error('Erro ao ler arquivo de backup');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestore = async () => {
    if (!restoreFile || !selectedCompanyId) return;

    setShowRestoreConfirm(false);
    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const text = await restoreFile.text();
      const backupData = JSON.parse(text);

      const { data, error } = await supabase.functions.invoke('saas-company-restore', {
        body: {
          companyId: selectedCompanyId,
          backupData,
          mode: 'overwrite',
        },
      });

      if (error) throw error;

      setRestoreResult(data as RestoreResult);

      if (data.summary.errorsCount === 0) {
        toast.success(`Restauração concluída! ${data.summary.totalRecords} registros restaurados.`);
      } else {
        toast.warning(`Restauração parcial. ${data.summary.totalRecords} registros, ${data.summary.errorsCount} erros.`);
      }
    } catch (err) {
      toast.error(`Erro na restauração: ${(err as Error).message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SaasLayout title="Backup & Restore">
      <div className="space-y-6">
        {/* Company selector */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Selecione a Empresa
            </CardTitle>
            <CardDescription className="text-slate-400">
              Escolha a empresa para backup ou restauração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full max-w-md bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder={loadingCompanies ? 'Carregando...' : 'Selecione uma empresa'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id} className="text-white hover:bg-slate-700">
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Backup Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-green-400" />
                Download Backup
              </CardTitle>
              <CardDescription className="text-slate-400">
                Gera um backup completo de todos os dados da empresa selecionada em formato JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                  <span>
                    O backup inclui: dados da empresa, usuários, produtos, categorias, pedidos, 
                    pagamentos, configurações, integrações (sem secrets), clientes, estoque, 
                    financeiro, reservas, delivery e mais.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-yellow-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Chaves de API e tokens sensíveis são automaticamente removidos por segurança.
                  </span>
                </div>
              </div>

              <Button
                onClick={handleBackup}
                disabled={!selectedCompanyId || isBackingUp}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {backupProgress || 'Gerando backup...'}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Company Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Restore Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-400" />
                Upload Company Backup
              </CardTitle>
              <CardDescription className="text-slate-400">
                Restaure um backup previamente gerado pelo sistema na empresa selecionada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    A restauração irá <strong>substituir todos os dados existentes</strong> da empresa 
                    selecionada. Esta ação não pode ser desfeita.
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedCompanyId || isRestoring}
                variant="outline"
                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Selecionar arquivo de backup
              </Button>

              {/* Preview */}
              {restorePreview && (
                <div className="bg-slate-900/80 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-white">Preview do Backup</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-400">Empresa original:</div>
                    <div className="text-white">{restorePreview.company_name}</div>
                    <div className="text-slate-400">Data do backup:</div>
                    <div className="text-white">
                      {new Date(restorePreview.created_at).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-slate-400">Tabelas incluídas:</div>
                    <div className="text-white">{restorePreview.total_tables}</div>
                    <div className="text-slate-400">Versão:</div>
                    <div className="text-white">{restorePreview.version}</div>
                  </div>

                  {restorePreview.company_id !== selectedCompanyId && (
                    <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 rounded p-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        O backup é de outra empresa ({restorePreview.company_name}). 
                        Os dados serão restaurados na empresa selecionada: <strong>{selectedCompany?.name}</strong>.
                      </span>
                    </div>
                  )}

                  <Button
                    onClick={() => setShowRestoreConfirm(true)}
                    disabled={isRestoring}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Restaurando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Restaurar Backup
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Restore Results */}
        {restoreResult && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {restoreResult.summary.errorsCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                )}
                Resultado da Restauração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {restoreResult.summary.tablesRestored} tabelas restauradas
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                  {restoreResult.summary.totalRecords} registros
                </Badge>
                {restoreResult.summary.errorsCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    {restoreResult.summary.errorsCount} erros
                  </Badge>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Detailed results */}
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {restoreResult.results
                    .filter(r => r.count > 0)
                    .map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span className="text-slate-300">{r.table}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {r.action}
                          </Badge>
                          <span className="text-white font-mono">{r.count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>

              {/* Errors */}
              {restoreResult.errors && restoreResult.errors.length > 0 && (
                <>
                  <Separator className="bg-slate-700" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-400">Erros</h4>
                    <ScrollArea className="max-h-40">
                      <div className="space-y-1">
                        {restoreResult.errors.map((err, i) => (
                          <div key={i} className="text-xs text-red-300 bg-red-500/10 rounded px-2 py-1">
                            {err}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Restore Confirmation Dialog */}
        <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Confirmar Restauração
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300 space-y-3">
                <p>
                  Você está prestes a restaurar um backup na empresa:
                </p>
                <p className="font-semibold text-white text-lg">
                  {selectedCompany?.name}
                </p>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                  <strong>⚠️ ATENÇÃO:</strong> Esta ação irá substituir TODOS os dados existentes 
                  da empresa. Produtos, pedidos, clientes, configurações — tudo será sobrescrito. 
                  Esta ação NÃO pode ser desfeita.
                </div>
                <p className="text-sm">
                  Backup original: <strong>{restorePreview?.company_name}</strong> de{' '}
                  {restorePreview && new Date(restorePreview.created_at).toLocaleString('pt-BR')}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestore}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Sim, restaurar backup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SaasLayout>
  );
}
