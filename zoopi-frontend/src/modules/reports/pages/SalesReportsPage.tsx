import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Package, TrendingUp, Clock, Tags, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useProductsSoldReport, 
  useCancelledItemsReport, 
  useSalesByHourReport, 
  useSalesByCategoryReport,
  useSalesBySubcategoryReport,
  useProductsWithoutSalesReport,
} from '../hooks/useReportsSales';
import { exportToCSV, formatCurrencyExport, formatDateTimeExport } from '@/utils/exportUtils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function SalesReportsPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [daysWithoutSale, setDaysWithoutSale] = useState(30);

  const filters = { startDate, endDate };

  const { data: productsSold = [], isLoading: loadingProducts } = useProductsSoldReport(filters);
  const { data: cancelledItems = [], isLoading: loadingCancelled } = useCancelledItemsReport(filters);
  const { data: salesByHour = [], isLoading: loadingHour } = useSalesByHourReport(filters);
  const { data: salesByCategory = [], isLoading: loadingCategory } = useSalesByCategoryReport(filters);
  const { data: salesBySubcategory = [], isLoading: loadingSubcategory } = useSalesBySubcategoryReport(filters);
  const { data: productsWithoutSales = [], isLoading: loadingWithoutSales } = useProductsWithoutSalesReport(daysWithoutSale);

  const handleExportProducts = () => {
    exportToCSV({
      filename: `produtos-vendidos-${startDate}-${endDate}`,
      columns: [
        { key: 'product_name', label: 'Produto' },
        { key: 'category_name', label: 'Categoria' },
        { key: 'subcategory_name', label: 'Subcategoria' },
        { key: 'quantity_sold', label: 'Qtd Vendida' },
        { key: 'total_revenue', label: 'Receita Total', format: formatCurrencyExport },
        { key: 'avg_price', label: 'Preço Médio', format: formatCurrencyExport },
      ],
      data: productsSold as unknown as Record<string, unknown>[],
    });
  };

  const handleExportCancelled = () => {
    exportToCSV({
      filename: `itens-cancelados-${startDate}-${endDate}`,
      columns: [
        { key: 'product_name', label: 'Produto' },
        { key: 'quantity', label: 'Quantidade' },
        { key: 'cancelled_at', label: 'Data/Hora', format: formatDateTimeExport },
        { key: 'reason', label: 'Motivo' },
        { key: 'cancelled_by_name', label: 'Cancelado por' },
      ],
      data: cancelledItems as unknown as Record<string, unknown>[],
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
              <h1 className="text-2xl font-bold">Relatórios de Vendas</h1>
              <p className="text-muted-foreground">Análise detalhada de produtos vendidos</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label>Data Início</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="products" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Cancelados
            </TabsTrigger>
            <TabsTrigger value="hourly" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Por Hora
            </TabsTrigger>
            <TabsTrigger value="category" className="flex items-center gap-1">
              <Tags className="h-4 w-4" />
              Categoria
            </TabsTrigger>
            <TabsTrigger value="subcategory" className="flex items-center gap-1">
              <Tags className="h-4 w-4" />
              Subcategoria
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Sem Vendas
            </TabsTrigger>
          </TabsList>

          {/* Produtos Vendidos */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtos Vendidos</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportProducts}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Preço Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingProducts ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                        </TableRow>
                      ) : productsSold.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhuma venda no período
                          </TableCell>
                        </TableRow>
                      ) : productsSold.map((product, index) => (
                        <TableRow key={product.product_id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category_name || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{product.quantity_sold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.total_revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.avg_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Itens Cancelados */}
          <TabsContent value="cancelled">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Itens Cancelados</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportCancelled}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Cancelado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCancelled ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                        </TableRow>
                      ) : cancelledItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum cancelamento no período
                          </TableCell>
                        </TableRow>
                      ) : cancelledItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>
                            {format(new Date(item.cancelled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{item.reason}</TableCell>
                          <TableCell>{item.cancelled_by_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendas por Hora */}
          <TabsContent value="hourly">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingHour ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                        </TableRow>
                      ) : salesByHour.filter(h => h.orders_count > 0).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhuma venda no período
                          </TableCell>
                        </TableRow>
                      ) : salesByHour.filter(h => h.orders_count > 0).map((hour) => (
                        <TableRow key={hour.hour}>
                          <TableCell className="font-medium">{`${String(hour.hour).padStart(2, '0')}:00 - ${String(hour.hour).padStart(2, '0')}:59`}</TableCell>
                          <TableCell className="text-right">{hour.orders_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(hour.total_revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(hour.avg_ticket)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendas por Categoria */}
          <TabsContent value="category">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCategory ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                        </TableRow>
                      ) : salesByCategory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhuma venda no período
                          </TableCell>
                        </TableRow>
                      ) : salesByCategory.map((cat) => (
                        <TableRow key={cat.category_id}>
                          <TableCell className="font-medium">{cat.category_name}</TableCell>
                          <TableCell className="text-right">{cat.quantity_sold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cat.total_revenue)}</TableCell>
                          <TableCell className="text-right">{cat.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendas por Subcategoria */}
          <TabsContent value="subcategory">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Subcategoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subcategoria</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSubcategory ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                        </TableRow>
                      ) : salesBySubcategory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhuma venda no período
                          </TableCell>
                        </TableRow>
                      ) : salesBySubcategory.map((sub) => (
                        <TableRow key={sub.subcategory_id}>
                          <TableCell className="font-medium">{sub.subcategory_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sub.category_name}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{sub.quantity_sold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sub.total_revenue)}</TableCell>
                          <TableCell className="text-right">{sub.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Produtos sem Vendas */}
          <TabsContent value="inactive">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtos sem Vendas</CardTitle>
                <div className="flex items-center gap-2">
                  <Label>Dias sem venda:</Label>
                  <Input 
                    type="number" 
                    value={daysWithoutSale} 
                    onChange={(e) => setDaysWithoutSale(parseInt(e.target.value) || 30)}
                    className="w-20"
                    min={1}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Última Venda</TableHead>
                        <TableHead className="text-right">Dias sem Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingWithoutSales ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                        </TableRow>
                      ) : productsWithoutSales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Todos os produtos tiveram vendas recentes
                          </TableCell>
                        </TableRow>
                      ) : productsWithoutSales.map((product) => (
                        <TableRow key={product.product_id}>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category_name || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            {product.last_sale_date 
                              ? format(new Date(product.last_sale_date), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Nunca vendido'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={product.days_without_sale > 60 ? 'destructive' : 'secondary'}>
                              {product.days_without_sale === 999 ? '∞' : product.days_without_sale}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
