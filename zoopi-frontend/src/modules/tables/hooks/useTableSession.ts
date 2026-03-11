// ================================================================
// FILE: modules/tables/hooks/useTableSession.ts
// ================================================================

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableSessionApi, SubmitPaymentPayload } from "../api";
import { CartItem, Product, ProductOption } from "../types";

export function useTableSession(tableId: string) {
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["tableSession", tableId] });
    qc.invalidateQueries({ queryKey: ["tables"] });
  }, [qc, tableId]);

  // ── Queries ───────────────────────────────────────────────────
  const sessionQuery = useQuery({
    queryKey: ["tableSession", tableId],
    queryFn:  () => tableSessionApi.getSession(tableId),
    enabled:  !!tableId,
    refetchInterval: 10000,
  });

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn:  tableSessionApi.getProducts,
    staleTime: 60000,
  });

  // ── Cart ──────────────────────────────────────────────────────
  const generateCartItemId = useCallback(
    (productId: string, options: ProductOption[] = []) => {
      const optionsHash = options.map((o) => o.id).sort().join("-");
      return optionsHash ? `${productId}-${optionsHash}` : productId;
    },
    []
  );

  const cartActions = useMemo(
    () => ({
      addItem: (product: Product, options: ProductOption[] = []) => {
        setCart((prev) => {
          const cartItemId = generateCartItemId(product.id, options);
          const existing   = prev.find((item) => item.cartItemId === cartItemId);
          if (existing) {
            return prev.map((item) =>
              item.cartItemId === cartItemId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }
          const optionsTotal = options.reduce(
            (sum, opt) => sum + Number(opt.price || 0),
            0
          );
          return [
            ...prev,
            {
              cartItemId,
              productId: product.id,
              name:      product.name,
              unitPrice: Number(product.price || 0) + optionsTotal,
              quantity:  1,
              options,
            },
          ];
        });
      },
      updateQuantity: (cartItemId: string, quantity: number) => {
        setCart((prev) =>
          prev
            .map((item) =>
              item.cartItemId === cartItemId ? { ...item, quantity } : item
            )
            .filter((i) => i.quantity > 0)
        );
      },
      clearCart: () => setCart([]),
      cartTotal: cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [cart, generateCartItemId]
  );

  // ── Mutations ─────────────────────────────────────────────────
  const createCommandMutation = useMutation({
    mutationFn: (name: string) => tableSessionApi.createCommand(tableId, name),
    onSuccess: invalidate,
  });

  const launchOrderMutation = useMutation({
    mutationFn: (payload: {
      commandId: string;
      items: { productId: string; quantity: number; note?: string }[];
    }) => tableSessionApi.launchOrder(tableId, payload),
    onSuccess: invalidate,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: (payload: SubmitPaymentPayload) =>
      tableSessionApi.submitPayment(tableId, payload),
    // Refetch session so paidTotal / remaining update immediately
    onSuccess: invalidate,
  });

  const closeTableMutation = useMutation({
    mutationFn: () => tableSessionApi.closeTable(tableId),
    onSuccess: invalidate,
  });

  const printBillMutation = useMutation({
    mutationFn: () => tableSessionApi.printBill(tableId),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => tableSessionApi.deleteItem(tableId, itemId),
    onSuccess: invalidate,
  });

  const closeCommandMutation = useMutation({
    mutationFn: (id: string) => tableSessionApi.closeCommand(tableId, id),
    onSuccess: invalidate,
  });

  const transferItemsMutation = useMutation({
    mutationFn: (p: {
      itemIds: string[];
      targetTableId: string;
      targetCommandId?: string;
      newCommandName?: string;
    }) => tableSessionApi.transferItems(tableId, p),
    onSuccess: invalidate,
  });

  // ── Return ────────────────────────────────────────────────────
  return {
    session:          sessionQuery.data,
    isLoadingSession: sessionQuery.isLoading,
    products:         Array.isArray(productsQuery.data) ? productsQuery.data : [],
    isLoadingProducts: productsQuery.isLoading,

    cart,
    ...cartActions,

    createCommand:      createCommandMutation.mutate,
    createCommandAsync: createCommandMutation.mutateAsync,
    isCreatingCommand:  createCommandMutation.isPending,

    launchOrder:  launchOrderMutation.mutateAsync,
    isLaunching:  launchOrderMutation.isPending,

    submitPayment:      submitPaymentMutation.mutateAsync,
    isSubmittingPayment: submitPaymentMutation.isPending,

    closeCommand: closeCommandMutation.mutate,
    deleteItem:   deleteItemMutation.mutate,

    closeTable:      closeTableMutation.mutate,
    isClosingTable:  closeTableMutation.isPending,

    printBill:  printBillMutation.mutateAsync,
    isPrinting: printBillMutation.isPending,

    transferItems:      transferItemsMutation.mutate,
    isTransferringItems: transferItemsMutation.isPending,

    transferTable: (target: string) =>
      tableSessionApi.transferTable(tableId, target).then(invalidate),
    mergeTables: (target: string) =>
      tableSessionApi.mergeTables(tableId, target).then(invalidate),
  };
}