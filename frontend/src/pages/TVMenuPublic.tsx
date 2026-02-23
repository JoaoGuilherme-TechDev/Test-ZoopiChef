import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTVMenu } from '@/hooks/useTVMenu';
import { usePublicBanners } from '@/hooks/useBanners';
import { useCompanyAccessBySlug } from '@/hooks/useCompanyAccessBySlug';
import { Loader2 } from 'lucide-react';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { useOrderReadyCallsListener } from '@/hooks/useOrderReadyCalls';
import { OrderReadyOverlay } from '@/components/tv/OrderReadyOverlay';
import { OrderReadyHistory } from '@/components/tv/OrderReadyHistory';
import { FullscreenButton } from '@/components/tv/FullscreenButton';
import { useTVOrderReadySound } from '@/hooks/useTVOrderReadySound';
import { supabase } from '@/lib/supabase-shim';

const BANNER_INTERVAL = 8000; // 8 seconds

export default function TVMenu() {
  const { slug } = useParams();
  const { company, categories, subcategories, products, isLoading } = useTVMenu(slug);
  const { data: banners = [] } = usePublicBanners(company?.id);
  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessBySlug(slug);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [tickerMessage, setTickerMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<'chime' | 'bell' | 'ding' | 'notification' | 'custom'>('chime');
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);
  const [orderReadyDuration, setOrderReadyDuration] = useState(5);
  const [soundLoop, setSoundLoop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Visual settings from TV config
  const [tvSettings, setTvSettings] = useState({
    backgroundColor: '#1a1a1a',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#ff6b00',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    logoUrl: null as string | null,
    showLogo: true,
    showClock: true,
    slideDuration: 10,
  });

  // Fetch TV display settings (all visual + sound settings)
  useEffect(() => {
    if (!company?.id) return;
    
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('tv_display_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (data) {
        // Sound settings
        if (data.ticker_message) {
          setTickerMessage(data.ticker_message);
        }
        setSoundEnabled(data.sound_enabled ?? true);
        setSoundType((data.sound_type as typeof soundType) ?? 'chime');
        setSoundVolume(data.sound_volume ?? 0.7);
        setCustomSoundUrl(data.custom_sound_url);
        setOrderReadyDuration(data.order_ready_duration_seconds ?? 5);
        setSoundLoop(data.sound_loop ?? false);
        
        // Visual settings
        setTvSettings({
          backgroundColor: data.background_color || '#1a1a1a',
          primaryColor: data.primary_color || '#000000',
          secondaryColor: data.secondary_color || '#ffffff',
          accentColor: data.accent_color || '#ff6b00',
          textColor: data.text_color || '#ffffff',
          fontFamily: data.font_family || 'Inter',
          logoUrl: data.logo_url,
          showLogo: data.show_logo ?? true,
          showClock: data.show_clock ?? true,
          slideDuration: data.slide_duration_seconds ?? 10,
        });
      }
    };
    
    fetchSettings();
  }, [company?.id]);

  // Order ready calls listener
  const { currentCall, recentCalls } = useOrderReadyCallsListener(company?.id);
  
  // Sound notification hook
  const { playOrderReadySound, stopLoopingSound } = useTVOrderReadySound({ 
    enabled: soundEnabled,
    soundType,
    volume: soundVolume,
    customSoundUrl,
    loop: soundLoop,
  });
  
  // Play sound when a new order is ready (currentCall changes)
  useEffect(() => {
    if (currentCall && soundEnabled) {
      playOrderReadySound(currentCall.id);
    }
  }, [currentCall, soundEnabled, playOrderReadySound]);

  // Rotate banners every 8 seconds (skip failed images)
  useEffect(() => {
    const validBanners = banners.filter(b => !failedImages.has(b.id));
    if (validBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % validBanners.length);
    }, BANNER_INTERVAL);

    return () => clearInterval(interval);
  }, [banners, failedImages]);

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

  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  // Check access status
  if (accessStatus && !accessStatus.hasAccess) {
    return <StoreUnavailable companyName={accessStatus.companyName} />;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-2xl">Empresa não encontrada</p>
      </div>
    );
  }

  const validBanners = banners.filter(b => !failedImages.has(b.id));
  const currentBanner = validBanners[currentBannerIndex];

  // Build footer message from company info
  const footerMessage = [
    company.whatsapp ? `WhatsApp: ${company.whatsapp}` : '',
    company.address || ''
  ].filter(Boolean).join(' • ');

  // If we have banners, show fullscreen banner mode with centered image
  if (validBanners.length > 0) {
    return (
      <div 
        ref={containerRef}
        className="h-screen w-screen overflow-hidden relative flex flex-col"
        style={{ 
          backgroundColor: tvSettings.backgroundColor,
          color: tvSettings.textColor,
          fontFamily: tvSettings.fontFamily,
        }}
      >
        {/* Order Ready Overlay */}
        {currentCall && (
          <OrderReadyOverlay 
            call={currentCall} 
            durationSeconds={orderReadyDuration}
            onDismiss={stopLoopingSound}
          />
        )}
        
        {/* Order Ready History - Top Left */}
        {recentCalls.length > 0 && !currentCall && <OrderReadyHistory calls={recentCalls} />}

        {/* Company name/logo - centered */}
        <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-center pointer-events-none gap-3">
          {tvSettings.showLogo && tvSettings.logoUrl && (
            <img 
              src={tvSettings.logoUrl} 
              alt={company.name}
              className="h-10 object-contain drop-shadow-lg"
            />
          )}
          <h1 
            className="text-2xl font-bold drop-shadow-lg"
            style={{ color: tvSettings.textColor }}
          >
            {company.name}
          </h1>
        </div>

        {/* Fullscreen Button - Bottom Left, always visible */}
        <div className="fixed bottom-24 left-4 z-50">
          <FullscreenButton autoHide={false} />
        </div>

        {/* Banner Area - takes full height minus footer bar, image centered */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          {validBanners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
                index === currentBannerIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={banner.image_url}
                alt={banner.title || 'Banner'}
                onError={() => handleImageError(banner.id)}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>

        {/* Banner indicators */}
        {validBanners.length > 1 && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {validBanners.map((_, index) => (
              <div
                key={index}
                className="w-3 h-3 rounded-full transition-colors"
                style={{ 
                  backgroundColor: index === currentBannerIndex 
                    ? tvSettings.accentColor 
                    : `${tvSettings.secondaryColor}50`
                }}
              />
            ))}
          </div>
        )}

        {/* Fixed Description Bar at Bottom - ALWAYS visible with scrolling message */}
        <div 
          className="w-full backdrop-blur-sm py-4 px-8"
          style={{ 
            minHeight: '80px',
            backgroundColor: `${tvSettings.primaryColor}F2`,
            borderTop: `1px solid ${tvSettings.secondaryColor}20`,
          }}
        >
          {/* Scrolling description message - ticker_message takes priority */}
          <div className="overflow-hidden w-full">
            <div 
              className="animate-marquee whitespace-nowrap"
              style={{ 
                fontFamily: currentBanner?.description_font || tvSettings.fontFamily,
                color: currentBanner?.description_color || tvSettings.textColor
              }}
            >
              <span className="text-xl md:text-2xl mx-8">
                {tickerMessage || currentBanner?.description || company.name}
              </span>
              <span className="text-xl md:text-2xl mx-8">
                {tickerMessage || currentBanner?.description || company.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: products only (no banners)
  const categoryProducts = products.filter(p => p.aparece_tv !== false);

  return (
    <div 
      ref={containerRef}
      className="h-screen w-screen overflow-hidden relative flex flex-col"
      style={{ 
        backgroundColor: tvSettings.backgroundColor,
        color: tvSettings.textColor,
        fontFamily: tvSettings.fontFamily,
      }}
    >
      {/* Order Ready Overlay */}
      {currentCall && (
        <OrderReadyOverlay 
          call={currentCall} 
          durationSeconds={orderReadyDuration}
          onDismiss={stopLoopingSound}
        />
      )}
      
      {/* Order Ready History - Top Left */}
      {recentCalls.length > 0 && !currentCall && <OrderReadyHistory calls={recentCalls} />}

      {/* Fullscreen Button - Bottom Left, always visible */}
      <div className="fixed bottom-24 left-4 z-50">
        <FullscreenButton autoHide={false} />
      </div>

      {/* Header */}
      <header 
        className="backdrop-blur-sm py-6 px-8 flex items-center justify-center gap-4"
        style={{ 
          backgroundColor: `${tvSettings.primaryColor}80`,
        }}
      >
        {tvSettings.showLogo && tvSettings.logoUrl && (
          <img 
            src={tvSettings.logoUrl} 
            alt={company.name}
            className="h-12 object-contain"
          />
        )}
        <h1 
          className="text-4xl font-bold text-center"
          style={{ color: tvSettings.textColor }}
        >
          {company.name}
        </h1>
      </header>

      {/* Products Grid */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categoryProducts.slice(0, 16).map((product) => (
            <div
              key={product.id}
              className="backdrop-blur rounded-xl p-4"
              style={{
                backgroundColor: `${tvSettings.secondaryColor}10`,
                border: `1px solid ${tvSettings.secondaryColor}20`,
              }}
            >
              <h3 
                className="font-semibold text-lg mb-2 line-clamp-2"
                style={{ color: tvSettings.textColor }}
              >
                {product.name}
              </h3>
              <p 
                className="text-2xl font-bold"
                style={{ color: tvSettings.accentColor }}
              >
                R$ {Number(product.price).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Footer with scrolling message - ticker_message takes priority */}
      <div 
        className="w-full backdrop-blur-sm py-4 px-0"
        style={{ 
          minHeight: '70px',
          backgroundColor: `${tvSettings.primaryColor}F2`,
          borderTop: `1px solid ${tvSettings.secondaryColor}20`,
        }}
      >
        <div className="overflow-hidden">
          <div 
            className="animate-marquee whitespace-nowrap"
            style={{ color: tvSettings.textColor }}
          >
            <span className="text-xl md:text-2xl font-medium mx-8">
              {tickerMessage || `${company.name}${footerMessage ? ` • ${footerMessage}` : ''}`}
            </span>
            <span className="text-xl md:text-2xl font-medium mx-8">
              {tickerMessage || `${company.name}${footerMessage ? ` • ${footerMessage}` : ''}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
