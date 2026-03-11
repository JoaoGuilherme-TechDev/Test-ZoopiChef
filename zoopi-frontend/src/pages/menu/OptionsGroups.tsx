/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOptionsGroups, OptionGroup } from "@/modules/products/hooks/useOptionsGroups";
import { useFlavors } from "@/modules/products/hooks/useFlavors";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Layers, 
  Save, 
  GripVertical,
  ChevronDown,
  ThumbsUp,
  Pencil,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBatchDirectLinkOptionGroups } from "@/hooks/useBatchLinkOptionGroups";

export default function OptionsGroupsPage() {
  const { groups, isLoading, createGroup, updateGroup, deleteGroup } = useOptionsGroups();
  const { flavors } = useFlavors();
  const { products } = useProducts();
  const { categories } = useCategories();
  const { subcategories } = useSubcategories();
  const batchDirectLinkOptionals = useBatchDirectLinkOptionGroups();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [itemOrigin, setItemOrigin] = useState<"manual" | "flavor-group" | "subcategory">("manual");
  const [selectedFlavorGroup, setSelectedFlavorGroup] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");

  // Modal interno: Adicionar Item a um grupo
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemTarget, setAddItemTarget] = useState<OptionGroup | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState<string>("0");
  const [newItemOrder, setNewItemOrder] = useState<string>("0");
  const [newItemActive, setNewItemActive] = useState<boolean>(true);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const flavorGroups = Array.from(
    new Set(
      (flavors || [])
        .map((f) => f.group?.trim())
        .filter((g): g is string => Boolean(g))
    )
  ).sort((a, b) => a.localeCompare(b));

  const categoryOptions = useMemo(
    () => (categories || []).filter((cat) => cat.active),
    [categories]
  );

  const subcategoryOptions = useMemo(
    () =>
      (subcategories || []).filter(
        (sub) => sub.active && (!selectedCategoryId || sub.category_id === selectedCategoryId)
      ),
    [subcategories, selectedCategoryId]
  );

  const importPreviewProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (selectedSubcategoryId) {
      return products.filter((p) => p.subcategory_id === selectedSubcategoryId && p.active);
    }
    if (selectedCategoryId) {
      const catSubIds = (subcategories || [])
        .filter((s) => s.category_id === selectedCategoryId)
        .map((s) => s.id);
      return products.filter(
        (p: any) =>
          p.active &&
          (catSubIds.includes(p.subcategory_id as string) ||
            (p as any).category_id === selectedCategoryId)
      );
    }
    return [];
  }, [products, selectedCategoryId, selectedSubcategoryId, subcategories]);

  // Estado para o formulário (Novo ou Edição)
  const [formData, setFormData] = useState({
    name: "",
    min_qty: 0,
    max_qty: 1,
    active: true,
    items: [{ name: "", price: 0, active: true, order: 0 }]
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<OptionGroup | null>(null);

  const handleReset = () => {
    setFormData({
      name: "",
      min_qty: 0,
      max_qty: 1,
      active: true,
      items: [{ name: "", price: 0, active: true, order: 0 }]
    });
    setIsAdding(false);
    setEditingId(null);
    setItemOrigin("manual");
  };

  const handleEdit = (group: OptionGroup) => {
    setEditingId(group.id);
    setItemOrigin("manual");
    setFormData({
      name: group.name,
      min_qty: group.min_qty,
      max_qty: group.max_qty,
      active: group.active,
      items: group.items.map((item, idx) => ({
        name: item.name,
        price: Number(item.price ?? 0),
        active: item.active ?? true,
        order: item.order ?? idx,
      })),
    });
    setIsAdding(true);
  };

  const handleDeleteClick = (group: OptionGroup) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroup.mutateAsync(groupToDelete.id);
      toast.success("Grupo excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir grupo.");
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const handleConfirmAddItem = async () => {
    if (!addItemTarget) return;
    const baseItems = (addItemTarget.items || []).map((it, idx) => ({
      name: it.name,
      price: Number(it.price ?? 0),
      active: it.active ?? true,
      order: it.order ?? idx,
    }));
    const itemName = newItemName.trim();
    const itemPrice = Number(newItemPrice || 0);
    const parsedOrder = Number.isFinite(Number(newItemOrder)) ? Math.max(0, parseInt(newItemOrder, 10)) : baseItems.length;
    if (!itemName) {
      toast.error("Informe o nome do item.");
      return;
    }
    let updatedItems = baseItems.slice();
    const newItem = {
      name: itemName,
      price: Number.isFinite(itemPrice) && itemPrice >= 0 ? itemPrice : 0,
      active: newItemActive,
      order: parsedOrder,
    };
    if (editingItemIndex !== null && editingItemIndex >= 0 && editingItemIndex < updatedItems.length) {
      updatedItems[editingItemIndex] = newItem;
    } else {
      updatedItems.push(newItem);
    }
    try {
      await updateGroup.mutateAsync({
        id: addItemTarget.id,
        name: addItemTarget.name,
        min_qty: addItemTarget.min_qty,
        max_qty: addItemTarget.max_qty,
        active: addItemTarget.active,
        items: updatedItems,
      });
      toast.success(editingItemIndex !== null ? "Item atualizado!" : "Item adicionado ao grupo!");
      setAddItemOpen(false);
      setAddItemTarget(null);
      setNewItemName("");
      setNewItemPrice("0");
      setNewItemOrder("0");
      setNewItemActive(true);
      setEditingItemIndex(null);
    } catch {
      toast.error(editingItemIndex !== null ? "Não foi possível atualizar o item." : "Não foi possível adicionar o item.");
    }
  };

  const handleEditItem = (group: OptionGroup, index: number) => {
    const item = group.items[index];
    setAddItemTarget(group);
    setEditingItemIndex(index);
    setNewItemName(item.name);
    setNewItemPrice(String(item.price ?? 0));
    setNewItemOrder(String(item.order ?? index));
    setNewItemActive(Boolean(item.active));
    setAddItemOpen(true);
  };

  const handleDeleteItem = async (group: OptionGroup, index: number) => {
    try {
      const remaining = group.items
        .filter((_, i) => i !== index)
        .map((it, idx) => ({
          name: it.name,
          price: Number(it.price ?? 0),
          active: it.active ?? true,
          order: it.order ?? idx,
        }));
      await updateGroup.mutateAsync({
        id: group.id,
        name: group.name,
        min_qty: group.min_qty,
        max_qty: group.max_qty,
        active: group.active,
        items: remaining,
      });
      toast.success("Item removido!");
    } catch {
      toast.error("Não foi possível remover o item.");
    }
  };

  const handleToggleGroupActive = async (group: OptionGroup, active: boolean) => {
    try {
      const updatedItems = group.items.map((it, idx) => ({
        name: it.name,
        price: Number(it.price ?? 0),
        active,
        order: it.order ?? idx,
      }));
      await updateGroup.mutateAsync({
        id: group.id,
        name: group.name,
        min_qty: group.min_qty,
        max_qty: group.max_qty,
        items: updatedItems,
      });
      toast.success(active ? "Grupo ativado" : "Grupo inativado");
    } catch {
      toast.error("Não foi possível atualizar o status do grupo.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const trimmedName = formData.name.trim();
      if (!trimmedName) {
        toast.error("Informe o nome do grupo.");
        return;
      }
      if (formData.max_qty < 1 || formData.min_qty < 0 || formData.min_qty > formData.max_qty) {
        toast.error("Verifique as quantidades mínima e máxima.");
        return;
      }

      // 1) Monta itens conforme origem selecionada
      let itemsPayload = formData.items;
      if (itemOrigin === "subcategory") {
        itemsPayload = importPreviewProducts.map((p, idx) => ({
          name: p.name,
          price: Number(p.prices?.[0]?.price || 0),
          active: true,
          order: idx,
        }));
      } else if (itemOrigin === "flavor-group") {
        const src = (flavors || []).filter(
          (f) => f.group?.trim().toLowerCase() === selectedFlavorGroup.trim().toLowerCase()
        );
        itemsPayload = src.map((f, idx) => ({
          name: f.name,
          price: 0,
          active: true,
          order: idx,
        }));
      } else {
        itemsPayload = [];
      }
      const payload = { ...formData, name: trimmedName, items: itemsPayload };

      if (editingId) {
        await updateGroup.mutateAsync({ id: editingId, ...payload });
        toast.success("Grupo atualizado!");
      } else {
        const resp: any = await createGroup.mutateAsync(payload);
        const newGroupId = resp?.data?.id || resp?.id;

        // 2) Se origem for subcategoria/categoria, vincula o grupo aos produtos listados
        if (itemOrigin === "subcategory" && importPreviewProducts.length > 0 && newGroupId) {
          const productIds = importPreviewProducts.map((p) => p.id);
          await batchDirectLinkOptionals.mutateAsync({
            productIds,
            groupLinks: [
              {
                groupId: newGroupId,
                minSelect: payload.min_qty,
                maxSelect: payload.max_qty,
              },
            ],
          });
          toast.success(`Grupo criado e vinculado a ${productIds.length} produtos!`);
        } else {
          toast.success("Grupo criado com sucesso!");
        }
      }
      handleReset();
    } catch (error) {
      toast.error("Erro ao salvar grupo.");
    }
  };

  return (
    <DashboardLayout title="Grupos de Opcionais">
      <div className="space-y-6 max-w-8xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Layers className="h-6 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-medium tracking-tight uppercase">Grupos Opcionais</h2>
              <p className="text-[12px] text-muted-foreground font-bold uppercase tracking-widest">
                Cadastre grupos como &quot;Escolha sua borda&quot; e vincule aos produtos depois.
              </p>
            </div>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="btn-neon gap-2">
              <Plus className="h-4 w-4" /> Novo Grupo
            </Button>
          )}
        </div>

        <div>
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)] rounded-2xl">Carregando grupos...</div>
          ) : groups.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)] rounded-2xl">
              Nenhum grupo cadastrado.
            </div>
          ) : (
            <Card className="panel">
              <CardContent className="p-0">
                <div className="divide-y divide-border divide-[hsla(270,100%,65%,0.22)]">
                  {groups.map((group) => {
                    const isExpanded = expandedGroupId === group.id;
                    const isGroupActive = group.items.some((item) => item.active !== false);
                    return (
                      <div
                        key={group.id}
                        className={cn(
                          "transition-colors",
                          isExpanded ? "bg-primary/[0.03]" : "hover:bg-primary/[0.02]"
                        )}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedGroupId((prev) => (prev === group.id ? null : group.id));
                            }
                          }}
                          onClick={() =>
                            setExpandedGroupId((prev) => (prev === group.id ? null : group.id))
                          }
                          className="w-full flex items-center justify-between px-6 py-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-muted-foreground cursor-grab">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">{group.name}</span>
                                <Badge variant="outline" className="text-[10px] border border-[hsla(270,100%,65%,0.22)] rounded-full">
                                  {group.items.length} itens
                                </Badge>
                                <Badge variant="outline" className="text-[10px] rounded-full border border-[hsla(270,100%,65%,0.22)]">
                                  Min: {group.min_qty} / Max: {group.max_qty}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center"
                              title={isGroupActive ? "Grupo ativo" : "Grupo inativo"}
                            >
                              <Switch
                                checked={isGroupActive}
                                onCheckedChange={(checked) =>
                                  handleToggleGroupActive(group, checked as boolean)
                                }
                              />
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-6 pb-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  className="h-9 rounded-full text-[11px] font-black uppercase tracking-widest"
                                  onClick={() => handleEdit(group)}
                                >
                                  Editar Grupo
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="h-9 rounded-full text-[11px] font-black uppercase tracking-widest"
                                  onClick={() => handleDeleteClick(group)}
                                >
                                  Excluir
                                </Button>
                              </div>
                                <Button
                                  type="button"
                                  className="h-9 rounded-full text-[11px] font-black uppercase tracking-widest"
                                  onClick={() => {
                                    setAddItemTarget(group);
                                    setEditingItemIndex(null);
                                    setNewItemName("");
                                    setNewItemPrice("0");
                                    setNewItemOrder(String(group.items?.length ?? 0));
                                    setNewItemActive(true);
                                    setAddItemOpen(true);
                                  }}
                                >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Item
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {group.items.map((item, idx) => (
                                <div
                                  key={item.id ?? `${item.name}-${idx}`}
                                  className="flex items-center justify-between rounded-2xl bg-muted/10 px-4 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                      <ThumbsUp className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{item.name}</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] rounded-full border border-[hsla(270,100%,65%,0.22)]">
                                          {item.active ? "Ativo" : "Inativo"}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px] rounded-full border border-[hsla(270,100%,65%,0.22)]">
                                          Ordem: {item.order ?? idx}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-[11px] rounded-full border border-[hsla(270,100%,65%,0.22)]">
                                      {Number(item.price).toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      })}
                                    </Badge>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest"
                                      onClick={() => handleEditItem(group, idx)}
                                    >
                                      <Pencil className="h-3 w-3 mr-1" />
                                      Editar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest"
                                      onClick={() => handleDeleteItem(group, idx)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Excluir
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {group.items.length === 0 && (
                                <div className="text-xs text-muted-foreground italic">
                                  Nenhum item cadastrado ainda.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={isAdding}
        onOpenChange={(open) => {
          setIsAdding(open);
          if (!open) {
            handleReset();
          }
        }}
      >
        <DialogContent className="max-w-3xl p-0 border border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col max-h-[80vh]">
            <div className="px-6 pt-6 pb-3">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase tracking-wide">
                  {editingId ? "Editar Grupo Opcional" : "Novo Grupo Opcional"}
                </DialogTitle>
                <DialogDescription className="text-xs uppercase font-semibold tracking-widest">
                  Defina o nome, origem dos itens e regras de seleção deste grupo opcional.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 space-y-8 mt-8 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Grupo*</Label>
                    <Input
                      placeholder="ex: Escolha o Molho"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Origem dos itens</Label>
                    <Select
                      value={itemOrigin}
                      onValueChange={(value) =>
                        setItemOrigin(value as "manual" | "flavor-group" | "subcategory")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a origem dos itens" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          Manual (cadastrar itens um a um)
                        </SelectItem>
                        <SelectItem value="flavor-group">
                          Sabores (de um Grupo de Sabor)
                        </SelectItem>
                        <SelectItem value="subcategory">
                          Produtos (de uma Subcategoria)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {itemOrigin === "flavor-group" && (
                    <div className="grid grid-cols-1  gap-4">
                      <div className="space-y-2">
                        <Label>Grupo de Sabor</Label>
                        <div className="flex gap-2">
                          <Select
                            value={selectedFlavorGroup}
                            onValueChange={setSelectedFlavorGroup}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione um grupo de sabor" />
                            </SelectTrigger>
                            <SelectContent>
                              {flavorGroups.length === 0 ? (
                                <SelectItem value="__none" disabled>
                                  Nenhum grupo de sabor cadastrado
                                </SelectItem>
                              ) : (
                                flavorGroups.map((groupName) => (
                                  <SelectItem key={groupName} value={groupName}>
                                    {groupName}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            className="whitespace-nowrap"
                            onClick={() => {
                              window.open("/menu/flavors", "_blank");
                            }}
                          >
                            Criar grupo
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Fórmula de Cálculo</Label>
                        <Select defaultValue="maior">
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a fórmula" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="maior">
                              Pela Maior (mais comum)
                            </SelectItem>
                            <SelectItem value="soma">
                              Soma = Valor de cada parte
                            </SelectItem>
                            <SelectItem value="proporcional">
                              Proporcional = Base + Sabor
                            </SelectItem>
                            <SelectItem value="total-item">
                              Total do item = Exibe valor da Pizza
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {itemOrigin === "subcategory" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                          value={selectedCategoryId}
                          onValueChange={(value) => {
                            setSelectedCategoryId(value);
                            setSelectedSubcategoryId("");
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                Nenhuma categoria cadastrada
                              </SelectItem>
                            ) : (
                              categoryOptions.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subcategoria</Label>
                        <Select
                          value={selectedSubcategoryId}
                          onValueChange={setSelectedSubcategoryId}
                          disabled={!selectedCategoryId || subcategoryOptions.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a subcategoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {subcategoryOptions.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                Nenhuma subcategoria disponível
                              </SelectItem>
                            ) : (
                              subcategoryOptions.map((subcategory) => (
                                <SelectItem key={subcategory.id} value={subcategory.id}>
                                  {subcategory.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Produtos que serão importados</Label>
                        <div className="flex flex-col gap-1 max-h-40 rounded-xl border border-primary/40 bg-muted/20 px-3 py-2 overflow-y-auto">
                          {importPreviewProducts.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Nenhum produto encontrado para os filtros selecionados.
                            </span>
                          ) : (
                            importPreviewProducts.map((product) => (
                              <div
                                key={product.id}
                                className="flex items-center justify-between text-xs py-0.5"
                              >
                                <span className="truncate">{product.name}</span>
                                {product.prices?.[0]?.price && (
                                  <span className="text-muted-foreground ml-2 whitespace-nowrap">
                                    {Number(product.prices[0].price).toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual: sem editor de itens por enquanto */}

                  <div className="space-y-2">
                    <Label>Qtd Mínima</Label>
                    <Input
                      type="number"
                      value={formData.min_qty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_qty: Number.isNaN(parseInt(e.target.value))
                            ? 0
                            : parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qtd Máxima</Label>
                    <Input
                      type="number"
                      value={formData.max_qty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_qty: Number.isNaN(parseInt(e.target.value))
                            ? 1
                            : parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold uppercase tracking-widest">
                          Obrigatório
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Cliente precisa escolher pelo menos um item.
                        </span>
                      </div>
                      <Switch
                        checked={formData.min_qty > 0}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            min_qty: checked ? Math.max(formData.min_qty, 1) : 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold uppercase tracking-widest">
                          Seleção única por item
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Permite apenas um item deste grupo por produto.
                        </span>
                      </div>
                      <Switch
                        checked={formData.max_qty === 1}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            max_qty: checked ? 1 : Math.max(formData.max_qty, 2),
                          })
                        }
                      />
                    </div>
                    {/* Toggle de ativo removido do formulário; agora controlado no cabeçalho de cada grupo */}
                  </div>
                </div>

             
                <div className="sticky bottom-0 w-full border-t border-primary/40 bg-background px-4 py-4 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={handleReset}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="btn-neon px-10"
                    disabled={createGroup.isPending || updateGroup.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" /> Salvar Grupo
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal interno: Adicionar Item ao grupo (somente campos) */}
      <Dialog open={addItemOpen} onOpenChange={(open) => {
        if (!open) {
          setAddItemOpen(false);
          setAddItemTarget(null);
          setNewItemName("");
          setNewItemPrice("0");
          setNewItemOrder("0");
          setNewItemActive(true);
          setEditingItemIndex(null);
        } else {
          setAddItemOpen(true);
        }
      }}>
        <DialogContent className="w-[96vw] sm:w-[85vw] lg:max-w-lg p-0 overflow-hidden rounded-3xl border border-[hsla(270,100%,65%,0.22)]">
          <div className="p-6 border-b border-primary/30 bg-muted/5">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-widest">
                {editingItemIndex !== null ? "Editar Item do Grupo" : "Adicionar Item ao Grupo"}
              </DialogTitle>
              <DialogDescription className="text-[10px] uppercase font-bold tracking-widest">
                Defina nome, preço adicional e ordem
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] uppercase font-semibold tracking-widest">Nome do item</Label>
                <Input
                  placeholder="Ex: Coca-Cola Lata"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase font-semibold tracking-widest">Preço adicional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase font-semibold tracking-widest">Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItemOrder}
                  onChange={(e) => setNewItemOrder(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold uppercase tracking-widest">
                      Ativo
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Define se o item aparece nas telas de venda.
                    </span>
                  </div>
                  <Switch
                    checked={newItemActive}
                    onCheckedChange={(checked) => setNewItemActive(checked)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-primary/30 bg-muted/5 flex items-center justify-end gap-3">
            <Button variant="ghost" className="uppercase text-[10px] font-black tracking-widest" onClick={() => setAddItemOpen(false)}>
              Cancelar
            </Button>
            <Button className="uppercase text-[10px] font-black tracking-widest" onClick={handleConfirmAddItem}>
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setGroupToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo de opcionais</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo "{groupToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}


