/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Package,
  Tag,
  Sparkles,
  Settings2,
  UtensilsCrossed,
  Layers,
  Loader2,
} from "lucide-react";

// Layout & UI
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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

// Sistema de alertas global
import { useAlert } from "@/modules/alerts";
import { suppressNextAlert } from "@/lib/api";

// Hooks
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useOptionsGroups } from "@/modules/products/hooks/useOptionsGroups";
import { useSizes } from "@/modules/products/hooks/useSizes";
import { useFlavors } from "@/modules/products/hooks/useFlavors";
import { useDoughTypes } from "@/modules/products/hooks/useDoughTypes";
import { useBorderTypes } from "@/modules/products/hooks/useBorderTypes";
import { useBatchDirectLinkOptionGroups } from "@/hooks/useBatchLinkOptionGroups";
import { CategoryList } from "@/modules/products/components/CategoryList";
import { CategoryFormModal } from "@/modules/products/components/modals/CategoryFormModal";
import { ImportExportModal } from "@/modules/products/components/modals/ImportExportModal";
import { ProductFormModal } from "@/modules/products/components/modals/ProductFormModal";
import { InfoProdutosModal } from "@/modules/products/components/modals/InfoProdutosModal";
import { SubcategoryFormModal } from "@/modules/products/components/modals/SubcategoryFormModal";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { ProductTable } from "@/modules/products/components/ProductTable";
import {
  initialProductFormData,
  initialCategoryFormData,
  initialSubcategoryFormData,
  templates,
} from "@/modules/products/constants/templates";
import { ViewMode, SortField, SortOrder } from "@/modules/products/types";

// ── Helpers de mensagem específica por contexto ──────────────────

/**
 * Extrai a mensagem de erro do servidor quando disponível e legível.
 * Fallback para a mensagem padrão do contexto.
 */
function extractServerMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  if (!raw) return fallback;
  const msg = Array.isArray(raw) ? raw[0] : raw;
  return typeof msg === "string" && msg.length <= 200 ? msg : fallback;
}

// Mapa de labels legíveis para o tipo de item sendo excluído
const DELETE_LABELS: Record<string, string> = {
  product: "produto",
  category: "categoria",
  subcategory: "subcategoria",
};

export default function Products() {
  const navigate = useNavigate();
  const alert = useAlert();

  // --- State: UI Control ---
  const [viewMode, setViewMode] = useState<ViewMode>("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- State: Modals ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState<any>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "product" | "category" | "subcategory";
    id: string;
    name?: string;
  } | null>(null);

  // --- State: Forms ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productFormData, setProductFormData] = useState(initialProductFormData);
  const [categoryFormData, setCategoryFormData] = useState(initialCategoryFormData);
  const [subcategoryFormData, setSubcategoryFormData] = useState(initialSubcategoryFormData);
  const [categoryInput, setCategoryInput] = useState("");
  const [subcategoryInput, setSubcategoryInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  // --- State: Pizza Specific ---
  const [selectedPizzaSizes, setSelectedPizzaSizes] = useState<string[]>([]);
  const [selectedPizzaFlavors, setSelectedPizzaFlavors] = useState<string[]>([]);
  const [selectedPizzaBorders, setSelectedPizzaBorders] = useState<string[]>([]);
  const [selectedDoughTypes, setSelectedDoughTypes] = useState<string[]>([]);
  const [pizzaPriceModel, setPizzaPriceModel] = useState<"highest" | "average" | "proportional">("highest");
  const [selectedBorderTypeId, setSelectedBorderTypeId] = useState<string>("none");

  // --- Data Fetching ---
  const { products, isLoading: pLoading, deleteProduct, createProduct, updateProduct, refetch: refetchProd } = useProducts();
  const { categories = [], isLoading: cLoading, createCategory, updateCategory, deleteCategory, refetch: refetchCat } = useCategories();
  const { subcategories = [], isLoading: sLoading, createSubcategory, updateSubcategory, deleteSubcategory, refetch: refetchSub } = useSubcategories();
  const { groups = [], isLoading: loadingGroups } = useOptionsGroups();
  const { sizes = [], isLoading: loadingSizes } = useSizes();
  const { flavors = [], isLoading: loadingFlavors } = useFlavors();
  const { doughTypes = [] } = useDoughTypes();
  const { borderTypes = [] } = useBorderTypes();
  const batchDirectLinkOptionals = useBatchDirectLinkOptionGroups();

  const isLoading = pLoading || cLoading || sLoading;

  // --- Logic: Color Management ---
  const generateRandomColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 20) + 60;
    const l = Math.floor(Math.random() * 15) + 45;
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  // --- Logic: Filtering & Sorting ---
  const processedProducts = useMemo(() => {
    return products
      .map((product: any) => {
        const pCatId =
          product.category_id ||
          product.categoryId ||
          product.category?.id ||
          subcategories.find(
            (s) => s.id === (product.subcategory_id || product.subcategoryId)
          )?.category_id;

        const categoryObj = categories.find((c) => c.id === pCatId);

        return {
          ...product,
          category: categoryObj,
          category_id: pCatId,
        };
      })
      .filter((product: any) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const matchesCategory =
          !selectedCategory || product.category_id === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a: any, b: any) => {
        let valA: any = a[sortField] || "";
        let valB: any = b[sortField] || "";

        if (sortField === "category") {
          valA = a.category?.name || "";
          valB = b.category?.name || "";
        } else if (sortField === "price") {
          valA = parseFloat(a.prices?.[0]?.price || a.price || "0");
          valB = parseFloat(b.prices?.[0]?.price || b.price || "0");

          if (sortOrder === "asc") return valA - valB;
          return valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (sortOrder === "asc") return strA.localeCompare(strB, "pt-BR");
        return strB.localeCompare(strA, "pt-BR");
      });
  }, [products, searchTerm, selectedCategory, subcategories, categories, sortField, sortOrder]);

  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);

  // --- Handlers: Categoria ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSave = { ...categoryFormData };

      if (!editingId) {
        dataToSave.color = generateRandomColor();
      }

      suppressNextAlert();
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, ...dataToSave });
        alert.success("Categoria atualizada com sucesso.");
      } else {
        await createCategory.mutateAsync(dataToSave);
        alert.success("Categoria criada com sucesso.");
      }

      setIsCategoryModalOpen(false);
    } catch (err: any) {
      alert.error(
        extractServerMessage(
          err,
          editingId
            ? "Não foi possível atualizar a categoria. Tente novamente."
            : "Não foi possível criar a categoria. Verifique os dados e tente novamente."
        ),
        { module: "Cardápio", route: "/menu/products" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Templates ---
  const handleApplyTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setIsSubmitting(true);
    setActiveTemplate(templateId);

    try {
      for (const cat of template.categories) {
        const assignedColor = generateRandomColor();

        suppressNextAlert();
        const newCatRes = await createCategory.mutateAsync({
          name: cat.name,
          active: true,
          color: assignedColor,
        });
        const catId = (newCatRes as any).id || (newCatRes as any).data?.id;

        for (const sub of cat.subcategories) {
          suppressNextAlert();
          const newSubRes = await createSubcategory.mutateAsync({
            name: sub.name,
            category_id: catId,
            active: true,
          });
          const subId = (newSubRes as any).id || (newSubRes as any).data?.id;

          for (const prod of sub.products) {
            suppressNextAlert();
            await createProduct.mutateAsync({
              name: prod.name,
              category_id: catId,
              subcategory_id: subId,
              description: prod.description || "",
              type: prod.type || "simple",
              active: true,
              prices: [{ label: "Padrão", price: prod.price, order: 0 }],
            });
          }
        }
      }

      alert.success(
        `Template "${template.title || templateId}" aplicado com sucesso. Categorias e produtos foram criados.`
      );
      refetchCat();
      refetchSub();
      refetchProd();
    } catch (err: any) {
      alert.error(
        extractServerMessage(
          err,
          `Falha ao aplicar o template "${template.title || templateId}". Alguns itens podem não ter sido criados.`
        ),
        { module: "Cardápio", route: "/menu/products" }
      );
    } finally {
      setIsSubmitting(false);
      setActiveTemplate(null);
    }
  };

  // --- Handlers: Produto ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isUuid = (val: any) =>
        typeof val === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      // 1. Resolve Category (Mandatory)
      let resolvedCatId: string | null = null;
      const catName = categoryInput.trim();

      const existingCat = categories.find(
        (c) =>
          c.id === productFormData.category_id ||
          c.name.toLowerCase() === catName.toLowerCase()
      );

      if (existingCat) {
        resolvedCatId = existingCat.id;
      } else if (catName) {
        suppressNextAlert();
        const newCatRes = await createCategory.mutateAsync({
          name: catName,
          active: true,
          color: generateRandomColor(),
        });
        resolvedCatId = (newCatRes as any).id || (newCatRes as any).data?.id;
      }

      if (!resolvedCatId) {
        alert.warning(
          "Informe uma categoria antes de salvar o produto.",
          { module: "Cardápio" }
        );
        setIsSubmitting(false);
        return;
      }

      // 2. Resolve Subcategory (Optional)
      let resolvedSubcatId: string | null = null;
      const subName = subcategoryInput.trim();

      if (subName) {
        const existingSub = subcategories.find(
          (s) =>
            (s.id === productFormData.subcategory_id ||
              s.name.toLowerCase() === subName.toLowerCase()) &&
            s.category_id === resolvedCatId
        );

        if (existingSub) {
          resolvedSubcatId = existingSub.id;
        } else {
          suppressNextAlert();
          const newSubRes = await createSubcategory.mutateAsync({
            name: subName,
            category_id: resolvedCatId,
            active: true,
          });
          resolvedSubcatId = (newSubRes as any).id || (newSubRes as any).data?.id;
        }
      }

      // 3. Construção do payload
      const parseCurrency = (val: string | number) => {
        if (!val) return 0;
        const str = val.toString();
        if (str.includes(",")) {
          return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
        }
        return parseFloat(str) || 0;
      };

      let finalPrice = parseCurrency(productFormData.price);

      if (finalPrice === 0) {
        const cost = parseCurrency(productFormData.cost_price);
        const margin = parseFloat(productFormData.profit_margin?.toString() || "0");
        if (cost > 0 && margin > 0) {
          finalPrice = cost + (cost * margin) / 100;
        }
      }

      // ── Validação: preço obrigatório ─────────────────────────────
      if (finalPrice === 0) {
        alert.warning(
          "Informe o preço de venda ou preencha o custo + margem de lucro para calcular o preço automaticamente.",
          { module: "Cardápio" }
        );
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...productFormData,
        display_name: productFormData.display_name || productFormData.name,
        production_location: productFormData.production_location || "cozinha",
        category_id: resolvedCatId,
        subcategory_id: resolvedSubcatId || null,
        price: finalPrice,
        cost_price: productFormData.cost_price
          ? parseCurrency(productFormData.cost_price)
          : null,
        sale_price: productFormData.sale_price
          ? parseCurrency(productFormData.sale_price)
          : null,
        wholesale_price: productFormData.wholesale_price
          ? parseCurrency(productFormData.wholesale_price)
          : null,
        wholesale_min_qty: productFormData.wholesale_min_qty
          ? Number(productFormData.wholesale_min_qty)
          : null,
        profit_margin: productFormData.profit_margin
          ? Number(productFormData.profit_margin.toString().replace(",", "."))
          : null,
        loyalty_points: Number(productFormData.loyalty_points || 0),
        prices: [{ label: "Padrão", price: finalPrice.toString(), order: 0 }],
      };

      delete (payload as any).category;
      delete (payload as any).subcategory;
      delete (payload as any).optionsGroups;
      delete (payload as any).option_group_ids;

      // 4. Salvar o produto
      suppressNextAlert();
      let savedProduct: any;
      if (editingId) {
        savedProduct = await updateProduct.mutateAsync({ id: editingId, ...payload });
      } else {
        savedProduct = await createProduct.mutateAsync(payload);
      }

      // 5. Vínculo de opcionais
      const finalId = editingId || savedProduct?.id || savedProduct?.data?.id;
      if (finalId && productFormData.option_group_ids?.length > 0) {
        suppressNextAlert();
        await batchDirectLinkOptionals.mutateAsync({
          productIds: [finalId],
          groupLinks: productFormData.option_group_ids.map((gid) => ({
            groupId: gid,
            minSelect: 0,
            maxSelect: 99,
            sortOrder: 0,
            calcMode: "sum",
          })),
        });
      }

      alert.success(
        editingId
          ? `Produto "${productFormData.name}" atualizado com sucesso.`
          : `Produto "${productFormData.name}" criado com sucesso.`
      );

      setIsProductModalOpen(false);
      setEditingId(null);
      setProductFormData(initialProductFormData);

      refetchCat();
      refetchSub();
      refetchProd();
    } catch (err: any) {
      alert.error(
        extractServerMessage(
          err,
          editingId
            ? `Não foi possível atualizar o produto "${productFormData.name}". Verifique os dados e tente novamente.`
            : `Não foi possível criar o produto "${productFormData.name}". Verifique os dados e tente novamente.`
        ),
        { module: "Cardápio", route: "/menu/products" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Delete ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const label = DELETE_LABELS[deleteTarget.type] ?? deleteTarget.type;
    const name = deleteTarget.name ? `"${deleteTarget.name}"` : "";

    try {
      suppressNextAlert();
      if (deleteTarget.type === "product") {
        await deleteProduct.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "category") {
        await deleteCategory.mutateAsync(deleteTarget.id);
      } else {
        await deleteSubcategory.mutateAsync(deleteTarget.id);
      }

      alert.success(`${label.charAt(0).toUpperCase() + label.slice(1)} ${name} excluída com sucesso.`);
    } catch (err: any) {
      // Caso específico: categoria com produtos vinculados (409 Conflict)
      const status = (err as any)?.response?.status;
      const isConflict = status === 409;

      alert.error(
        isConflict
          ? `Não é possível excluir a ${label} ${name} pois ela possui itens vinculados. Remova os itens primeiro.`
          : extractServerMessage(err, `Não foi possível excluir a ${label} ${name}. Tente novamente.`),
        { module: "Cardápio", route: "/menu/products" }
      );
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // --- Handlers: Edit Product ---
  const handleEditProduct = (p: any) => {
    setEditingId(p.id);

    const formatToBRL = (val: any) => {
      if (val === null || val === undefined || val === "") return "";
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) return "";
      return num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const subId = p.subcategory_id || p.subcategoryId || p.subcategory?.id || null;
    let catId = p.category_id || p.categoryId || p.category?.id || null;

    if (!catId && subId) {
      const parentSub = subcategories.find((s) => s.id === subId);
      catId = parentSub?.category_id || null;
    }

    const catObj = categories.find((c) => c.id === catId);
    const subObj = subcategories.find((s) => s.id === subId);

    setCategoryInput(catObj?.name || "");
    setSubcategoryInput(subObj?.name || "");

    setProductFormData({
      ...initialProductFormData,
      ...p,
      category_id: catId,
      subcategory_id: subId,
      description: p.description ?? "",
      sku: p.sku || "",
      image_url: p.image_url || null,
      price: formatToBRL(p.prices?.[0]?.price || p.price || "0"),
      cost_price: formatToBRL(p.cost_price),
      profit_margin: p.profit_margin || "",
      sale_price: formatToBRL(p.sale_price),
      wholesale_price: formatToBRL(p.wholesale_price),
      wholesale_min_qty: p.wholesale_min_qty || "",
      option_group_ids:
        p.optionsGroups
          ?.map((og: any) => og.group?.id || og.groupId)
          .filter(Boolean) || [],
    });

    if (p.type === "pizza") {
      setSelectedPizzaSizes(p.sizes?.map((s: any) => s.id) || []);
      setSelectedPizzaFlavors(p.flavors?.map((f: any) => f.id) || []);
    }

    setIsProductModalOpen(true);
  };

  return (
    <DashboardLayout title="Produtos">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter">
                Gestão de Produtos
              </h2>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                {isLoading ? "Sincronizando..." : `${products.length} produtos`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-11 px-4 font-bold rounded-xl text-xs uppercase bg-primary"
              onClick={() => {
                setEditingId(null);
                setProductFormData(initialProductFormData);
                setCategoryInput("");
                setSubcategoryInput("");
                setIsProductModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </Button>
            <Button
              variant="outline"
              className="h-11 px-4 font-bold rounded-xl text-xs uppercase"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <Tag className="h-4 w-4 mr-2" /> Nova Categoria
            </Button>
            <Button
              variant="outline"
              className="h-11 px-4 font-bold rounded-xl text-xs uppercase"
              onClick={() => setIsSubcategoryModalOpen(true)}
            >
              <Tag className="h-4 w-4 mr-2" /> Nova Subcategoria
            </Button>
            <Button
              variant="outline"
              className="h-11 px-4 font-bold rounded-xl text-xs uppercase"
              onClick={() => setIsImportExportModalOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2 text-primary" /> Importar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 px-4 font-bold rounded-xl text-xs uppercase">
                  <Settings2 className="h-4 w-4 mr-2" /> Config
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-[10px] uppercase">Opções</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate("/products/flavors")}>
                  <UtensilsCrossed className="mr-2 h-4 w-4" /> Sabores
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/products/optional-groups")}>
                  <Layers className="mr-2 h-4 w-4" /> Grupos Opcionais
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ProductFilters
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortField={sortField}
          setSortField={setSortField}
        />

        <Card className="bg-card overflow-hidden rounded-3xl border-[hsla(270,100%,65%,0.22)] shadow-xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest">Carregando...</p>
              </div>
            ) : viewMode === "products" ? (
              <ProductTable
                products={paginatedProducts}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={(f) => {
                  if (sortField === f) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else setSortField(f);
                }}
                onEdit={handleEditProduct}
                onView={(p) => { setSelectedProductForView(p); setIsInfoModalOpen(true); }}
                onDelete={(id, name) => { setDeleteTarget({ type: "product", id, name }); setDeleteDialogOpen(true); }}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onApplyTemplate={handleApplyTemplate}
                isSubmitting={isSubmitting}
                activeTemplate={activeTemplate}
              />
            ) : (
              <CategoryList
                categories={categories}
                subcategories={subcategories}
                products={processedProducts}
                onEditCategory={(c: any) => {
                  setEditingId(c.id);
                  setCategoryFormData({
                    name: c.name,
                    active: c.active,
                    image_url: c.image_url || null,
                    color: c.color || "#8b5cf6",
                  });
                  setIsCategoryModalOpen(true);
                }}
                onDeleteCategory={(id, name) => { setDeleteTarget({ type: "category", id, name }); setDeleteDialogOpen(true); }}
                onUpdateCategory={(id, data) => updateCategory.mutateAsync({ id, ...data })}
                onEditSubcategory={(s: any) => {
                  setEditingId(s.id);
                  setSubcategoryFormData({ name: s.name, category_id: s.category_id, active: s.active });
                  setIsSubcategoryModalOpen(true);
                }}
                onDeleteSubcategory={(id, name) => { setDeleteTarget({ type: "subcategory", id, name }); setDeleteDialogOpen(true); }}
                onUpdateSubcategory={(id, data) => updateSubcategory.mutateAsync({ id, ...data })}
                onEditProduct={handleEditProduct}
                onView={(p) => { setSelectedProductForView(p); setIsInfoModalOpen(true); }}
                onDeleteProduct={(id, name) => { setDeleteTarget({ type: "product", id, name }); setDeleteDialogOpen(true); }}
                onUpdateProduct={(id, data) => updateProduct.mutateAsync({ id, ...data })}
                onApplyTemplate={handleApplyTemplate}
                isSubmitting={isSubmitting}
                activeTemplate={activeTemplate}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ProductFormModal
        isOpen={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        editingId={editingId}
        formData={productFormData}
        setFormData={setProductFormData}
        categories={categories}
        subcategories={subcategories}
        categoryInput={categoryInput}
        setCategoryInput={setCategoryInput}
        subcategoryInput={subcategoryInput}
        setSubcategoryInput={setSubcategoryInput}
        isSubmitting={isSubmitting}
        onSubmit={handleSaveProduct}
        optionGroups={groups}
        loadingOptionGroups={loadingGroups}
        onToggleOptionGroup={(id) =>
          setProductFormData((prev) => ({
            ...prev,
            option_group_ids: prev.option_group_ids.includes(id)
              ? prev.option_group_ids.filter((x) => x !== id)
              : [...prev.option_group_ids, id],
          }))
        }
        pizzaProps={{
          sizes, loadingSizes, selectedPizzaSizes, setSelectedPizzaSizes,
          allFlavors: flavors, loadingFlavors, selectedPizzaFlavors, setSelectedPizzaFlavors,
          pizzaPriceModel, setPizzaPriceModel, borderTypes, selectedBorderTypeId, setSelectedBorderTypeId,
          selectedPizzaBorders, setSelectedPizzaBorders, doughTypes, selectedDoughTypes, setSelectedDoughTypes,
        }}
      />

      <InfoProdutosModal
        isOpen={isInfoModalOpen}
        onOpenChange={setIsInfoModalOpen}
        product={selectedProductForView}
        categories={categories}
        subcategories={subcategories}
      />

      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        editingId={editingId}
        formData={categoryFormData}
        setFormData={setCategoryFormData}
        isSubmitting={isSubmitting}
        onSubmit={handleSaveCategory}
      />

      <SubcategoryFormModal
        isOpen={isSubcategoryModalOpen}
        onOpenChange={setIsSubcategoryModalOpen}
        editingId={editingId}
        formData={subcategoryFormData}
        setFormData={setSubcategoryFormData}
        categories={categories}
        isSubmitting={isSubmitting}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmitting(true);
          try {
            suppressNextAlert();
            if (editingId) {
              await updateSubcategory.mutateAsync({ id: editingId, ...subcategoryFormData });
              alert.success(`Subcategoria "${subcategoryFormData.name}" atualizada com sucesso.`);
            } else {
              await createSubcategory.mutateAsync(subcategoryFormData);
              alert.success(`Subcategoria "${subcategoryFormData.name}" criada com sucesso.`);
            }
            setIsSubcategoryModalOpen(false);
          } catch (err: any) {
            alert.error(
              extractServerMessage(
                err,
                editingId
                  ? `Não foi possível atualizar a subcategoria "${subcategoryFormData.name}".`
                  : `Não foi possível criar a subcategoria "${subcategoryFormData.name}".`
              ),
              { module: "Cardápio", route: "/menu/products" }
            );
          } finally {
            setIsSubmitting(false);
          }
        }}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onOpenChange={setIsImportExportModalOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {deleteTarget?.type}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}