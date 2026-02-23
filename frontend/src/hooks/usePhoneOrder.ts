import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { CustomerAddress } from './useCustomerAddresses';
import { createPrintJobsForOrder } from '@/utils/createPrintJobsForOrder';

export interface PhoneOrderCustomer {
  id?: string;
  name: string;
  whatsapp: string;
  alerts?: string;
  isNew?: boolean;
}

export interface PhoneOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  selected_options_json?: any;
}

export interface PhoneOrderData {
  customer: PhoneOrderCustomer;
  receipt_type: string;
  table_number?: string;
  delivery_address?: CustomerAddress;
  address_notes?: string; // Observação do endereço
  delivery_fee: number;
  items: PhoneOrderItem[];
  payment_method: string;
  change_for?: number;
  notes?: string;
  store_address?: string; // For pickup orders
  eat_here?: boolean; // Comer aqui (balcão)
}

export type PhoneOrderStep = 'customer' | 'receipt' | 'address' | 'products' | 'payment' | 'confirmation';

export function usePhoneOrder() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<PhoneOrderStep>('customer');
  const [orderData, setOrderData] = useState<Partial<PhoneOrderData>>({
    items: [],
    delivery_fee: 0,
    receipt_type: 'delivery',
    payment_method: 'money',
  });

  const updateOrderData = useCallback((updates: Partial<PhoneOrderData>) => {
    setOrderData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    const steps: PhoneOrderStep[] = ['customer', 'receipt', 'address', 'products', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    
    // Skip address step if not delivery
    if (step === 'receipt' && orderData.receipt_type !== 'delivery') {
      setStep('products');
      return;
    }
    
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [step, orderData.receipt_type]);

  const prevStep = useCallback(() => {
    const steps: PhoneOrderStep[] = ['customer', 'receipt', 'address', 'products', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    
    // Skip address step if not delivery
    if (step === 'products' && orderData.receipt_type !== 'delivery') {
      setStep('receipt');
      return;
    }
    
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [step, orderData.receipt_type]);

  const goToStep = useCallback((targetStep: PhoneOrderStep) => {
    setStep(targetStep);
  }, []);

  const addItem = useCallback((item: PhoneOrderItem) => {
    setOrderData(prev => {
      const existingIndex = prev.items?.findIndex(i => i.product_id === item.product_id && i.notes === item.notes);
      if (existingIndex !== undefined && existingIndex >= 0) {
        const newItems = [...(prev.items || [])];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + item.quantity,
        };
        return { ...prev, items: newItems };
      }
      return { ...prev, items: [...(prev.items || []), item] };
    });
  }, []);

  const updateItem = useCallback((index: number, updates: Partial<PhoneOrderItem>) => {
    setOrderData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], ...updates };
      return { ...prev, items: newItems };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setOrderData(prev => {
      const newItems = [...(prev.items || [])];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  }, []);

  const getSubtotal = useCallback(() => {
    return orderData.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  }, [orderData.items]);

  const getTotal = useCallback(() => {
    return getSubtotal() + (orderData.delivery_fee || 0);
  }, [getSubtotal, orderData.delivery_fee]);

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('No company');
      // Cliente é obrigatório apenas se não for balcão
      if (!orderData.customer && orderData.receipt_type !== 'counter') throw new Error('No customer');
      if (!orderData.items?.length) throw new Error('No items');

      // Create or get customer (skip if counter/balcão without customer data)
      let customerId: string | null = orderData.customer?.id || null;
      
      if (orderData.customer && (orderData.customer.isNew || !customerId)) {
        // Only create customer if we have at least name or whatsapp
        if (orderData.customer.name || orderData.customer.whatsapp) {
          const { data: newCustomer, error: customerError } = await (supabase as any)
            .from('customers')
            .upsert({
              company_id: profile.company_id,
              name: orderData.customer.name || 'Cliente Balcão',
              whatsapp: orderData.customer.whatsapp || '',
              alerts: orderData.customer.alerts,
            }, { onConflict: 'company_id,whatsapp' })
            .select()
            .single();
          
          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Prepare notes - include store address for pickup orders
      let orderNotes = orderData.notes || '';
      if (orderData.receipt_type === 'pickup' && orderData.store_address) {
        const pickupNote = `📍 RETIRADA NO LOCAL: ${orderData.store_address}`;
        orderNotes = orderNotes ? `${pickupNote}\n\n${orderNotes}` : pickupNote;
      }

      // Create order - Auto-accept: go directly to "preparo"
      const acceptedAt = new Date().toISOString();
      
      // Determine order_type properly
      let orderTypeValue = 'local';
      if (orderData.receipt_type === 'delivery') {
        orderTypeValue = 'delivery';
      } else if (orderData.receipt_type === 'counter') {
        orderTypeValue = 'counter';
      }
      
      const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .insert({
          company_id: profile.company_id,
          customer_id: customerId,
          customer_name: orderData.customer?.name || null,
          customer_phone: orderData.customer?.whatsapp || null,
          customer_address: orderData.delivery_address 
            ? `${orderData.delivery_address.street}, ${orderData.delivery_address.number} - ${orderData.delivery_address.neighborhood}`
            : orderData.store_address || null,
          address_notes: orderData.address_notes || null,
          order_type: orderTypeValue,
          receipt_type: orderData.receipt_type,
          table_number: orderData.table_number,
          delivery_address_id: orderData.delivery_address?.id,
          delivery_latitude: orderData.delivery_address?.latitude || null,
          delivery_longitude: orderData.delivery_address?.longitude || null,
          delivery_fee: orderData.delivery_fee || 0,
          payment_method: orderData.payment_method,
          change_for: orderData.change_for,
          notes: orderNotes,
          source: 'phone',
          total: getTotal(),
          status: 'preparo', // Auto-accept: skip "novo"
          accepted_at: acceptedAt, // Auto-accept timestamp
          eat_here: orderData.eat_here || false, // Comer aqui
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Record auto-accept event
      await (supabase as any).from('order_status_events').insert({
        order_id: order.id,
        company_id: profile.company_id,
        from_status: null,
        to_status: 'preparo',
        meta: { source: 'auto_accept' },
      });

      // Create order items - include selected_options_json if present
      const orderItems = orderData.items!.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes || null,
        selected_options_json: item.selected_options_json || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create print jobs for automatic printing (print_job_queue)
      await createPrintJobsForOrder(profile.company_id, order.id);

      return order;
    },
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const orderDisplayNumber = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(-4).toUpperCase();
      toast.success(`Pedido #${orderDisplayNumber} criado!`);
      setStep('confirmation');
    },
    onError: (error) => {
      toast.error('Erro ao criar pedido');
      console.error(error);
    },
  });

  const reset = useCallback(() => {
    setStep('customer');
    setOrderData({
      items: [],
      delivery_fee: 0,
      receipt_type: 'delivery',
      payment_method: 'money',
    });
  }, []);

  return {
    step,
    orderData,
    updateOrderData,
    nextStep,
    prevStep,
    goToStep,
    addItem,
    updateItem,
    removeItem,
    getSubtotal,
    getTotal,
    createOrder,
    reset,
  };
}
