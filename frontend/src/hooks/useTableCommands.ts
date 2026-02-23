import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface TableCommand {
  id: string;
  company_id: string;
  session_id: string;
  table_id: string;
  name: string | null;
  number: number | null;
  status: 'open' | 'closed';
  total_amount_cents: number;
  created_at: string;
  updated_at: string;
}

export interface TableCommandItem {
  id: string;
  company_id: string;
  command_id: string;
  session_id: string;
  table_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  command?: {
    id: string;
    name: string | null;
    number: number | null;
  };
}

const mapCommandToFrontend = (data: any): TableCommand => ({
  id: data.id,
  company_id: data.companyId,
  session_id: data.sessionId,
  table_id: data.tableId,
  name: data.name,
  number: data.number,
  status: data.status,
  total_amount_cents: data.totalAmountCents,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapCommandItemToFrontend = (data: any): TableCommandItem => {
  const item: TableCommandItem = {
    id: data.id,
    company_id: data.companyId,
    command_id: data.commandId,
    session_id: data.sessionId,
    table_id: data.tableId,
    product_id: data.productId,
    product_name: data.productName,
    quantity: data.quantity,
    unit_price_cents: data.unitPriceCents,
    total_price_cents: data.totalPriceCents,
    notes: data.notes,
    status: data.status,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  };

  if (data.command) {
    item.command = {
      id: data.command.id,
      name: data.command.name,
      number: data.command.number,
    };
  }

  return item;
};

export function useTableCommands(sessionId?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: commands = [], isLoading, error } = useQuery({
    queryKey: ['table-commands', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const response = await api.get('/table-commands', {
        params: { sessionId }
      });
      return (response.data || []).map(mapCommandToFrontend);
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Polling for updates
  });

  const createCommand = useMutation({
    mutationFn: async ({ 
      sessionId, 
      tableId, 
      name, 
      number 
    }: { 
      sessionId: string; 
      tableId: string; 
      name?: string; 
      number?: number;
    }) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/table-commands', {
        companyId: company.id,
        sessionId,
        tableId,
        name: name || null,
        number: number || null,
      });
      return mapCommandToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      toast.success('Comanda criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating command:', error);
      toast.error('Erro ao criar comanda');
    },
  });

  const updateCommand = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TableCommand> & { id: string }) => {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.number !== undefined) payload.number = updates.number;
      if (updates.status !== undefined) payload.status = updates.status;

      const response = await api.patch(`/table-commands/${id}`, payload);
      return mapCommandToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      toast.success('Comanda atualizada!');
    },
    onError: (error) => {
        console.error('Error updating command:', error);
        toast.error('Erro ao atualizar comanda');
    }
  });

  const closeCommand = useMutation({
    mutationFn: async (commandId: string) => {
      const response = await api.patch(`/table-commands/${commandId}`, { status: 'closed' });
      return mapCommandToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      toast.success('Comanda fechada!');
    },
  });

  const deleteCommand = useMutation({
    mutationFn: async (commandId: string) => {
      await api.delete(`/table-commands/${commandId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      toast.success('Comanda excluída!');
    },
    onError: (error: any) => {
      console.error('Error deleting command:', error);
      // Show backend error message if available
      const message = error.response?.data?.message || 'Erro ao excluir comanda';
      toast.error(message);
    },
  });

  return {
    commands,
    openCommands: commands.filter(c => c.status === 'open'),
    isLoading,
    error,
    createCommand,
    updateCommand,
    closeCommand,
    deleteCommand,
  };
}

export function useTableCommandItems(commandId?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['table-command-items', commandId],
    queryFn: async () => {
      if (!commandId) return [];
      
      const response = await api.get('/table-command-items', {
        params: { commandId }
      });
      return (response.data || []).map(mapCommandItemToFrontend);
    },
    enabled: !!commandId,
    refetchInterval: 5000,
  });

  const addItem = useMutation({
    mutationFn: async ({ 
      commandId, 
      sessionId, 
      tableId,
      productId,
      productName,
      quantity,
      unitPriceCents,
      notes
    }: { 
      commandId: string;
      sessionId: string;
      tableId: string;
      productId?: string;
      productName: string;
      quantity: number;
      unitPriceCents: number;
      notes?: string;
    }) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/table-command-items', {
        companyId: company.id,
        commandId,
        sessionId,
        tableId,
        productId: productId || null,
        productName,
        quantity,
        unitPriceCents,
        totalPriceCents: unitPriceCents * quantity,
        notes: notes || null,
      });
      
      return mapCommandItemToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['table-session-items'] });
      toast.success('Item adicionado!');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TableCommandItem> & { id: string }) => {
      const payload: any = {};
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.total_price_cents !== undefined) payload.totalPriceCents = updates.total_price_cents;

      const response = await api.patch(`/table-command-items/${id}`, payload);
      return mapCommandItemToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] }); // Total might change
      queryClient.invalidateQueries({ queryKey: ['table-session-items'] });
      toast.success('Item atualizado!');
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/table-command-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['table-session-items'] });
      toast.success('Item removido!');
    },
  });

  const transferItem = useMutation({
    mutationFn: async ({ 
      itemId, 
      targetCommandId,
      quantity 
    }: { 
      itemId: string; 
      targetCommandId: string;
      quantity?: number;
    }) => {
      const response = await api.post(`/table-command-items/${itemId}/transfer`, {
        targetCommandId,
        quantity
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-session-items'] });
      toast.success('Item transferido!');
    },
  });

  return {
    items,
    activeItems: items.filter(i => i.status !== 'cancelled'),
    isLoading,
    error,
    addItem,
    updateItem,
    removeItem,
    transferItem,
  };
}

export function useAllSessionItems(sessionId?: string) {
  const { data: company } = useCompany();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['table-session-items', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const response = await api.get('/table-command-items', {
        params: { sessionId }
      });
      
      return (response.data || []).map(mapCommandItemToFrontend);
    },
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  return {
    items,
    activeItems: items.filter(i => i.status !== 'cancelled'),
    isLoading,
    error,
    totalCents: items
      .filter(i => i.status !== 'cancelled')
      .reduce((sum, item) => sum + item.total_price_cents, 0),
  };
}
