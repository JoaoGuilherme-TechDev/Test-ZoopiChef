import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'employee';
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await api.get(`/users/${user.id}`);

      return {
        id: data.id,
        company_id: data.companyId,
        full_name: data.fullName,
        email: data.email,
        avatar_url: null, // Not supported in backend yet
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      } as Profile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // OTIMIZAÇÃO: 5 minutos de staleTime
    gcTime: 1000 * 60 * 30, // OTIMIZAÇÃO: 30 min cache
    refetchOnWindowFocus: false, // OTIMIZAÇÃO: evita refetch desnecessário
  });
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await api.get(`/users/${user.id}`);

      return {
        id: data.id, // Using user ID as role ID for simplicity
        user_id: data.id,
        role: (data.role as 'admin' | 'employee') || 'employee',
      } as UserRole;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // OTIMIZAÇÃO: 5 minutos de staleTime
    gcTime: 1000 * 60 * 30, // OTIMIZAÇÃO: 30 min cache
    refetchOnWindowFocus: false, // OTIMIZAÇÃO: evita refetch desnecessário
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Map frontend profile fields to backend user fields
      const backendUpdates: any = {};
      if (updates.full_name) backendUpdates.fullName = updates.full_name;
      if (updates.email) backendUpdates.email = updates.email;
      // if (updates.company_id) backendUpdates.companyId = updates.company_id;
      
      const { data } = await api.patch(`/users/${user.id}`, backendUpdates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'employee' }) => {
      const { data } = await api.patch(`/users/${userId}`, { role });
      return data;
    },
    onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['userRole', variables.userId] });
       queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
    },
  });
}
