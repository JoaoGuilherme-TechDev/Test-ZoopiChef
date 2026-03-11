import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { diningApi } from "../api/dining.api";
import { WaiterCall } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, Trash2, CheckCircle2, Clock, HandHelping } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function WaiterCallQueue() {
  const queryClient = useQueryClient();

  // 1. Polling de chamados (atualiza a cada 5s para ser "quase" real-time)
  const { data: calls = [] } = useQuery({
    queryKey: ["waiter-calls-active"],
    queryFn: diningApi.fetchActiveCalls,
    refetchInterval: 5000,
  });

  // 2. Mutação para resolver chamado
  const resolveCall = useMutation({
    mutationFn: diningApi.resolveCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiter-calls-active"] });
      queryClient.invalidateQueries({ queryKey: ["dining-tables"] });
    },
  });

  const getCallConfig = (type: string) => {
    switch (type) {
      case 'bill': 
        return { icon: Receipt, label: "Pediu Conta", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" };
      case 'cleaning': 
        return { icon: Trash2, label: "Limpeza", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
      default: 
        return { icon: Bell, label: "Chamado", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" };
    }
  };

  if (calls.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <HandHelping size={12} className="text-primary" />
          Fila de Atendimento
        </h3>
        <Badge variant="outline" className="h-5 text-[9px] font-black bg-primary/5 text-primary border-primary/20">
          {calls.length} PENDENTE(S)
        </Badge>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
        <AnimatePresence mode="popLayout">
          {calls.map((call) => {
            const config = getCallConfig(call.type);
            const Icon = config.icon;

            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className={cn(
                  "glass-card border-l-4 transition-all",
                  config.border,
                  call.type === 'bill' && "animate-pulse" // Alerta visual para fechamento de conta
                )}>
                  <CardContent className="p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                        <Icon size={16} className={config.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-tight truncate">
                          Mesa {call.table_name || call.table_id}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[9px] font-bold uppercase", config.color)}>
                            {config.label}
                          </span>
                          <span className="text-[8px] text-muted-foreground flex items-center gap-1">
                            <Clock size={8} /> 
                            {new Date(call.created_at).toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => resolveCall.mutate(call.id)}
                      className="h-8 w-8 rounded-full hover:bg-emerald-500/20 hover:text-emerald-500 group"
                      disabled={resolveCall.isPending}
                    >
                      <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}