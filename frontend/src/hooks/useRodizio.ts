import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

// ==================== TYPES ====================
export interface RodizioType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RodizioMenu {
  id: string;
  company_id: string;
  rodizio_type_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  print_sector_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RodizioMenuItem {
  id: string;
  company_id: string;
  rodizio_menu_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  max_quantity_per_session: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RodizioSession {
  id: string;
  company_id: string;
  rodizio_type_id: string;
  table_session_id: string | null;
  comanda_id: string | null;
  people_count: number;
  status: 'active' | 'closed' | 'cancelled';
  activated_by: string | null;
  activated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  total_price_cents: number;
  created_at: string;
  updated_at: string;
}

export interface RodizioItemOrder {
  id: string;
  company_id: string;
  rodizio_session_id: string;
  rodizio_menu_item_id: string;
  quantity: number;
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  ordered_at: string;
  ordered_by: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== HOOKS ====================

// Tipos de Rodízio (Master, Prêmio, Criança)
export function useRodizioTypes() {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-types', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('rodizio_types')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as RodizioType[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateRodizioType() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<RodizioType, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data: result, error } = await supabase
        .from('rodizio_types')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-types'] });
      toast.success('Tipo de rodízio criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateRodizioType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RodizioType> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('rodizio_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-types'] });
      toast.success('Tipo de rodízio atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteRodizioType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rodizio_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-types'] });
      toast.success('Tipo de rodízio excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Menus do Rodízio (Sashimis, Niguiris, etc)
export function useRodizioMenus(rodizioTypeId?: string) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-menus', company?.id, rodizioTypeId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('rodizio_menus')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order', { ascending: true });
      
      if (rodizioTypeId) {
        query = query.eq('rodizio_type_id', rodizioTypeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RodizioMenu[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateRodizioMenu() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<RodizioMenu, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data: result, error } = await supabase
        .from('rodizio_menus')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menus'] });
      toast.success('Menu criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateRodizioMenu() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RodizioMenu> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('rodizio_menus')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menus'] });
      toast.success('Menu atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteRodizioMenu() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rodizio_menus')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menus'] });
      toast.success('Menu excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Copiar menu de um tipo para outro
export function useCopyRodizioMenu() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sourceMenuId, targetRodizioTypeId }: { sourceMenuId: string; targetRodizioTypeId: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Buscar menu original
      const { data: sourceMenu, error: menuError } = await supabase
        .from('rodizio_menus')
        .select('*')
        .eq('id', sourceMenuId)
        .single();
      
      if (menuError) throw menuError;
      
      // Criar cópia do menu (mantém nome original e copia imagem e setor de impressão)
      const { data: newMenu, error: createMenuError } = await supabase
        .from('rodizio_menus')
        .insert({
          company_id: company.id,
          rodizio_type_id: targetRodizioTypeId,
          name: sourceMenu.name,
          description: sourceMenu.description,
          icon: sourceMenu.icon,
          image_url: sourceMenu.image_url,
          print_sector_id: sourceMenu.print_sector_id,
          display_order: sourceMenu.display_order,
          is_active: sourceMenu.is_active,
        })
        .select()
        .single();
      
      if (createMenuError) throw createMenuError;
      
      // Buscar itens do menu original
      const { data: sourceItems, error: itemsError } = await supabase
        .from('rodizio_menu_items')
        .select('*')
        .eq('rodizio_menu_id', sourceMenuId);
      
      if (itemsError) throw itemsError;
      
      // Copiar itens
      if (sourceItems && sourceItems.length > 0) {
        const newItems = sourceItems.map(item => ({
          company_id: company.id,
          rodizio_menu_id: newMenu.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          image_url: item.image_url,
          max_quantity_per_session: item.max_quantity_per_session,
          is_active: item.is_active,
          display_order: item.display_order,
        }));
        
        const { error: insertItemsError } = await supabase
          .from('rodizio_menu_items')
          .insert(newItems);
        
        if (insertItemsError) throw insertItemsError;
      }
      
      return newMenu;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menus'] });
      queryClient.invalidateQueries({ queryKey: ['rodizio-menu-items'] });
      toast.success('Menu copiado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao copiar: ${error.message}`);
    },
  });
}

// Itens do Menu
export function useRodizioMenuItems(menuId?: string) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-menu-items', company?.id, menuId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('rodizio_menu_items')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order', { ascending: true });
      
      if (menuId) {
        query = query.eq('rodizio_menu_id', menuId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RodizioMenuItem[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateRodizioMenuItem() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<RodizioMenuItem, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data: result, error } = await supabase
        .from('rodizio_menu_items')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menu-items'] });
      toast.success('Item adicionado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateRodizioMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RodizioMenuItem> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('rodizio_menu_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menu-items'] });
      toast.success('Item atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteRodizioMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rodizio_menu_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menu-items'] });
      toast.success('Item excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Importar produtos para itens do menu
export function useImportProductsToRodizio() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ menuId, productIds }: { menuId: string; productIds: string[] }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Buscar produtos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, image_url')
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      // Criar itens
      const items = products.map((product, index) => ({
        company_id: company.id,
        rodizio_menu_id: menuId,
        product_id: product.id,
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        max_quantity_per_session: null,
        is_active: true,
        display_order: index,
      }));
      
      const { error } = await supabase
        .from('rodizio_menu_items')
        .insert(items);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-menu-items'] });
      toast.success('Produtos importados!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Sessões de Rodízio
export function useActiveRodizioSession(tableSessionId?: string, comandaId?: string) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-session-active', company?.id, tableSessionId, comandaId],
    queryFn: async () => {
      if (!company?.id) return null;
      if (!tableSessionId && !comandaId) return null;
      
      let query = supabase
        .from('rodizio_sessions')
        .select('*, rodizio_types(*)')
        .eq('company_id', company.id)
        .eq('status', 'active')
        // Pode existir mais de uma sessão "active" por inconsistência histórica.
        // Para não quebrar a UI, pegamos a mais recente.
        .order('activated_at', { ascending: false })
        .limit(1);
      
      if (tableSessionId) {
        query = query.eq('table_session_id', tableSessionId);
      }
      if (comandaId) {
        query = query.eq('comanda_id', comandaId);
      }
      
      // Não usar maybeSingle aqui: em algumas combinações com limit/order ele ainda pode causar
      // comportamento inconsistente. Pegamos o primeiro item com segurança.
      const { data, error } = await query;
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!company?.id && (!!tableSessionId || !!comandaId),
  });
}

export function useActivateRodizio() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      rodizio_type_id: string;
      people_count: number;
      table_session_id?: string;
      comanda_id?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // 1. Create the rodizio session
      const { data: result, error } = await supabase
        .from('rodizio_sessions')
        .insert({
          company_id: company.id,
          ...data,
        })
        .select('*, rodizio_types(*)')
        .single();
      
      if (error) throw error;

      // 2. Auto-create the charge item in the table/comanda bill
      const rodizioType = result.rodizio_types as RodizioType | null;
      const peopleCount = Number(result.people_count || 0);
      const unitPriceCents = Number(rodizioType?.price_cents || 0);
      const productName = `RODÍZIO - ${rodizioType?.name || 'Rodízio'}`;

      if (data.table_session_id && unitPriceCents > 0 && peopleCount > 0) {
        // Table rodizio: ensure command exists and insert item
        let commandId: string | null = null;

        // Find or create command for the session
        const { data: existingCommands } = await supabase
          .from('table_commands')
          .select('id')
          .eq('session_id', data.table_session_id)
          .eq('status', 'open')
          .limit(1);

        if (existingCommands && existingCommands.length > 0) {
          commandId = existingCommands[0].id;
        } else {
          // Get table_id from session
          const { data: session } = await supabase
            .from('table_sessions')
            .select('table_id')
            .eq('id', data.table_session_id)
            .single();

          if (session?.table_id) {
            // Get next command number
            const { data: allCommands } = await supabase
              .from('table_commands')
              .select('number')
              .eq('session_id', data.table_session_id)
              .order('number', { ascending: false })
              .limit(1);

            const nextNumber = (allCommands?.[0]?.number || 0) + 1;

            const { data: newCmd } = await supabase
              .from('table_commands')
              .insert({
                company_id: company.id,
                session_id: data.table_session_id,
                table_id: session.table_id,
                number: nextNumber,
                status: 'open',
              })
              .select('id')
              .single();

            commandId = newCmd?.id || null;
          }
        }

        if (commandId) {
          // Get table_id for the item
          const { data: cmd } = await supabase
            .from('table_commands')
            .select('table_id')
            .eq('id', commandId)
            .single();

          await supabase.from('table_command_items').insert({
            company_id: company.id,
            command_id: commandId,
            session_id: data.table_session_id,
            table_id: cmd?.table_id,
            product_name: productName,
            quantity: peopleCount,
            unit_price_cents: unitPriceCents,
            total_price_cents: unitPriceCents * peopleCount,
            status: 'pending',
          });
        }
      } else if (data.comanda_id && unitPriceCents > 0 && peopleCount > 0) {
        // Comanda rodizio: insert directly to comanda_items using correct column names
        await supabase.from('comanda_items').insert({
          company_id: company.id,
          comanda_id: data.comanda_id,
          product_name_snapshot: productName,
          qty: peopleCount,
          unit_price_snapshot: unitPriceCents,
        });

        // Recalculate comanda totals
        const { data: items } = await supabase
          .from('comanda_items')
          .select('qty, unit_price_snapshot, canceled_at')
          .eq('comanda_id', data.comanda_id);

        const totalAmount = (items || [])
          .filter(i => !i.canceled_at)
          .reduce((sum, i) => sum + ((i.qty || 0) * (i.unit_price_snapshot || 0)), 0);

        await supabase
          .from('comandas')
          .update({ total_amount: totalAmount, status: 'open' })
          .eq('id', data.comanda_id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-session-active'] });
      queryClient.invalidateQueries({ queryKey: ['table-session-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
      toast.success('Rodízio ativado e lançado na conta!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCloseRodizio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('rodizio_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-session-active'] });
      toast.success('Rodízio encerrado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Buscar contagem de itens já pedidos na sessão
export function useRodizioSessionItemCounts(rodizioSessionId?: string) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-item-counts', company?.id, rodizioSessionId],
    queryFn: async () => {
      if (!company?.id || !rodizioSessionId) return {};
      
      const { data, error } = await supabase
        .from('rodizio_session_item_counts')
        .select('*')
        .eq('rodizio_session_id', rodizioSessionId);
      
      if (error) throw error;
      
      // Retornar como mapa: menuItemId -> count
      const counts: Record<string, number> = {};
      data?.forEach(row => {
        counts[row.rodizio_menu_item_id] = row.total_ordered;
      });
      return counts;
    },
    enabled: !!company?.id && !!rodizioSessionId,
  });
}

// Fazer pedido de item do rodízio
export function useOrderRodizioItem() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      rodizio_session_id: string;
      rodizio_menu_item_id: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Verificar limite de quantidade
      const { data: menuItem, error: itemError } = await supabase
        .from('rodizio_menu_items')
        .select('max_quantity_per_session, name')
        .eq('id', data.rodizio_menu_item_id)
        .single();
      
      if (itemError) throw itemError;
      
      if (menuItem.max_quantity_per_session) {
        // Verificar contagem atual
        const { data: currentCount, error: countError } = await supabase
          .from('rodizio_session_item_counts')
          .select('total_ordered')
          .eq('rodizio_session_id', data.rodizio_session_id)
          .eq('rodizio_menu_item_id', data.rodizio_menu_item_id)
          .maybeSingle();
        
        if (countError) throw countError;
        
        const alreadyOrdered = currentCount?.total_ordered || 0;
        const remaining = menuItem.max_quantity_per_session - alreadyOrdered;
        
        if (data.quantity > remaining) {
          throw new Error(`Limite de ${menuItem.name}: máximo ${menuItem.max_quantity_per_session} por sessão (restam ${remaining})`);
        }
      }
      
      const { data: result, error } = await supabase
        .from('rodizio_item_orders')
        .insert({
          company_id: company.id,
          ...data,
        })
        .select('*, rodizio_menu_items(*)')
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodizio-item-counts'] });
      queryClient.invalidateQueries({ queryKey: ['rodizio-item-orders'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Pedidos de uma sessão
export function useRodizioSessionOrders(rodizioSessionId?: string) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-item-orders', company?.id, rodizioSessionId],
    queryFn: async () => {
      if (!company?.id || !rodizioSessionId) return [];
      
      const { data, error } = await supabase
        .from('rodizio_item_orders')
        .select('*, rodizio_menu_items(name, image_url)')
        .eq('rodizio_session_id', rodizioSessionId)
        .order('ordered_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && !!rodizioSessionId,
  });
}

// Buscar menus ativos para um tipo de rodízio (para tablet)
export function useActiveRodizioMenusForType(rodizioTypeId?: string) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-menus-active', company?.id, rodizioTypeId],
    queryFn: async () => {
      if (!company?.id || !rodizioTypeId) return [];
      
      const { data, error } = await supabase
        .from('rodizio_menus')
        .select(`
          *,
          items:rodizio_menu_items(*)
        `)
        .eq('company_id', company.id)
        .eq('rodizio_type_id', rodizioTypeId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      // Filtrar apenas itens ativos
      return data.map(menu => ({
        ...menu,
        items: (menu.items as RodizioMenuItem[]).filter((item: RodizioMenuItem) => item.is_active),
      }));
    },
    enabled: !!company?.id && !!rodizioTypeId,
  });
}

// Buscar tipos de rodízio ativos (para seleção)
export function useActiveRodizioTypes() {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['rodizio-types-active', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('rodizio_types')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as RodizioType[];
    },
    enabled: !!company?.id,
  });
}
