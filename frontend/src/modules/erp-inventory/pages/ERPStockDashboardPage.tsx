import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { useERPItems } from '../hooks/useERPItems';
import { useERPStock } from '../hooks/useERPStock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ArrowRight,
  Loader2,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function ERPStockDashboardPage() {
  const { items, isLoading, lowStockItems } = useERPItems(['raw', 'consumable']);
  const { movements } = useERPStock();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Dashboard de Estoque">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  // Calculate metrics
  const totalItems = items.length;
  const totalStockValue = items.reduce((sum, item) => sum + item.current_stock * item.avg_cost, 0);
  const lowStockCount = lowStockItems.length;
  
  // Items by type
  const itemsByType = items.reduce((acc, item) => {
    acc[item.item_type] = (acc[item.item_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeLabels: Record<string, string> = {
    raw: 'Insumos',
    consumable: 'Consumíveis',
    resale: 'Revenda',
    finished: 'Produtos'
  };

  const pieData = Object.entries(itemsByType).map(([type, count]) => ({
    name: typeLabels[type] || type,
    value: count
  }));

  // Top items by value
  const topValueItems = [...items]
    .map(item => ({
      name: item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name,
      value: item.current_stock * item.avg_cost
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Recent movements
  const recentMovements = movements.slice(0, 5);

  // Movement summary
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const recentMovementsSummary = movements.filter(m => new Date(m.created_at) >= last7Days);
  const entriesCount = recentMovementsSummary.filter(m => m.movement_type.includes('in')).length;
  const exitsCount = recentMovementsSummary.filter(m => m.movement_type.includes('out')).length;

  return (
    <ERPInventoryLayout title="Dashboard de Estoque">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              itens cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              custo médio total
            </p>
          </CardContent>
        </Card>

        <Card className={lowStockCount > 0 ? 'border-orange-500' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-orange-500' : ''}`} />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-orange-500' : ''}`}>
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              abaixo do mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Movimentos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-lg font-bold">{entriesCount}</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span className="text-lg font-bold">{exitsCount}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              entradas / saídas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Items by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Items by Value */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 - Valor em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topValueItems} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="mb-6 border-orange-500 bg-orange-500/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Itens Abaixo do Estoque Mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => {
                const percentage = item.min_stock > 0 
                  ? Math.round((item.current_stock / item.min_stock) * 100) 
                  : 0;
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {item.current_stock} / {item.min_stock}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <Progress value={percentage} className="h-2 [&>div]:bg-orange-500" />
                      <span className="text-sm text-orange-600 w-12">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {lowStockCount > 5 && (
              <Button variant="link" className="mt-2 p-0" asChild>
                <Link to="/erp-inventory/stock">
                  Ver todos os {lowStockCount} itens <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/erp-inventory/stock">
                <Package className="w-5 h-5" />
                <span>Ver Estoque</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/erp-inventory/movements">
                <TrendingUp className="w-5 h-5" />
                <span>Movimentos</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/erp-inventory/inventory-count">
                <BarChart3 className="w-5 h-5" />
                <span>Contagem</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/erp-inventory/purchases">
                <DollarSign className="w-5 h-5" />
                <span>Compras</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ERPInventoryLayout>
  );
}
