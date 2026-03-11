import { useState } from 'react';
import { useERPDREAdvanced } from '../hooks/useERPDREAdvanced';
import { DREChart } from '../components/DREChart';
import { DREComparisonCard } from '../components/DREComparisonCard';
import { exportDREToCSV, exportDREToPrint } from '../utils/dreExport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Download, 
  Printer, 
  BarChart3, 
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export function ERPDREAdvancedPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');

  const { data, isLoading } = useERPDREAdvanced({
    startDate,
    endDate,
    compareWithPrevious,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const handleExportCSV = () => {
    if (data?.current) {
      exportDREToCSV(data.current, `dre-${startDate}-${endDate}`);
    }
  };

  const handlePrint = () => {
    if (data?.current) {
      exportDREToPrint(data.current);
    }
  };

  return (
    <DashboardLayout title="DRE Avançado">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="compare"
                  checked={compareWithPrevious}
                  onCheckedChange={setCompareWithPrevious}
                />
                <Label htmlFor="compare">Comparar com período anterior</Label>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={handleExportCSV} disabled={!data?.current}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" onClick={handlePrint} disabled={!data?.current}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data?.current ? (
          <>
            {/* Cards Resumo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <DREComparisonCard
                title="Receita Líquida"
                currentValue={data.current.receita_liquida}
                previousValue={data.previous?.receita_liquida}
                className="bg-blue-500/10"
              />
              <DREComparisonCard
                title="Lucro Bruto"
                currentValue={data.current.lucro_bruto}
                previousValue={data.previous?.lucro_bruto}
                className={data.current.lucro_bruto >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
              />
              <DREComparisonCard
                title="Margem Bruta"
                currentValue={data.current.margem_bruta_percent}
                previousValue={data.previous?.margem_bruta_percent}
                format="percent"
              />
              <DREComparisonCard
                title="Resultado Final"
                currentValue={data.current.resultado_final}
                previousValue={data.previous?.resultado_final}
                className={data.current.resultado_final >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
              />
            </div>

            <Tabs defaultValue="dre" className="space-y-4">
              <TabsList>
                <TabsTrigger value="dre">DRE Completo</TabsTrigger>
                <TabsTrigger value="despesas">Despesas por Categoria</TabsTrigger>
                <TabsTrigger value="analise">Análise Visual</TabsTrigger>
              </TabsList>

              <TabsContent value="dre">
                <Card>
                  <CardHeader>
                    <CardTitle>Demonstrativo de Resultados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[400px]">Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">% Rec. Líq.</TableHead>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableHead className="text-right">Anterior</TableHead>
                              <TableHead className="text-right">Variação</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* RECEITAS */}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={compareWithPrevious ? 5 : 3} className="font-bold">
                            RECEITAS
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8">Receita Bruta</TableCell>
                          <TableCell className="text-right">{formatCurrency(data.current.receita_bruta)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right">{formatCurrency(data.previous.receita_bruta)}</TableCell>
                              <TableCell className="text-right">
                                <VariationBadge current={data.current.receita_bruta} previous={data.previous.receita_bruta} />
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8">(-) Descontos</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(-data.current.descontos)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right text-red-600">{formatCurrency(-data.previous.descontos)}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </>
                          )}
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8">(+) Taxas Delivery</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(data.current.taxas_delivery)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right text-green-600">{formatCurrency(data.previous.taxas_delivery)}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </>
                          )}
                        </TableRow>
                        <TableRow className="font-semibold bg-muted/30">
                          <TableCell>= Receita Líquida</TableCell>
                          <TableCell className="text-right">{formatCurrency(data.current.receita_liquida)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right">{formatCurrency(data.previous.receita_liquida)}</TableCell>
                              <TableCell className="text-right">
                                <VariationBadge current={data.current.receita_liquida} previous={data.previous.receita_liquida} />
                              </TableCell>
                            </>
                          )}
                        </TableRow>

                        {/* CUSTOS */}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={compareWithPrevious ? 5 : 3} className="font-bold">
                            CUSTOS
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8">(-) CMV</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(-data.current.cmv)}</TableCell>
                          <TableCell className="text-right">{formatPercent(data.current.receita_liquida > 0 ? (data.current.cmv / data.current.receita_liquida) * 100 : 0)}</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right text-red-600">{formatCurrency(-data.previous.cmv)}</TableCell>
                              <TableCell className="text-right">
                                <VariationBadge current={data.current.cmv} previous={data.previous.cmv} invert />
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                        <TableRow className="font-semibold bg-green-500/10">
                          <TableCell>= Lucro Bruto</TableCell>
                          <TableCell className="text-right">{formatCurrency(data.current.lucro_bruto)}</TableCell>
                          <TableCell className="text-right">{formatPercent(data.current.margem_bruta_percent)}</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right">{formatCurrency(data.previous.lucro_bruto)}</TableCell>
                              <TableCell className="text-right">
                                <VariationBadge current={data.current.lucro_bruto} previous={data.previous.lucro_bruto} />
                              </TableCell>
                            </>
                          )}
                        </TableRow>

                        {/* DESPESAS OPERACIONAIS */}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={compareWithPrevious ? 5 : 3} className="font-bold">
                            DESPESAS OPERACIONAIS
                          </TableCell>
                        </TableRow>
                        {data.current.despesas_por_categoria.slice(0, 10).map((cat) => (
                          <TableRow key={cat.category_id}>
                            <TableCell className="pl-8">(-) {cat.category_name}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(-cat.amount)}</TableCell>
                            <TableCell className="text-right">
                              {formatPercent(data.current.receita_liquida > 0 ? (cat.amount / data.current.receita_liquida) * 100 : 0)}
                            </TableCell>
                            {compareWithPrevious && data.previous && (
                              <>
                                <TableCell className="text-right text-red-600">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell>= Total Despesas</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(-data.current.total_despesas_operacionais)}</TableCell>
                          <TableCell className="text-right">
                            {formatPercent(data.current.receita_liquida > 0 ? (data.current.total_despesas_operacionais / data.current.receita_liquida) * 100 : 0)}
                          </TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className="text-right text-red-600">{formatCurrency(-data.previous.total_despesas_operacionais)}</TableCell>
                              <TableCell className="text-right">
                                <VariationBadge current={data.current.total_despesas_operacionais} previous={data.previous.total_despesas_operacionais} invert />
                              </TableCell>
                            </>
                          )}
                        </TableRow>

                        {/* RESULTADO */}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={compareWithPrevious ? 5 : 3} className="font-bold">
                            RESULTADO
                          </TableCell>
                        </TableRow>
                        <TableRow className={cn(
                          'font-bold text-lg',
                          data.current.resultado_final >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                        )}>
                          <TableCell>= RESULTADO FINAL</TableCell>
                          <TableCell className={cn(
                            'text-right',
                            data.current.resultado_final >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(data.current.resultado_final)}
                          </TableCell>
                          <TableCell className="text-right">{formatPercent(data.current.margem_liquida_percent)}</TableCell>
                          {compareWithPrevious && data.previous && (
                            <>
                              <TableCell className={cn(
                                'text-right',
                                data.previous.resultado_final >= 0 ? 'text-green-600' : 'text-red-600'
                              )}>
                                {formatCurrency(data.previous.resultado_final)}
                              </TableCell>
                              <TableCell className="text-right">
                                <VariationBadge current={data.current.resultado_final} previous={data.previous.resultado_final} />
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="despesas">
                <Card>
                  <CardHeader>
                    <CardTitle>Despesas por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">% do Total</TableHead>
                          <TableHead className="text-right">% Receita Líq.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.current.despesas_por_categoria.map((cat) => (
                          <TableRow key={cat.category_id}>
                            <TableCell className="font-medium">{cat.category_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.amount)}</TableCell>
                            <TableCell className="text-right">{formatPercent(cat.percent_of_total)}</TableCell>
                            <TableCell className="text-right">
                              {formatPercent(data.current.receita_liquida > 0 ? (cat.amount / data.current.receita_liquida) * 100 : 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">{formatCurrency(data.current.total_despesas_operacionais)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          <TableCell className="text-right">
                            {formatPercent(data.current.receita_liquida > 0 ? (data.current.total_despesas_operacionais / data.current.receita_liquida) * 100 : 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analise">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Composição das Despesas</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant={chartType === 'bar' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setChartType('bar')}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={chartType === 'pie' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setChartType('pie')}
                        >
                          <PieChartIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DREChart categories={data.current.despesas_por_categoria} type={chartType} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Análise de Margens</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Margem Bruta</span>
                          <span className="text-2xl font-bold">{formatPercent(data.current.margem_bruta_percent)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-4">
                          <div
                            className="bg-green-500 h-4 rounded-full transition-all"
                            style={{ width: `${Math.min(data.current.margem_bruta_percent, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Margem Operacional</span>
                          <span className="text-2xl font-bold">{formatPercent(data.current.margem_operacional_percent)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-4">
                          <div
                            className={cn(
                              'h-4 rounded-full transition-all',
                              data.current.margem_operacional_percent >= 0 ? 'bg-blue-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(Math.abs(data.current.margem_operacional_percent), 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Margem Líquida</span>
                          <span className={cn(
                            'text-2xl font-bold',
                            data.current.margem_liquida_percent >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatPercent(data.current.margem_liquida_percent)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-4">
                          <div
                            className={cn(
                              'h-4 rounded-full transition-all',
                              data.current.margem_liquida_percent >= 0 ? 'bg-green-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(Math.abs(data.current.margem_liquida_percent), 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="h-4 w-4" />
                          <span>
                            {data.current.resultado_final >= 0 
                              ? `Lucro de ${formatCurrency(data.current.resultado_final)} no período`
                              : `Prejuízo de ${formatCurrency(Math.abs(data.current.resultado_final))} no período`
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Selecione um período para gerar o DRE
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function VariationBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const variation = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  const isPositive = invert ? variation < 0 : variation > 0;
  const isNegative = invert ? variation > 0 : variation < 0;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium',
      isPositive && 'text-green-600',
      isNegative && 'text-red-600',
      !isPositive && !isNegative && 'text-muted-foreground'
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
    </span>
  );
}
