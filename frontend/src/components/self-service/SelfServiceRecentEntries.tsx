import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, History } from "lucide-react";
import type { SelfServiceEntry } from "@/hooks/useSelfServiceEntries";

interface SelfServiceRecentEntriesProps {
  entries: SelfServiceEntry[];
  isLoading: boolean;
}

export function SelfServiceRecentEntries({
  entries,
  isLoading,
}: SelfServiceRecentEntriesProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Últimos Lançamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <History className="h-8 w-8 mb-2" />
            <p className="text-sm text-center">Nenhum lançamento ainda</p>
          </div>
        ) : (
          <ScrollArea className="h-full px-4 pb-4">
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    {/* Comanda and Table */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-primary">
                        C{entry.comanda?.command_number || "?"}
                      </span>
                      {entry.table?.number && (
                        <>
                          <span className="text-muted-foreground">-</span>
                          <span>M{entry.table.number}</span>
                        </>
                      )}
                    </div>

                    {/* Product name */}
                    <span className="font-medium truncate">{entry.product_name}</span>

                    {/* Weight and value */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {entry.weight_kg > 0 && (
                        <span>P {entry.weight_kg.toFixed(3)}</span>
                      )}
                      <span className="font-medium text-foreground">
                        {formatCurrency(entry.total_value / 100)}
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), "HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
