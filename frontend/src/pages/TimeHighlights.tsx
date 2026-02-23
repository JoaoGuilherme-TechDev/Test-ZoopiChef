import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Tv, 
  Menu, 
  Sparkles, 
  Check, 
  X, 
  Play,
  Loader2,
  Sun,
  Utensils,
  Coffee,
  Moon
} from 'lucide-react';
import { 
  useTimeHighlights, 
  usePendingHighlights,
  useAppliedHighlights,
  useGenerateMenuHighlights,
  useGenerateTVHighlights,
  useApplyHighlight,
  useRejectHighlight,
  getPeriodLabel,
  TimeHighlightSuggestion
} from '@/hooks/useTimeHighlights';
import { useCompany } from '@/hooks/useCompany';

const PERIOD_ICONS: Record<string, React.ReactNode> = {
  manha: <Coffee className="h-4 w-4" />,
  almoco: <Utensils className="h-4 w-4" />,
  tarde: <Sun className="h-4 w-4" />,
  jantar: <Utensils className="h-4 w-4" />,
  noite: <Moon className="h-4 w-4" />,
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function HighlightCard({ 
  suggestion, 
  onApply, 
  onReject,
  isApplying 
}: { 
  suggestion: TimeHighlightSuggestion;
  onApply: () => void;
  onReject: () => void;
  isApplying: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {PERIOD_ICONS[suggestion.period]}
            <CardTitle className="text-base">{getPeriodLabel(suggestion.period)}</CardTitle>
            <span className="text-sm text-muted-foreground">
              ({suggestion.start_hour}h - {suggestion.end_hour}h)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {suggestion.channels.includes('tv') && (
              <Badge variant="outline" className="text-xs">
                <Tv className="h-3 w-3 mr-1" />
                TV
              </Badge>
            )}
            {suggestion.channels.includes('menu') && (
              <Badge variant="outline" className="text-xs">
                <Menu className="h-3 w-3 mr-1" />
                Menu
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={CONFIDENCE_COLORS[suggestion.confidence || 'medium']}
            >
              {suggestion.confidence === 'high' ? 'Alta' : 
               suggestion.confidence === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{suggestion.product?.name || 'Produto'}</p>
            <p className="text-sm text-muted-foreground">
              R$ {suggestion.product?.price?.toFixed(2)}
            </p>
          </div>
          {suggestion.sales_count !== null && suggestion.sales_count > 0 && (
            <Badge variant="secondary">
              {suggestion.sales_count} vendas
            </Badge>
          )}
        </div>

        {suggestion.reason && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            {suggestion.reason}
          </p>
        )}

        {suggestion.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              onClick={onApply}
              disabled={isApplying}
              className="flex-1"
            >
              {isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Aplicar
                </>
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onReject}
              disabled={isApplying}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {suggestion.status === 'applied' && (
          <div className="flex items-center gap-2 text-green-600 pt-2">
            <Check className="h-4 w-4" />
            <span className="text-sm">Aplicado</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TimeHighlights() {
  const { data: company } = useCompany();
  const { data: allHighlights, isLoading } = useTimeHighlights();
  const { data: pendingHighlights } = usePendingHighlights();
  const { data: appliedHighlights } = useAppliedHighlights();
  
  const generateMenu = useGenerateMenuHighlights();
  const generateTV = useGenerateTVHighlights();
  const applyHighlight = useApplyHighlight();
  const rejectHighlight = useRejectHighlight();

  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleGenerateMenu = () => {
    if (!company?.id) return;
    generateMenu.mutate({ companyId: company.id, channels: ['menu'] });
  };

  const handleGenerateTV = () => {
    if (!company?.id) return;
    generateTV.mutate(company.id);
  };

  const handleApply = async (suggestion: TimeHighlightSuggestion) => {
    setApplyingId(suggestion.id);
    try {
      await applyHighlight.mutateAsync(suggestion);
    } finally {
      setApplyingId(null);
    }
  };

  const handleReject = (id: string) => {
    rejectHighlight.mutate(id);
  };

  // Agrupar por período
  const groupByPeriod = (suggestions: TimeHighlightSuggestion[] | undefined) => {
    if (!suggestions) return {};
    return suggestions.reduce((acc, s) => {
      if (!acc[s.period]) acc[s.period] = [];
      acc[s.period].push(s);
      return acc;
    }, {} as Record<string, TimeHighlightSuggestion[]>);
  };

  const pendingByPeriod = groupByPeriod(pendingHighlights);
  const appliedByPeriod = groupByPeriod(appliedHighlights);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Destaque por Horário
            </h1>
            <p className="text-muted-foreground">
              IA analisa vendas e sugere destaques por faixa horária
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateMenu}
              disabled={generateMenu.isPending || !company?.id}
            >
              {generateMenu.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Menu className="h-4 w-4 mr-2" />
              )}
              Analisar Cardápio
            </Button>
            <Button
              onClick={handleGenerateTV}
              disabled={generateTV.isPending || !company?.id}
            >
              {generateTV.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Tv className="h-4 w-4 mr-2" />
              )}
              Analisar TV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingHighlights?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Sugestões Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{appliedHighlights?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Destaques Aplicados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-sm text-muted-foreground">Faixas Horárias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pendentes ({pendingHighlights?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="applied">
              Aplicados ({appliedHighlights?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(pendingByPeriod).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma sugestão pendente</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Analisar" para gerar sugestões baseadas nas suas vendas
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(pendingByPeriod).map(([period, suggestions]) => (
                <div key={period} className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {PERIOD_ICONS[period]}
                    {getPeriodLabel(period)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map(suggestion => (
                      <HighlightCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onApply={() => handleApply(suggestion)}
                        onReject={() => handleReject(suggestion.id)}
                        isApplying={applyingId === suggestion.id}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="applied" className="space-y-6">
            {Object.keys(appliedByPeriod).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Check className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum destaque aplicado ainda</h3>
                </CardContent>
              </Card>
            ) : (
              Object.entries(appliedByPeriod).map(([period, suggestions]) => (
                <div key={period} className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {PERIOD_ICONS[period]}
                    {getPeriodLabel(period)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map(suggestion => (
                      <HighlightCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onApply={() => {}}
                        onReject={() => {}}
                        isApplying={false}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
