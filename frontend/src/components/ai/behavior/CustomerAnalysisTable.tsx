import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Brain, 
  Send, 
  Clock, 
  Calendar,
  Utensils,
  Pizza,
  Sandwich,
  ChefHat
} from "lucide-react";
import { CustomerBehaviorAnalysis, useGenerateSuggestion } from "@/hooks/useAIBehaviorAnalysis";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerAnalysisTableProps {
  analyses: (CustomerBehaviorAnalysis & { customers?: { name: string; whatsapp: string } })[];
  isLoading: boolean;
}

const businessTypeIcons: Record<string, React.ReactNode> = {
  marmita: <Utensils className="h-4 w-4" />,
  pizzaria: <Pizza className="h-4 w-4" />,
  lanchonete: <Sandwich className="h-4 w-4" />,
  restaurante: <ChefHat className="h-4 w-4" />,
};

export function CustomerAnalysisTable({ analyses, isLoading }: CustomerAnalysisTableProps) {
  const generateSuggestion = useGenerateSuggestion();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clientes Analisados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clientes Analisados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma análise realizada ainda.</p>
            <p className="text-sm">Clique em "Analisar Clientes" para começar.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes Analisados</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Horário Preferido</TableHead>
              <TableHead>Dias Analisados</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses.map((analysis) => (
              <TableRow key={analysis.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{(analysis as any).customers?.name || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">
                      {(analysis as any).customers?.whatsapp || '-'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    {businessTypeIcons[analysis.business_type] || <ChefHat className="h-4 w-4" />}
                    {analysis.business_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {analysis.order_frequency_days ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      A cada {analysis.order_frequency_days} dias
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {analysis.avg_order_time ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {analysis.avg_order_time.substring(0, 5)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={analysis.consecutive_days_analyzed && analysis.consecutive_days_analyzed >= 5 ? "default" : "secondary"}>
                    {analysis.consecutive_days_analyzed || 0} dias
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {analysis.wants_daily_suggestions ? (
                      <Badge variant="default">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Inativo
                      </Badge>
                    )}
                    {analysis.next_suggestion_at && (
                      <span className="text-xs text-muted-foreground">
                        Próxima: {format(new Date(analysis.next_suggestion_at), "HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateSuggestion.mutate(analysis.customer_id)}
                    disabled={generateSuggestion.isPending}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Sugerir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
