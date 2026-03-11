import { useState, useEffect, useRef } from "react";
import {
  User, MapPin, Wallet, History, Save, Trash2, Plus,
  CheckCircle2, Phone, Mail, Loader2, CreditCard,
  TrendingDown, TrendingUp, Minus, AlertTriangle,
  Home, Shield,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useCustomers, useCustomerDetail, Customer,
} from "@/modules/customers/hooks/useCustomers";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  credit_limit_cents: number;
  alert_message: string;
  allow_fiado: boolean;
  is_blocked: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
}

const EMPTY: FormData = {
  name: "", email: "", phone: "", tax_id: "",
  address: "", neighborhood: "", city: "", state: "", zip_code: "",
  notes: "", credit_limit_cents: 0,
  alert_message: "", allow_fiado: false, is_blocked: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Only used when fiado is active
const fmtBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Math.abs(cents) / 100
  );

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2)  return d.length ? `(${d}` : "";
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskTaxId(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3)  return d;
    if (d.length <= 6)  return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9)  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskZip(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// balance_cents: >0 = owes (debt), <0 = has credit, 0 = settled
function balanceState(cents: number): "debt" | "settled" | "credit" {
  if (cents > 0) return "debt";
  if (cents < 0) return "credit";
  return "settled";
}

function isValidEmail(email: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1">
      <AlertTriangle size={10} /> {msg}
    </p>
  );
}

function SectionLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={11} className="text-primary shrink-0" />}
      <p className="text-[10px] uppercase font-black text-primary tracking-widest">{children}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerDetailModal({ isOpen, onOpenChange, customer }: Props) {
  const isEditMode = customer !== null;

  const { data: liveCustomer, isLoading: isLoadingDetail } = useCustomerDetail(
    isEditMode && isOpen ? customer.id : undefined
  );
  const detail = liveCustomer ?? customer;

  const {
    createCustomer, updateCustomer, deleteCustomer,
    registerPayment, addAddress, deleteAddress,
  } = useCustomers();

  const [activeTab, setActiveTab]             = useState("dados");
  const [form, setForm]                       = useState<FormData>(EMPTY);
  const [errors, setErrors]                   = useState<FormErrors>({});
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr]                 = useState({
    street: "", number: "", neighborhood: "", city: "", state: "", zip_code: "",
  });

  // Fiado-only state — only allocated when fiado is active, harmless otherwise
  const [isReceivingPayment, setIsReceivingPayment] = useState(false);
  const [paymentInput, setPaymentInput]             = useState("");
  const paymentRef = useRef<HTMLInputElement>(null);

  // ── Confirm dialog ───────────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  const closeConfirm = () =>
    setConfirmDialog(prev => ({ ...prev, open: false }));

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (customer) {
      setForm({
        name:               customer.name               ?? "",
        email:              customer.email              ?? "",
        phone:              customer.phone              ?? "",
        tax_id:             customer.tax_id             ?? "",
        address:            customer.address            ?? "",
        neighborhood:       customer.neighborhood       ?? "",
        city:               customer.city               ?? "",
        state:              customer.state              ?? "",
        zip_code:           customer.zip_code           ?? "",
        notes:              customer.notes              ?? "",
        credit_limit_cents: customer.credit_limit_cents ?? 0,
        alert_message:      customer.alert_message      ?? "",
        allow_fiado:        customer.allow_fiado        ?? false,
        is_blocked:         customer.is_blocked         ?? false,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setActiveTab("dados");
    setIsAddingAddress(false);
    setIsReceivingPayment(false);
    setPaymentInput("");
    setNewAddr({ street: "", number: "", neighborhood: "", city: "", state: "", zip_code: "" });
  }, [isOpen, customer]);

  // Sync credit_limit from live data — only relevant when fiado is on,
  // but safe to run regardless (doesn't render anything when fiado is off)
  useEffect(() => {
    if (liveCustomer && form.allow_fiado) {
      setForm(prev => ({
        ...prev,
        credit_limit_cents: liveCustomer.credit_limit_cents ?? prev.credit_limit_cents,
      }));
    }
  }, [liveCustomer]);

  // ── Derived — fiado-specific, only computed when needed ──────────────────────
  const isFiado        = form.allow_fiado;
  const currentBalance = isFiado ? (detail?.balance_cents ?? 0) : 0;
  const bState         = isFiado ? balanceState(currentBalance) : "settled";
  const addressCount   = detail?.addresses?.length ?? 0;

  const previewPayCents = isFiado
    ? Math.round(parseFloat(paymentInput.replace(",", ".") || "0") * 100)
    : 0;
  const previewBalance = currentBalance - previewPayCents;

  // ── Misc derived ─────────────────────────────────────────────────────────────
  const isSaving = createCustomer.isPending || updateCustomer.isPending;
  const initials = form.name
    ? form.name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // ── Field helper ─────────────────────────────────────────────────────────────
  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      if (errors[key as keyof FormErrors]) setErrors(prev => ({ ...prev, [key]: undefined }));
    };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim())         next.name  = "Nome é obrigatório";
    if (!isValidEmail(form.email)) next.email = "E-mail inválido";
    setErrors(next);
    if (Object.keys(next).length) { setActiveTab("dados"); return false; }
    return true;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    if (isEditMode) {
      updateCustomer.mutate(
        { id: customer.id, ...form },
        { onSuccess: () => { toast.success("Cliente atualizado!"); onOpenChange(false); } }
      );
    } else {
      try {
        await createCustomer.mutateAsync(form);
        toast.success("Cliente cadastrado!");
        onOpenChange(false);
      } catch { /* onError on mutation handles toast */ }
    }
  };

  // Only called from fiado tab — guard is belt-and-suspenders
  const handlePay = () => {
    if (!isFiado || !previewPayCents || previewPayCents <= 0) return toast.error("Valor inválido");
    registerPayment.mutate(
      { customerId: customer!.id, amount_cents: previewPayCents },
      { onSuccess: () => { setIsReceivingPayment(false); setPaymentInput(""); } }
    );
  };

  const handleAddAddress = () => {
    if (!newAddr.street.trim()) return toast.error("Rua é obrigatória");
    addAddress.mutate(
      { customerId: customer!.id, data: newAddr },
      {
        onSuccess: () => {
          setIsAddingAddress(false);
          setNewAddr({ street: "", number: "", neighborhood: "", city: "", state: "", zip_code: "" });
        },
      }
    );
  };

  const handleDeleteAddress = (addressId: string) => {
    openConfirm(
      "Remover endereço",
      "Este endereço será removido permanentemente do cadastro do cliente.",
      () => deleteAddress.mutate({ customerId: customer!.id, addressId }),
    );
  };

  const handleDelete = () => {
    if (!customer) return;
    openConfirm(
      `Excluir ${customer.name}?`,
      "Esta ação é permanente e não pode ser desfeita. Todo o histórico vinculado a este cliente será perdido.",
      () => deleteCustomer.mutate(customer.id, {
        onSuccess: () => { onOpenChange(false); toast.success("Cliente excluído."); },
      }),
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col border-white/10 bg-[#080810]/98 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-2xl">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="p-7 pb-5 bg-gradient-to-b from-primary/8 to-transparent border-b border-white/[0.06] shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-5">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={cn(
                "h-16 w-16 rounded-[1.5rem] p-[1.5px] shadow-xl",
                isEditMode
                  ? "bg-gradient-to-br from-primary to-accent shadow-primary/20"
                  : "bg-gradient-to-br from-white/20 to-white/5"
              )}>
                <div className="h-full w-full rounded-[1.4rem] bg-[#0a0a14] flex items-center justify-center font-black text-xl text-white">
                  {initials}
                </div>
              </div>
              {isEditMode && (
                <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-500 border-[3px] border-[#080810] flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
            </div>

            {/* Name + contacts */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-black text-white tracking-tighter uppercase truncate leading-tight">
                {isEditMode ? (form.name || "—") : "Novo Cliente"}
              </DialogTitle>
              {isEditMode ? (
                <div className="flex flex-wrap gap-4 mt-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                    <Phone size={11} className="text-primary/60" /> {form.phone || "---"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                    <Mail size={11} className="text-primary/60" /> {form.email || "---"}
                  </span>
                  {form.is_blocked && (
                    <Badge variant="destructive" className="text-[9px] px-2 py-0 h-4">Bloqueado</Badge>
                  )}
                </div>
              ) : (
                <DialogDescription className="text-[11px] uppercase font-bold text-white/30 mt-1">
                  Preencha os dados para cadastrar
                </DialogDescription>
              )}
            </div>

            {/* Balance badge — only when fiado is active */}
            {isEditMode && isFiado && (
              <div className={cn(
                "flex flex-col gap-1 px-4 py-3 rounded-2xl border shrink-0 min-w-[130px]",
                bState === "debt"    && "bg-orange-500/8 border-orange-500/20",
                bState === "credit"  && "bg-emerald-500/8 border-emerald-500/20",
                bState === "settled" && "bg-white/[0.03] border-white/[0.08]",
              )}>
                <p className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  bState === "debt"    ? "text-orange-400/80"  : "",
                  bState === "credit"  ? "text-emerald-400/80" : "",
                  bState === "settled" ? "text-white/30"       : "",
                )}>
                  {bState === "debt" ? "Saldo Devedor" : bState === "credit" ? "Crédito" : "Em Dia"}
                </p>
                {isLoadingDetail
                  ? <Loader2 size={16} className="animate-spin opacity-30 mt-1" />
                  : <p className={cn(
                      "text-lg font-black",
                      bState === "debt"    ? "text-orange-400"  : "",
                      bState === "credit"  ? "text-emerald-400" : "",
                      bState === "settled" ? "text-white/40"    : "",
                    )}>
                      {bState === "settled" ? "R$ 0,00" : fmtBRL(currentBalance)}
                    </p>
                }
              </div>
            )}
          </div>
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">

          <div className="px-7 py-2.5 bg-black/15 border-b border-white/[0.05] shrink-0">
            <TabsList className="bg-white/[0.04] border border-white/[0.08] p-1 h-10 rounded-xl w-fit gap-0.5">
              {[
                { id: "dados",     label: "Dados",     icon: User,    show: true },
                { id: "enderecos", label: "Endereços", icon: MapPin,  show: isEditMode, badge: addressCount > 0 ? addressCount : null },
                // Fiado tab only shown when allow_fiado is true
                { id: "fiado",     label: "Fiado",     icon: Wallet,  show: isEditMode && isFiado, badge: bState === "debt" ? "!" : null },
                { id: "historico", label: "Histórico", icon: History, show: isEditMode },
              ].filter(t => t.show).map(t => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="relative rounded-lg px-4 h-full data-[state=active]:bg-primary transition-all text-[10px] font-black uppercase gap-1.5 data-[state=active]:text-white text-white/50"
                >
                  <t.icon size={12} /> {t.label}
                  {t.badge && (
                    <span className={cn(
                      "absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center",
                      t.badge === "!" ? "bg-orange-500 text-white" : "bg-primary/80 text-white"
                    )}>
                      {t.badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-7 pb-8">

                {/* ── ABA DADOS ─────────────────────────────────────────────── */}
                <TabsContent value="dados" className="mt-6 space-y-7">

                  <section>
                    <SectionLabel icon={User}>Identificação</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">Nome Completo *</Label>
                        <Input
                          value={form.name}
                          onChange={set("name")}
                          placeholder="João da Silva"
                          className={cn("h-11 bg-white/[0.04] border-white/[0.08] rounded-xl transition-colors", errors.name && "border-red-500/50 bg-red-500/5")}
                        />
                        <FieldError msg={errors.name} />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">CPF / CNPJ</Label>
                        <Input
                          value={form.tax_id}
                          onChange={e => setForm(prev => ({ ...prev, tax_id: maskTaxId(e.target.value) }))}
                          placeholder="000.000.000-00"
                          className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <SectionLabel icon={Phone}>Contato</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">WhatsApp / Telefone</Label>
                        <Input
                          value={form.phone}
                          onChange={e => setForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                          placeholder="(00) 00000-0000"
                          className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">E-mail</Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={set("email")}
                          placeholder="joao@email.com"
                          className={cn("h-11 bg-white/[0.04] border-white/[0.08] rounded-xl", errors.email && "border-red-500/50 bg-red-500/5")}
                        />
                        <FieldError msg={errors.email} />
                      </div>
                    </div>
                  </section>

                  <section>
                    <SectionLabel icon={MapPin}>Localização</SectionLabel>
                    <div className="space-y-3">
                      <Input
                        value={form.address}
                        onChange={set("address")}
                        placeholder="Rua / Avenida e número"
                        className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl"
                      />
                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">Bairro</Label>
                          <Input value={form.neighborhood} onChange={set("neighborhood")} className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">Cidade</Label>
                          <Input value={form.city} onChange={set("city")} className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl" />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">UF</Label>
                          <Input
                            value={form.state}
                            onChange={e => setForm(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                            maxLength={2}
                            className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl text-center font-mono"
                          />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">CEP</Label>
                          <Input
                            value={form.zip_code}
                            onChange={e => setForm(prev => ({ ...prev, zip_code: maskZip(e.target.value) }))}
                            placeholder="00000-000"
                            className="h-11 bg-white/[0.04] border-white/[0.08] rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <SectionLabel>Observações</SectionLabel>
                    <Textarea
                      value={form.notes}
                      onChange={set("notes")}
                      placeholder="Anotações internas sobre este cliente…"
                      className="bg-white/[0.04] border-white/[0.08] rounded-xl min-h-[80px] resize-none text-sm"
                    />
                  </section>

                  {isEditMode && (
                    <section className="pt-4 border-t border-white/[0.06] space-y-5">
                      <SectionLabel icon={Shield}>Configurações</SectionLabel>

                      <div>
                        <Label className="text-[10px] font-black uppercase opacity-50 mb-1.5 block">
                          Alerta ao abrir pedido
                        </Label>
                        <Textarea
                          value={form.alert_message}
                          onChange={set("alert_message")}
                          placeholder="Ex: Cliente alérgico a amendoim"
                          className="bg-orange-500/5 border-orange-500/15 rounded-xl min-h-[64px] resize-none text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <div>
                            <p className="text-sm font-bold">Permitir Fiado</p>
                            <p className="text-[10px] text-white/30">Cliente pode comprar a prazo</p>
                          </div>
                          <Switch
                            checked={form.allow_fiado}
                            onCheckedChange={v => {
                              setForm(prev => ({
                                ...prev,
                                allow_fiado: v,
                                // Reset fiado-specific fields when disabling
                                credit_limit_cents: v ? prev.credit_limit_cents : 0,
                              }));
                              // If user was on the fiado tab, snap back to dados
                              if (!v && activeTab === "fiado") setActiveTab("dados");
                              // Reset fiado UI state
                              if (!v) { setIsReceivingPayment(false); setPaymentInput(""); }
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-red-500/5 border border-red-500/10">
                          <div>
                            <p className="text-sm font-bold text-red-400">Bloquear Cliente</p>
                            <p className="text-[10px] text-red-400/40">Impede novos pedidos</p>
                          </div>
                          <Switch
                            checked={form.is_blocked}
                            onCheckedChange={v => setForm(prev => ({ ...prev, is_blocked: v }))}
                          />
                        </div>
                      </div>
                    </section>
                  )}
                </TabsContent>

                {/* ── ABA ENDEREÇOS ─────────────────────────────────────────── */}
                <TabsContent value="enderecos" className="mt-6 space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black uppercase">Endereços de Entrega</h3>
                      <p className="text-[11px] text-white/30 mt-0.5">
                        {addressCount} endereço{addressCount !== 1 ? "s" : ""} cadastrado{addressCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsAddingAddress(v => !v)}
                      size="sm"
                      className={cn(
                        "gap-1.5 h-9 px-4 text-xs font-black uppercase rounded-xl",
                        isAddingAddress ? "bg-white/10 hover:bg-white/15 text-white" : "btn-neon"
                      )}
                    >
                      <Plus size={13} /> {isAddingAddress ? "Cancelar" : "Adicionar"}
                    </Button>
                  </div>

                  {isAddingAddress && (
                    <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <Input
                        placeholder="Rua / Avenida"
                        value={newAddr.street}
                        onChange={e => setNewAddr(a => ({ ...a, street: e.target.value }))}
                        className="bg-black/30 border-white/10 h-11 rounded-xl"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <Input placeholder="Número"   value={newAddr.number}       onChange={e => setNewAddr(a => ({ ...a, number: e.target.value }))}       className="bg-black/30 border-white/10 h-11 rounded-xl" />
                        <Input placeholder="Bairro"   value={newAddr.neighborhood} onChange={e => setNewAddr(a => ({ ...a, neighborhood: e.target.value }))} className="bg-black/30 border-white/10 h-11 rounded-xl" />
                        <Input placeholder="Cidade"   value={newAddr.city}         onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))}         className="bg-black/30 border-white/10 h-11 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="UF" value={newAddr.state} maxLength={2}
                          onChange={e => setNewAddr(a => ({ ...a, state: e.target.value.toUpperCase().slice(0, 2) }))}
                          className="bg-black/30 border-white/10 h-11 rounded-xl font-mono text-center"
                        />
                        <Input
                          placeholder="CEP" value={newAddr.zip_code}
                          onChange={e => setNewAddr(a => ({ ...a, zip_code: maskZip(e.target.value) }))}
                          className="bg-black/30 border-white/10 h-11 rounded-xl font-mono"
                        />
                      </div>
                      <Button
                        onClick={handleAddAddress}
                        disabled={addAddress.isPending}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-xs rounded-xl"
                      >
                        {addAddress.isPending ? <Loader2 className="animate-spin" size={16} /> : "Salvar Endereço"}
                      </Button>
                    </div>
                  )}

                  {isLoadingDetail ? (
                    <div className="py-10 flex justify-center">
                      <Loader2 className="animate-spin text-primary/40" size={24} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail?.addresses?.map((addr: any) => (
                        <div
                          key={addr.id}
                          className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] group hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                              <Home size={14} className="text-primary/70" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{addr.street}{addr.number ? `, ${addr.number}` : ""}</p>
                              <p className="text-[11px] text-white/35 truncate">
                                {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(" · ")}
                                {addr.zip_code && ` — ${addr.zip_code}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-xl text-red-500/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            onClick={() => handleDeleteAddress(addr.id)}
                            disabled={deleteAddress.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                      {!detail?.addresses?.length && !isAddingAddress && (
                        <div className="py-12 text-center">
                          <MapPin size={32} className="text-white/10 mx-auto mb-3" />
                          <p className="text-xs font-black uppercase text-white/20">Nenhum endereço cadastrado</p>
                          <p className="text-[11px] text-white/15 mt-1">Clique em Adicionar para incluir</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── ABA FIADO — only rendered when allow_fiado is true ─────── */}
                {isFiado && (
                  <TabsContent value="fiado" className="mt-6 space-y-5">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                      {/* Saldo Devedor */}
                      <div className={cn(
                        "p-5 rounded-2xl border flex flex-col gap-3 transition-all",
                        bState === "debt"
                          ? "bg-orange-500/8 border-orange-500/25"
                          : "bg-white/[0.02] border-white/[0.05] opacity-35 pointer-events-none"
                      )}>
                        <div className="flex items-center gap-2">
                          <TrendingDown size={14} className="text-orange-400" />
                          <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Saldo Devedor</p>
                        </div>
                        <p className={cn("text-3xl font-black tracking-tighter", bState === "debt" ? "text-orange-400" : "text-white/15")}>
                          {bState === "debt" ? fmtBRL(currentBalance) : "—"}
                        </p>
                        {bState === "debt" && (
                          <Button
                            onClick={() => { setIsReceivingPayment(v => !v); setTimeout(() => paymentRef.current?.focus(), 100); }}
                            size="sm"
                            className="w-full bg-orange-600/80 hover:bg-orange-600 h-9 rounded-xl font-black uppercase text-[11px] mt-auto"
                          >
                            {isReceivingPayment ? "Cancelar" : "Registrar Pagamento"}
                          </Button>
                        )}
                      </div>

                      {/* Crédito Disponível */}
                      <div className={cn(
                        "p-5 rounded-2xl border flex flex-col gap-3 transition-all",
                        bState === "credit"
                          ? "bg-emerald-500/8 border-emerald-500/25"
                          : "bg-white/[0.02] border-white/[0.05] opacity-35"
                      )}>
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-emerald-400" />
                          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Crédito Disponível</p>
                        </div>
                        <p className={cn("text-3xl font-black tracking-tighter", bState === "credit" ? "text-emerald-400" : "text-white/15")}>
                          {bState === "credit" ? fmtBRL(currentBalance) : "—"}
                        </p>
                      </div>

                      {/* Limite de Crédito */}
                      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <CreditCard size={14} className="text-primary/60" />
                          <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Limite de Crédito</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-black text-white/30">R$</span>
                          <input
                            type="number" min={0}
                            value={form.credit_limit_cents / 100}
                            onChange={e => setForm(prev => ({
                              ...prev,
                              credit_limit_cents: Math.round(Math.max(0, Number(e.target.value)) * 100),
                            }))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full p-0"
                          />
                        </div>
                        <p className="text-[10px] text-white/20 font-bold uppercase">Salvo com o botão principal</p>
                      </div>
                    </div>

                    {/* Em dia */}
                    {bState === "settled" && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5">
                        <Minus size={16} className="text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-sm font-black text-emerald-400">Cliente em dia</p>
                          <p className="text-[11px] text-white/30">Sem saldo devedor nem crédito acumulado.</p>
                        </div>
                      </div>
                    )}

                    {/* Payment form */}
                    {isReceivingPayment && (
                      <div className="p-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Valor Recebido (R$)</p>
                        <div className="flex gap-3">
                          <Input
                            ref={paymentRef}
                            value={paymentInput}
                            onChange={e => setPaymentInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handlePay()}
                            placeholder="0,00"
                            className="h-13 bg-black/30 border-emerald-500/20 text-xl font-black flex-1"
                          />
                          <Button
                            onClick={handlePay}
                            disabled={registerPayment.isPending || !previewPayCents}
                            className="bg-emerald-600 hover:bg-emerald-700 h-13 px-8 font-black uppercase text-xs shrink-0 rounded-xl"
                          >
                            {registerPayment.isPending ? <Loader2 className="animate-spin" size={16} /> : "Confirmar"}
                          </Button>
                        </div>
                        {previewPayCents > 0 && (
                          <div className="flex items-center gap-3 text-[11px] font-bold text-white/50">
                            <span>Devedor atual: <span className="text-orange-400">{fmtBRL(currentBalance)}</span></span>
                            <span className="text-white/20">→</span>
                            <span>
                              Após pagamento:{" "}
                              <span className={previewBalance > 0 ? "text-orange-400" : previewBalance < 0 ? "text-emerald-400" : "text-white/60"}>
                                {previewBalance === 0 ? "R$ 0,00 (Zerado)" : fmtBRL(previewBalance)}
                                {previewBalance < 0 && " (vira crédito)"}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* ── ABA HISTÓRICO ─────────────────────────────────────────── */}
                <TabsContent value="historico" className="mt-6 py-20 flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                    <History size={28} className="text-white/15" />
                  </div>
                  <p className="text-xs font-black uppercase text-white/20 tracking-widest">
                    Integração com Pedidos pendente
                  </p>
                </TabsContent>

              </div>
            </ScrollArea>
          </div>

          {/* ── FOOTER ─────────────────────────────────────────────────────── */}
          <div className="px-7 py-5 bg-[#080810] border-t border-white/[0.06] flex gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 rounded-xl font-black uppercase text-[10px] text-white/40 hover:text-white"
            >
              Fechar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-11 btn-neon font-black uppercase text-xs gap-2"
            >
              {isSaving
                ? <Loader2 className="animate-spin" size={16} />
                : <><Save size={16} /> {isEditMode ? "Salvar Alterações" : "Cadastrar Cliente"}</>
              }
            </Button>
            {isEditMode && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteCustomer.isPending}
                className="h-11 w-11 rounded-xl shrink-0 bg-red-500/10 hover:bg-red-500/80 border border-red-500/20 text-red-400 hover:text-white transition-all"
              >
                {deleteCustomer.isPending ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
              </Button>
            )}
          </div>
        </Tabs>

      </DialogContent>
    </Dialog>

    {/* ── CONFIRM DIALOG ───────────────────────────────────────────────────── */}
    <Dialog open={confirmDialog.open} onOpenChange={closeConfirm}>
      <DialogContent className="max-w-sm border-white/10 bg-[#0e0e1a] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                {confirmDialog.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/40 leading-relaxed">
                {confirmDialog.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="px-6 pb-6 gap-2 flex-row">
          <Button
            variant="ghost"
            onClick={closeConfirm}
            className="flex-1 h-10 rounded-xl font-black uppercase text-[10px] text-white/40 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }}
            className="flex-1 h-10 rounded-xl font-black uppercase text-[10px] bg-red-600 hover:bg-red-700 text-white border-none"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}