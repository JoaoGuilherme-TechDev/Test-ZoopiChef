/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { diningApi } from "../../api/dining.api";
import { Bill, Payment } from "../../types";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CreditCard, Banknote, QrCode, Receipt, 
  CheckCircle2, AlertTriangle, Users, Minus, Plus, 
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@radix-ui/react-select";

interface CheckoutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill;
  tableNumber: number;
}

export function CheckoutModal({ isOpen, onOpenChange, bill, tableNumber }: CheckoutModalProps) {
  const queryClient = useQueryClient();
  
  // Estado para os pagamentos que estão sendo processados agora
  const [activePayments, setActivePayments] = useState<Array<{ method: string; amount: string }>>([
    { method: "credit", amount: "" }
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  // --- CÁLCULOS TOTAIS ---
  const currentTotalCents = useMemo(() => {
    const discountAmount = (bill.subtotal_cents * discountPercent) / 100;
    return bill.subtotal_cents + bill.service_fee_cents - discountAmount;
  }, [bill, discountPercent]);

  const totalPaidCents = useMemo(() => {
    return activePayments.reduce((acc, curr) => {
      const val = parseFloat(curr.amount.replace(",", ".")) || 0;
      return acc + (val * 100);
    }, 0);
  }, [activePayments]);

  const remainingCents = Math.max(0, currentTotalCents - totalPaidCents);

  // --- HANDLERS ---
  const addPaymentMethod = () => {
    setActivePayments([...activePayments, { method: "credit", amount: "" }]);
  };

  const removePaymentMethod = (index: number) => {
    setActivePayments(activePayments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: "method" | "amount", value: string) => {
    const newPayments = [...activePayments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setActivePayments(newPayments);
  };

  const closeBillMutation = useMutation({
    mutationFn: () => diningApi.closeBill(bill.id, {
      payments: activePayments.map(p => ({
        method: p.method,
        amount_cents: Math.round(parseFloat(p.amount.replace(",", ".")) * 100)
      })),
      discount_cents: (bill.subtotal_cents * discountPercent) / 100
    }),
    onSuccess: () => {
      toast.success(`Mesa ${tableNumber} finalizada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["dining-tables"] });
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao fechar conta.")
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-white/10 glass-card p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 h-[600px]">
          
          {/* --- LADO ESQUERDO: RESUMO DA CONTA (2/5) --- */}
          <div className="md:col-span-2 bg-white/[0.02] border-r border-white/5 p-6 flex flex-col">
            <div className="space-y-1 mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fechamento</p>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Mesa {tableNumber}</h2>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-bold">{formatCurrency(bill.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Taxa de Serviço (10%)</span>
                <span className="font-bold text-emerald-500">{formatCurrency(bill.service_fee_cents)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground font-medium">Desconto (%)</span>
                <Input 
                  type="number" 
                  className="w-16 h-8 text-right bg-transparent border-primary/20 text-xs font-bold"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-end pt-2">
                <span className="text-xs font-black uppercase text-muted-foreground">Total a Pagar</span>
                <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(currentTotalCents)}</span>
              </div>

              {/* Divisão por pessoas */}
              <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sugestão de Divisão</span>
                </div>
                <p className="text-lg font-black">
                  {formatCurrency(currentTotalCents / (bill.people_count || 1))} 
                  <span className="text-[10px] text-muted-foreground ml-1">p/ pessoa ({bill.people_count})</span>
                </p>
              </div>
            </div>
          </div>

          {/* --- LADO DIREITO: PAGAMENTOS (3/5) --- */}
          <div className="md:col-span-3 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Formas de Pagamento</h3>
              <Button variant="ghost" size="sm" onClick={addPaymentMethod} className="h-7 text-[9px] font-black uppercase bg-white/5">
                <Plus size={12} className="mr-1" /> Adicionar Outro
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {activePayments.map((p, index) => (
                  <div key={index} className="flex gap-3 items-end animate-in slide-in-from-right-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase opacity-50">Método</Label>
                      <Select value={p.method} onValueChange={(v) => updatePayment(index, "method", v)}>
                        <SelectTrigger className="h-11 bg-muted/20 border-white/10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase opacity-50">Valor (R$)</Label>
                      <Input 
                        placeholder="0,00"
                        className="h-11 bg-muted/20 border-white/10 rounded-xl font-bold"
                        value={p.amount}
                        onChange={(e) => updatePayment(index, "amount", e.target.value)}
                      />
                    </div>
                    {activePayments.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePaymentMethod(index)} className="mb-1 text-red-500/50">
                        <Minus size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* --- STATUS DO PAGAMENTO --- */}
            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Falta Receber</p>
                  <p className={cn("text-xl font-black", remainingCents > 0 ? "text-orange-500" : "text-emerald-500")}>
                    {remainingCents > 0 ? formatCurrency(remainingCents) : "CONTA QUITADA"}
                  </p>
                </div>
                {remainingCents === 0 && <CheckCircle2 size={32} className="text-emerald-500" />}
              </div>

              <Button 
                className="w-full h-14 btn-neon rounded-2xl font-black uppercase tracking-widest text-sm"
                disabled={remainingCents > 0 || closeBillMutation.isPending}
                onClick={() => closeBillMutation.mutate()}
              >
                {closeBillMutation.isPending ? <Loader2 className="animate-spin" /> : "Finalizar e Emitir Cupom"}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full", className)} />;