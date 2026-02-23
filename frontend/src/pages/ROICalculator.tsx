import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building2,
  ShoppingBag,
} from 'lucide-react';

interface ROIInputs {
  ordersPerDay: number;
  averageTicket: number;
  deliveryPercentage: number;
  employeesCount: number;
  hoursManualWork: number;
}

interface ROIResults {
  monthlySavings: number;
  yearlyProjection: number;
  timeSavedHours: number;
  efficiencyGain: number;
  additionalRevenue: number;
}

export default function ROICalculator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<ROIInputs>({
    ordersPerDay: 50,
    averageTicket: 45,
    deliveryPercentage: 60,
    employeesCount: 5,
    hoursManualWork: 3,
  });
  const [results, setResults] = useState<ROIResults | null>(null);

  const calculateROI = () => {
    // Calculations based on industry benchmarks
    const monthlyOrders = inputs.ordersPerDay * 30;
    const monthlyRevenue = monthlyOrders * inputs.averageTicket;

    // Time savings (assuming 2 min saved per order with automation)
    const timeSavedPerOrder = 2; // minutes
    const totalTimeSaved = (monthlyOrders * timeSavedPerOrder) / 60; // hours

    // Labor cost savings (manual hours reduced)
    const hourlyLabor = 15; // R$ per hour average
    const laborSavings = inputs.hoursManualWork * 30 * hourlyLabor * 0.7; // 70% reduction

    // Delivery efficiency (reduced errors, faster dispatch)
    const deliveryOrders = monthlyOrders * (inputs.deliveryPercentage / 100);
    const deliverySavings = deliveryOrders * 1.5; // R$1.50 saved per delivery

    // Revenue increase from better customer experience (3% average)
    const revenueIncrease = monthlyRevenue * 0.03;

    // AI-driven upsell improvements (2% average)
    const aiUpsell = monthlyRevenue * 0.02;

    const totalMonthlySavings = laborSavings + deliverySavings + revenueIncrease + aiUpsell;
    const yearlyProjection = totalMonthlySavings * 12;

    setResults({
      monthlySavings: Math.round(totalMonthlySavings),
      yearlyProjection: Math.round(yearlyProjection),
      timeSavedHours: Math.round(totalTimeSaved + inputs.hoursManualWork * 30 * 0.7),
      efficiencyGain: Math.round((totalTimeSaved / (inputs.hoursManualWork * 30)) * 100),
      additionalRevenue: Math.round(revenueIncrease + aiUpsell),
    });

    setStep(2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Badge className="mb-4" variant="outline">
              <Calculator className="w-3 h-3 mr-1" />
              Calculadora de ROI
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3 text-foreground">
              Quanto você pode economizar?
            </h1>
            <p className="text-muted-foreground">
              Descubra o potencial de economia e ganho de eficiência do seu negócio
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {step === 1 ? (
            /* Input Form */
            <Card className="border-0 shadow-large">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Dados do seu negócio
                </CardTitle>
                <CardDescription>
                  Preencha com os dados aproximados do seu restaurante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Orders per day */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      Pedidos por dia
                    </Label>
                    <span className="text-2xl font-bold text-primary">
                      {inputs.ordersPerDay}
                    </span>
                  </div>
                  <Slider
                    value={[inputs.ordersPerDay]}
                    onValueChange={(v) => setInputs({ ...inputs, ordersPerDay: v[0] })}
                    min={10}
                    max={300}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>300+</span>
                  </div>
                </div>

                {/* Average ticket */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success" />
                      Ticket médio (R$)
                    </Label>
                    <span className="text-2xl font-bold text-success">
                      {formatCurrency(inputs.averageTicket)}
                    </span>
                  </div>
                  <Slider
                    value={[inputs.averageTicket]}
                    onValueChange={(v) => setInputs({ ...inputs, averageTicket: v[0] })}
                    min={15}
                    max={150}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>R$ 15</span>
                    <span>R$ 150</span>
                  </div>
                </div>

                {/* Delivery percentage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-info" />
                      % de vendas em delivery
                    </Label>
                    <span className="text-2xl font-bold text-info">
                      {inputs.deliveryPercentage}%
                    </span>
                  </div>
                  <Slider
                    value={[inputs.deliveryPercentage]}
                    onValueChange={(v) => setInputs({ ...inputs, deliveryPercentage: v[0] })}
                    min={0}
                    max={100}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Employees count */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-warning" />
                      Funcionários na operação
                    </Label>
                    <span className="text-2xl font-bold text-warning">
                      {inputs.employeesCount}
                    </span>
                  </div>
                  <Slider
                    value={[inputs.employeesCount]}
                    onValueChange={(v) => setInputs({ ...inputs, employeesCount: v[0] })}
                    min={1}
                    max={30}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>30+</span>
                  </div>
                </div>

                {/* Manual work hours */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4 text-destructive" />
                      Horas/dia em trabalho manual
                    </Label>
                    <span className="text-2xl font-bold text-destructive">
                      {inputs.hoursManualWork}h
                    </span>
                  </div>
                  <Slider
                    value={[inputs.hoursManualWork]}
                    onValueChange={(v) => setInputs({ ...inputs, hoursManualWork: v[0] })}
                    min={1}
                    max={10}
                    step={0.5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1h</span>
                    <span>10h</span>
                  </div>
                </div>

                <Button size="lg" className="w-full" onClick={calculateROI}>
                  Calcular minha economia
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Results */
            <div className="space-y-6">
              {/* Hero Result */}
              <Card className="border-0 shadow-large bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center">
                    <Badge className="mb-4 bg-white/20 text-white border-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Seu potencial de economia
                    </Badge>
                    <div className="text-6xl font-bold mb-2">
                      {formatCurrency(results?.monthlySavings || 0)}
                    </div>
                    <p className="text-lg opacity-90">por mês em economia + receita adicional</p>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-2xl font-semibold">
                        {formatCurrency(results?.yearlyProjection || 0)}/ano
                      </p>
                      <p className="text-sm opacity-75">projeção anual</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Details Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-medium">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="w-6 h-6 text-success" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(results?.additionalRevenue || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Receita adicional/mês</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      via upsell e melhor experiência
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-medium">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-info" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {results?.timeSavedHours || 0}h
                    </p>
                    <p className="text-sm text-muted-foreground">Tempo economizado/mês</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      para focar no que importa
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-medium">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-warning" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      +{results?.efficiencyGain || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Ganho de eficiência</p>
                    <p className="text-xs text-muted-foreground mt-1">na sua operação</p>
                  </CardContent>
                </Card>
              </div>

              {/* What's included */}
              <Card className="border-0 shadow-medium">
                <CardHeader>
                  <CardTitle className="text-lg">O que está incluído no cálculo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      'Redução de tempo em tarefas manuais',
                      'Economia com erros de pedido',
                      'Otimização de entregas',
                      'Aumento de vendas via IA',
                      'Melhoria na experiência do cliente',
                      'Automação de processos',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Começar meu teste grátis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setStep(1)}>
                  Recalcular
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate('/demo')}>
                  Ver demonstração
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
