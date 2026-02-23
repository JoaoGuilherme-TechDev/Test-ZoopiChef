/**
 * TenantTotemPWA - Unified PWA entry point for Totem
 * 
 * Route: /:slug/totem
 * 
 * This component:
 * 1. Shows SlugEntryScreen FIRST if no slug in URL
 * 2. Resolves restaurant by slug from URL
 * 3. Auto-loads the kiosk if only one device exists
 * 4. Shows device selection if multiple exist
 * 
 * NO TOKEN REQUIRED - works with slug-only access
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Loader2, AlertTriangle, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KioskShell } from '@/components/kiosk/KioskShell';
import { SlugEntryScreen } from '@/components/pwa/SlugEntryScreen';
import { savePWAContext, PWAContext } from '@/lib/pwa/unifiedPersistence';

interface TotemContentProps {
  slug: string;
}

function TotemContent({ slug }: TotemContentProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Resolve company by slug
  const { data: company, isLoading: companyLoading, error: companyError } = useQuery({
    queryKey: ['company_by_slug_totem_pwa', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, logo_url, is_active, is_blocked')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch kiosk devices for this company
  const { data: kioskDevices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['kiosk_devices_pwa', company?.id],
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

  // Persist context when company loads
  useEffect(() => {
    if (company && slug) {
      const contextToSave: PWAContext = {
        restaurantSlug: slug,
        restaurantId: company.id,
        restaurantName: company.name,
        function: 'totem',
        lastAccessedAt: new Date().toISOString(),
      };
      savePWAContext(contextToSave);
    }
  }, [company, slug]);

  // Auto-select device if only one exists
  useEffect(() => {
    if (kioskDevices.length === 1 && !selectedDeviceId) {
      setSelectedDeviceId(kioskDevices[0].id);
    }
  }, [kioskDevices, selectedDeviceId]);

  const isLoading = companyLoading || devicesLoading;

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

  if (!company || companyError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Restaurante não encontrado</CardTitle>
            <CardDescription className="text-gray-400">
              O link acessado não corresponde a nenhum restaurante cadastrado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (company.is_blocked || !company.is_active) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-white">Restaurante Inativo</CardTitle>
            <CardDescription className="text-gray-400">
              Este restaurante está temporariamente indisponível.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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

  // Device selected - render the kiosk shell with company ID
  if (selectedDeviceId) {
    return <KioskShell companyId={company.id} deviceId={selectedDeviceId} />;
  }

  // Multiple kiosks - show selection
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        {company.logo_url && (
          <img src={company.logo_url} alt={company.name} className="h-20 w-auto mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-3xl font-bold text-white">{company.name}</h1>
        <p className="text-lg text-gray-400 mt-2">Selecione um Totem</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {kioskDevices.map((kiosk) => (
          <Card
            key={kiosk.id}
            className="bg-gray-800 border-gray-700 hover:border-orange-500 transition-colors cursor-pointer group"
            onClick={() => setSelectedDeviceId(kiosk.id)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Monitor className="w-12 h-12 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-1">{kiosk.name}</h3>
              <p className="text-sm text-gray-400">{kiosk.device_code}</p>
              <Button variant="outline" className="mt-4 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                Acessar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function TenantTotemPWA() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [needsSlugEntry, setNeedsSlugEntry] = useState(!slug);

  if (needsSlugEntry) {
    return (
      <SlugEntryScreen
        appName="Totem de Autoatendimento"
        appIcon={<Monitor className="w-10 h-10 text-orange-500" />}
        onSlugValidated={(validatedSlug) => {
          setNeedsSlugEntry(false);
          navigate(`/${validatedSlug}/totem`, { replace: true });
        }}
      />
    );
  }

  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-orange-500" />
      </div>
    );
  }

  return <TotemContent slug={slug} />;
}
