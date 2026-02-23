import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Comanda, useComandas, useComandaMutations } from './useComandas';
import { ComandaItem, useComandaItemMutations } from './useComandaItems';

export interface CartItem {
  id: string;
  productId: string | null;
  name: string;
  qty: number;
  unitPrice: number;
  notes?: string;
  optionsJson?: any;
  // Se veio de comanda existente
  fromComanda?: boolean;
  comandaItemId?: string;
  // Desconto individual no item
  discountCents?: number;
  discountPercent?: number;
}

export interface SaleAdjustments {
  discountCents: number;
  discountPercent: number;
  additionCents: number;
  serviceFeeEnabled: boolean;
  serviceFeePercent: number;
}

export interface PDVPayment {
  method: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'multiplo';
  amount: number;
  change?: number;
}

export type PDVMode = 'standalone' | 'with_comanda';

export function usePDVLoja() {
  const { company } = useCompanyContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estado do carrinho
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [linkedComanda, setLinkedComanda] = useState<Comanda | null>(null);
  const [mode, setMode] = useState<PDVMode>('standalone');
  const [payments, setPayments] = useState<PDVPayment[]>([]);
  
  // Ajustes de venda (desconto, acréscimo, taxa de serviço)
  const [adjustments, setAdjustments] = useState<SaleAdjustments>({
    discountCents: 0,
    discountPercent: 0,
    additionCents: 0,
    serviceFeeEnabled: false,
    serviceFeePercent: 10,
  });

  // Hooks de comanda
  const { comandas } = useComandas(['open', 'no_activity', 'requested_bill']);
  const { addItem: addComandaItem, cancelItem: cancelComandaItem } = useComandaItemMutations();
  const { createComanda, closeComanda, mergeComandas } = useComandaMutations();

  // Comandas abertas para seleção
  const openComandas = useMemo(() => {
    return comandas.filter(c => c.status !== 'closed');
  }, [comandas]);

  // Total bruto do carrinho (sem descontos de item)
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  }, [cartItems]);

  // Total de descontos por item
  const itemDiscountsTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.discountCents || 0), 0);
  }, [cartItems]);

  // Taxa de serviço
  const serviceFeeValue = useMemo(() => {
    if (!adjustments.serviceFeeEnabled) return 0;
    return Math.round(((cartSubtotal - itemDiscountsTotal) * adjustments.serviceFeePercent) / 100);
  }, [cartSubtotal, itemDiscountsTotal, adjustments.serviceFeeEnabled, adjustments.serviceFeePercent]);

  // Total do carrinho (com todos os ajustes)
  const cartTotal = useMemo(() => {
    const subtotalAfterItemDiscounts = cartSubtotal - itemDiscountsTotal;
    return subtotalAfterItemDiscounts - adjustments.discountCents + adjustments.additionCents + serviceFeeValue;
  }, [cartSubtotal, itemDiscountsTotal, adjustments, serviceFeeValue]);

  // Total já pago
  const paidTotal = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Saldo restante
  const remainingBalance = useMemo(() => {
    return Math.max(0, cartTotal - paidTotal);
  }, [cartTotal, paidTotal]);

  // Adicionar item ao carrinho
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Verificar se já existe item igual (mesmo produto, mesmas opções)
    const existingIndex = cartItems.findIndex(
      ci => ci.productId === item.productId && 
            JSON.stringify(ci.optionsJson) === JSON.stringify(item.optionsJson) &&
            ci.notes === item.notes &&
            !ci.fromComanda
    );

    if (existingIndex >= 0) {
      // Incrementar quantidade
      setCartItems(prev => prev.map((ci, i) => 
        i === existingIndex ? { ...ci, qty: ci.qty + item.qty } : ci
      ));
    } else {
      setCartItems(prev => [...prev, { ...item, id }]);
    }
  }, [cartItems]);

  // Remover item do carrinho
  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  // Atualizar quantidade
  const updateCartItemQty = useCallback((itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, qty: newQty } : i
    ));
  }, [removeFromCart]);

  // Vincular comanda existente
  const linkComanda = useCallback((comanda: Comanda, items: ComandaItem[]) => {
    setLinkedComanda(comanda);
    setMode('with_comanda');

    // Carregar itens da comanda no carrinho
    const comandaCartItems: CartItem[] = items
      .filter(item => !item.canceled_at)
      .map(item => ({
        id: `comanda-${item.id}`,
        productId: item.product_id,
        name: item.product_name_snapshot,
        qty: Number(item.qty),
        unitPrice: Number(item.unit_price_snapshot),
        notes: item.notes || undefined,
        optionsJson: item.options_json,
        fromComanda: true,
        comandaItemId: item.id,
      }));

    // Mesclar com itens já no carrinho (novos)
    setCartItems(prev => {
      const newItems = prev.filter(i => !i.fromComanda);
      return [...comandaCartItems, ...newItems];
    });
  }, []);

  // Desvincular comanda
  const unlinkComanda = useCallback(() => {
    setLinkedComanda(null);
    setMode('standalone');
    // Remover itens que vieram da comanda
    setCartItems(prev => prev.filter(i => !i.fromComanda));
  }, []);

  // Limpar carrinho
  const clearCart = useCallback(() => {
    setCartItems([]);
    setPayments([]);
    setLinkedComanda(null);
    setMode('standalone');
    setAdjustments({
      discountCents: 0,
      discountPercent: 0,
      additionCents: 0,
      serviceFeeEnabled: false,
      serviceFeePercent: 10,
    });
  }, []);

  // Adicionar pagamento
  const addPayment = useCallback((payment: PDVPayment) => {
    setPayments(prev => [...prev, payment]);
  }, []);

  // Remover pagamento
  const removePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Atualizar ajustes de desconto/acréscimo
  const updateAdjustments = useCallback((updates: Partial<SaleAdjustments>) => {
    setAdjustments(prev => ({ ...prev, ...updates }));
  }, []);

  // Desconto individual em item
  const updateItemDiscount = useCallback((itemId: string, discountCents: number, discountPercent: number) => {
    setCartItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, discountCents, discountPercent } : item
    ));
  }, []);

  // Finalizar venda - Mutation
  const finalizeSale = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      if (cartItems.length === 0) throw new Error('Carrinho vazio');
      if (remainingBalance > 0.01) throw new Error('Pagamento incompleto');

      let comandaId = linkedComanda?.id;

      // Se não tem comanda vinculada, criar uma nova e já fechar
      if (!comandaId) {
        const newComanda = await createComanda.mutateAsync({
          name: 'PDV Loja',
          applyServiceFee: false,
        });
        comandaId = newComanda.id;
      }

      // Adicionar novos itens à comanda (os que não vieram dela)
      const newItems = cartItems.filter(i => !i.fromComanda);
      
      for (const item of newItems) {
        await addComandaItem.mutateAsync({
          comandaId,
          productId: item.productId,
          productName: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          notes: item.notes,
          optionsJson: item.optionsJson,
        });
      }

      // Registrar pagamentos na comanda
      for (const payment of payments) {
        await supabase.from('comanda_payments').insert({
          company_id: company.id,
          comanda_id: comandaId,
          payment_method: payment.method,
          amount: payment.amount,
          paid_by_user_id: user?.id || null,
        });
      }

      // Fechar comanda
      await closeComanda.mutateAsync({ comandaId });

      return { comandaId, total: cartTotal };
    },
    onSuccess: (data) => {
      toast.success(`Venda finalizada! Total: R$ ${data.total.toFixed(2)}`);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao finalizar venda: ' + error.message);
    },
  });

  // Cancelar venda
  const cancelSale = useCallback(() => {
    if (linkedComanda) {
      // Se tinha comanda, apenas desvincula (não fecha)
      unlinkComanda();
    }
    clearCart();
    toast.info('Venda cancelada');
  }, [linkedComanda, unlinkComanda, clearCart]);

  // Excluir item da comanda (com log)
  const deleteComandaItem = useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      await cancelComandaItem.mutateAsync({ itemId, reason });
      // Remover do carrinho local
      setCartItems(prev => prev.filter(i => i.comandaItemId !== itemId));
    },
    onSuccess: () => {
      toast.success('Item excluído da comanda');
    },
  });

  // Juntar comandas
  const mergeComandasMutation = useMutation({
    mutationFn: async ({ sourceIds, targetId }: { sourceIds: string[]; targetId: string }) => {
      for (const sourceId of sourceIds) {
        if (sourceId !== targetId) {
          await mergeComandas.mutateAsync({ sourceId, targetId });
        }
      }
      return targetId;
    },
    onSuccess: () => {
      toast.success('Comandas unificadas!');
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
  });

  return {
    // Estado
    cartItems,
    linkedComanda,
    mode,
    payments,
    openComandas,
    adjustments,
    
    // Cálculos
    cartSubtotal,
    cartTotal,
    paidTotal,
    remainingBalance,
    serviceFeeValue,
    itemDiscountsTotal,
    
    // Ações carrinho
    addToCart,
    removeFromCart,
    updateCartItemQty,
    clearCart,
    updateItemDiscount,
    
    // Ações comanda
    linkComanda,
    unlinkComanda,
    
    // Pagamentos e ajustes
    addPayment,
    removePayment,
    updateAdjustments,
    
    // Finalização
    finalizeSale,
    cancelSale,
    deleteComandaItem,
    mergeComandasMutation,
  };
}
