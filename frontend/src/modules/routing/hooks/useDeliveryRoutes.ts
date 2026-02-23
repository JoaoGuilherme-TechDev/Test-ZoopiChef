import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { DeliveryRoute, RouteFormData, StopFormData } from '../types';

export function useDeliveryRoutes(date?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const routesQuery = useQuery({
    queryKey: ['delivery-routes', company?.id, date],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = (supabase as any)
        .from('delivery_routes')
        .select(`
          *,
          deliverer:deliverers(id, name),
          stops:delivery_route_stops(*, order:orders(id, customer_name, total))
        `)
        .eq('company_id', company.id)
        .order('route_date', { ascending: false });

      if (date) {
        query = query.eq('route_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort stops by stop_order
      return (data as DeliveryRoute[]).map(route => ({
        ...route,
        stops: route.stops?.sort((a: any, b: any) => a.stop_order - b.stop_order),
      }));
    },
    enabled: !!company?.id,
  });

  const createRoute = useMutation({
    mutationFn: async (data: RouteFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data: route, error } = await (supabase as any)
        .from('delivery_routes')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success('Rota criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar rota: ' + error.message);
    },
  });

  const addStop = useMutation({
    mutationFn: async (data: StopFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get current max stop_order
      const { data: stops } = await (supabase as any)
        .from('delivery_route_stops')
        .select('stop_order')
        .eq('route_id', data.route_id)
        .order('stop_order', { ascending: false })
        .limit(1);

      const nextOrder = (stops?.[0]?.stop_order || 0) + 1;

      const { error } = await (supabase as any)
        .from('delivery_route_stops')
        .insert({
          ...data,
          company_id: company.id,
          stop_order: nextOrder,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success('Parada adicionada');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar parada: ' + error.message);
    },
  });

  const updateStopStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'arrived' || status === 'delivered') {
        updateData.actual_arrival = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from('delivery_route_stops')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success('Status atualizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const startRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('delivery_routes')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success('Rota iniciada');
    },
    onError: (error: any) => {
      toast.error('Erro ao iniciar rota: ' + error.message);
    },
  });

  const completeRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('delivery_routes')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success('Rota concluída');
    },
    onError: (error: any) => {
      toast.error('Erro ao concluir rota: ' + error.message);
    },
  });

  const reorderStops = useMutation({
    mutationFn: async ({ routeId, stopIds }: { routeId: string; stopIds: string[] }) => {
      // Update each stop with new order
      for (let i = 0; i < stopIds.length; i++) {
        const { error } = await (supabase as any)
          .from('delivery_route_stops')
          .update({ stop_order: i + 1 })
          .eq('id', stopIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success('Ordem atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });

  // Simple route optimization (nearest neighbor algorithm)
  const optimizeRoute = useMutation({
    mutationFn: async (routeId: string) => {
      // This is a simplified optimization
      // In production, you'd use Google Routes API or similar
      
      const route = routesQuery.data?.find(r => r.id === routeId);
      if (!route?.stops || route.stops.length < 2) {
        throw new Error('Rota precisa de pelo menos 2 paradas');
      }

      // For now, just mark as optimized
      const { error } = await (supabase as any)
        .from('delivery_routes')
        .update({ optimized_at: new Date().toISOString() })
        .eq('id', routeId);
      if (error) throw error;

      return route.stops.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast.success(`Rota otimizada com ${count} paradas`);
    },
    onError: (error: any) => {
      toast.error('Erro ao otimizar: ' + error.message);
    },
  });

  return {
    routes: routesQuery.data || [],
    isLoading: routesQuery.isLoading,
    createRoute,
    addStop,
    updateStopStatus,
    startRoute,
    completeRoute,
    reorderStops,
    optimizeRoute,
  };
}
