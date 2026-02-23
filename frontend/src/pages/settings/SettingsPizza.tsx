import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Pizza, AlertCircle, CheckCircle } from 'lucide-react';
import { PizzaDoughTypesAdmin, PizzaBorderTypesAdmin } from '@/components/pizza/PizzaDoughBorderAdmin';
import {
  useCompanyPizzaSettings,
  useUpsertCompanyPizzaSettings,
  PRICING_MODEL_LABELS,
  PRICING_MODEL_DESCRIPTIONS,
} from '@/hooks/useCompanyPizzaSettings';
import { toast } from 'sonner';

export default function SettingsPizza() {
  const { data: settings, isLoading } = useCompanyPizzaSettings();
  const upsertSettings = useUpsertCompanyPizzaSettings();

  const [pricingModel, setPricingModel] = useState<'maior' | 'media' | 'partes'>('maior');
  const [sizes, setSizes] = useState<string[]>(['Broto', 'Média', 'Grande', 'Gigante']);
  const [slicesPerSize, setSlicesPerSize] = useState<Record<string, number>>({});
  const [maxFlavorsPerSize, setMaxFlavorsPerSize] = useState<Record<string, number>>({});

  useEffect(() => {
    if (settings) {
      setPricingModel(settings.pricing_model);
      setSizes(settings.default_sizes || ['Broto', 'Média', 'Grande', 'Gigante']);
      setSlicesPerSize(settings.slices_per_size || {});
      setMaxFlavorsPerSize(settings.max_flavors_per_size || {});
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsertSettings.mutateAsync({
        pricing_model: pricingModel,
        default_sizes: sizes,
        slices_per_size: slicesPerSize,
        max_flavors_per_size: maxFlavorsPerSize,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const updateSlices = (size: string, value: number) => {
    setSlicesPerSize((prev) => ({ ...prev, [size]: value }));
  };

  const updateMaxFlavors = (size: string, value: number) => {
    setMaxFlavorsPerSize((prev) => ({ ...prev, [size]: value }));
  };

  // Example calculation for demonstration
  const getExampleCalculation = () => {
    const flavorA = 80; // Example price
    const flavorB = 60; // Example price

    switch (pricingModel) {
      case 'maior':
        return {
          formula: `max(${flavorA}, ${flavorB})`,
          result: Math.max(flavorA, flavorB),
          explanation: 'Cobra o valor do sabor mais caro',
        };
      case 'media':
        return {
          formula: `(${flavorA} + ${flavorB}) / 2`,
          result: (flavorA + flavorB) / 2,
          explanation: 'Cobra a média dos valores',
        };
      case 'partes':
        return {
          formula: `${flavorA}/2 + ${flavorB}/2`,
          result: flavorA / 2 + flavorB / 2,
          explanation: 'Cada sabor contribui proporcionalmente',
        };
    }
  };

  const example = getExampleCalculation();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pizza className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Configurações de Pizza</h1>
              <p className="text-muted-foreground">
                Defina como o sistema deve calcular o preço das pizzas
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={upsertSettings.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>

        {/* Pricing Model */}
        <Card>
          <CardHeader>
            <CardTitle>Modelo de Cobrança</CardTitle>
            <CardDescription>
              Escolha como calcular o preço quando o cliente pede pizza com múltiplos sabores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={pricingModel}
              onValueChange={(value) => setPricingModel(value as 'maior' | 'media' | 'partes')}
              className="space-y-4"
            >
              {Object.entries(PRICING_MODEL_LABELS).map(([value, label]) => (
                <div
                  key={value}
                  className={`flex items-start space-x-4 p-4 rounded-lg border transition-colors ${
                    pricingModel === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <RadioGroupItem value={value} id={value} className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor={value}
                      className="text-base font-medium cursor-pointer flex items-center gap-2"
                    >
                      {label}
                      {pricingModel === value && (
                        <Badge variant="secondary" className="ml-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Selecionado
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {PRICING_MODEL_DESCRIPTIONS[value]}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <Separator />

            {/* Example Calculation */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-primary" />
                Exemplo de Cálculo
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Pizza meio a meio: Sabor A (R$ 80,00) + Sabor B (R$ 60,00)
              </p>
              <div className="flex items-center gap-2 text-lg">
                <span className="font-mono text-sm bg-background px-2 py-1 rounded">
                  {example.formula}
                </span>
                <span>=</span>
                <span className="font-bold text-primary">
                  R$ {example.result.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{example.explanation}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sizes Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Tamanhos e Limites</CardTitle>
            <CardDescription>
              Configure fatias e máximo de sabores por tamanho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sizes.map((size) => (
                <div
                  key={size}
                  className="grid grid-cols-3 gap-4 items-center p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <Label className="text-sm font-medium">{size}</Label>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fatias</Label>
                    <Input
                      type="number"
                      min={1}
                      value={slicesPerSize[size] || 4}
                      onChange={(e) => updateSlices(size, parseInt(e.target.value) || 4)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Máx. Sabores</Label>
                    <Input
                      type="number"
                      min={1}
                      value={maxFlavorsPerSize[size] || 1}
                      onChange={(e) => updateMaxFlavors(size, parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dough Types */}
        <PizzaDoughTypesAdmin />

        {/* Border Types */}
        <PizzaBorderTypesAdmin />

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Como funciona:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    No cadastro de sabores, você informa apenas o <strong>Preço Base</strong> por
                    tamanho
                  </li>
                  <li>
                    O sistema usa o <strong>Modelo de Cobrança</strong> escolhido acima para
                    calcular o preço final
                  </li>
                  <li>
                    Produtos tipo pizza podem ter um modelo próprio (override) nas configurações do
                    produto
                  </li>
                  <li>
                    Se não houver override no produto, o sistema usa a configuração global definida
                    aqui
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
