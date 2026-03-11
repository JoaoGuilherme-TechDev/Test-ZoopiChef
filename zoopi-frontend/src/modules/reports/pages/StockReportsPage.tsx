import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Package, Warehouse, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { useStockValueReport, useStockMovementsSummaryReport } from '../hooks/useReportsStock';
import { exportToCSV, formatCurrencyExport } from '@/utils/exportUtils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ITEM_TYPE_LABELS: Record<string, string> = {
  sale: 'Venda Direta',
  resale: 'Revenda',
  raw: 'Matéria-Prima',
  consumable: 'Consumo',
  service: 'Serviço',
  cleaning: 'Limpeza',
  fixed_asset: 'Imobilizado',
  packaging: 'Embalagem',
};

export default function StockReportsPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: stockData, isLoading: loadingStock } = useStockValueReport({});
  const { data: movementsSummary = [], isLoading: loadingMovements } = useStockMovementsSummaryReport({ startDate, endDate });

  const handleExportStock = () => {
    if (!stockData) return;
    exportToCSV({
      filename: `estoque-valorizado-${format(new Date(), 'yyyy-MM-dd')}`,
      columns: [
        { key: 'item_name', label: 'Item' },
        { key: 'sku', label: 'SKU' },
        { key: 'item_type', label: 'Tipo', format: (v: any) => ITEM_TYPE_LABELS[v] || v },
        { key: 'current_stock', label: 'Qtd Estoque' },
        { key: 'avg_cost', label: 'Custo Médio', format: formatCurrencyExport },
        { key: 'total_cost_value', label: 'Valor Custo Total', format: formatCurrencyExport },
        { key: 'sale_price', label: 'Preço Venda', format: formatCurrencyExport },
        { key: 'total_sale_value', label: 'Valor Venda Total', format: formatCurrencyExport },
        { key: 'margin_percent', label: 'Margem %', format: (v: any) => v ? `${v.toFixed(1)}%` : '-' },
      ],
      data: stockData.items as unknown as Record<string, unknown>[],
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/reports-hub')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Relatórios de Estoque</h1>
              <p className="text-muted-foreground">Valorização e movimentação de estoque</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {stockData && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Itens</p>
                    <p className="text-2xl font-bold">{stockData.summary.total_items}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Custo</p>
                    <p className="text-2xl font-bold">{formatCurrency(stockData.summary.total_cost_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Venda</p>
                    <p className="text-2xl font-bold">{formatCurrency(stockData.summary.total_sale_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Margem Média</p>
                    <p className="text-2xl font-bold">{stockData.summary.avg_margin_percent.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className="text-2xl font-bold">{stockData.summary.low_stock_items}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stock Value Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Estoque Valorizado</CardTitle>
              <CardDescription>Preço de custo, quantidade e valor total</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportStock}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Valor Custo</TableHead>
                    <TableHead className="text-right">Preço Venda</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStock ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : !stockData?.items.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        Nenhum item no estoque
                      </TableCell>
                    </TableRow>
                  ) : stockData.items.map((item) => (
                    <TableRow key={item.erp_item_id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.sku || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ITEM_TYPE_LABELS[item.item_type] || item.item_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.current_stock.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.avg_cost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_cost_value)}</TableCell>
                      <TableCell className="text-right">{item.sale_price ? formatCurrency(item.sale_price) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.total_sale_value ? formatCurrency(item.total_sale_value) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.margin_percent !== null ? (
                          <Badge variant={item.margin_percent < 20 ? 'destructive' : 'secondary'}>
                            {item.margin_percent.toFixed(1)}%
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Movements Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Movimentações</CardTitle>
            <CardDescription>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Label>De:</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Até:</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-36"
                  />
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Movimentação</TableHead>
                  <TableHead className="text-right">Quantidade Total</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Nº Movimentações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMovements ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                  </TableRow>
                ) : movementsSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma movimentação no período
                    </TableCell>
                  </TableRow>
                ) : movementsSummary.map((mov) => (
                  <TableRow key={mov.movement_type}>
                    <TableCell className="font-medium">{mov.movement_type_label}</TableCell>
                    <TableCell className="text-right">{mov.total_qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(mov.total_value)}</TableCell>
                    <TableCell className="text-right">{mov.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
