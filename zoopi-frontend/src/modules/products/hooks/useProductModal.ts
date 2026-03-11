import { useState } from "react";
import { 
  initialProductFormData, 
  initialCategoryFormData, 
  initialSubcategoryFormData 
} from "../constants/templates";
import { Product, Category, Subcategory, ProductFormData } from "../types";

export function useProductModals() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ 
    type: 'product' | 'category' | 'subcategory'; 
    id: string; 
    name?: string 
  } | null>(null);

  const [productFormData, setProductFormData] = useState(initialProductFormData);
  const [categoryFormData, setCategoryFormData] = useState(initialCategoryFormData);
  const [subcategoryFormData, setSubcategoryFormData] = useState(initialSubcategoryFormData);

  const [categoryInput, setCategoryInput] = useState("");
  const [subcategoryInput, setSubcategoryInput] = useState("");

  const openEditProduct = (product: Product, categories: Category[]) => {
    setEditingId(product.id);

    // 1. Resolve Category ID from all possible backend locations
    // NestJS might return it as category_id, categoryId, or inside product.category.id
    const resolvedCategoryId = 
      (product as any).category_id || 
      (product as any).categoryId || 
      (product as any).category?.id || 
      (product as any).subcategory?.category_id || 
      "";
    
    const currentCategory = categories.find((cat) => cat.id === resolvedCategoryId);
    
    // 2. Map form data explicitly to avoid sending nested objects back to the API
    // and to convert nulls (from NestJS) to empty strings (for HTML Inputs)
    setProductFormData({
      ...initialProductFormData,
      name: product.name,
      display_name: (product as any).display_name || product.name,
      description: product.description ?? "", // Convert null to ""
      sku: product.sku ?? "",                  // Convert null to ""
      type: product.type,
      active: product.active,
      category_id: resolvedCategoryId,
      subcategory_id: product.subcategory_id || (product as any).subcategoryId || "",
      price: product.prices?.[0]?.price?.toString() || "",
      option_group_ids: product.optionsGroups?.map((og: any) => og.group.id) || [],
      image_url: product.image_url ?? null,
      
      // Keep other fields if they exist, or use defaults
      loyalty_points: (product as any).loyalty_points || 0,
      featured: (product as any).featured || false,
      commission: (product as any).commission ?? true,
    });
    
    setCategoryInput(currentCategory?.name || "");
    setSubcategoryInput(product.subcategory?.name || "");
    setIsProductModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingId(category.id);
    setCategoryFormData({
      name: category.name,
      active: category.active,
      image_url: category.image_url || null
    });
    setIsCategoryModalOpen(true);
  };

  const openEditSubcategory = (subcategory: Subcategory) => {
    setEditingId(subcategory.id);
    setSubcategoryFormData({
      name: subcategory.name,
      category_id: subcategory.category_id,
      active: subcategory.active
    });
    setIsSubcategoryModalOpen(true);
  };

  const resetProductForm = () => {
    setEditingId(null);
    setProductFormData(initialProductFormData);
    setCategoryInput("");
    setSubcategoryInput("");
  };

  return {
    isProductModalOpen, setIsProductModalOpen,
    isCategoryModalOpen, setIsCategoryModalOpen,
    isSubcategoryModalOpen, setIsSubcategoryModalOpen,
    isImportExportModalOpen, setIsImportExportModalOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    editingId, setEditingId,
    deleteTarget, setDeleteTarget,
    productFormData, setProductFormData,
    categoryFormData, setCategoryFormData,
    subcategoryFormData, setSubcategoryFormData,
    categoryInput, setCategoryInput,
    subcategoryInput, setSubcategoryInput,
    openEditProduct,
    openEditCategory,
    openEditSubcategory,
    resetProductForm
  };
}