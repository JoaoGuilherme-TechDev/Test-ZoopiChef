/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  [x: string]: string;
  global_role: string;
  id: string;
  email: string;
  full_name: string;
  company_id: string;
  company_slug: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyId: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ao carregar a página, verifica se já existe um usuário salvo no navegador
    const savedUser = localStorage.getItem('zoopi_user');
    const token = localStorage.getItem('zoopi_token');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, access_token } = response.data;

      // Salva no localStorage ANTES de atualizar o estado
      // para garantir que o interceptor já tem o token
      // quando o React Query disparar as primeiras queries
      localStorage.setItem('zoopi_token', access_token);
      localStorage.setItem('zoopi_user', JSON.stringify(user));

      // Pequeno delay para o localStorage ser lido antes das queries
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      setUser(user);
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Erro ao fazer login' };
    }
  };
  const signUp = async (email: string, password: string, fullName: string, companyId: string) => {
    try {
      await api.post('/auth/register', { 
        email, 
        password, 
        full_name: fullName, 
        company_id: companyId 
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Erro ao criar conta' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('zoopi_token');
    localStorage.removeItem('zoopi_user');
    setUser(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

function suppressNextAlert() {
  throw new Error('Function not implemented.');
}
