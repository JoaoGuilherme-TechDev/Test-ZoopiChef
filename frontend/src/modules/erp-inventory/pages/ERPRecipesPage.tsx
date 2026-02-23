import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { RecipeEditorDialog } from '../components/RecipeEditorDialog';
import { RealCostBreakdown } from '../components/RealCostBreakdown';
import { OverheadConfigDialog } from '../components/OverheadConfigDialog';
import { useERPRecipes } from '../hooks/useERPRecipes';
import { useERPItems } from '../hooks/useERPItems';
import { useOverheadConfig } from '../hooks/useOverheadConfig';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight, Loader2, Settings, Target } from 'lucide-react';
import type { ERPRecipeFormData } from '../types';

export default function ERPRecipesPage() {
  const { recipes, isLoading, createRecipe, calculateRecipeCost } = useERPRecipes();
  const { items: saleItems } = useERPItems('sale');
  const { calculateRealCost, config } = useOverheadConfig();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

  const handleCreate = async (data: ERPRecipeFormData) => {
    await createRecipe.mutateAsync(data);
    setDialogOpen(false);
  };

  const toggleExpand = (recipeId: string) => {
    const newSet = new Set(expandedRecipes);
    if (newSet.has(recipeId)) {
      newSet.delete(recipeId);
    } else {
      newSet.add(recipeId);
    }
    setExpandedRecipes(newSet);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Items without recipe
  const itemsWithoutRecipe = saleItems.filter(
    (item) => !recipes.some((r) => r.sale_item_id === item.id)
  );

  // Calcular total de overhead configurado
  const totalOverhead = config ? (
    (config.rent_percent || 0) +
    (config.utilities_percent || 0) +
    (config.insurance_percent || 0) +
    (config.depreciation_percent || 0) +
    (config.labor_percent || 0) +
    (config.administrative_percent || 0) +
    (config.marketing_percent || 0) +
    (config.maintenance_percent || 0) +
    (config.taxes_percent || 0) +
    (config.card_fees_percent || 0) +
    (config.delivery_fees_percent || 0)
  ) : 0;

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Fichas Técnicas">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Fichas Técnicas">
      {/* Configuração de Overhead */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Custos Operacionais
            </p>
            <p className="text-sm text-muted-foreground">
              {config ? (
                <>Overhead: <Badge variant="secondary">{totalOverhead.toFixed(1)}%</Badge> • Lucro: <Badge variant="outline">{config.target_profit_percent}%</Badge></>
              ) : (
                'Configure os custos fixos e operacionais para calcular o valor real do prato'
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Overhead
          </Button>
        </div>
      </Card>

      {/* Alert for items without recipe */}
      {itemsWithoutRecipe.length > 0 && (
        <Card className="p-4 border-yellow-500 bg-yellow-500/10 mb-4">
          <p className="text-sm text-yellow-700">
            <strong>{itemsWithoutRecipe.length}</strong> produto(s) de venda sem ficha técnica:{' '}
            {itemsWithoutRecipe.slice(0, 5).map((i) => i.name).join(', ')}
            {itemsWithoutRecipe.length > 5 && '...'}
          </p>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Defina os insumos e quantidades para calcular o CMV e custo real de cada produto.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Ficha Técnica
          </Button>
        </div>

        <div className="divide-y">
          {recipes.map((recipe) => {
            const costData = calculateRecipeCost(recipe);
            const realCostData = calculateRealCost(costData.total_cost);
            const isExpanded = expandedRecipes.has(recipe.id);

            return (
              <Collapsible key={recipe.id} open={isExpanded} onOpenChange={() => toggleExpand(recipe.id)}>
                <CollapsibleTrigger asChild>
                  <div className="p-4 hover:bg-muted/50 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div>
                        <p className="font-medium">{recipe.sale_item?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {recipe.lines?.length || 0} componentes • Versão {recipe.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">CMV</p>
                        <p className="font-medium">
                          {formatCurrency(costData.total_cost)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Custo Real</p>
                        <p className="font-bold text-orange-500">
                          {formatCurrency(realCostData.real_cost)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Preço Sugerido</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(realCostData.suggested_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 grid lg:grid-cols-2 gap-4">
                    {/* Tabela de ingredientes */}
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Componente</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Custo Unit.</TableHead>
                            <TableHead className="text-right">Perda %</TableHead>
                            <TableHead className="text-right">Custo Linha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {costData.lines.map((line, index) => (
                            <TableRow key={index}>
                              <TableCell>{line.component_name}</TableCell>
                              <TableCell className="text-right">{line.qty}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                              <TableCell className="text-right">{line.waste_percent}%</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(line.line_cost)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-medium text-right">
                              Total CMV (Rendimento: {recipe.yield_qty})
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(costData.total_cost)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Breakdown do custo real */}
                    <RealCostBreakdown calculation={realCostData} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {recipes.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma ficha técnica cadastrada
            </div>
          )}
        </div>
      </Card>

      <RecipeEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isLoading={createRecipe.isPending}
      />

      <OverheadConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />
    </ERPInventoryLayout>
  );
}
