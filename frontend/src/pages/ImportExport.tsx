import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Package,
  Cookie,
  FileDown,
  FileUp,
  MapPin,
  Users,
  Truck
} from 'lucide-react';
import {
  useImportProducts,
  useExportProducts,
  useImportFlavors,
  useExportFlavors,
  downloadProductsTemplate,
  downloadFlavorsTemplate,
} from '@/hooks/useProductImportExport';
import {
  useImportNeighborhoods,
  useExportNeighborhoods,
  downloadNeighborhoodsTemplate,
  useImportCustomers,
  useExportCustomers,
  downloadCustomersTemplate,
  useImportSuppliers,
  useExportSuppliers,
  downloadSuppliersTemplate,
} from '@/hooks/useAdditionalImportExport';
import { ImportError } from '@/utils/importExportUtils';
import { EnhancedProductImporter } from '@/modules/products/components';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ImportResultData {
  success: number;
  errors: ImportError[];
  totalRows: number;
}

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState('products');
  const [productResult, setProductResult] = useState<ImportResultData | null>(null);
  const [flavorResult, setFlavorResult] = useState<ImportResultData | null>(null);
  const [neighborhoodResult, setNeighborhoodResult] = useState<ImportResultData | null>(null);
  const [customerResult, setCustomerResult] = useState<ImportResultData | null>(null);
  const [supplierResult, setSupplierResult] = useState<ImportResultData | null>(null);

  const productFileRef = useRef<HTMLInputElement>(null);
  const flavorFileRef = useRef<HTMLInputElement>(null);
  const neighborhoodFileRef = useRef<HTMLInputElement>(null);
  const customerFileRef = useRef<HTMLInputElement>(null);
  const supplierFileRef = useRef<HTMLInputElement>(null);

  const importProducts = useImportProducts();
  const exportProducts = useExportProducts();
  const importFlavors = useImportFlavors();
  const exportFlavors = useExportFlavors();
  const importNeighborhoods = useImportNeighborhoods();
  const exportNeighborhoods = useExportNeighborhoods();
  const importCustomers = useImportCustomers();
  const exportCustomers = useExportCustomers();
  const importSuppliers = useImportSuppliers();
  const exportSuppliers = useExportSuppliers();

  const handleImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    importMutation: any,
    setResult: (r: ImportResultData | null) => void,
    fileRef: React.RefObject<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importMutation.mutateAsync(file);
      const insertedCount = 'inserted' in result ? result.inserted : result.success.length;
      setResult({
        success: insertedCount || 0,
        errors: result.errors,
        totalRows: result.totalRows,
      });
    } catch (error) {
      // Error handled by mutation
    }
    
    // Reset input
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const renderImportResult = (result: ImportResultData | null) => {
    if (!result) return null;

    return (
      <div className="space-y-4 mt-6">
        {/* Summary */}
        <div className="flex items-center gap-4">
          {result.errors.length === 0 ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Importação concluída!</AlertTitle>
              <AlertDescription>
                {result.success} de {result.totalRows} registros importados com sucesso.
              </AlertDescription>
            </Alert>
          ) : result.success > 0 ? (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-600">Importação parcial</AlertTitle>
              <AlertDescription>
                {result.success} registros importados. {result.errors.length} erros encontrados.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Erro na importação</AlertTitle>
              <AlertDescription>
                Nenhum registro foi importado. {result.errors.length} erros encontrados.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Error list */}
        {result.errors.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Erros encontrados ({result.errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead className="w-32">Campo</TableHead>
                      <TableHead className="w-32">Valor</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((error, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline">{error.row}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{error.field}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-[150px]">
                          {error.value || '-'}
                        </TableCell>
                        <TableCell className="text-destructive">{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Importar / Exportar</h1>
          <p className="text-muted-foreground">
            Importe dados via planilha ou exporte os dados existentes
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="products" className="gap-2 text-xs">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="flavors" className="gap-2 text-xs">
              <Cookie className="h-4 w-4" />
              <span className="hidden sm:inline">Sabores</span>
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="gap-2 text-xs">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Bairros</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2 text-xs">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2 text-xs">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Fornecedores</span>
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Enhanced Import */}
            <EnhancedProductImporter />

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou use o formato clássico
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Classic Import Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    Importar Produtos (Clássico)
                  </CardTitle>
                  <CardDescription>
                    Importe produtos a partir de um arquivo CSV ou Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Colunas esperadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Código Interno</li>
                      <li>Código de Barras</li>
                      <li>Nome *</li>
                      <li>Descrição</li>
                      <li>Categoria *</li>
                      <li>Subcategoria *</li>
                      <li>Unidade</li>
                      <li>Valor Venda *</li>
                      <li>Valor Custo</li>
                      <li>Estoque</li>
                      <li>NCM</li>
                      <li>Tributação</li>
                    </ul>
                    <p className="text-xs">* Campos obrigatórios</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => downloadProductsTemplate()}
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Modelo
                    </Button>
                    <Button
                      onClick={() => productFileRef.current?.click()}
                      disabled={importProducts.isPending}
                      className="flex-1 gap-2"
                    >
                      {importProducts.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Importar
                    </Button>
                    <input
                      ref={productFileRef}
                      type="file"
                      accept=".csv,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleImport(e, importProducts, setProductResult, productFileRef)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Export Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    Exportar Produtos
                  </CardTitle>
                  <CardDescription>
                    Exporte todos os produtos cadastrados para CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>O arquivo exportado conterá todas as informações dos produtos:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>Código interno e de barras</li>
                      <li>Nome e descrição</li>
                      <li>Categoria e subcategoria</li>
                      <li>Valores e estoque</li>
                      <li>Informações fiscais</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => exportProducts.mutate()}
                    disabled={exportProducts.isPending}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    {exportProducts.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Exportar Produtos
                  </Button>
                </CardContent>
              </Card>
            </div>

            {renderImportResult(productResult)}
          </TabsContent>

          {/* Flavors Tab */}
          <TabsContent value="flavors" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    Importar Sabores
                  </CardTitle>
                  <CardDescription>
                    Importe sabores a partir de um arquivo CSV ou Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Colunas esperadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Código</li>
                      <li>Nome *</li>
                      <li>Descrição (ingredientes)</li>
                      <li>Destaque</li>
                    </ul>
                    <p className="text-xs">* Campos obrigatórios</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => downloadFlavorsTemplate()}
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Modelo
                    </Button>
                    <Button
                      onClick={() => flavorFileRef.current?.click()}
                      disabled={importFlavors.isPending}
                      className="flex-1 gap-2"
                    >
                      {importFlavors.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Importar
                    </Button>
                    <input
                      ref={flavorFileRef}
                      type="file"
                      accept=".csv,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleImport(e, importFlavors, setFlavorResult, flavorFileRef)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    Exportar Sabores
                  </CardTitle>
                  <CardDescription>
                    Exporte todos os sabores cadastrados para CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>O arquivo exportado conterá:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>Código do sabor</li>
                      <li>Nome</li>
                      <li>Descrição (ingredientes)</li>
                      <li>Grupo de destaque</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => exportFlavors.mutate()}
                    disabled={exportFlavors.isPending}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    {exportFlavors.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Exportar Sabores
                  </Button>
                </CardContent>
              </Card>
            </div>

            {renderImportResult(flavorResult)}
          </TabsContent>

          {/* Neighborhoods Tab */}
          <TabsContent value="neighborhoods" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    Importar Bairros
                  </CardTitle>
                  <CardDescription>
                    Importe bairros para cobrança de frete por região
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Colunas esperadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Cidade *</li>
                      <li>Bairro *</li>
                      <li>Taxa * (valor em R$)</li>
                      <li>Zona (opcional)</li>
                    </ul>
                    <p className="text-xs">* Campos obrigatórios</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => downloadNeighborhoodsTemplate()}
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Modelo
                    </Button>
                    <Button
                      onClick={() => neighborhoodFileRef.current?.click()}
                      disabled={importNeighborhoods.isPending}
                      className="flex-1 gap-2"
                    >
                      {importNeighborhoods.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Importar
                    </Button>
                    <input
                      ref={neighborhoodFileRef}
                      type="file"
                      accept=".csv,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleImport(e, importNeighborhoods, setNeighborhoodResult, neighborhoodFileRef)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    Exportar Bairros
                  </CardTitle>
                  <CardDescription>
                    Exporte todos os bairros cadastrados para CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>O arquivo exportado conterá:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>Cidade</li>
                      <li>Bairro</li>
                      <li>Taxa de entrega</li>
                      <li>Zona</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => exportNeighborhoods.mutate()}
                    disabled={exportNeighborhoods.isPending}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    {exportNeighborhoods.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Exportar Bairros
                  </Button>
                </CardContent>
              </Card>
            </div>

            {renderImportResult(neighborhoodResult)}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    Importar Clientes
                  </CardTitle>
                  <CardDescription>
                    Importe clientes com endereço e saldo de fiado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Colunas esperadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Nome *</li>
                      <li>WhatsApp *</li>
                      <li>Email</li>
                      <li>CPF/CNPJ</li>
                      <li>RG/IE</li>
                      <li>Permite Fiado (Sim/Não)</li>
                      <li>Limite Fiado</li>
                      <li>Saldo Inicial Fiado</li>
                      <li>Observações</li>
                      <li>CEP, Rua, Número, Complemento</li>
                      <li>Bairro, Cidade, Estado, Referência</li>
                    </ul>
                    <p className="text-xs">* Campos obrigatórios</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => downloadCustomersTemplate()}
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Modelo
                    </Button>
                    <Button
                      onClick={() => customerFileRef.current?.click()}
                      disabled={importCustomers.isPending}
                      className="flex-1 gap-2"
                    >
                      {importCustomers.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Importar
                    </Button>
                    <input
                      ref={customerFileRef}
                      type="file"
                      accept=".csv,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleImport(e, importCustomers, setCustomerResult, customerFileRef)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    Exportar Clientes
                  </CardTitle>
                  <CardDescription>
                    Exporte todos os clientes cadastrados para CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>O arquivo exportado conterá:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>Dados pessoais (nome, contato, documento)</li>
                      <li>Configurações de fiado</li>
                      <li>Endereço principal</li>
                      <li>Observações</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => exportCustomers.mutate()}
                    disabled={exportCustomers.isPending}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    {exportCustomers.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Exportar Clientes
                  </Button>
                </CardContent>
              </Card>
            </div>

            {renderImportResult(customerResult)}
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    Importar Fornecedores
                  </CardTitle>
                  <CardDescription>
                    Importe fornecedores com dados fiscais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Colunas esperadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Nome *</li>
                      <li>CPF/CNPJ</li>
                      <li>Inscrição Estadual</li>
                      <li>Telefone</li>
                      <li>Email</li>
                      <li>Condições Pagamento</li>
                      <li>Observações</li>
                    </ul>
                    <p className="text-xs">* Campos obrigatórios</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => downloadSuppliersTemplate()}
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Modelo
                    </Button>
                    <Button
                      onClick={() => supplierFileRef.current?.click()}
                      disabled={importSuppliers.isPending}
                      className="flex-1 gap-2"
                    >
                      {importSuppliers.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Importar
                    </Button>
                    <input
                      ref={supplierFileRef}
                      type="file"
                      accept=".csv,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleImport(e, importSuppliers, setSupplierResult, supplierFileRef)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    Exportar Fornecedores
                  </CardTitle>
                  <CardDescription>
                    Exporte todos os fornecedores cadastrados para CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>O arquivo exportado conterá:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>Nome e contato</li>
                      <li>Documentos (CPF/CNPJ, IE)</li>
                      <li>Condições de pagamento</li>
                      <li>Observações</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => exportSuppliers.mutate()}
                    disabled={exportSuppliers.isPending}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    {exportSuppliers.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Exportar Fornecedores
                  </Button>
                </CardContent>
              </Card>
            </div>

            {renderImportResult(supplierResult)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
