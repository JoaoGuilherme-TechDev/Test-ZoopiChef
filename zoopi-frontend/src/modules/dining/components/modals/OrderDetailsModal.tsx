import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { diningApi } from "../../api/dining.api";
import { BillItem, ItemStatus } from "../../types";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Receipt, Clock, Users, Trash2, 
  ChevronRight, Utensils, CheckCircle2, MessageSquare, 
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableNumber: number;
  billId?: string;
}

const ITEM_STATUS_CONFIG: Record<ItemStatus, { label: string, color: string }> = {
  ordered: { label: "Pendente", color: "text-blue-400 bg-blue-500/10" },
  preparing: { label: "Na Cozinha", color: "text-amber-400 bg-amber-500/10 animate-pulse" },
  ready: { label: "Pronto", color: "text-emerald-400 bg-emerald-500/10" },
  delivered: { label: "Entregue", color: "text-muted-foreground bg-muted/20" },
  cancelled: { label: "Cancelado", color: "text-red-400 bg-red-500/10" },
};

export function OrderDetailsModal({ isOpen, onOpenChange, tableId, tableNumber, billId }: OrderDetailsModalProps) {
  const queryClient = useQueryClient();

  // 1. Busca os detalhes da conta (Bill)
  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill-details", billId],
    queryFn: () => diningApi.fetchBill(billId!),
    enabled: !!billId && isOpen,
  });

  // 2. Mutações
  const removeItem = useMutation({
    mutationFn: (itemId: string) => diningApi.removeItem(billId!, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bill-details", billId] }),
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 overflow-hidden border-white/10 glass-card">
        
        {/* --- HEADER DO MODAL --- */}
        <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <Utensils size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  Mesa {tableNumber}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                    <Users size={12} /> {bill?.people_count || 0} pessoas
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                    <Clock size={12} /> Aberta há 45 min
                  </div>
                </div>
              </div>
            </div>
            <Badge className="bg-primary text-white font-black uppercase text-[10px] px-3 py-1">
              CONTA ABERTA
            </Badge>
          </div>
        </DialogHeader>

        {/* --- LISTA DE CONSUMO --- */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Itens Lançados</h3>
              
              {bill?.items.length === 0 ? (
                <div className="py-10 text-center space-y-2 opacity-30">
                  <Package size={40} className="mx-auto" />
                  <p className="text-xs font-bold uppercase">Nenhum item na conta</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bill?.items.map((item) => (
                    <div key={item.id} className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-black">
                          {item.quantity}x
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground leading-none">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1.5 h-4", ITEM_STATUS_CONFIG[item.status].color)}>
                              {ITEM_STATUS_CONFIG[item.status].label}
                            </Badge>
                            {item.notes && <MessageSquare size={12} className="text-primary" />}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="text-sm font-black">{formatCurrency(item.total_price_cents)}</p>
                        {item.status === 'ordered' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                            onClick={() => removeItem.mutate(item.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* --- FOOTER: RESUMO E AÇÕES --- */}
        <div className="p-6 bg-white/[0.04] border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Consumido</p>
              <p className="text-3xl font-black text-primary tracking-tighter">
                {formatCurrency(bill?.total_cents || 0)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Subtotal: {formatCurrency(bill?.subtotal_cents || 0)}</span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase">Taxa de Serviço (10%): {formatCurrency(bill?.service_fee_cents || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-white/10 hover:bg-white/5">
              <Plus className="mr-2 h-4 w-4" /> Lançar Itens
            </Button>
            <Button className="h-12 btn-neon rounded-xl font-black uppercase tracking-widest text-[10px]">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Fechar Conta <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}