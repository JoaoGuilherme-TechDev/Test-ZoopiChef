import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, CreditCard, Loader2, Save, X } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFormError } from "@/hooks/useFormError";
import { Customer } from "@/modules/customers/hooks/useCustomers";
import { cn } from "@/lib/utils";

interface CustomerFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer: Customer | null;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export function CustomerFormModal({
  isOpen,
  onOpenChange,
  editingCustomer,
  onSubmit,
  isSubmitting
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tax_id: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
    credit_limit_cents: 0
  });

  const { hasError, handleInputChange } = useFormError();

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || "",
        email: editingCustomer.email || "",
        phone: editingCustomer.phone || "",
        tax_id: editingCustomer.tax_id || "",
        address: editingCustomer.address || "",
        neighborhood: editingCustomer.neighborhood || "",
        city: editingCustomer.city || "",
        state: editingCustomer.state || "",
        notes: editingCustomer.notes || "",
        credit_limit_cents: editingCustomer.credit_limit_cents || 0
      });
    } else {
      setFormData({
        name: "", email: "", phone: "", tax_id: "", address: "",
        neighborhood: "", city: "", state: "", notes: "", credit_limit_cents: 0
      });
    }
  }, [editingCustomer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <User className="text-primary h-5 w-5" />
            {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">
            {editingCustomer ? "Atualize as informações do cadastro." : "Cadastre um novo cliente para sua base."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Nome Completo *</Label>
              <Input 
                name="name"
                value={formData.name}
                onChange={(e) => { setFormData({...formData, name: e.target.value}); handleInputChange(); }}
                className={hasError("name") ? "border-red-500" : ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">WhatsApp / Telefone</Label>
              <Input 
                name="phone"
                value={formData.phone}
                onChange={(e) => { setFormData({...formData, phone: e.target.value}); handleInputChange(); }}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">E-mail</Label>
              <Input 
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => { setFormData({...formData, email: e.target.value}); handleInputChange(); }}
                className={hasError("email") ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">CPF / CNPJ</Label>
              <Input 
                name="tax_id"
                value={formData.tax_id}
                onChange={(e) => { setFormData({...formData, tax_id: e.target.value}); handleInputChange(); }}
              />
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Endereço */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <MapPin size={12} /> Localização
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Logradouro e Número</Label>
                <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase">Bairro</Label>
                  <Input value={formData.neighborhood} onChange={(e) => setFormData({...formData, neighborhood: e.target.value})} />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase">Cidade</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase">UF</Label>
                  <Input value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})} maxLength={2} />
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Financeiro e Notas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase flex items-center gap-2">
                <CreditCard size={12} /> Limite de Crédito (R$)
              </Label>
              <Input 
                type="number"
                value={formData.credit_limit_cents / 100}
                onChange={(e) => setFormData({...formData, credit_limit_cents: Number(e.target.value) * 100})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Observações Internas</Label>
              <Textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="bg-black/20 border-white/10"
              />
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 bg-white/[0.03] border-t border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-black">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-neon min-w-[150px] uppercase text-[10px] font-black"
          >
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Cadastro</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full", className)} />;