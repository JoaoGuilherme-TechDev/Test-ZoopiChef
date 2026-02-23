import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface CompanyAccessGuardProps {
  children: ReactNode;
}


// Routes that should be accessible even when company is blocked
const ALLOWED_BLOCKED_ROUTES = [
  '/bloqueado',
  '/auth',
  '/empresa', // Allow access to company page to see status
  '/settings', // Allow basic settings access
];

// Public routes that don't require a company/auth.
// IMPORTANT: use strict matching (avoid prefix collisions like "/tv-screens" or "/kds" internal pages).
function isNoCompanyRoute(pathname: string): boolean {
  // Auth / onboarding style
  if (pathname === '/auth' || pathname.startsWith('/auth/')) return true;
  if (pathname === '/empresa' || pathname.startsWith('/empresa/')) return true;
  if (pathname === '/reset-password' || pathname.startsWith('/reset-password/')) return true;
  if (pathname === '/onboarding') return true;
  if (pathname === '/bloqueado') return true;
  if (pathname === '/demo') return true;
  if (pathname === '/roi-calculator') return true;

  // Token/QR routes (public)
  if (pathname.startsWith('/m/')) return true;
  if (pathname.startsWith('/tv/')) return true;
  if (pathname.startsWith('/r/')) return true;
  if (pathname.startsWith('/kds/')) return true;
  if (pathname.startsWith('/painel-chamada/')) return true;
  if (pathname.startsWith('/ss/')) return true;
  if (pathname.startsWith('/balanca/')) return true;
  if (pathname.startsWith('/kiosk/')) return true;
  if (pathname.startsWith('/qr/')) return true;
  if (pathname.startsWith('/qr-mesa/')) return true;
  if (pathname.startsWith('/qr-comanda/')) return true;

  // Sommelier (Enólogo) public QR routes
  if (pathname === '/enologo' || pathname.startsWith('/enologo/')) return true;
  if (pathname === '/enologo-totem' || pathname.startsWith('/enologo-totem/')) return true;
  if (pathname.startsWith('/sommelier/')) return true;
  if (pathname.startsWith('/sommelier-totem/')) return true;

  // Public review + opt-out
  if (pathname.startsWith('/avaliar/')) return true;
  if (pathname.startsWith('/review/')) return true;
  if (pathname.startsWith('/opt-out/')) return true;
  if (pathname.startsWith('/optout/')) return true;

  // Legacy public routes (backward compatibility)
  if (pathname.startsWith('/menu/')) return true;
  if (pathname.startsWith('/tv/s/')) return true;
  if (pathname.startsWith('/roleta/')) return true;

  // Kiosk/tablet public routes
  if (pathname.startsWith('/tablet/')) return true;

  // Reservations public routes
  if (pathname.startsWith('/reservas/')) return true;
  if (pathname.startsWith('/reservation-portal/')) return true;

  return false;
}


// Routes that are internal dashboard routes (not public slug routes)
// IMPORTANT: Keep this list complete to avoid false positives with /:slug route
const INTERNAL_ROUTES = [
  // Core
  '/',
  '/auth',
  '/empresa',
  '/company',
  '/reset-password',
  '/onboarding',
  '/bloqueado',
  '/demo',
  '/roi-calculator',
  '/pos-simulator',
  '/performance-panel',
  
  // Menu/Cardápio
  '/categories',
  '/subcategories',
  '/products',
  '/flavors',
  '/optional-groups',
  '/advanced-menu',
  '/batch-actions',
  '/batch-operations',
  '/flavor-highlight-groups',
  '/ai-product-import',
  '/import-export',
  
  // Orders/Pedidos
  '/orders',
  '/phone-order',
  '/whatsapp',
  '/delivery-menu',
  
  // Customers/Clientes
  '/customers',
  '/customer-credits',
  
  // Delivery
  '/deliverers',
  '/deliverer-tracking',
  '/deliverer-settlement',
  '/deliverer-rankings',
  '/deliverer-app',
  '/deliverer-badge',
  '/delivery-expedition',
  
  // Users/Settings
  '/users',
  '/settings',
  '/profiles',
  
  // Marketing/Campanhas
  '/marketing',
  '/my-links',
  '/banners',
  '/prizes',
  '/prize-wheel',
  '/campaigns',
  '/repurchase',
  '/coupons',
  '/referral-program',
  '/gamification',
  '/dynamic-pricing',
  '/time-highlights',
  
  // AI
  '/ai-central',
  '/ai-recommendations',
  '/ai-suggestions',
  '/ai-menu-creative',
  '/ai-tv-scheduler',
  '/ai-operational',
  '/ai-operacional',
  '/ai-marketing-posts',
  '/ai-churn',
  '/ai-voice',
  '/smart-waitlist',
  '/ai-concierge',
  '/predictive-upselling',
  '/staff-performance',
  '/smart-kds',
  '/selfservice-advanced',
  '/chatbot-settings',
  '/demand-forecast',
  '/churn-prediction',
  '/tax-ai-advisor',
  
  // Operations
  '/tv-screens',
  '/kds',
  '/pdv-loja',
  '/tables',
  '/tables-register',
  '/comandas',
  '/reservations',
  '/self-service',
  '/self-checkout',
  '/operations-performance',
  '/internal-messages',
  '/service-calls',
  '/print-station',
  '/operator-terminal',
  '/terminal',
  
  // Waiter PWA
  '/waiter',
  
  // Finance
  '/cash-register',
  '/cashier',
  '/accounts-payable',
  '/finance-dashboard',
  '/chart-of-accounts',
  '/cash-history',
  '/payment-methods',
  '/bank-accounts',
  '/bank-reconciliation',
  
  // Reports/BI
  '/reports',
  '/delay-reports',
  '/timer-dashboard',
  '/reviews',
  '/business-intelligence',
  '/bi-advanced',
  '/inventory',
  '/auditoria',
  
  // ERP
  '/erp',
  '/crm',
  '/integrations',
  '/marketing-module',
  '/employees',
  '/assets',
  '/delivery-routes',
  '/smart-purchasing',
  '/marketplace',
  '/fiscal',
  '/multi-store',
  
  // SaaS Admin
  '/saas',
  
  // Debug/QA
  '/qa',
  '/debug',
  '/chat-monitor',
  '/system-manual',
  '/documentacao',
  
  // Loyalty
  '/loyalty',
  
  // Tablets/Kiosk (internal config)
  '/tablet',
  '/tablet-autoatendimento',
  '/tablet-kiosk',
];

// Check if a path is a public company slug route (/:slug) or tenant route (/:slug/:app)
function isPublicSlugRoute(pathname: string): boolean {
  // If path is exactly "/" or starts with an internal route, it's not a slug route
  if (pathname === '/') return false;
  
  // Check if it matches any internal route
  const isInternal = INTERNAL_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // Check if it matches a no-company (public) route
  const isNoCompany = isNoCompanyRoute(pathname);
  
  // If it's not internal and not a known no-company route
  if (!isInternal && !isNoCompany) {
    const segments = pathname.split('/').filter(Boolean);
    
    // /:slug (single segment) = public menu
    if (segments.length === 1) return true;
    
    // /:slug/:app (tenant routes) - check for known app routes
    if (segments.length >= 2) {
      const tenantApps = [
        'autoatendimento', 'delivery', 'web', 'tv', 'roleta', 'kds', 
        'entregador', 'garcom', 'balanca', 'totem', 'enologo', 'sommelier',
        'reservas', 'mesa', 'comanda'
      ];
      if (tenantApps.includes(segments[1])) return true;
    }
  }
  
  return false;
}

// Maximum time to wait for loading before rendering content anyway
const MAX_LOADING_TIME_MS = 3000; // Reduzido de 5000 para 3000ms

export function CompanyAccessGuard({ children }: CompanyAccessGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: accessStatus, isLoading: accessLoading, isFetched } = useCompanyAccess();
  const [loadingTimeout, setLoadingTimeout] = useState(false);


  const isAllowedWhenBlocked = ALLOWED_BLOCKED_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  const requiresNoCompany = isNoCompanyRoute(location.pathname);

  // Check if this is a public slug route (/:slug)
  const isSlugRoute = isPublicSlugRoute(location.pathname);


  // OTIMIZAÇÃO: Safety timeout reduzido e mais agressivo
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, MAX_LOADING_TIME_MS);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    // Skip check for public routes or slug routes
    if (requiresNoCompany || isSlugRoute) return;
    
    // Wait for loading to complete
    if (authLoading || accessLoading) return;

    // If not authenticated, don't do anything (Auth handles redirect)
    if (!user) return;

    // If on an allowed blocked route, don't redirect
    if (isAllowedWhenBlocked) return;

    // If access is denied, redirect to blocked page
    if (accessStatus && !accessStatus.hasAccess) {
      navigate('/bloqueado', { 
        replace: true,
        state: { reason: accessStatus.reason }
      });
    }
  }, [user, authLoading, accessLoading, accessStatus, isAllowedWhenBlocked, requiresNoCompany, isSlugRoute, navigate]);

  // For public routes that don't require company/auth, render immediately
  if (requiresNoCompany || isSlugRoute) {
    return <>{children}</>;
  }

  // OTIMIZAÇÃO: Renderizar mais cedo se já temos dados de acesso
  // Show loading while checking access (only for protected routes)
  // But if we've timed out OR access was already fetched, render content
  const shouldRenderContent = loadingTimeout || (isFetched && !accessLoading);
  
  if ((authLoading || accessLoading) && !shouldRenderContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth (prevents "tela preta" on protected routes like /waiter)
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // Allow rendering if on allowed route or access granted
  // Default to true if accessStatus hasn't loaded yet (fail open)
  if (isAllowedWhenBlocked || accessStatus?.hasAccess !== false) {
    return <>{children}</>;
  }

  // If access explicitly denied, show blocked page
  return <Navigate to="/bloqueado" replace state={{ reason: accessStatus?.reason }} />;
}
