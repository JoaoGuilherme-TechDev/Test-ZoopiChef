import { useState, useCallback } from 'react';
import api from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function useAuthNest() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('access_token', access_token);
      setUser(user);
      
      return user;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  return {
    user,
    loading,
    error,
    login,
    logout,
  };
}
