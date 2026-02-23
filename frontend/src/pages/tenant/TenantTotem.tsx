/**
 * TenantTotem - Tenant-based route for Kiosk/Totem access
 * 
 * Route: /:slug/totem
 * 
 * This component resolves the company by slug and renders the kiosk.
 * Slug-only access - no token required.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Loader2, Monitor, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KioskShell } from '@/components/kiosk/KioskShell';

export default function TenantTotem() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Resolve company by slug
  const { data: company, isLoading: companyLoading, error: companyError } = useQuery({
    queryKey: ['company_by_slug_totem', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch active kiosk devices for this company
  const { data: kioskDevices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['kiosk_devices_tenant', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('id, name, device_code, access_token, is_active')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Auto-select device if only one exists
  useEffect(() => {
    if (kioskDevices.length === 1 && !selectedDeviceId) {
      setSelectedDeviceId(kioskDevices[0].id);
    }
  }, [kioskDevices, selectedDeviceId]);

  const isLoading = companyLoading || devicesLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-xl text-white">Carregando Totem...</p>
        </div>
      </div>
    );
  }

  // Company not found
  if (!company || companyError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Restaurante não encontrado</CardTitle>
            <CardDescription className="text-gray-400">
              O link acessado não corresponde a nenhum restaurante cadastrado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // No kiosk devices configured
  if (kioskDevices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <Monitor className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-white">Nenhum Totem Configurado</CardTitle>
            <CardDescription className="text-gray-400">
              Este restaurante ainda não possui totens de autoatendimento configurados.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              Configure seus totens em Ajustes → Totem Autoatendimento
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Device selected - render the kiosk shell
  if (selectedDeviceId) {
    return <KioskShell companyId={company.id} deviceId={selectedDeviceId} />;
  }

  // Multiple kiosks - show selection
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Company Header */}
      <div className="text-center mb-8">
        {company.logo_url && (
          <img 
            src={company.logo_url} 
            alt={company.name} 
            className="h-20 w-auto mx-auto mb-4 object-contain"
          />
        )}
        <h1 className="text-3xl font-bold text-white">{company.name}</h1>
        <p className="text-lg text-gray-400 mt-2">Selecione um Totem</p>
      </div>

      {/* Kiosk Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {kioskDevices.map((device) => (
          <Card 
            key={device.id}
            className="bg-gray-800 border-gray-700 hover:border-orange-500 transition-colors cursor-pointer group"
            onClick={() => setSelectedDeviceId(device.id)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Monitor className="w-12 h-12 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-1">{device.name}</h3>
              <p className="text-sm text-gray-400">{device.device_code}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              >
                Acessar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
