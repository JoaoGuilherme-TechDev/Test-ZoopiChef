import { useEffect } from 'react';
import { usePublicMarketingSettings, PublicMarketingSettings } from '@/hooks/useMarketingSettings';
import { trackingService } from '@/lib/marketing/trackingService';

interface MarketingScriptsProps {
  companyId: string | undefined | null;
}

/**
 * Component that injects marketing scripts (Meta Pixel, GA4, GTM)
 * Only loads on public pages when enabled
 */
export function MarketingScripts({ companyId }: MarketingScriptsProps) {
  const { data: settings } = usePublicMarketingSettings(companyId);

  useEffect(() => {
    if (!settings) return;

    // Initialize tracking service
    trackingService.initialize({
      metaPixelId: settings.enable_meta_pixel ? settings.meta_pixel_id : null,
      ga4MeasurementId: settings.enable_ga4 ? settings.ga4_measurement_id : null,
      gtmContainerId: settings.enable_gtm ? settings.gtm_container_id : null,
      enableDebug: settings.enable_debug,
    });

    // Inject scripts
    injectScripts(settings);

    // Track initial page view
    trackingService.trackPageView(document.title);

    return () => {
      // Cleanup on unmount
      trackingService.reset();
    };
  }, [settings]);

  return null; // This component doesn't render anything
}

/**
 * Inject marketing scripts into the document head
 */
function injectScripts(settings: PublicMarketingSettings) {
  // Meta Pixel
  if (settings.enable_meta_pixel && settings.meta_pixel_id) {
    injectMetaPixel(settings.meta_pixel_id);
  }

  // Google Analytics 4
  if (settings.enable_ga4 && settings.ga4_measurement_id) {
    injectGA4(settings.ga4_measurement_id);
  }

  // Google Tag Manager
  if (settings.enable_gtm && settings.gtm_container_id) {
    injectGTM(settings.gtm_container_id);
  }
}

function injectMetaPixel(pixelId: string) {
  // Skip if already loaded
  if (document.getElementById('fb-pixel-script')) return;

  // Create fbq function
  const script = document.createElement('script');
  script.id = 'fb-pixel-script';
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
  `;
  document.head.appendChild(script);

  // Add noscript fallback
  const noscript = document.createElement('noscript');
  noscript.id = 'fb-pixel-noscript';
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

function injectGA4(measurementId: string) {
  // Skip if already loaded
  if (document.getElementById('ga4-script')) return;

  // Load gtag.js
  const gtagScript = document.createElement('script');
  gtagScript.id = 'ga4-script';
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(gtagScript);

  // Initialize gtag
  const initScript = document.createElement('script');
  initScript.id = 'ga4-init-script';
  initScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(initScript);
}

function injectGTM(containerId: string) {
  // Skip if already loaded
  if (document.getElementById('gtm-script')) return;

  // GTM head script
  const headScript = document.createElement('script');
  headScript.id = 'gtm-script';
  headScript.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `;
  document.head.appendChild(headScript);

  // GTM body noscript
  const noscript = document.createElement('noscript');
  noscript.id = 'gtm-noscript';
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}
