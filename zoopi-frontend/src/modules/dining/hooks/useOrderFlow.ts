/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { diningApi } from "../api/dining.api";
import { toast } from "sonner";

export interface OrderCartItem {
  id: string; // ID temporário apenas para controle no front-end
  product_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  notes?: string;
}

export function useOrderFlow(billId?: string) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<OrderCartItem[]>([]);

  // 1. Adicionar ao Carrinho Local
  const addToCart = (item: Omit<OrderCartItem, 'id'>) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    setCart((prev) => {
      // Agrupa itens iguais se não tiverem observações diferentes
      const existing = prev.find(i => i.product_id === item.product_id && i.notes === item.notes);
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, { ...item, id: tempId }];
    });
  };

  // 2. Atualizar Quantidade
  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: Math.max(1, newQty) }; // Impede qtd < 1
      }
      return item;
    }));
  };

  // 3. Remover do Carrinho
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // 4. Totais
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.quantity * item.unit_price_cents), 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // 5. Enviar para a API / Cozinha
  const submitOrder = useMutation({
    mutationFn: async () => {
      if (!billId) throw new Error("Nenhuma conta selecionada.");
      if (cart.length === 0) throw new Error("Carrinho vazio.");

      // Dispara todos os itens para a API (O ideal seria um endpoint em lote /bulk-items, 
      // mas aqui fazemos Promise.all reaproveitando sua rota atual)
      const promises = cart.map(item => 
        diningApi.addItem(billId, {
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          total_price_cents: item.unit_price_cents * item.quantity,
          notes: item.notes,
          status: 'ordered' // O status inicial vai para a fila do KDS
        })
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Pedido enviado para a cozinha!");
      clearCart();
      // Atualiza os dados da conta aberta e do mapa de mesas
      queryClient.invalidateQueries({ queryKey:["bill-details", billId] });
      queryClient.invalidateQueries({ queryKey: ["dining-tables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao enviar pedido. Verifique a conexão.");
    }
  });

  return {
    cart,
    cartTotal,
    cartItemsCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    submitOrder: submitOrder.mutate,
    isSubmitting: submitOrder.isPending
  };
}