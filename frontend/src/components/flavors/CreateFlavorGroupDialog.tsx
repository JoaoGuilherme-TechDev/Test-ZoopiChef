import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateFlavorGroup } from "@/hooks/useFlavorGroups";

type Props = {
  triggerLabel?: string;
  onCreated?: (groupId: string) => void;
};

export function CreateFlavorGroupDialog({ triggerLabel = "Criar grupo de sabor", onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateFlavorGroup();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe o nome do grupo de sabor");
      return;
    }

    try {
      const created = await create.mutateAsync({
        name: trimmed,
        active: true,
        sort_order: 10,
      });
      toast.success("Grupo de sabor criado");
      onCreated?.(created.id);
      setName("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar grupo de sabor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Grupo de Sabor</DialogTitle>
          <DialogDescription>
            Ex: Pizza Salgada, Pizza Doce, Proteínas, Guarnições.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pizza Salgada" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleCreate} disabled={create.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
