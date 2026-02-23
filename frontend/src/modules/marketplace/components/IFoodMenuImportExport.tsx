import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  Link, 
  Check, 
  AlertCircle, 
  ChevronRight,
  Package,
  FolderOpen,
  ListChecks,
  Image as ImageIcon,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useIFoodImport, IFoodCategory } from '@/hooks/useIFoodImport';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { toast } from 'sonner';

export function IFoodMenuImportExport() {
  const [ifoodUrl, setIfoodUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const { isLoading, scrapeResult, importResult, scrapeMenu, importMenu, reset } = useIFoodImport();
  
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();

  const handleScrape = async () => {
    const result = await scrapeMenu(ifoodUrl);
    if (result) {
      // Select all categories by default
      setSelectedCategories(new Set(result.categories.map((_, idx) => idx)));
    }
  };

  const handleImport = async () => {
    if (!scrapeResult) return;

    const categoriesToImport = scrapeResult.categories.filter((_, idx) => 
      selectedCategories.has(idx)
    );

    if (categoriesToImport.length === 0) {
      toast.error('Selecione pelo menos uma categoria para importar');
      return;
    }

    await importMenu(categoriesToImport);
  };

  const toggleCategory = (idx: number) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedCategories(newSet);
  };

  const toggleAll = () => {
    if (!scrapeResult) return;
    
    if (selectedCategories.size === scrapeResult.categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(scrapeResult.categories.map((_, idx) => idx)));
    }
  };

  const activeProducts = products.filter(p => p.active);
  const activeCategories = categories.filter(c => c.active);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Importar do iFood
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Exportar para iFood
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-red-500" />
                Importar Cardápio do iFood
              </CardTitle>
              <CardDescription>
                Cole o link do seu restaurante no iFood para importar automaticamente todo o cardápio: produtos, categorias, subcategorias e opcionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!scrapeResult && !importResult && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ifood-url">Link do Cardápio do iFood</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="ifood-url"
                          placeholder="https://www.ifood.com.br/delivery/cidade/restaurante"
                          value={ifoodUrl}
                          onChange={(e) => setIfoodUrl(e.target.value)}
                          className="pl-9"
                          disabled={isLoading}
                        />
                      </div>
                      <Button 
                        onClick={handleScrape} 
                        disabled={isLoading || !ifoodUrl.trim()}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Buscando...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Buscar Cardápio
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exemplo: https://www.ifood.com.br/delivery/sao-paulo-sp/seu-restaurante-bairro/uuid
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm">O que será importado:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" /> Categorias e subcategorias
                      </li>
                      <li className="flex items-center gap-2">
                        <Package className="h-4 w-4" /> Produtos com nome, descrição e preço
                      </li>
                      <li className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> Grupos de opcionais (perguntas)
                      </li>
                      <li className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Imagens dos produtos (quando disponíveis)
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {scrapeResult && !importResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Cardápio encontrado!</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={reset}>
                      Buscar outro
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{scrapeResult.stats.categoriesCount}</div>
                        <div className="text-sm text-muted-foreground">Categorias</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{scrapeResult.stats.productsCount}</div>
                        <div className="text-sm text-muted-foreground">Produtos</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Selecione as categorias para importar:</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={toggleAll}
                      >
                        {selectedCategories.size === scrapeResult.categories.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      </Button>
                    </div>

                    <ScrollArea className="h-[300px] border rounded-md p-4">
                      <div className="space-y-4">
                        {scrapeResult.categories.map((category, catIdx) => (
                          <div key={catIdx} className="space-y-2">
                            <div 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => toggleCategory(catIdx)}
                            >
                              <Checkbox 
                                checked={selectedCategories.has(catIdx)}
                                onCheckedChange={() => toggleCategory(catIdx)}
                              />
                              <span className="font-medium">{category.name}</span>
                              <Badge variant="secondary" className="ml-auto">
                                {category.subcategories.reduce((sum, sub) => sum + sub.products.length, 0)} produtos
                              </Badge>
                            </div>

                            {selectedCategories.has(catIdx) && (
                              <div className="ml-6 space-y-1">
                                {category.subcategories.map((sub, subIdx) => (
                                  <div key={subIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <ChevronRight className="h-4 w-4" />
                                    <span>{sub.name}</span>
                                    <span className="text-xs">({sub.products.length} produtos)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Button 
                    onClick={handleImport} 
                    disabled={isLoading || selectedCategories.size === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Importar {selectedCategories.size} Categoria(s)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-6 w-6" />
                    <span className="text-lg font-semibold">Importação concluída!</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{importResult.categories}</div>
                        <div className="text-sm text-green-600">Categorias</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{importResult.subcategories}</div>
                        <div className="text-sm text-green-600">Subcategorias</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{importResult.products}</div>
                        <div className="text-sm text-green-600">Produtos</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{importResult.optionGroups}</div>
                        <div className="text-sm text-green-600">Grupos Opcionais</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button onClick={reset} variant="outline" className="w-full">
                    Importar outro cardápio
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-red-500" />
                Exportar Cardápio para iFood
              </CardTitle>
              <CardDescription>
                Envie seu cardápio completo para o iFood automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Recurso em Desenvolvimento</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      A exportação automática para o iFood requer integração via API do iFood Portal do Parceiro.
                      Para habilitar esta função, conecte sua conta do iFood nas configurações de Marketplace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Resumo do Cardápio Atual</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{activeCategories.length}</div>
                      <div className="text-sm text-muted-foreground">Categorias Ativas</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{subcategories.filter(s => s.active).length}</div>
                      <div className="text-sm text-muted-foreground">Subcategorias Ativas</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{activeProducts.length}</div>
                      <div className="text-sm text-muted-foreground">Produtos Ativos</div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Pré-requisitos para exportação:</h4>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Conta de parceiro iFood ativa</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Integração do iFood conectada (em Marketplace)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Produtos com preço definido</span>
                    </li>
                  </ul>
                </div>

                <Button disabled className="w-full" size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  Exportar para iFood (Em breve)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
