import { useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Check,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Image as ImageIcon,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEnhancedProductImport,
  downloadUnifiedProductsTemplate,
  exportImportReportCSV,
  exportImportReport,
} from '../hooks/useEnhancedProductImport';
import type { ImportReport, ValidationResult } from '../hooks/useEnhancedProductImport';

interface EnhancedProductImporterProps {
  onComplete?: () => void;
}

export function EnhancedProductImporter({ onComplete }: EnhancedProductImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    step,
    parsedProducts,
    report,
    detectedTemplate,
    isValidating,
    isImporting,
    isDownloadingImages,
    startImport,
    confirmImport,
    reset,
  } = useEnhancedProductImport();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await startImport(file);
  }, [startImport]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await startImport(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const templateLabel = detectedTemplate === 'old' ? 'Clássico' : detectedTemplate === 'new' ? 'Novo' : 'Mesclado';

  // ─── STEP: Upload ───
  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação Unificada de Produtos
          </CardTitle>
          <CardDescription>
            Faça upload de um CSV com seus produtos. Compatível com o template clássico e o novo,
            incluindo importação de imagens via URL, configuração de pizza, e validação em 3 fases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isValidating && "opacity-50 pointer-events-none"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isValidating ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Validando produtos...</p>
                <p className="text-sm text-muted-foreground">
                  Verificando campos, detectando duplicatas e validando URLs
                </p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Arraste e solte seu arquivo CSV aqui
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Aceita template clássico, novo ou mesclado — detecção automática
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                />
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                  <Button variant="secondary" onClick={downloadUnifiedProductsTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo Unificado
                  </Button>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Campos obrigatórios:</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    <Badge variant="secondary">nome *</Badge>
                    <Badge variant="secondary">categoria *</Badge>
                    <Badge variant="secondary">preco *</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-3">Campos opcionais:</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    <Badge variant="outline">subcategoria</Badge>
                    <Badge variant="outline">descricao</Badge>
                    <Badge variant="outline">codigo_sku</Badge>
                    <Badge variant="outline">estoque</Badge>
                    <Badge variant="outline">ativo</Badge>
                    <Badge variant="outline">observacoes</Badge>
                    <Badge variant="outline">tipo_produto</Badge>
                    <Badge variant="outline">grupo_opcionais</Badge>
                    <Badge variant="outline">url_imagem_principal</Badge>
                    <Badge variant="outline">urls_imagens_secundarias</Badge>
                    <Badge variant="outline">eh_pizza</Badge>
                    <Badge variant="outline">tamanhos_pizza</Badge>
                    <Badge variant="outline">sabores_pizza</Badge>
                    <Badge variant="outline">bordas_pizza</Badge>
                    <Badge variant="outline">permite_meio_a_meio</Badge>
                    <Badge variant="outline">ordem_exibicao</Badge>
                    <Badge variant="outline">status_visibilidade</Badge>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP: Preview ───
  if (step === 'preview' && report.phase1) {
    return <ImportPreview
      report={report}
      parsedProducts={parsedProducts}
      isImporting={isImporting}
      templateType={detectedTemplate}
      onConfirm={confirmImport}
      onCancel={reset}
    />;
  }

  // ─── STEP: Importing ───
  if (step === 'importing') {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {isDownloadingImages ? 'Baixando imagens...' : 'Importando produtos...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isDownloadingImages
                ? 'Fazendo download e salvando imagens dos produtos'
                : 'Criando/atualizando categorias, subcategorias e produtos'}
            </p>
            <Progress className="w-64" value={isDownloadingImages ? 75 : 40} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP: Report ───
  if (step === 'report') {
    return <ImportReportView report={report} onDone={() => { reset(); onComplete?.(); }} />;
  }

  return null;
}

// ─── Preview Component ───

function ImportPreview({
  report,
  parsedProducts,
  isImporting,
  templateType,
  onConfirm,
  onCancel,
}: {
  report: ImportReport;
  parsedProducts: any[];
  isImporting: boolean;
  templateType: 'old' | 'new' | 'merged';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const phase1 = report.phase1!;
  const { summary, results } = phase1;
  const validProducts = results.filter(r => r.valid);
  const invalidProducts = results.filter(r => !r.valid);
  const withWarnings = results.filter(r => r.warnings.length > 0 && r.valid);

  const templateLabel = templateType === 'old' ? 'Clássico' : templateType === 'new' ? 'Novo' : 'Mesclado';

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Pré-visualização da Importação
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            Revise os dados antes de confirmar
            <Badge variant="secondary" className="text-xs">{templateLabel}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard icon={<FileText className="h-4 w-4" />} label="Total" value={summary.total} />
            <SummaryCard icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} label="Válidos" value={summary.valid} variant="success" />
            <SummaryCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Erros" value={summary.errors} variant="error" />
            <SummaryCard icon={<RefreshCw className="h-4 w-4 text-blue-600" />} label="Duplicatas" value={summary.duplicates || 0} variant="info" />
            <SummaryCard icon={<ImageIcon className="h-4 w-4 text-blue-600" />} label="Imagens" value={summary.imagesToDownload} variant="info" />
          </div>

          {(summary.newCategories.length > 0 || summary.newSubcategories.length > 0) && (
            <div className="mt-4 p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Serão criados automaticamente:</span>
              </div>
              {summary.newCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  <span className="text-xs text-muted-foreground">Categorias:</span>
                  {summary.newCategories.map(c => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              )}
              {summary.newSubcategories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Subcategorias:</span>
                  {summary.newSubcategories.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {(summary.duplicates || 0) > 0 && (
            <Alert className="mt-4">
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>Duplicatas detectadas</AlertTitle>
              <AlertDescription>
                {summary.duplicates} produto(s) já existem (por SKU ou nome+categoria) e serão <strong>atualizados</strong> em vez de duplicados.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Error Details */}
      {invalidProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              Produtos com Erro ({invalidProducts.length}) — Não serão importados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invalidProducts.flatMap(r =>
                    r.errors.map((e, idx) => (
                      <TableRow key={`${r.row}-${idx}`}>
                        <TableCell><Badge variant="destructive">{r.row}</Badge></TableCell>
                        <TableCell className="font-medium">{r.product.name || '(sem nome)'}</TableCell>
                        <TableCell>{e.field}</TableCell>
                        <TableCell className="text-destructive">{e.message}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Warning Details */}
      {withWarnings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Avisos ({withWarnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Aviso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withWarnings.flatMap(r =>
                    r.warnings.map((w, idx) => (
                      <TableRow key={`${r.row}-w-${idx}`}>
                        <TableCell><Badge variant="outline">{r.row}</Badge></TableCell>
                        <TableCell>{r.product.name}</TableCell>
                        <TableCell className="text-yellow-600">{w.message}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Valid Products Preview */}
      {validProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Produtos Válidos ({validProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Subcategoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Imagem</TableHead>
                    <TableHead>Pizza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validProducts.map(r => (
                    <TableRow key={r.row}>
                      <TableCell><Badge variant="outline">{r.row}</Badge></TableCell>
                      <TableCell className="font-medium">{r.product.name}</TableCell>
                      <TableCell>{r.product.category}</TableCell>
                      <TableCell>{r.product.subcategory || '—'}</TableCell>
                      <TableCell className="text-right">
                        R$ {Number(r.product.price).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>
                        {r.product.image_url || r.product.multiple_image_urls ? (
                          <Badge variant="secondary" className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.product.is_pizza ? (
                          <Badge className="text-xs bg-primary text-primary-foreground">🍕</Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isImporting || validProducts.length === 0}
          className="min-w-[200px]"
        >
          {isImporting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
          ) : (
            <><Check className="h-4 w-4 mr-2" />Importar {validProducts.length} Produto(s)</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Report Component ───

function ImportReportView({
  report,
  onDone,
}: {
  report: ImportReport;
  onDone: () => void;
}) {
  const phase2 = report.phase2;
  const phase3 = report.phase3;

  const totalImported = phase2?.imported || 0;
  const totalUpdated = phase2?.updated || 0;
  const totalErrors = phase2?.errors || 0;
  const totalWarnings = phase2?.warnings || 0;
  const imgSuccess = phase3?.summary.success || 0;
  const imgFailures = phase3?.summary.failures || 0;

  return (
    <div className="space-y-4">
      {/* Main Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Importação Concluída
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard icon={<Check className="h-4 w-4" />} label="Criados" value={totalImported} variant="success" />
            <SummaryCard icon={<RefreshCw className="h-4 w-4" />} label="Atualizados" value={totalUpdated} variant="info" />
            <SummaryCard icon={<XCircle className="h-4 w-4" />} label="Erros" value={totalErrors} variant={totalErrors > 0 ? "error" : undefined} />
            <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Avisos" value={totalWarnings} variant={totalWarnings > 0 ? "warning" : undefined} />
            <SummaryCard icon={<ImageIcon className="h-4 w-4" />} label="Imagens" value={`${imgSuccess}/${imgSuccess + imgFailures}`} variant={imgFailures > 0 ? "warning" : "info"} />
          </div>
        </CardContent>
      </Card>

      {/* Import Errors */}
      {phase2 && phase2.errorDetails.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              Produtos não importados ({phase2.errorDetails.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phase2.errorDetails.map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Badge variant="destructive">{e.row}</Badge></TableCell>
                      <TableCell className="font-medium">{e.product}</TableCell>
                      <TableCell className="text-destructive">{e.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Image Failures */}
      {phase3 && phase3.results.filter(r => !r.success).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Imagens não baixadas ({phase3.results.filter(r => !r.success).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phase3.results.filter(r => !r.success).map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{r.productName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{r.originalUrl}</TableCell>
                      <TableCell className="text-destructive text-sm">{r.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => exportImportReport(report)}>
          <Download className="h-4 w-4 mr-2" />
          Exportar TXT
        </Button>
        <Button variant="outline" onClick={() => exportImportReportCSV(report)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
        <Button onClick={onDone}>
          <Check className="h-4 w-4 mr-2" />
          Concluir
        </Button>
      </div>
    </div>
  );
}

// ─── Summary Card Helper ───

function SummaryCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant?: 'success' | 'error' | 'warning' | 'info';
}) {
  const colors = {
    success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={cn("rounded-lg border p-3 text-center", variant ? colors[variant] : 'bg-muted')}>
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
