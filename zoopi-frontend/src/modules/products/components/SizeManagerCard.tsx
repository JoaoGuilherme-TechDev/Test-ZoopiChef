import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Trash2 } from "lucide-react";
import { useSizes } from "../hooks/useSizes";
import { useFlavors } from "../hooks/useFlavors";

export function SizeManagerCard() {
  const { sizes, isLoading, createSize, deleteSize } = useSizes();
  const { flavors, updateFlavors } = useFlavors();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [slices, setSlices] = useState("");
  const [maxFlavors, setMaxFlavors] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredSizes = useMemo(() => {
    if (!search.trim()) return sizes;
    const term = search.trim().toLowerCase();
    return sizes.filter((s) => s.name.toLowerCase().includes(term));
  }, [sizes, search]);

  const handleOpenCreate = () => {
    setError(null);
    setName("");
    setBasePrice("");
    setSlices("");
    setMaxFlavors("");
    setIsCreateOpen(true);
  };

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !basePrice.trim() || !slices.trim() || !maxFlavors.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    const duplicate = sizes.some(
      (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setError("Já existe um tamanho com este nome.");
      return;
    }
    const priceNumber = parseFloat(basePrice.replace(",", "."));
    const slicesNumber = parseInt(slices, 10);
    const maxFlavorsNumber = parseInt(maxFlavors, 10);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setError("Informe um preço base válido e maior que zero.");
      return;
    }
    if (!Number.isFinite(slicesNumber) || slicesNumber <= 0) {
      setError("Informe a quantidade de fatias.");
      return;
    }
    if (!Number.isFinite(maxFlavorsNumber) || maxFlavorsNumber <= 0) {
      setError("Informe a quantidade de sabores por pizza.");
      return;
    }

    createSize.mutate(
      {
        name: trimmedName,
        basePrice: priceNumber.toFixed(2),
        slices: slicesNumber,
        maxFlavors: maxFlavorsNumber,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
        },
      }
    );
  };

  const getFlavorCountForSize = (sizeId: string) => {
    return flavors.filter((f) => f.sizes.some((s) => s.sizeId === sizeId)).length;
  };

  const handleConfirmDelete = (sizeId: string) => {
    updateFlavors((prev) =>
      prev.map((f) => ({
        ...f,
        sizes: f.sizes.filter((s) => s.sizeId !== sizeId),
      }))
    );
    deleteSize.mutate(sizeId);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    if (!Number.isFinite(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  return (
    <Card className="panel border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">Tamanhos Globais</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Defina os tamanhos disponíveis para todas as pizzas. Eles serão usados na configuração de sabores.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="h-9 px-4 rounded-full text-xs font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo tamanho
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 ">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2  " />
            <Input
              placeholder="Buscar tamanho..."
              className="pl-7 h-8 text-xs border border-primary/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {sizes.length} tamanho(s)
          </span>
        </div>

        {isLoading ? (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground ">
            Carregando tamanhos...
          </div>
        ) : filteredSizes.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground text-center ">
            Nenhum tamanho cadastrado. Clique em{" "}
            <span className="mx-1 font-medium">Novo tamanho</span> para criar o primeiro.
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-2 pr-1 ">
              {filteredSizes.map((size) => {
                const flavorCount = getFlavorCountForSize(size.id);
                return (
                  <div
                    key={size.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card border-primary/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{size.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {formatCurrency(size.basePrice)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{size.slices} fatia(s)</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span>Até {size.maxFlavors} sabor(es)</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span>
                          Usado em {flavorCount} sabor(es)
                        </span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover tamanho</AlertDialogTitle>
                          <AlertDialogDescription>
                            Este tamanho está associado a {flavorCount} sabor(es). Ao removê-lo, ele será
                            automaticamente desvinculado desses sabores. Deseja continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleConfirmDelete(size.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[96vw] sm:w-[420px]">
          <DialogHeader>
            <DialogTitle>Novo tamanho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome do tamanho *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Broto, Média, Grande"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Preço base *</Label>
              <Input
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Ex: 39,90"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fatias *</Label>
                <Input
                  value={slices}
                  onChange={(e) => setSlices(e.target.value)}
                  placeholder="Ex: 8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Sabores por pizza *</Label>
                <Input
                  value={maxFlavors}
                  onChange={(e) => setMaxFlavors(e.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              className="w-full sm:w-auto"
              disabled={createSize.isPending}
            >
              {createSize.isPending ? "Salvando..." : "Criar tamanho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

