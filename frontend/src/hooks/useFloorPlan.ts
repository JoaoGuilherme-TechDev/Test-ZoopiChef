import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface FloorPlanLayout {
  id: string;
  company_id: string;
  name: string;
  width: number;
  height: number;
  background_color: string;
  grid_enabled: boolean;
  grid_size: number;
  background_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FloorPlanElement {
  id: string;
  company_id: string;
  layout_id: string;
  element_type: 'wall' | 'door' | 'window' | 'decoration' | 'label';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label: string | null;
  icon: string | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface TablePosition {
  id: string;
  number: number;
  name: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number;
  height: number;
  rotation: number;
  shape: 'circle' | 'square' | 'rectangle';
  capacity: number;
  active: boolean;
  status: string;
}

export function useFloorPlanLayout() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: layout, isLoading } = useQuery({
    queryKey: ['floor-plan-layout', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('floor_plan_layouts')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as FloorPlanLayout | null;
    },
    enabled: !!company?.id,
  });

  const createLayout = useMutation({
    mutationFn: async (layoutData: Partial<FloorPlanLayout>) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('floor_plan_layouts')
        .insert([{ ...layoutData, company_id: company.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-layout'] });
      toast.success('Layout criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar layout: ' + error.message);
    },
  });

  const updateLayout = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FloorPlanLayout> & { id: string }) => {
      const { data, error } = await supabase
        .from('floor_plan_layouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-layout'] });
      toast.success('Layout atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar layout: ' + error.message);
    },
  });

  return {
    layout,
    isLoading,
    createLayout,
    updateLayout,
  };
}

export function useFloorPlanElements(layoutId: string | undefined) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: elements = [], isLoading } = useQuery({
    queryKey: ['floor-plan-elements', layoutId],
    queryFn: async () => {
      if (!layoutId) return [];
      
      const { data, error } = await supabase
        .from('floor_plan_elements')
        .select('*')
        .eq('layout_id', layoutId)
        .order('z_index', { ascending: true });

      if (error) throw error;
      return data as FloorPlanElement[];
    },
    enabled: !!layoutId,
  });

  const createElement = useMutation({
    mutationFn: async (elementData: {
      element_type: FloorPlanElement['element_type'];
      position_x: number;
      position_y: number;
      width: number;
      height: number;
      rotation?: number;
      color?: string;
      label?: string | null;
      icon?: string | null;
      z_index?: number;
    }) => {
      if (!company?.id || !layoutId) throw new Error('No company or layout');
      
      const { data, error } = await supabase
        .from('floor_plan_elements')
        .insert([{ ...elementData, company_id: company.id, layout_id: layoutId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-elements'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar elemento: ' + error.message);
    },
  });

  const updateElement = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FloorPlanElement> & { id: string }) => {
      const { data, error } = await supabase
        .from('floor_plan_elements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-elements'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar elemento: ' + error.message);
    },
  });

  const deleteElement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('floor_plan_elements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-elements'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover elemento: ' + error.message);
    },
  });

  return {
    elements,
    isLoading,
    createElement,
    updateElement,
    deleteElement,
  };
}

export function useTablesWithPositions() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables-with-positions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('tables')
        .select('id, number, name, position_x, position_y, width, height, rotation, shape, capacity, active, status')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('number', { ascending: true });

      if (error) throw error;
      return data as TablePosition[];
    },
    enabled: !!company?.id,
  });

  const updateTablePosition = useMutation({
    mutationFn: async ({ id, position_x, position_y, width, height, rotation, shape, capacity }: {
      id: string;
      position_x?: number;
      position_y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      shape?: string;
      capacity?: number;
    }) => {
      const updates: Record<string, unknown> = {};
      if (position_x !== undefined) updates.position_x = position_x;
      if (position_y !== undefined) updates.position_y = position_y;
      if (width !== undefined) updates.width = width;
      if (height !== undefined) updates.height = height;
      if (rotation !== undefined) updates.rotation = rotation;
      if (shape !== undefined) updates.shape = shape;
      if (capacity !== undefined) updates.capacity = capacity;

      const { data, error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-with-positions'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar posição: ' + error.message);
    },
  });

  return {
    tables,
    isLoading,
    updateTablePosition,
  };
}

export function usePublicFloorPlan(companyId: string | undefined) {
  const { data: layout, isLoading: layoutLoading } = useQuery({
    queryKey: ['public-floor-plan-layout', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('floor_plan_layouts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as FloorPlanLayout | null;
    },
    enabled: !!companyId,
  });

  const { data: elements = [], isLoading: elementsLoading } = useQuery({
    queryKey: ['public-floor-plan-elements', layout?.id],
    queryFn: async () => {
      if (!layout?.id) return [];
      
      const { data, error } = await supabase
        .from('floor_plan_elements')
        .select('*')
        .eq('layout_id', layout.id)
        .order('z_index', { ascending: true });

      if (error) throw error;
      return data as FloorPlanElement[];
    },
    enabled: !!layout?.id,
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['public-tables-positions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('tables')
        .select('id, number, name, position_x, position_y, width, height, rotation, shape, capacity, active, status')
        .eq('company_id', companyId)
        .eq('active', true)
        .not('position_x', 'is', null)
        .order('number', { ascending: true });

      if (error) throw error;
      return data as TablePosition[];
    },
    enabled: !!companyId,
  });

  return {
    layout,
    elements,
    tables,
    isLoading: layoutLoading || elementsLoading || tablesLoading,
  };
}
