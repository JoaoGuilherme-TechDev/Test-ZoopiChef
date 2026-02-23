/**
 * TenantTabletPWA - Unified PWA entry point for Tablet
 * 
 * Route: /:slug/tablet
 * 
 * This component:
 * 1. Shows SlugEntryScreen FIRST if no slug in URL
 * 2. Resolves restaurant by slug from URL
 * 3. Persists restaurant + function context
 * 4. Loads the tablet autoatendimento interface
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, Tablet } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { SlugEntryScreen } from '@/components/pwa/SlugEntryScreen';
import { savePWAContext, loadPWAContext, PWAContext } from '@/lib/pwa/unifiedPersistence';

import TenantAutoatendimento from '@/pages/tenant/TenantAutoatendimento';

function TabletContentWithPersistence({ slug }: { slug: string }) {
  const { company } = useTenant();

  useEffect(() => {
    if (company && slug) {
      const existingContext = loadPWAContext();
      const contextToSave: PWAContext = {
        restaurantSlug: slug,
        restaurantId: company.id,
        restaurantName: company.name,
        function: 'tablet',
        tableNumber: existingContext?.tableNumber,
        lastAccessedAt: new Date().toISOString(),
      };
      savePWAContext(contextToSave);
    }
  }, [company, slug]);

  return <TenantAutoatendimento />;
}

function TabletContent({ slug }: { slug: string }) {
  return (
    <TenantProvider tenantSlug={slug}>
      <TabletContentWithPersistence slug={slug} />
    </TenantProvider>
  );
}

export default function TenantTabletPWA() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [needsSlugEntry, setNeedsSlugEntry] = useState(!slug);

  if (needsSlugEntry) {
    return (
      <SlugEntryScreen
        appName="Tablet de Autoatendimento"
        appIcon={<Tablet className="w-10 h-10 text-violet-500" />}
        onSlugValidated={(validatedSlug) => {
          setNeedsSlugEntry(false);
          navigate(`/${validatedSlug}/tablet`, { replace: true });
        }}
      />
    );
  }

  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle>Restaurante não identificado</CardTitle>
            <CardDescription>
              Acesse este tablet através do link correto do estabelecimento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <TabletContent slug={slug} />;
}
