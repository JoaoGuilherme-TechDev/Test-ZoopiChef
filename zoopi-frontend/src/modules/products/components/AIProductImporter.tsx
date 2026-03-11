import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileSpreadsheet, 
  Image, 
  FileText, 
  Loader2, 
  Check, 
  X, 
  Sparkles,
  Calculator,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAIProductImport, ExtractedProduct } from '../hooks/useAIProductImport';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIProductImporterProps {
  onComplete?: () => void;
}

export function AIProductImporter({ onComplete }: AIProductImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [defaultSubcategoryId, setDefaultSubcategoryId] = useState<string>('');
  
  const {
    extractedProducts,
    extractionResult,
    selectedCount,
    isExtracting,
    isAnalyzingFiscal,
    isImporting,
    extractProducts,
    analyzeFiscal,
    importProducts,
    updateExtractedProduct,
    toggleProductSelection,
    toggleAllProducts,
    removeProduct,
    clearExtraction,
  } = useAIProductImport();

  const { categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    const fileType = file.type;
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    let content = '';

    // Handle different file types
    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      if (extension === 'csv') {
        content = await file.text();
      } else {
        // For Excel files, convert to base64 for backend processing
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        content = `[EXCEL_BASE64:${extension}]\n${base64}`;
      }
    } else if (extension === 'pdf' || extension === 'docx' || extension === 'doc') {
      // For complex documents, read as base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      content = `[BASE64_DOCUMENT:${extension}]\n${base64}`;
    } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp') {
      // For images, convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      content = `[IMAGE:${extension}]\ndata:image/${extension};base64,${base64}`;
    } else if (extension === 'txt' || extension === 'md') {
      content = await file.text();
    } else {
      // Try to read as text
      try {
        content = await file.text();
      } catch {
        toast.error('Formato de arquivo não suportado');
        return;
      }
    }

    await extractProducts({
      fileContent: content,
      fileType: extension || 'unknown',
      fileName,
    });
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  }, [extractProducts]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  };

  const handleAnalyzeFiscal = async () => {
    const selected = extractedProducts.filter(p => p.selected !== false);
    if (selected.length === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }
    await analyzeFiscal(selected);
  };

  const handleImport = async () => {
    if (selectedCount === 0) {
      toast.error('Selecione pelo menos um produto para importar');
      return;
    }

    // Check if all selected products have category
    const selected = extractedProducts.filter(p => p.selected !== false);
    const withoutCategory = selected.filter(p => !p.category_id && !p.category_name);
    
    if (withoutCategory.length > 0 && !defaultCategoryId) {
      toast.error('Defina uma categoria padrão ou atribua categorias a todos os produtos');
      return;
    }

    await importProducts({
      products: selected.map(p => ({
        ...p,
        category_id: p.category_id || defaultCategoryId,
        subcategory_id: p.subcategory_id || defaultSubcategoryId || undefined
      })),
    });

    onComplete?.();
  };

  const toggleExpanded = (index: number) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getFileIcon = (type: string) => {
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return <FileSpreadsheet className="h-6 w-6" />;
    }
    if (type.includes('image')) {
      return <Image className="h-6 w-6" />;
    }
    return <FileText className="h-6 w-6" />;
  };

  // If no products extracted yet, show upload area
  if (extractedProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importação Inteligente de Produtos
          </CardTitle>
          <CardDescription>
            Faça upload de uma planilha, foto do cardápio ou documento com produtos.
            A IA irá extrair automaticamente todas as informações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isExtracting && "opacity-50 pointer-events-none"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isExtracting ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Analisando documento com IA...</p>
                <p className="text-sm text-muted-foreground">
                  Extraindo produtos, preços e categorias
                </p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Arraste e solte seu arquivo aqui
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  ou clique para selecionar
                </p>
                
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.txt"
                  onChange={handleFileInput}
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>

                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileSpreadsheet className="h-3 w-3" /> Excel/CSV
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Image className="h-3 w-3" /> Imagem/Foto
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> PDF/Word
                  </Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show extracted products for review
  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {extractedProducts.length} Produtos Extraídos
              </CardTitle>
              <CardDescription>
                {extractionResult?.summary}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearExtraction}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAnalyzeFiscal}
                disabled={isAnalyzingFiscal || selectedCount === 0}
              >
                {isAnalyzingFiscal ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-1" />
                )}
                Análise Fiscal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Selection controls */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedCount === extractedProducts.length}
                onCheckedChange={(checked) => toggleAllProducts(!!checked)}
              />
              <span className="text-sm">
                {selectedCount} de {extractedProducts.length} selecionados
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Categoria padrão:</Label>
                <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Subcategoria padrão:</Label>
                <Select 
                  value={defaultSubcategoryId} 
                  onValueChange={setDefaultSubcategoryId}
                  disabled={!defaultCategoryId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={defaultCategoryId ? "Selecione..." : "Selecione categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories
                      .filter(sub => sub.category_id === defaultCategoryId)
                      .map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {extractedProducts.map((product, index) => (
            <Card 
              key={index} 
              className={cn(
                "transition-colors",
                product.selected === false && "opacity-50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={product.selected !== false}
                    onCheckedChange={() => toggleProductSelection(index)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Input
                          value={product.name}
                          onChange={(e) => updateExtractedProduct(index, { name: e.target.value })}
                          className="font-medium h-8 w-auto"
                        />
                        {product.is_pizza && (
                          <Badge className="text-xs bg-primary text-primary-foreground">
                            🍕 Pizza
                          </Badge>
                        )}
                        {product.ncm_code && (
                          <Badge variant="outline" className="text-xs">
                            NCM: {product.ncm_code}
                          </Badge>
                        )}
                        {product.has_st && (
                          <Badge variant="destructive" className="text-xs">
                            ST
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs">R$</Label>
                          <Input
                            type="number"
                            value={product.price || ''}
                            onChange={(e) => updateExtractedProduct(index, { 
                              price: parseFloat(e.target.value) || 0 
                            })}
                            className="h-8 w-20"
                            step="0.01"
                          />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleExpanded(index)}
                        >
                          {expandedProducts.has(index) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick info */}
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      {product.category && (
                        <span>Categoria: {product.category}</span>
                      )}
                      {product.subcategory && (
                        <span>• Subcategoria: {product.subcategory}</span>
                      )}
                      {product.is_pizza && (
                        <Badge variant="secondary" className="text-xs">
                          🍕 Comportamento Pizza
                        </Badge>
                      )}
                      {product.suggested_name && product.suggested_name !== product.name && (
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => updateExtractedProduct(index, { name: product.suggested_name })}
                          title="Clique para usar este nome"
                        >
                          💡 Sugestão: {product.suggested_name}
                        </Badge>
                      )}
                    </div>

                    {/* Expanded details */}
                    {expandedProducts.has(index) && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Descrição</Label>
                            <Textarea
                              value={product.description || ''}
                              onChange={(e) => updateExtractedProduct(index, { 
                                description: e.target.value 
                              })}
                              className="h-20 text-sm"
                              placeholder="Descrição do produto..."
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Composição</Label>
                            <Textarea
                              value={product.composition || ''}
                              onChange={(e) => updateExtractedProduct(index, { 
                                composition: e.target.value 
                              })}
                              className="h-20 text-sm"
                              placeholder="Ingredientes..."
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Subcategoria</Label>
                            <Select 
                              value={product.subcategory_id || ''} 
                              onValueChange={(v) => updateExtractedProduct(index, { 
                                subcategory_id: v 
                              })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {subcategories.map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">NCM</Label>
                            <Input
                              value={product.ncm_code || ''}
                              onChange={(e) => updateExtractedProduct(index, { 
                                ncm_code: e.target.value 
                              })}
                              className="h-8"
                              placeholder="00000000"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Código EAN</Label>
                            <Input
                              value={product.ean_code || ''}
                              onChange={(e) => updateExtractedProduct(index, { 
                                ean_code: e.target.value 
                              })}
                              className="h-8"
                              placeholder="Código de barras"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Código Interno</Label>
                            <Input
                              value={product.internal_code || ''}
                              onChange={(e) => updateExtractedProduct(index, { 
                                internal_code: e.target.value 
                              })}
                              className="h-8"
                              placeholder="Código"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={product.is_weighted || false}
                              onCheckedChange={(checked) => updateExtractedProduct(index, { 
                                is_weighted: !!checked 
                              })}
                            />
                            <Label className="text-xs">Produto Pesado (kg)</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={product.has_st || false}
                              onCheckedChange={(checked) => updateExtractedProduct(index, { 
                                has_st: !!checked 
                              })}
                            />
                            <Label className="text-xs">Substituição Tributária</Label>
                          </div>
                        </div>

                        {product.tax_notes && (
                          <div className="p-2 bg-muted rounded-md">
                            <p className="text-xs text-muted-foreground">
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              {product.tax_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Import button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={clearExtraction}>
          Cancelar
        </Button>
        <Button 
          onClick={handleImport} 
          disabled={isImporting || selectedCount === 0}
          className="min-w-[150px]"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Importar {selectedCount} Produto(s)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
