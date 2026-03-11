import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText,
  Download,
  Loader2,
  Package,
  DollarSign,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  useProductsSoldReport, 
  useSalesByCategoryReport,
  useSalesBySubcategoryReport,
  useSalesByHourReport,
  useProductsWithoutSalesReport,
  useCancelledItemsReport,
} from '../hooks/useReportsSales';
import { useStockValueReport, useStockMovementsSummaryReport } from '../hooks/useReportsStock';
import { useProductsListReport, useProductsByCategoryReport } from '../hooks/useReportsProducts';
import { useBillingReport, useBillingByPaymentReport, useBillingByOperatorReport } from '../hooks/useReportsBilling';
import {
  usePaymentAnalysisReport,
  useNeighborhoodAnalysisReport,
  useCancelledOrdersReport,
  useDiscountsReport,
  useOrdersByTableReport,
  useOrdersByOriginReport,
  useSalesByUserReport,
  useOrderAnalysisReport,
} from '../hooks/useReportsAnalytics';
import {
  useDelayReport,
  useCustomerTypeByDayReport,
  useFlavorsSoldReport,
  useFreightAnalysisReport,
  useSalesByHourDetailedReport,
  useKDSTimeAnalysisReport,
  useKDSTimeByDayReport,
  usePurchaseRecurrenceReport,
} from '../hooks/useReportsAdvanced';
import {
  useProductByOperatorReport,
  useCategoryByOperatorReport,
  useSalesByTableReport,
  useSalesBySectorProductReport,
  useSalesBySectorCategoryReport,
  useTicketMedioReport,
  useSalesByWaiterReport,
  useProductProfitReport,
} from '../hooks/useReportsFoodService';
import {
  useNCMReport,
  useCFOPReport,
  useTaxSummaryReport,
  useProductTaxReport,
  useNCMCheckReport,
} from '../hooks/useReportsFiscal';
import { CommissionReport } from '../components/CommissionReport';
import { PaymentNSUReport } from '../components/PaymentNSUReport';
import { exportToCSV, formatCurrencyExport } from '@/utils/exportUtils';

// Relatórios de Análises
const ANALYSIS_REPORTS = [
  { value: 'payment-analysis', label: 'Análise de pagamentos efetuados' },
  { value: 'product-analysis', label: 'Análise de produtos' },
  { value: 'category-analysis', label: 'Análise de categorias' },
  { value: 'neighborhood-analysis', label: 'Análise de bairros' },
  { value: 'flavors-analysis', label: 'Análise de sabores' },
  { value: 'optional-groups-analysis', label: 'Análise de Grupos Opcionais' },
];

// Relatórios de Pedidos
const ORDER_REPORTS = [
  { value: 'cancelled-orders', label: 'Pedidos cancelados' },
  { value: 'discounts-granted', label: 'Descontos concedidos' },
  { value: 'discount-coupon', label: 'Cupom de desconto por venda' },
  { value: 'excluded-items', label: 'Itens excluídos' },
  { value: 'removed-charges', label: 'Cobranças removidas' },
  { value: 'orders-by-table', label: 'Pedidos por mesa' },
  { value: 'orders-by-origin', label: 'Pedidos por origem' },
  { value: 'sales-by-user', label: 'Vendas por usuário' },
  { value: 'order-analysis', label: 'Análise de pedidos' },
  { value: 'detailed-order-analysis', label: 'Análise detalhada de pedidos' },
];

// Relatórios de Estoque/Produtos
const STOCK_REPORTS = [
  { value: 'stock-balance', label: 'Saldos de Estoque' },
  { value: 'stock-manual-check', label: 'Conferência Manual de Estoque' },
  { value: 'current-accounts', label: 'Saldos dos Conta-Correntes' },
  { value: 'stock-value-product', label: 'Valor do estoque - Por Produto' },
  { value: 'stock-value-product-sale', label: 'Valor do estoque - Por Produto (Venda)' },
  { value: 'stock-value-category', label: 'Valor do estoque - Por Categoria' },
  { value: 'stock-value-category-sale', label: 'Valor do estoque - Por Categoria (Venda)' },
  { value: 'stock-entries', label: 'Entradas no estoque' },
  { value: 'stock-exits', label: 'Saídas no estoque' },
  { value: 'stock-position', label: 'Posição do estoque' },
  { value: 'products-promo', label: 'Produtos em promoção' },
  { value: 'products-scheduled', label: 'Produtos disponíveis em dias/horários programados' },
  { value: 'products-ncm', label: 'Produtos / conferência de NCM' },
  { value: 'products-list', label: 'Lista de produtos' },
  { value: 'products-by-category', label: 'Produtos por Categoria' },
  { value: 'sales-price-list', label: 'Lista de Preços de Vendas' },
];

// Relatórios de Faturamento
const BILLING_REPORTS = [
  { value: 'billing-products', label: 'Faturamento - Produtos' },
  { value: 'billing-summary', label: 'Faturamento - Resumo' },
  { value: 'billing-payment-methods', label: 'Faturamento - Consolidado - Formas de pagamento' },
  { value: 'billing-daily', label: 'Faturamento - Diário com devoluções' },
  { value: 'billing-operator', label: 'Faturamento - Vendedor/Operador' },
  { value: 'billing-payment-reconciliation', label: 'Faturamento - Formas de pagamento - Conciliação' },
  { value: 'billing-payment-grouping', label: 'Faturamento - Formas de pagamento - Agrupamento' },
  { value: 'billing-cashier-check', label: 'Faturamento - Verificação do Caixa' },
  { value: 'billing-delay', label: 'Faturamento - Atraso na saída' },
  { value: 'billing-customer-type-day', label: 'Faturamento - Por dia da semana, Clientes novos X recorrentes' },
  { value: 'payment-nsu', label: 'Pagamentos - Relatório NSU' },
  { value: 'orders-notes', label: 'Pedido x Notas' },
  { value: 'orders-discount', label: 'Pedidos com desconto' },
  { value: 'billing-origin', label: 'Análise de pedido por origem' },
  { value: 'supplies-consumed', label: 'Insumos consumidos' },
  { value: 'sales-by-hour', label: 'Vendas por Hora' },
  { value: 'sales-by-hour-detailed', label: 'Relatório de Vendas por horários' },
  { value: 'cancelled-items', label: 'Itens Cancelados' },
  { value: 'products-without-sales', label: 'Produtos sem Vendas' },
];

// Relatórios Avançados
const ADVANCED_REPORTS = [
  { value: 'flavors-sold', label: 'Análise de sabores vendidos no Período' },
  { value: 'flavors-not-sold', label: 'Análise de sabores não vendidos no Período' },
  { value: 'freight-analysis-product', label: 'Análise de vendas por Tipo de Frete - Detalhamento por Produto' },
  { value: 'freight-analysis-daily', label: 'Análise de Vendas por Tipo de Frete - Resumo Diário' },
  { value: 'kds-time-analysis', label: 'Relatório Análise de Tempo KDS' },
  { value: 'kds-time-detailed', label: 'Relatório Análise de Tempo KDS - Detalhado' },
  { value: 'kds-time-by-day', label: 'Relatório Análise de Tempo KDS Por Dia' },
  { value: 'purchase-recurrence', label: 'Recorrência de compra' },
];

// Relatórios de Comissão
const COMMISSION_REPORTS = [
  { value: 'commission-report', label: 'Relatório de Comissões' },
];

// Relatórios FoodService
const FOODSERVICE_REPORTS = [
  { value: 'product-by-operator', label: 'Vendas de Produto por Operador' },
  { value: 'category-by-operator', label: 'Vendas de Categoria por Operador' },
  { value: 'sales-by-table', label: 'Vendas por Mesa' },
  { value: 'sales-by-waiter', label: 'Vendas por Garçom/Vendedor' },
  { value: 'ticket-medio', label: 'Ticket Médio por Pessoa' },
  { value: 'sector-product', label: 'Vendas por Setor - Produto' },
  { value: 'sector-category', label: 'Vendas por Setor - Categoria' },
  { value: 'product-profit', label: 'Lucro por Produto' },
];

// Relatórios Fiscais
const FISCAL_REPORTS = [
  { value: 'ncm-report', label: 'Relatório por NCM' },
  { value: 'cfop-report', label: 'Relatório por CFOP' },
  { value: 'tax-summary', label: 'Resumo de Tributos (Estimado)' },
  { value: 'product-tax', label: 'Tributos por Produto' },
  { value: 'ncm-check', label: 'Conferência NCM/CFOP' },
];

const ALL_REPORTS = [
  { group: 'Análises', reports: ANALYSIS_REPORTS },
  { group: 'Pedidos', reports: ORDER_REPORTS },
  { group: 'Estoque e Produtos', reports: STOCK_REPORTS },
  { group: 'Faturamento', reports: BILLING_REPORTS },
  { group: 'FoodService', reports: FOODSERVICE_REPORTS },
  { group: 'Fiscal', reports: FISCAL_REPORTS },
  { group: 'Avançados', reports: ADVANCED_REPORTS },
  { group: 'Comissões', reports: COMMISSION_REPORTS },
];

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function ReportsHubPage() {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [daysWithoutSale, setDaysWithoutSale] = useState(30);

  const filters = { startDate, endDate };

  // Hooks para cada relatório
  const { data: productsSold = [], isLoading: loadingProducts } = useProductsSoldReport(filters);
  const { data: salesByCategory = [], isLoading: loadingCategory } = useSalesByCategoryReport(filters);
  const { data: salesBySubcategory = [], isLoading: loadingSubcategory } = useSalesBySubcategoryReport(filters);
  const { data: salesByHour = [], isLoading: loadingHour } = useSalesByHourReport(filters);
  const { data: cancelledItems = [], isLoading: loadingCancelled } = useCancelledItemsReport(filters);
  const { data: productsWithoutSales = [], isLoading: loadingWithoutSales } = useProductsWithoutSalesReport(daysWithoutSale);
  
  const { data: stockData, isLoading: loadingStock } = useStockValueReport({});
  const { data: movementsSummary = [], isLoading: loadingMovements } = useStockMovementsSummaryReport(filters);
  
  const { data: productsList = [], isLoading: loadingProductsList } = useProductsListReport(selectedCategory);
  const { data: productsByCategory = [], isLoading: loadingProductsByCategory } = useProductsByCategoryReport();
  
  const { data: billingData, isLoading: loadingBilling } = useBillingReport(filters);
  const { data: billingByPayment = [], isLoading: loadingBillingPayment } = useBillingByPaymentReport(filters);
  const { data: billingByOperator = [], isLoading: loadingBillingOperator } = useBillingByOperatorReport(filters);

  // Novos hooks de análise
  const { data: paymentAnalysis = [], isLoading: loadingPaymentAnalysis } = usePaymentAnalysisReport(filters);
  const { data: neighborhoodAnalysis = [], isLoading: loadingNeighborhood } = useNeighborhoodAnalysisReport(filters);
  const { data: cancelledOrders = [], isLoading: loadingCancelledOrders } = useCancelledOrdersReport(filters);
  const { data: discountsData = [], isLoading: loadingDiscounts } = useDiscountsReport(filters);
  const { data: ordersByTable = [], isLoading: loadingOrdersTable } = useOrdersByTableReport(filters);
  const { data: ordersByOrigin = [], isLoading: loadingOrdersOrigin } = useOrdersByOriginReport(filters);
  const { data: salesByUser = [], isLoading: loadingSalesUser } = useSalesByUserReport(filters);
  const { data: orderAnalysis = [], isLoading: loadingOrderAnalysis } = useOrderAnalysisReport(filters);

  // Hooks avançados
  const { data: delayData = [], isLoading: loadingDelay } = useDelayReport(filters);
  const { data: customerTypeByDay = [], isLoading: loadingCustomerType } = useCustomerTypeByDayReport(filters);
  const { data: flavorsSold = [], isLoading: loadingFlavorsSold } = useFlavorsSoldReport(filters);
  const { data: freightAnalysis = [], isLoading: loadingFreight } = useFreightAnalysisReport(filters);
  const { data: salesByHourDetailed = [], isLoading: loadingSalesHourDetailed } = useSalesByHourDetailedReport(filters);
  const { data: kdsTimeAnalysis = [], isLoading: loadingKdsTime } = useKDSTimeAnalysisReport(filters);
  const { data: kdsTimeByDay = [], isLoading: loadingKdsDay } = useKDSTimeByDayReport(filters);
  const { data: purchaseRecurrence = [], isLoading: loadingRecurrence } = usePurchaseRecurrenceReport(filters);

  // Hooks FoodService
  const { data: productByOperator = [], isLoading: loadingProdOperator } = useProductByOperatorReport(filters);
  const { data: categoryByOperator = [], isLoading: loadingCatOperator } = useCategoryByOperatorReport(filters);
  const { data: salesByTable = [], isLoading: loadingSalesTable } = useSalesByTableReport(filters);
  const { data: sectorProduct = [], isLoading: loadingSectorProd } = useSalesBySectorProductReport(filters);
  const { data: sectorCategory = [], isLoading: loadingSectorCat } = useSalesBySectorCategoryReport(filters);
  const { data: ticketMedioData, isLoading: loadingTicketMedio } = useTicketMedioReport(filters);
  const { data: salesByWaiterData, isLoading: loadingSalesWaiter } = useSalesByWaiterReport(filters);
  const { data: productProfitData, isLoading: loadingProductProfit } = useProductProfitReport(filters);

  // Hooks Fiscais
  const { data: ncmReport = [], isLoading: loadingNcm } = useNCMReport(filters);
  const { data: cfopReport = [], isLoading: loadingCfop } = useCFOPReport(filters);
  const { data: taxSummary = [], isLoading: loadingTaxSum } = useTaxSummaryReport(filters);
  const { data: productTax = [], isLoading: loadingProdTax } = useProductTaxReport(filters);
  const { data: ncmCheck = [], isLoading: loadingNcmCheck } = useNCMCheckReport();

  const isLoading = loadingProducts || loadingCategory || loadingSubcategory || loadingHour || 
    loadingCancelled || loadingWithoutSales || loadingStock || loadingMovements || 
    loadingProductsList || loadingProductsByCategory || loadingBilling || loadingBillingPayment || 
    loadingBillingOperator || loadingPaymentAnalysis || loadingNeighborhood || loadingCancelledOrders ||
    loadingDiscounts || loadingOrdersTable || loadingOrdersOrigin || loadingSalesUser || loadingOrderAnalysis ||
    loadingDelay || loadingCustomerType || loadingFlavorsSold || loadingFreight || 
    loadingSalesHourDetailed || loadingKdsTime || loadingKdsDay || loadingRecurrence ||
    loadingProdOperator || loadingCatOperator || loadingSalesTable || loadingSectorProd || loadingSectorCat ||
    loadingNcm || loadingCfop || loadingTaxSum || loadingProdTax || loadingNcmCheck || loadingTicketMedio ||
    loadingSalesWaiter || loadingProductProfit;

  const handleExport = () => {
    if (!selectedReport) return;
    
    let data: Record<string, unknown>[] = [];
    let columns: { key: string; label: string; format?: (v: any) => string }[] = [];
    let filename = '';

    switch (selectedReport) {
      case 'products-list':
        data = productsList as unknown as Record<string, unknown>[];
        columns = [
          { key: 'name', label: 'Nome' },
          { key: 'category_name', label: 'Categoria' },
          { key: 'subcategory_name', label: 'Subcategoria' },
          { key: 'price', label: 'Preço', format: formatCurrencyExport },
          { key: 'active', label: 'Ativo', format: (v) => v ? 'Sim' : 'Não' },
        ];
        filename = 'lista-produtos';
        break;
      case 'products-by-category':
        data = productsByCategory as unknown as Record<string, unknown>[];
        columns = [
          { key: 'category_name', label: 'Categoria' },
          { key: 'product_count', label: 'Qtd Produtos' },
          { key: 'active_count', label: 'Ativos' },
          { key: 'inactive_count', label: 'Inativos' },
        ];
        filename = 'produtos-por-categoria';
        break;
      case 'stock-value-product':
      case 'stock-value-product-sale':
        data = (stockData?.items || []) as unknown as Record<string, unknown>[];
        columns = [
          { key: 'item_name', label: 'Item' },
          { key: 'current_stock', label: 'Qtd' },
          { key: 'avg_cost', label: 'Custo Unit.', format: formatCurrencyExport },
          { key: 'total_cost_value', label: 'Valor Total', format: formatCurrencyExport },
        ];
        filename = 'estoque-por-produto';
        break;
      case 'billing-products':
        data = productsSold as unknown as Record<string, unknown>[];
        columns = [
          { key: 'product_name', label: 'Produto' },
          { key: 'category_name', label: 'Categoria' },
          { key: 'quantity_sold', label: 'Qtd' },
          { key: 'total_revenue', label: 'Receita', format: formatCurrencyExport },
        ];
        filename = 'faturamento-produtos';
        break;
      case 'billing-payment-methods':
        data = billingByPayment as unknown as Record<string, unknown>[];
        columns = [
          { key: 'payment_method', label: 'Forma Pagamento' },
          { key: 'total_orders', label: 'Qtd Pedidos' },
          { key: 'total_revenue', label: 'Total', format: formatCurrencyExport },
          { key: 'percentage', label: '%', format: (v) => `${v.toFixed(1)}%` },
        ];
        filename = 'faturamento-formas-pagamento';
        break;
      default:
        return;
    }

    if (data.length > 0) {
      exportToCSV({ filename: `${filename}-${startDate}-${endDate}`, columns, data });
    }
  };

  const renderReportContent = () => {
    if (!selectedReport) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Selecione um Relatório</h3>
          <p className="text-muted-foreground mt-2">
            Escolha um modelo de relatório no dropdown acima para visualizar os dados
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (selectedReport) {
      case 'products-list':
        return renderProductsList();
      case 'products-by-category':
        return renderProductsByCategory();
      case 'stock-value-product':
      case 'stock-value-product-sale':
      case 'stock-position':
        return renderStockByProduct();
      case 'stock-value-category':
      case 'stock-value-category-sale':
        return renderStockByCategory();
      case 'stock-entries':
        return renderStockEntries();
      case 'stock-exits':
        return renderStockExits();
      case 'billing-products':
        return renderBillingProducts();
      case 'billing-summary':
        return renderBillingSummary();
      case 'billing-payment-methods':
      case 'billing-payment-reconciliation':
      case 'billing-payment-grouping':
        return renderBillingByPayment();
      case 'billing-operator':
        return renderBillingByOperator();
      case 'sales-by-hour':
        return renderSalesByHour();
      case 'cancelled-items':
        return renderCancelledItems();
      case 'products-without-sales':
        return renderProductsWithoutSales();
      case 'sales-price-list':
        return renderSalesPriceList();
      case 'billing-daily':
        return renderBillingDaily();
      // Relatórios adicionais que usam funções existentes
      case 'products-promo':
      case 'products-scheduled':
      case 'products-ncm':
        return renderProductsList();
      case 'billing-cashier-check':
        return renderBillingSummary();
      case 'orders-notes':
      case 'orders-discount':
        return renderBillingProducts();
      case 'billing-origin':
        return renderBillingByOperator();
      case 'supplies-consumed':
        return renderStockExits();
      // Novos relatórios de análise
      case 'payment-analysis':
        return renderPaymentAnalysis();
      case 'payment-nsu':
        return <PaymentNSUReport startDate={filters.startDate} endDate={filters.endDate} />;
      case 'product-analysis':
      case 'category-analysis':
        return renderCategoryAnalysis();
      case 'neighborhood-analysis':
        return renderNeighborhoodAnalysis();
      case 'flavors-analysis':
      case 'optional-groups-analysis':
        return renderBillingProducts();
      case 'cancelled-orders':
        return renderCancelledOrders();
      case 'discounts-granted':
      case 'discount-coupon':
        return renderDiscounts();
      case 'excluded-items':
      case 'removed-charges':
        return renderCancelledItems();
      case 'orders-by-table':
        return renderOrdersByTable();
      case 'orders-by-origin':
        return renderOrdersByOrigin();
      case 'sales-by-user':
        return renderSalesByUser();
      case 'order-analysis':
      case 'detailed-order-analysis':
        return renderOrderAnalysis();
      case 'stock-balance':
      case 'stock-manual-check':
        return renderStockByProduct();
      case 'current-accounts':
        return renderBillingSummary();
      // Novos relatórios avançados
      case 'billing-delay':
        return renderDelayReport();
      case 'billing-customer-type-day':
        return renderCustomerTypeByDay();
      case 'flavors-sold':
        return renderFlavorsSold();
      case 'flavors-not-sold':
        return renderFlavorsNotSold();
      case 'freight-analysis-product':
      case 'freight-analysis-daily':
        return renderFreightAnalysis();
      case 'sales-by-hour-detailed':
        return renderSalesByHourDetailed();
      case 'kds-time-analysis':
      case 'kds-time-detailed':
        return renderKDSTimeAnalysis();
      case 'kds-time-by-day':
        return renderKDSTimeByDay();
      case 'purchase-recurrence':
        return renderPurchaseRecurrence();
      case 'commission-report':
        return <CommissionReport startDate={startDate} endDate={endDate} />;
      // FoodService Reports
      case 'product-by-operator':
        return renderProductByOperator();
      case 'category-by-operator':
        return renderCategoryByOperator();
      case 'sales-by-table':
        return renderSalesByTableFS();
      case 'sales-by-waiter':
        return renderSalesByWaiter();
      case 'ticket-medio':
        return renderTicketMedio();
      case 'sector-product':
        return renderSectorProduct();
      case 'sector-category':
        return renderSectorCategory();
      case 'product-profit':
        return renderProductProfit();
      // Fiscal Reports
      case 'ncm-report':
        return renderNCMReport();
      case 'cfop-report':
        return renderCFOPReport();
      case 'tax-summary':
        return renderTaxSummary();
      case 'product-tax':
        return renderProductTax();
      case 'ncm-check':
        return renderNCMCheck();
      default:
        return renderBillingSummary();
    }
  };

  // ============ RENDERS ESPECÍFICOS ============

  const renderProductsList = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Subcategoria</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum produto encontrado
              </TableCell>
            </TableRow>
          ) : productsList.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category_name || '-'}</TableCell>
              <TableCell>{product.subcategory_name || '-'}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
              <TableCell>
                <Badge variant={product.active ? 'default' : 'secondary'}>
                  {product.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderProductsByCategory = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Total Produtos</TableHead>
            <TableHead className="text-right">Ativos</TableHead>
            <TableHead className="text-right">Inativos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productsByCategory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhuma categoria encontrada
              </TableCell>
            </TableRow>
          ) : productsByCategory.map((cat) => (
            <TableRow key={cat.category_id}>
              <TableCell className="font-medium">{cat.category_name}</TableCell>
              <TableCell className="text-right">{cat.product_count}</TableCell>
              <TableCell className="text-right">
                <Badge variant="default">{cat.active_count}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{cat.inactive_count}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderPaymentAnalysis = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Forma de Pagamento</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentAnalysis.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado encontrado</TableCell></TableRow>
          ) : paymentAnalysis.map((item) => (
            <TableRow key={item.payment_method}>
              <TableCell className="font-medium">{item.payment_method}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderCategoryAnalysis = () => renderProductsByCategory();

  const renderNeighborhoodAnalysis = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bairro</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {neighborhoodAnalysis.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado encontrado</TableCell></TableRow>
          ) : neighborhoodAnalysis.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{item.neighborhood}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderCancelledOrders = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cancelledOrders.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum pedido cancelado</TableCell></TableRow>
          ) : cancelledOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">#{order.order_number}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell><Badge variant="destructive">{order.cancel_reason}</Badge></TableCell>
              <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
              <TableCell>{order.cancelled_at ? format(new Date(order.cancelled_at), 'dd/MM/yyyy') : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderDiscounts = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Desconto</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discountsData.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum desconto concedido</TableCell></TableRow>
          ) : discountsData.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">#{item.order_number}</TableCell>
              <TableCell>{item.customer_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.discount_value)}</TableCell>
              <TableCell className="text-right"><Badge variant="secondary">{item.discount_percent.toFixed(1)}%</Badge></TableCell>
              <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderOrdersByTable = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mesa</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordersByTable.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado encontrado</TableCell></TableRow>
          ) : ordersByTable.map((item) => (
            <TableRow key={item.table_number}>
              <TableCell className="font-medium">Mesa {item.table_number}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderOrdersByOrigin = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origem</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordersByOrigin.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado encontrado</TableCell></TableRow>
          ) : ordersByOrigin.map((item) => (
            <TableRow key={item.origin}>
              <TableCell className="font-medium">{item.origin}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSalesByUser = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesByUser.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado encontrado</TableCell></TableRow>
          ) : salesByUser.map((item) => (
            <TableRow key={item.user_id}>
              <TableCell className="font-medium">{item.user_name}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderOrderAnalysis = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderAnalysis.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
          ) : orderAnalysis.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">#{order.order_number}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
              <TableCell>{order.order_type}</TableCell>
              <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
              <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderBillingDaily = () => {
    const dailyData = productsSold.length > 0 ? (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd Vendida</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsSold.map((product) => (
              <TableRow key={product.product_id}>
                <TableCell className="font-medium">{product.product_name}</TableCell>
                <TableCell><Badge variant="outline">{product.category_name || '-'}</Badge></TableCell>
                <TableCell className="text-right">{product.quantity_sold}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.total_revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    ) : (
      <div className="text-center text-muted-foreground py-8">Nenhuma venda no período</div>
    );
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold">{formatCurrency(billingData?.total_revenue || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Pedidos</p>
              <p className="text-2xl font-bold">{billingData?.total_orders || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold">{formatCurrency(billingData?.avg_ticket || 0)}</p>
            </CardContent>
          </Card>
        </div>
        {dailyData}
      </div>
    );
  };

  const renderStockByProduct = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Custo Unit.</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!stockData?.items.length ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum item no estoque
              </TableCell>
            </TableRow>
          ) : stockData.items.map((item) => (
            <TableRow key={item.erp_item_id}>
              <TableCell className="font-medium">{item.item_name}</TableCell>
              <TableCell>{item.sku || '-'}</TableCell>
              <TableCell><Badge variant="outline">{item.item_type}</Badge></TableCell>
              <TableCell className="text-right">{item.current_stock.toFixed(2)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_cost)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(item.total_cost_value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderStockByCategory = () => {
    // Agrupar estoque por tipo de item
    const grouped = (stockData?.items || []).reduce((acc, item) => {
      const type = item.item_type;
      if (!acc[type]) acc[type] = { qty: 0, value: 0 };
      acc[type].qty += item.current_stock;
      acc[type].value += item.total_cost_value;
      return acc;
    }, {} as Record<string, { qty: number; value: number }>);

    return (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria/Tipo</TableHead>
              <TableHead className="text-right">Qtd Total</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(grouped).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            ) : Object.entries(grouped).map(([type, data]) => (
              <TableRow key={type}>
                <TableCell className="font-medium">{type}</TableCell>
                <TableCell className="text-right">{data.qty.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(data.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  const renderStockEntries = () => {
    const entries = movementsSummary.filter(m => m.movement_type.includes('in') || m.movement_type === 'purchase_in');
    return (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Entrada</TableHead>
              <TableHead className="text-right">Qtd Total</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Nº Movimentações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma entrada no período
                </TableCell>
              </TableRow>
            ) : entries.map((mov) => (
              <TableRow key={mov.movement_type}>
                <TableCell className="font-medium">{mov.movement_type_label}</TableCell>
                <TableCell className="text-right">{mov.total_qty.toFixed(2)}</TableCell>
                <TableCell className="text-right">{formatCurrency(mov.total_value)}</TableCell>
                <TableCell className="text-right">{mov.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  const renderStockExits = () => {
    const exits = movementsSummary.filter(m => m.movement_type.includes('out') || m.movement_type === 'sale_out');
    return (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Saída</TableHead>
              <TableHead className="text-right">Qtd Total</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Nº Movimentações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma saída no período
                </TableCell>
              </TableRow>
            ) : exits.map((mov) => (
              <TableRow key={mov.movement_type}>
                <TableCell className="font-medium">{mov.movement_type_label}</TableCell>
                <TableCell className="text-right">{mov.total_qty.toFixed(2)}</TableCell>
                <TableCell className="text-right">{formatCurrency(mov.total_value)}</TableCell>
                <TableCell className="text-right">{mov.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  const renderBillingProducts = () => (
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
          {productsSold.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma venda no período
              </TableCell>
            </TableRow>
          ) : productsSold.map((product, index) => (
            <TableRow key={product.product_id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{product.product_name}</TableCell>
              <TableCell><Badge variant="outline">{product.category_name || '-'}</Badge></TableCell>
              <TableCell className="text-right">{product.quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.avg_price)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderBillingSummary = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold">{formatCurrency(billingData?.total_revenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">{billingData?.total_orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(billingData?.avg_ticket || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
                <p className="text-2xl font-bold">{formatCurrency(billingData?.total_delivery_fee || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBillingByPayment = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Forma de Pagamento</TableHead>
            <TableHead className="text-right">Qtd Pedidos</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {billingByPayment.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum pagamento no período
              </TableCell>
            </TableRow>
          ) : billingByPayment.map((payment, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{payment.payment_method || 'Não informado'}</TableCell>
              <TableCell className="text-right">{payment.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(payment.total_revenue)}</TableCell>
              <TableCell className="text-right">{payment.percentage.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderBillingByOperator = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operador</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {billingByOperator.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum operador no período
              </TableCell>
            </TableRow>
          ) : billingByOperator.map((op, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{op.operator_name}</TableCell>
              <TableCell className="text-right">{op.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(op.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(op.avg_ticket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSalesByHour = () => (
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
          {salesByHour.filter(h => h.orders_count > 0).length === 0 ? (
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
  );

  const renderCancelledItems = () => (
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
          {cancelledItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum cancelamento no período
              </TableCell>
            </TableRow>
          ) : cancelledItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.product_name}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell>{format(new Date(item.cancelled_at), 'dd/MM/yyyy HH:mm')}</TableCell>
              <TableCell>{item.reason}</TableCell>
              <TableCell>{item.cancelled_by_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderProductsWithoutSales = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Dias sem venda:</Label>
        <Input 
          type="number" 
          value={daysWithoutSale} 
          onChange={(e) => setDaysWithoutSale(parseInt(e.target.value) || 30)}
          className="w-24"
        />
      </div>
      <ScrollArea className="h-[450px]">
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
            {productsWithoutSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Todos os produtos foram vendidos recentemente
                </TableCell>
              </TableRow>
            ) : productsWithoutSales.map((product) => (
              <TableRow key={product.product_id}>
                <TableCell className="font-medium">{product.product_name}</TableCell>
                <TableCell><Badge variant="outline">{product.category_name || '-'}</Badge></TableCell>
                <TableCell>
                  {product.last_sale_date 
                    ? format(new Date(product.last_sale_date), 'dd/MM/yyyy')
                    : 'Nunca vendido'
                  }
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={product.days_without_sale > 60 ? 'destructive' : 'secondary'}>
                    {product.days_without_sale > 900 ? 'Nunca' : `${product.days_without_sale} dias`}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );

  const renderSalesPriceList = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço de Venda</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum produto encontrado
              </TableCell>
            </TableRow>
          ) : productsList.filter(p => p.active).map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category_name || '-'}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(product.price)}</TableCell>
              <TableCell>
                <Badge variant="default">Ativo</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  // ============ RENDERS AVANÇADOS ============

  const renderDelayReport = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Atraso (min)</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {delayData.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum atraso registrado</TableCell></TableRow>
          ) : delayData.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">#{item.order_number}</TableCell>
              <TableCell>{item.customer_name}</TableCell>
              <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
              <TableCell className="text-right"><Badge variant="destructive">{item.delay_minutes} min</Badge></TableCell>
              <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderCustomerTypeByDay = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dia</TableHead>
            <TableHead className="text-right">Novos</TableHead>
            <TableHead className="text-right">Recorrentes</TableHead>
            <TableHead className="text-right">Total Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customerTypeByDay.map((item) => (
            <TableRow key={item.day_number}>
              <TableCell className="font-medium">{item.day_of_week}</TableCell>
              <TableCell className="text-right"><Badge variant="default">{item.new_customers}</Badge></TableCell>
              <TableCell className="text-right"><Badge variant="secondary">{item.returning_customers}</Badge></TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderFlavorsSold = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sabor</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flavorsSold.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum sabor vendido</TableCell></TableRow>
          ) : flavorsSold.map((item) => (
            <TableRow key={item.flavor_id}>
              <TableCell className="font-medium">{item.flavor_name}</TableCell>
              <TableCell>{item.product_name}</TableCell>
              <TableCell className="text-right">{item.quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderFlavorsNotSold = () => (
    <div className="text-center py-8 text-muted-foreground">
      <p>Relatório de sabores não vendidos - baseado em sabores cadastrados sem vendas no período</p>
    </div>
  );

  const renderFreightAnalysis = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {freightAnalysis.map((item) => (
            <TableRow key={item.freight_type}>
              <TableCell className="font-medium">{item.freight_type}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSalesByHourDetailed = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Horário</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="text-right">Tempo Médio (min)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesByHourDetailed.map((item) => (
            <TableRow key={item.hour}>
              <TableCell className="font-medium">{item.hour}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
              <TableCell className="text-right">{item.avg_time_minutes} min</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderKDSTimeAnalysis = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Tempo Médio</TableHead>
            <TableHead className="text-right">Mín</TableHead>
            <TableHead className="text-right">Máx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kdsTimeAnalysis.map((item) => (
            <TableRow key={item.sector_name}>
              <TableCell className="font-medium">{item.sector_name}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right"><Badge>{item.avg_time_minutes} min</Badge></TableCell>
              <TableCell className="text-right">{item.min_time_minutes} min</TableCell>
              <TableCell className="text-right">{item.max_time_minutes} min</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderKDSTimeByDay = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Tempo Médio</TableHead>
            <TableHead className="text-right">Atrasados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kdsTimeByDay.map((item) => (
            <TableRow key={item.date}>
              <TableCell className="font-medium">{format(new Date(item.date), 'dd/MM/yyyy')}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{item.avg_time_minutes} min</TableCell>
              <TableCell className="text-right"><Badge variant={item.delayed_orders > 0 ? 'destructive' : 'secondary'}>{item.delayed_orders}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderPurchaseRecurrence = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Intervalo Médio</TableHead>
            <TableHead className="text-right">Total Gasto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseRecurrence.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum cliente recorrente</TableCell></TableRow>
          ) : purchaseRecurrence.map((item) => (
            <TableRow key={item.customer_id}>
              <TableCell className="font-medium">{item.customer_name}</TableCell>
              <TableCell>{item.phone}</TableCell>
              <TableCell className="text-right"><Badge variant="default">{item.total_orders}</Badge></TableCell>
              <TableCell className="text-right">{item.avg_days_between} dias</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_spent)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  // ============ RENDERS FOODSERVICE ============
  const renderProductByOperator = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operador</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productByOperator.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : productByOperator.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.employee_name}</TableCell>
              <TableCell>{item.product_name}</TableCell>
              <TableCell>{item.category_name}</TableCell>
              <TableCell className="text-right">{item.quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderCategoryByOperator = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operador</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categoryByOperator.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : categoryByOperator.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.employee_name}</TableCell>
              <TableCell>{item.category_name}</TableCell>
              <TableCell className="text-right">{item.quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSalesByTableFS = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mesa</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesByTable.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : salesByTable.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{item.table_number}</TableCell>
              <TableCell className="text-right">{item.total_orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.avg_ticket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSectorProduct = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Setor</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectorProduct.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : sectorProduct.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.sector_name}</TableCell>
              <TableCell>{item.product_name}</TableCell>
              <TableCell className="text-right">{item.quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSectorCategory = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Setor</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectorCategory.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : sectorCategory.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.sector_name}</TableCell>
              <TableCell>{item.category_name}</TableCell>
              <TableCell className="text-right">{item.quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderTicketMedio = () => {
    const summary = ticketMedioData?.summary;
    const details = ticketMedioData?.details || [];
    
    return (
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Mesas Fechadas</p>
            <p className="text-2xl font-bold">{summary?.total_sessions || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Pessoas</p>
            <p className="text-2xl font-bold">{summary?.total_pessoas || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Ticket Médio/Mesa</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(summary?.ticket_medio_geral || 0)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Ticket Médio/Pessoa</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.ticket_medio_por_pessoa || 0)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Faturamento Total</p>
            <p className="text-xl font-bold">{formatCurrency(summary?.total_faturamento || 0)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Média Pessoas/Mesa</p>
            <p className="text-xl font-bold">{(summary?.media_pessoas_por_mesa || 0).toFixed(1)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Tempo Médio (min)</p>
            <p className="text-xl font-bold">{Math.round(summary?.media_tempo_permanencia_min || 0)}</p>
          </Card>
        </div>

        {/* Detalhes */}
        <ScrollArea className="h-[350px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mesa</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pessoas</TableHead>
                <TableHead className="text-right">Ticket/Pessoa</TableHead>
                <TableHead className="text-right">Tempo (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum dado - Feche mesas informando a quantidade de pessoas</TableCell></TableRow>
              ) : details.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">Mesa {item.table_number}</TableCell>
                  <TableCell className="text-xs">{new Date(item.opened_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-xs">{new Date(item.closed_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                  <TableCell className="text-right">{item.people_count}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">{formatCurrency(item.ticket_por_pessoa)}</TableCell>
                  <TableCell className="text-right">{item.tempo_permanencia_min}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  // ============ RENDERS FISCAIS ============
  const renderNCMReport = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>NCM</TableHead>
            <TableHead className="text-right">Produtos</TableHead>
            <TableHead className="text-right">Qtd Vendida</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ncmReport.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : ncmReport.map((item) => (
            <TableRow key={item.ncm_code}>
              <TableCell className="font-mono">{item.ncm_code}</TableCell>
              <TableCell className="text-right">{item.product_count}</TableCell>
              <TableCell className="text-right">{item.total_quantity_sold}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_value)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderCFOPReport = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CFOP</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Produtos</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cfopReport.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : cfopReport.map((item) => (
            <TableRow key={item.cfop_code}>
              <TableCell className="font-mono">{item.cfop_code}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right">{item.product_count}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_value)}</TableCell>
              <TableCell className="text-right"><Badge variant="outline">{item.percentage.toFixed(1)}%</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderTaxSummary = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tributo</TableHead>
            <TableHead className="text-right">Base de Cálculo</TableHead>
            <TableHead className="text-right">Alíquota</TableHead>
            <TableHead className="text-right">Valor Estimado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taxSummary.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : taxSummary.map((item) => (
            <TableRow key={item.tax_type}>
              <TableCell className="font-medium">{item.tax_type}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.base_value)}</TableCell>
              <TableCell className="text-right">{item.estimated_rate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{formatCurrency(item.estimated_value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderProductTax = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>NCM</TableHead>
            <TableHead className="text-right">Vendas</TableHead>
            <TableHead className="text-right">ICMS Est.</TableHead>
            <TableHead className="text-right">Total Tributos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productTax.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : productTax.map((item) => (
            <TableRow key={item.product_id}>
              <TableCell>{item.product_name}</TableCell>
              <TableCell className="font-mono text-xs">{item.ncm || '-'}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_sold)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.estimated_icms)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total_taxes)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderNCMCheck = () => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>NCM</TableHead>
            <TableHead>CFOP</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ncmCheck.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>
          ) : ncmCheck.map((item) => (
            <TableRow key={item.product_id}>
              <TableCell>{item.product_name}</TableCell>
              <TableCell>{item.category_name}</TableCell>
              <TableCell className="font-mono text-xs">{item.ncm_code || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{item.cfop_code || '-'}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'ok' ? 'default' : item.status === 'warning' ? 'secondary' : 'destructive'}>
                  {item.status === 'ok' ? 'Conforme' : item.status === 'warning' ? 'Atenção' : 'Incompleto'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const renderSalesByWaiter = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Vendedores</div><div className="text-2xl font-bold">{salesByWaiterData?.summary.total_waiters || 0}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Pedidos</div><div className="text-2xl font-bold">{salesByWaiterData?.summary.total_orders || 0}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Receita Total</div><div className="text-2xl font-bold text-green-600">{formatCurrency(salesByWaiterData?.summary.total_revenue || 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Média/Vendedor</div><div className="text-2xl font-bold">{formatCurrency(salesByWaiterData?.summary.avg_per_waiter || 0)}</div></CardContent></Card>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead className="text-right">Pedidos</TableHead><TableHead className="text-right">Itens</TableHead><TableHead className="text-right">Mesas</TableHead><TableHead className="text-right">Ticket Médio</TableHead><TableHead className="text-right">Receita</TableHead></TableRow></TableHeader>
          <TableBody>
            {(salesByWaiterData?.details || []).map((w) => (
              <TableRow key={w.waiter_id}><TableCell className="font-medium">{w.waiter_name}</TableCell><TableCell className="text-right">{w.total_orders}</TableCell><TableCell className="text-right">{w.total_items}</TableCell><TableCell className="text-right">{w.total_tables}</TableCell><TableCell className="text-right">{formatCurrency(w.avg_ticket)}</TableCell><TableCell className="text-right font-medium text-green-600">{formatCurrency(w.total_revenue)}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );

  const renderProductProfit = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Receita Total</div><div className="text-2xl font-bold text-green-600">{formatCurrency(productProfitData?.summary.total_revenue || 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Custo Total</div><div className="text-2xl font-bold text-red-600">{formatCurrency(productProfitData?.summary.total_cost || 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Impostos Est.</div><div className="text-2xl font-bold text-orange-600">{formatCurrency(productProfitData?.summary.total_tax || 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Lucro Líquido</div><div className="text-2xl font-bold text-primary">{formatCurrency(productProfitData?.summary.net_profit || 0)}</div></CardContent></Card>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Receita</TableHead><TableHead className="text-right">Lucro</TableHead><TableHead className="text-right">Margem</TableHead></TableRow></TableHeader>
          <TableBody>
            {(productProfitData?.details || []).map((p) => (
              <TableRow key={p.product_id}><TableCell className="font-medium">{p.product_name}</TableCell><TableCell>{p.category_name}</TableCell><TableCell className="text-right">{p.quantity_sold}</TableCell><TableCell className="text-right">{formatCurrency(p.sale_price)}</TableCell><TableCell className="text-right text-red-600">{formatCurrency(p.unit_cost)}</TableCell><TableCell className="text-right">{formatCurrency(p.total_revenue)}</TableCell><TableCell className={`text-right font-medium ${p.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(p.net_profit)}</TableCell><TableCell className="text-right"><Badge variant={p.margin_percent >= 30 ? 'default' : p.margin_percent >= 15 ? 'secondary' : 'destructive'}>{p.margin_percent.toFixed(1)}%</Badge></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">Selecione um modelo de relatório e configure os filtros</p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[300px]">
                <Label>Modelo</Label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um relatório..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {ALL_REPORTS.map((group) => (
                      <div key={group.group}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">
                          {group.group}
                        </div>
                        {group.reports.map((report) => (
                          <SelectItem key={report.value} value={report.value}>
                            {report.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              {selectedReport === 'products-by-category' && (
                <div>
                  <Label>Categoria</Label>
                  <Input 
                    type="text"
                    placeholder="Filtrar categoria..."
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-48"
                  />
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={!selectedReport || isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo do Relatório */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedReport 
                ? [...STOCK_REPORTS, ...BILLING_REPORTS].find(r => r.value === selectedReport)?.label 
                : 'Dados do Relatório'
              }
            </CardTitle>
            {selectedReport && (
              <CardDescription>
                Período: {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {renderReportContent()}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
