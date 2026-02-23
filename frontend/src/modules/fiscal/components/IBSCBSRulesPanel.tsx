import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Calendar, Info, AlertTriangle } from 'lucide-react';
import { useIBSCBSRules, useCurrentTaxRates } from '../hooks/useFiscalReferences';

const TRANSITION_YEARS = [
  { year: 2026, ibs: 0.1, cbs: 0.9, icms_reduction: 0, iss_reduction: 0 },
  { year: 2027, ibs: 0.1, cbs: 0.9, icms_reduction: 0, iss_reduction: 0 },
  { year: 2028, ibs: 0.1, cbs: 0.9, icms_reduction: 0, iss_reduction: 0 },
  { year: 2029, ibs: 6.5, cbs: 8.8, icms_reduction: 10, iss_reduction: 10 },
  { year: 2030, ibs: 6.5, cbs: 8.8, icms_reduction: 20, iss_reduction: 20 },
  { year: 2031, ibs: 6.5, cbs: 8.8, icms_reduction: 30, iss_reduction: 30 },
  { year: 2032, ibs: 6.5, cbs: 8.8, icms_reduction: 40, iss_reduction: 40 },
  { year: 2033, ibs: 26.5, cbs: 0, icms_reduction: 100, iss_reduction: 100 },
];

export function IBSCBSRulesPanel() {
  const { rules, generalRules, isLoading } = useIBSCBSRules();
  const { data: currentRates } = useCurrentTaxRates();

  const currentYear = new Date().getFullYear();
  const transitionProgress = Math.min(
    ((currentYear - 2026) / (2033 - 2026)) * 100,
    100
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Reforma Tributária - IBS/CBS</CardTitle>
            <CardDescription>
              Acompanhe a transição para o novo sistema tributário brasileiro
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Year Status */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold">Status Atual ({currentYear})</span>
            </div>
            <Badge variant="outline" className="bg-background">
              Período de Transição
            </Badge>
          </div>
          
          {currentRates ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-primary">{currentRates.ibs_rate}%</p>
                <p className="text-xs text-muted-foreground">IBS</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-primary">{currentRates.cbs_rate}%</p>
                <p className="text-xs text-muted-foreground">CBS</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Carregando alíquotas atuais...
            </p>
          )}
        </div>

        {/* Transition Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso da Transição</span>
            <span className="text-sm text-muted-foreground">
              {currentYear < 2026 ? 'Início em 2026' : currentYear > 2033 ? 'Concluída' : `${Math.round(transitionProgress)}%`}
            </span>
          </div>
          <Progress value={transitionProgress} className="h-2" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">2026</span>
            <span className="text-xs text-muted-foreground">2033</span>
          </div>
        </div>

        {/* Tabs for Rules */}
        <Tabs defaultValue="timeline">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Cronograma</TabsTrigger>
            <TabsTrigger value="sectors">Por Setor</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <div className="space-y-2">
              {TRANSITION_YEARS.map((year) => (
                <div
                  key={year.year}
                  className={`p-3 rounded-lg border ${
                    year.year === currentYear
                      ? 'bg-primary/10 border-primary'
                      : year.year < currentYear
                      ? 'bg-muted/50 opacity-60'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg w-12">{year.year}</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary">IBS {year.ibs}%</Badge>
                        <Badge variant="secondary">CBS {year.cbs}%</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ICMS -{year.icms_reduction}% | ISS -{year.iss_reduction}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sectors" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : rules?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma regra setorial configurada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules?.map((rule) => (
                  <div key={rule.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{rule.ncm_code || 'Regra Geral'}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge>IBS {rule.ibs_rate}%</Badge>
                        <Badge>CBS {rule.cbs_rate}%</Badge>
                      </div>
                    </div>
                    {rule.is_reduced_rate && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600">
                          Alíquota Reduzida: {rule.reduction_percent}%
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                      O que é o IBS?
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      O Imposto sobre Bens e Serviços (IBS) é um imposto estadual/municipal 
                      que substituirá o ICMS e o ISS. Será cobrado no destino da operação.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-300">
                      O que é a CBS?
                    </h4>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      A Contribuição sobre Bens e Serviços (CBS) é um tributo federal 
                      que substituirá o PIS e a COFINS. Também será cobrada no destino.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-700 dark:text-amber-300">
                      Período de Transição
                    </h4>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Entre 2026 e 2032, haverá convivência dos sistemas antigo e novo. 
                      A partir de 2033, apenas IBS e CBS estarão em vigor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
