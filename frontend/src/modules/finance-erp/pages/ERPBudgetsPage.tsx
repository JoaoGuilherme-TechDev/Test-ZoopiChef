import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  useERPBudgets,
  useCreateBudget,
  useDeleteBudget,
  type BudgetInsert,
} from "../hooks/useERPBudgets";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useCostCenters } from "@/hooks/useCostCenters";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { SkeletonKPIGrid, SkeletonTable } from "@/components/ui/skeleton-table";
import { EmptyData } from "@/components/ui/empty-state";

export function ERPBudgetsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: budgets, isLoading } = useERPBudgets(year);
  const { accounts } = useChartOfAccounts();
  const { data: costCenters } = useCostCenters();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [form, setForm] = useState<BudgetInsert>({
    name: "",
    budget_type: "expense",
    period_type: "monthly",
    period_year: currentYear,
    period_month: new Date().getMonth() + 1,
    planned_amount_cents: 0,
    category_id: null,
    cost_center_id: null,
    alert_threshold_percent: 80,
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  const handleSubmit = async () => {
    await createBudget.mutateAsync(form);
    setIsDialogOpen(false);
    setForm({
      name: "",
      budget_type: "expense",
      period_type: "monthly",
      period_year: currentYear,
      period_month: new Date().getMonth() + 1,
      planned_amount_cents: 0,
      category_id: null,
      cost_center_id: null,
      alert_threshold_percent: 80,
    });
  };

  const totalPlanned = budgets?.reduce((s, b) => s + b.planned_amount_cents, 0) || 0;
  const totalActual = budgets?.reduce((s, b) => s + b.actual_amount_cents, 0) || 0;
  const overBudgetCount = budgets?.filter((b) => (b.usage_percent || 0) > 100).length || 0;
  const warningCount = budgets?.filter((b) => {
    const usage = b.usage_percent || 0;
    return usage >= b.alert_threshold_percent && usage <= 100;
  }).length || 0;

  const getStatusBadge = (budget: typeof budgets extends (infer T)[] | undefined ? T : never) => {
    const usage = budget.usage_percent || 0;
    if (usage > 100) {
      return <Badge variant="destructive">Excedido</Badge>;
    }
    if (usage >= budget.alert_threshold_percent) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Atenção</Badge>;
    }
    return <Badge variant="outline" className="text-green-600">OK</Badge>;
  };

  const expenseAccounts = accounts?.filter((a) => a.account_type === "expense") || [];

  // Export configuration
  const exportData = (budgets || []).map(b => ({
    nome: b.name,
    tipo: b.budget_type,
    periodo: b.period_type === 'monthly' 
      ? new Date(2000, (b.period_month || 1) - 1).toLocaleString("pt-BR", { month: "long" })
      : b.period_type,
    planejado: b.planned_amount_cents,
    realizado: b.actual_amount_cents,
    uso_percent: b.usage_percent || 0,
    status: (b.usage_percent || 0) > 100 ? 'Excedido' : (b.usage_percent || 0) >= b.alert_threshold_percent ? 'Atenção' : 'OK',
  }));

  const exportColumns = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'periodo', label: 'Período' },
    { key: 'planejado', label: 'Planejado', format: (v: number) => formatCurrency(v) },
    { key: 'realizado', label: 'Realizado', format: (v: number) => formatCurrency(v) },
    { key: 'uso_percent', label: 'Uso %', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'status', label: 'Status' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Orçamentos">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <SkeletonTable rows={6} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orçamentos">
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Gestão de Orçamentos</h2>
            <p className="text-muted-foreground">
              Planeje e acompanhe seus gastos por categoria
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportDropdown
              data={exportData}
              columns={exportColumns}
              filename={`orcamentos-${year}`}
              title={`Orçamentos ${year}`}
              disabled={(budgets || []).length === 0}
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Orçamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Orçamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Marketing Mensal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={form.budget_type}
                        onValueChange={(v) => setForm({ ...form, budget_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Despesa</SelectItem>
                          <SelectItem value="revenue">Receita</SelectItem>
                          <SelectItem value="investment">Investimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Período</Label>
                      <Select
                        value={form.period_type}
                        onValueChange={(v) => setForm({ ...form, period_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {form.period_type === "monthly" && (
                    <div>
                      <Label>Mês</Label>
                      <Select
                        value={form.period_month?.toString()}
                        onValueChange={(v) => setForm({ ...form, period_month: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2000, i).toLocaleString("pt-BR", { month: "long" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Categoria (opcional)</Label>
                    <Select
                      value={form.category_id || "none"}
                      onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {expenseAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Centro de Custo (opcional)</Label>
                    <Select
                      value={form.cost_center_id || "none"}
                      onValueChange={(v) => setForm({ ...form, cost_center_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {costCenters?.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor Planejado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(form.planned_amount_cents / 100).toFixed(2)}
                      onChange={(e) =>
                        setForm({ ...form, planned_amount_cents: Math.round(parseFloat(e.target.value || "0") * 100) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Alerta em (%)</Label>
                    <Input
                      type="number"
                      value={form.alert_threshold_percent}
                      onChange={(e) =>
                        setForm({ ...form, alert_threshold_percent: parseInt(e.target.value || "80") })
                      }
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={createBudget.isPending} className="w-full">
                    Criar Orçamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Planejado
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPlanned)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Realizado
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Alerta
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Excedidos
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overBudgetCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Budget List */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos de {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {budgets?.length === 0 ? (
              <EmptyData entity="orçamentos" type="list" />
            ) : (
              <div className="space-y-4">
                {budgets?.map((budget) => (
                  <div
                    key={budget.id}
                    className="border rounded-lg p-4 space-y-3 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-medium">{budget.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {budget.category_name || "Sem categoria"} • 
                            {budget.period_type === "monthly" && ` ${new Date(2000, (budget.period_month || 1) - 1).toLocaleString("pt-BR", { month: "long" })}`}
                            {budget.period_type === "quarterly" && ` Q${budget.period_month}`}
                            {budget.period_type === "yearly" && " Anual"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(budget)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBudget.mutate(budget.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {formatCurrency(budget.actual_amount_cents)} de{" "}
                          {formatCurrency(budget.planned_amount_cents)}
                        </span>
                        <span className={budget.usage_percent && budget.usage_percent > 100 ? "text-destructive" : ""}>
                          {budget.usage_percent || 0}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(budget.usage_percent || 0, 100)}
                        className={`h-2 ${
                          (budget.usage_percent || 0) > 100
                            ? "[&>div]:bg-destructive"
                            : (budget.usage_percent || 0) >= budget.alert_threshold_percent
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-green-500"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
