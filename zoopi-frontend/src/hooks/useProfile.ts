import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  company_id: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      // No seu NestJS, o login já retorna o usuário, 
      // mas as telas costumam pedir o perfil completo.
      const savedUser = JSON.parse(localStorage.getItem('zoopi_user') || '{}');
      return savedUser as Profile;
    },
  });
}

// Hook auxiliar para o Sidebar
export function useUserRole() {
  const { data: profile } = useProfile();
  return { data: { role: profile?.role || 'user' } };
}