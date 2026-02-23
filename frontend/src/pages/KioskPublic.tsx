/**
 * KioskPublic - Public kiosk page accessed via token
 * 
 * This is the entry point for the kiosk, loaded in fullscreen on the totem device.
 * Persists restaurant context so the PWA can auto-restore after reopening.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { KioskShell } from '@/components/kiosk/KioskShell';
import { Loader2, AlertTriangle } from 'lucide-react';
import { saveKioskContext, touchKioskContext } from '@/lib/pwa/kioskPersistence';

export default function KioskPublic() {
  const { token } = useParams<{ token: string }>();

  // Fetch device by token (includes company info via join)
  const { data: device, isLoading, error } = useQuery({
    queryKey: ['kiosk-device-by-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select(`
          *,
          companies:company_id (
            id,
            name,
            slug
          )
        `)
        .eq('access_token', token)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  // Persist context when device loads successfully
  useEffect(() => {
    if (device && token) {
      const company = (device as any).companies;
      if (company) {
        saveKioskContext({
          deviceToken: token,
          companyId: company.id,
          companySlug: company.slug,
          companyName: company.name,
          deviceName: device.name,
          lastAccessedAt: new Date().toISOString(),
        });
      }
    }
  }, [device, token]);

  // Touch context periodically to track activity
  useEffect(() => {
    const interval = setInterval(() => {
      touchKioskContext();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Carregando totem...</p>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Totem não encontrado</h1>
          <p className="text-gray-400 mb-4">
            Este link pode estar inválido ou o totem foi desativado.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return <KioskShell deviceToken={token!} />;
}
