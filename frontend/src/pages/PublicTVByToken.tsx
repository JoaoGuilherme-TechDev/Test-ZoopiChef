import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCompanyAccessByToken } from '@/hooks/useCompanyAccess';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, AlertTriangle, Maximize, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { validateTokenPrefix, isLegacyToken } from '@/utils/tokenValidation';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { useOrderReadyCallsListener } from '@/hooks/useOrderReadyCalls';
import { OrderReadyOverlay } from '@/components/tv/OrderReadyOverlay';
import { OrderReadyHistory } from '@/components/tv/OrderReadyHistory';
import { useTVOrderReadySound } from '@/hooks/useTVOrderReadySound';
import type { SoundType } from '@/hooks/useTVDisplaySettings';
interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  tv_screen_id: string | null;
  description_font: string | null;
  description_color: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  is_on_sale?: boolean;
  sale_price?: number | null;
  is_featured?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface TVData {
  companyId: string;
  companyName: string;
  banners: Banner[];
  products: Product[];
  categories: Category[];
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

const REFRESH_INTERVAL = 60000; // 60 seconds
const BANNER_INTERVAL = 8000; // 8 seconds

export default function PublicTVByToken() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const isDebugMode = searchParams.get('debug') === '1';
  
  // Validate token prefix (allow legacy tokens without prefix)
  const isValidToken = token && (validateTokenPrefix(token, 'tv') || isLegacyToken(token));
  
  // Use the company_public_links table to get company data
  // Also check tv_screens table for individual TV tokens
  const { data: company, isLoading: companyLoading, error: companyError } = useQuery({
    queryKey: ['tv-company-by-token', token],
    queryFn: async () => {
      if (!token) return null;

      // First try company_public_links (generic TV token)
      let { data: linkData } = await (supabase as any)
        .from('company_public_links')
        .select('company_id')
        .eq('tv_token_v2', token)
        .maybeSingle();

      // If not found, try legacy token
      if (!linkData) {
        const result = await (supabase as any)
          .from('company_public_links')
          .select('company_id')
          .eq('tv_token', token)
          .maybeSingle();
        linkData = result.data;
      }

      // If still not found, try tv_screens table (individual TV screen tokens)
      if (!linkData) {
        const { data: tvScreenData } = await supabase
          .from('tv_screens')
          .select('company_id')
          .eq('token', token)
          .eq('active', true)
          .maybeSingle();
        
        if (tvScreenData) {
          linkData = { company_id: tvScreenData.company_id };
        }
      }

      if (!linkData?.company_id) return null;

      // Use public_companies view for public-facing data
      const { data: companyData, error: companyError } = await supabase
        .from('public_companies')
        .select('id, name, slug, address, whatsapp')
        .eq('id', linkData.company_id)
        .maybeSingle();

      if (companyError) throw companyError;
      return companyData;
    },
    enabled: !!token && isValidToken,
  });
  
  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessByToken(company?.id);
  
  // Order ready calls listener
  const { currentCall, recentCalls } = useOrderReadyCallsListener(company?.id);

  // Sound configuration state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>('chime');
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);
  const [orderReadyDuration, setOrderReadyDuration] = useState(5);
  const [soundLoop, setSoundLoop] = useState(false);

  // Sound notification hook
  const { playOrderReadySound, stopLoopingSound } = useTVOrderReadySound({ 
    enabled: soundEnabled,
    soundType,
    volume: soundVolume,
    customSoundUrl,
    loop: soundLoop,
  });

  // State for data with fallback
  const [tvData, setTvData] = useState<TVData | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // UI state
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch sound settings
  useEffect(() => {
    if (!company?.id) return;
    
    const fetchSoundSettings = async () => {
      const { data } = await supabase
        .from('tv_display_settings')
        .select('sound_enabled, sound_type, sound_volume, custom_sound_url, order_ready_duration_seconds, sound_loop')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (data) {
        setSoundEnabled(data.sound_enabled ?? true);
        setSoundType((data.sound_type as SoundType) ?? 'chime');
        setSoundVolume(data.sound_volume ?? 0.7);
        setCustomSoundUrl(data.custom_sound_url);
        setOrderReadyDuration(data.order_ready_duration_seconds ?? 5);
        setSoundLoop(data.sound_loop ?? false);
      }
    };
    
    fetchSoundSettings();
  }, [company?.id]);

  // Play sound when a new order is ready
  useEffect(() => {
    if (currentCall && soundEnabled) {
      playOrderReadySound(currentCall.id);
    }
  }, [currentCall, soundEnabled, playOrderReadySound]);

  // Fetch TV data
  const fetchTVData = useCallback(async () => {
    if (!company?.id) return;

    try {
      // Fetch banners - get all active banners for the company
      const { data: bannersData } = await supabase
        .from('banners')
        .select('id, image_url, title, description, tv_screen_id, description_font, description_color')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('display_order', { ascending: true });

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price, is_on_sale, sale_price, is_featured')
        .eq('company_id', company.id)
        .eq('active', true)
        .eq('aparece_tv', true)
        .order('is_featured', { ascending: false })
        .order('name');

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      setTvData({
        companyId: company.id,
        companyName: company.name,
        banners: bannersData || [],
        products: productsData || [],
        categories: categoriesData || [],
      });
      setLastRefreshAt(new Date());
      setFetchError(null);
    } catch (error: any) {
      console.error('TV fetch error:', error);
      setFetchError(error.message);
    }
  }, [company?.id, company?.name]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (company?.id) {
      fetchTVData();
      const interval = setInterval(fetchTVData, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [company?.id, fetchTVData]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Rotate banners every 8 seconds (skip failed images)
  useEffect(() => {
    const validBanners = tvData?.banners.filter(b => !failedImages.has(b.id)) || [];
    if (validBanners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % validBanners.length);
    }, BANNER_INTERVAL);
    return () => clearInterval(interval);
  }, [tvData?.banners, failedImages]);

  // Prevent scroll and hide scrollbars
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Handle image error
  const handleImageError = (bannerId: string) => {
    setFailedImages(prev => new Set(prev).add(bannerId));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Invalid token
  if (!token || (!isValidToken && !isLegacyToken(token))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Token inválido</h1>
          <p className="text-gray-400">Este token não é válido para TV.</p>
        </div>
      </div>
    );
  }

  // Initial loading
  if ((companyLoading || accessLoading) && !tvData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Check company access after loading
  if (company && accessStatus && !accessStatus.hasAccess) {
    return <StoreUnavailable companyName={company.name} />;
  }

  // Company not found
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">TV não encontrada</h1>
          <p className="text-gray-400">Este link de TV não existe ou foi desativado.</p>
          {companyError && isDebugMode && (
            <p className="text-red-400 text-sm mt-4">Erro: {(companyError as Error).message}</p>
          )}
        </div>
      </div>
    );
  }

  const validBanners = tvData?.banners.filter(b => !failedImages.has(b.id)) || [];
  const hasContent = validBanners.length > 0 || (tvData?.products?.length ?? 0) > 0;
  const currentBanner = validBanners[currentBannerIndex];

  // Fallback: no content
  if (tvData && !hasContent) {
    return (
      <div 
        ref={containerRef}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
      >
        <div className="text-center p-8">
          <h1 className="text-5xl font-bold mb-6">{tvData.companyName}</h1>
          <p className="text-2xl text-gray-400">Sem anúncios configurados</p>
          <p className="text-gray-500 mt-4">Configure banners ou produtos para exibição na TV.</p>
        </div>
        
        {/* Debug overlay */}
        {isDebugMode && (
          <DebugOverlay
            companyId={tvData.companyId}
            bannerCount={tvData.banners.length}
            productCount={tvData.products.length}
            lastRefreshAt={lastRefreshAt}
            isOnline={isOnline}
            fetchError={fetchError}
            onRefresh={fetchTVData}
            onFullscreen={toggleFullscreen}
          />
        )}
      </div>
    );
  }

  // If we have banners, show fullscreen banner mode
  if (validBanners.length > 0) {
    return (
      <div 
        ref={containerRef}
        className="h-screen w-screen bg-black text-white overflow-hidden relative flex flex-col"
      >
        {/* Order Ready Overlay */}
        {currentCall && (
          <OrderReadyOverlay 
            call={currentCall} 
            durationSeconds={orderReadyDuration}
            onDismiss={stopLoopingSound}
          />
        )}
        
        {/* Order Ready History */}
        {recentCalls.length > 0 && !currentCall && <OrderReadyHistory calls={recentCalls} />}

        {/* Company name overlay */}
        <div className="absolute top-4 left-4 z-20">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{company.name}</h1>
        </div>

        {/* Banner Area - takes full height minus description bar */}
        <div className="flex-1 relative overflow-hidden">
          {validBanners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentBannerIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={banner.image_url}
                alt={banner.title || 'Banner'}
                onError={() => handleImageError(banner.id)}
                className="w-full h-full object-contain bg-black"
              />
            </div>
          ))}
        </div>

        {/* Fixed Description Bar at Bottom */}
        {currentBanner && (currentBanner.title || currentBanner.description) && (
          <div 
            className="w-full bg-black/95 backdrop-blur-sm border-t border-white/10 py-4 px-8"
            style={{ minHeight: '80px' }}
          >
            <div className="flex items-center gap-6">
              {currentBanner.title && (
                <h2 className="text-2xl md:text-3xl font-bold whitespace-nowrap shrink-0">
                  {currentBanner.title}
                </h2>
              )}
              {currentBanner.description && (
                <div className="flex-1 overflow-hidden">
                  <div 
                    className="animate-marquee whitespace-nowrap"
                    style={{ 
                      fontFamily: currentBanner.description_font || 'Inter',
                      color: currentBanner.description_color || '#FFFFFF'
                    }}
                  >
                    <span className="text-xl md:text-2xl mx-8">
                      {currentBanner.description}
                    </span>
                    <span className="text-xl md:text-2xl mx-8">
                      {currentBanner.description}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Banner indicators */}
        {validBanners.length > 1 && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {validBanners.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentBannerIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Debug overlay */}
        {isDebugMode && tvData && (
          <DebugOverlay
            companyId={tvData.companyId}
            bannerCount={tvData.banners.length}
            productCount={tvData.products.length}
            lastRefreshAt={lastRefreshAt}
            isOnline={isOnline}
            fetchError={fetchError}
            onRefresh={fetchTVData}
            onFullscreen={toggleFullscreen}
          />
        )}
      </div>
    );
  }

  // Fallback: products only (no banners)
  return (
    <div 
      ref={containerRef}
      className="h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden relative"
    >
      {/* Order Ready Overlay */}
      {currentCall && (
        <OrderReadyOverlay 
          call={currentCall} 
          durationSeconds={orderReadyDuration}
          onDismiss={stopLoopingSound}
        />
      )}
      
      {/* Order Ready History */}
      {recentCalls.length > 0 && !currentCall && <OrderReadyHistory calls={recentCalls} />}

      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm py-6 px-8">
        <h1 className="text-4xl font-display font-bold text-center">{company.name}</h1>
      </header>

      {/* Products Grid */}
      <div className="p-6 h-[calc(100vh-88px)] overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tvData?.products?.slice(0, 16).map((product) => (
            <div
              key={product.id}
              className={`bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 ${
                product.is_featured ? 'ring-2 ring-primary' : ''
              }`}
            >
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
              {product.is_on_sale && product.sale_price ? (
                <div>
                  <p className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</p>
                  <p className="text-2xl font-bold text-red-400">{formatPrice(product.sale_price)}</p>
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Debug overlay */}
      {isDebugMode && tvData && (
        <DebugOverlay
          companyId={tvData.companyId}
          bannerCount={tvData.banners.length}
          productCount={tvData.products.length}
          lastRefreshAt={lastRefreshAt}
          isOnline={isOnline}
          fetchError={fetchError}
          onRefresh={fetchTVData}
          onFullscreen={toggleFullscreen}
        />
      )}
    </div>
  );
}

// Debug Overlay Component
function DebugOverlay({
  companyId,
  bannerCount,
  productCount,
  lastRefreshAt,
  isOnline,
  fetchError,
  onRefresh,
  onFullscreen,
}: {
  companyId: string;
  bannerCount: number;
  productCount: number;
  lastRefreshAt: Date | null;
  isOnline: boolean;
  fetchError: string | null;
  onRefresh: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-xs text-white font-mono space-y-1 max-w-xs z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-primary font-bold">DEBUG MODE</span>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      
      <div className="space-y-1 text-gray-300">
        <p><span className="text-gray-500">company_id:</span> {companyId.substring(0, 8)}...</p>
        <p><span className="text-gray-500">banners_ativos:</span> {bannerCount}</p>
        <p><span className="text-gray-500">produtos_tv:</span> {productCount}</p>
        <p>
          <span className="text-gray-500">last_refresh:</span>{' '}
          {lastRefreshAt ? lastRefreshAt.toLocaleTimeString('pt-BR') : 'N/A'}
        </p>
        {fetchError && (
          <p className="text-red-400">
            <span className="text-gray-500">erro:</span> {fetchError.substring(0, 30)}...
          </p>
        )}
      </div>
      
      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-700">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRefresh}
          className="text-xs h-7 px-2"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onFullscreen}
          className="text-xs h-7 px-2"
        >
          <Maximize className="w-3 h-3 mr-1" />
          Tela cheia
        </Button>
      </div>
    </div>
  );
}
