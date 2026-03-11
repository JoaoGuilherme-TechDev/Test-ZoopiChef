import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Phone, Users, FileText } from "lucide-react";

interface AddClientModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddClient: (clientData: {
    name: string;
    whatsapp: string;
    people: number;
    observations: string;
  }) => void;
}

const PEOPLE_PRESETS = [1, 2, 3, 4, 5, 6];

export function AddClientModal({ isOpen, onOpenChange, onAddClient }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [people, setPeople] = useState(2);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setWhatsapp("");
      setPeople(2);
      setObservations("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("O nome do cliente é obrigatório.");
      return;
    }
    onAddClient({ name, whatsapp, people, observations });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] w-[calc(100vw-2rem)] bg-background border-border rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">
                Adicionar à Fila
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preencha os dados do cliente
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Nome completo do cliente"
              className="h-11 rounded-xl border-border/60 bg-muted/30 focus-visible:ring-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              WhatsApp <span className="text-muted-foreground font-normal normal-case tracking-normal">(opcional)</span>
            </Label>
            <Input
              id="whatsapp"
              placeholder="(99) 99999-9999"
              className="h-11 rounded-xl border-border/60 bg-muted/30 focus-visible:ring-1"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Recebe notificação quando a mesa estiver pronta
            </p>
          </div>

          {/* People count */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Pessoas
            </Label>
            <div className="flex items-center gap-2">
              {PEOPLE_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPeople(n)}
                  className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition-all duration-150 ${
                    people === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:border-border"
                  }`}
                >
                  {n}
                </button>
              ))}
              <Input
                type="number"
                min={1}
                max={99}
                className="h-11 w-16 rounded-xl border-border/60 bg-muted/30 text-center focus-visible:ring-1 shrink-0"
                value={people > 6 ? people : ""}
                placeholder="+"
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setPeople(v);
                }}
              />
            </div>
          </div>

          {/* Observations */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="observations" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Observações <span className="text-muted-foreground font-normal normal-case tracking-normal">(opcional)</span>
            </Label>
            <Textarea
              id="observations"
              placeholder="Preferência de mesa, cadeirinha infantil, etc..."
              className="rounded-xl border-border/60 bg-muted/30 focus-visible:ring-1 resize-none min-h-[80px]"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 pt-0 flex flex-row gap-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="flex-1 h-11 rounded-xl font-semibold gap-2"
            onClick={handleSubmit}
          >
            <UserPlus className="h-4 w-4" />
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}