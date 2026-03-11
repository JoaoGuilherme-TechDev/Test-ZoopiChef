import { Table, TABLE_STATUS_LABELS, TableStatus } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Receipt, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TableCardProps {
  table: Table;
  onClick: (table: Table) => void;
}

// Mapeamento estético de status para o padrão Zoopi Premium
const STATUS_STYLES: Record<TableStatus, { border: string; bg: string; text: string; dot: string }> = {
  free: { 
    border: "border-emerald-500/30", 
    bg: "bg-emerald-500/10", 
    text: "text-emerald-500", 
    dot: "bg-emerald-500" 
  },
  occupied: { 
    border: "border-primary/30", 
    bg: "bg-primary/10", 
    text: "text-primary", 
    dot: "bg-primary" 
  },
  waiting_payment: { 
    border: "border-purple-500/50", 
    bg: "bg-purple-500/20", 
    text: "text-purple-400", 
    dot: "bg-purple-500 animate-pulse" 
  },
  reserved: { 
    border: "border-amber-500/30", 
    bg: "bg-amber-500/10", 
    text: "text-amber-500", 
    dot: "bg-amber-500" 
  },
  cleaning: { 
    border: "border-slate-500/30", 
    bg: "bg-slate-500/10", 
    text: "text-slate-400", 
    dot: "bg-slate-400" 
  },
  blocked: { 
    border: "border-red-500/30", 
    bg: "bg-red-500/10", 
    text: "text-red-500", 
    dot: "bg-red-500" 
  },
};

export function TableCard({ table, onClick }: TableCardProps) {
  const style = STATUS_STYLES[table.status];
  
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(table)}
      className="cursor-pointer"
    >
      <Card className={cn(
        "glass-card border-2 transition-all duration-300 relative overflow-hidden h-full",
        style.border
      )}>
        {/* Indicador Flutuante de Chamado Ativo */}
        {table.active_call_id && (
          <div className="absolute top-0 right-0 p-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          </div>
        )}

        <CardContent className="p-5 flex flex-col gap-4">
          {/* Header: Número e Status */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mesa</span>
              <p className="text-2xl font-black leading-none">{table.number}</p>
            </div>
            <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none px-2", style.bg, style.text)}>
              <div className={cn("h-1.5 w-1.5 rounded-full mr-1.5", style.dot)} />
              {TABLE_STATUS_LABELS[table.status]}
            </Badge>
          </div>

          {/* Consumo Parcial (Aparece se ocupada ou pedindo conta) */}
          <div className="flex-1">
            {table.status === 'occupied' || table.status === 'waiting_payment' ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Consumo Parcial</p>
                <p className="text-lg font-black text-primary tracking-tight">
                  {formatCurrency(table.total_consumption_cents)}
                </p>
              </div>
            ) : (
              <div className="h-10 flex items-center">
                <p className="text-xs text-muted-foreground italic font-medium">Disponível para uso</p>
              </div>
            )}
          </div>

          {/* Footer: Capacidade e Tempo */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users size={14} />
              <span className="text-[10px] font-bold uppercase">{table.capacity} lug.</span>
            </div>
            
            {table.opened_at && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={14} />
                <span className="text-[10px] font-bold uppercase">
                  {new Date(table.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}