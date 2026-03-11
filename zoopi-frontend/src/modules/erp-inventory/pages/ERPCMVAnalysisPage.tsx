import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { useERPCOGS } from '../hooks/useERPCOGS';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { ERPCMVReport } from '../types';

export default function ERPCMVAnalysisPage() {
  const { computePeriodCOGS, getCMVReport } = useERPCOGS();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<ERPCMVReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const handleLoadReport = async () => {
    setIsLoadingReport(true);
    try {
      const data = await getCMVReport(startDate, endDate);
      setReport(data);
    } catch (error) {
      console.error('Error loading CMV report:', error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleRecalculate = async () => {
    await computePeriodCOGS.mutateAsync({ startDate, endDate });
    await handleLoadReport();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <ERPInventoryLayout title="CMV - Custo da Mercadoria Vendida">
      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={handleLoadReport} disabled={isLoadingReport}>
            {isLoadingReport ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Carregar Relatório
          </Button>
          <Button variant="outline" onClick={handleRecalculate} disabled={computePeriodCOGS.isPending}>
            {computePeriodCOGS.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Recalcular CMV
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold">{formatCurrency(report.total_revenue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">CMV Total</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(report.total_cogs)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Lucro Bruto</p>
              <p className={`text-2xl font-bold ${report.gross_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(report.gross_margin)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Margem Bruta</p>
              <div className="flex items-center gap-2">
                {report.gross_margin_percent >= 30 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
                <p className={`text-2xl font-bold ${report.gross_margin_percent >= 30 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(report.gross_margin_percent)}
                </p>
              </div>
            </Card>
          </div>

          {/* By Product Table */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-medium">CMV por Produto</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd Vendida</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">CMV</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.by_product.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="text-right">{product.qty_sold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(product.cogs)}</TableCell>
                    <TableCell className={`text-right ${product.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(product.margin)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${product.margin_percent >= 30 ? 'text-green-600' : product.margin_percent < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {formatPercent(product.margin_percent)}
                    </TableCell>
                  </TableRow>
                ))}
                {report.by_product.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum dado de CMV encontrado para o período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {!report && !isLoadingReport && (
        <Card className="p-8 text-center text-muted-foreground">
          Selecione um período e clique em "Carregar Relatório" para visualizar o CMV.
        </Card>
      )}
    </ERPInventoryLayout>
  );
}
