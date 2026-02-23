import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';
// import { User, Session } from '@supabase/supabase-js';
import { User, Session } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await api.get('/auth/profile');
      // The profile endpoint returns the user payload
      const userData = response.data;
      
      // Construct user object similar to what we expect
      const user: User = {
        id: userData.sub || userData.id,
        email: userData.username || userData.email,
        role: userData.role,
        company_id: userData.companyId,
        user_metadata: {
          full_name: userData.fullName,
        }
      };
      
      setUser(user);
      setSession({
        access_token: token,
        user: user
      });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      localStorage.removeItem('access_token');
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('access_token', access_token);
      
      const user: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        company_id: userData.companyId,
        user_metadata: {
          full_name: userData.fullName,
        }
      };
      
      setUser(user);
      setSession({
        access_token,
        user
      });
      
      return { error: null };
    } catch (err: any) {
      console.error('Login error:', err);
      return { error: err.response?.data?.message || err.message || 'Login failed' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Implement sign up logic here if backend supports it
      // For now, we can just log
      console.log('Sign up not fully implemented in backend yet');
      return { error: new Error('Sign up not implemented') };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
