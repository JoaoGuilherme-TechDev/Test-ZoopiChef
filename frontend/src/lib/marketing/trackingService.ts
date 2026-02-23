/**
 * Marketing Tracking Service
 * Handles Meta Pixel, GA4, and GTM events
 * LGPD Compliant: No sensitive data (phone, name, address) is sent
 */

export interface TrackingProduct {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface TrackingPayload {
  order_id?: string;
  value?: number;
  currency?: string;
  items?: TrackingProduct[];
  content_type?: string;
  content_ids?: string[];
  content_name?: string;
}

interface MarketingConfig {
  metaPixelId?: string | null;
  ga4MeasurementId?: string | null;
  gtmContainerId?: string | null;
  enableDebug?: boolean;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

class TrackingService {
  private config: MarketingConfig = {};
  private initialized = false;

  /**
   * Initialize tracking with company config
   */
  initialize(config: MarketingConfig) {
    this.config = config;
    this.initialized = true;

    if (config.enableDebug) {
      console.log('[Tracking] Initialized with config:', {
        metaPixel: !!config.metaPixelId,
        ga4: !!config.ga4MeasurementId,
        gtm: !!config.gtmContainerId,
      });
    }
  }

  /**
   * Track PageView event
   */
  trackPageView(pageName?: string) {
    if (!this.initialized) return;

    // Meta Pixel
    if (this.config.metaPixelId && window.fbq) {
      window.fbq('track', 'PageView');
      this.debugLog('Meta Pixel', 'PageView');
    }

    // GA4
    if (this.config.ga4MeasurementId && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
      });
      this.debugLog('GA4', 'page_view', { page_title: pageName });
    }

    // GTM
    this.pushToDataLayer({
      event: 'pageview',
      pageName,
    });
  }

  /**
   * Track ViewContent (when viewing a product)
   */
  trackViewContent(product: { id: string; name: string; price: number }) {
    if (!this.initialized) return;

    const payload: TrackingPayload = {
      content_type: 'product',
      content_ids: [product.id],
      content_name: product.name,
      value: product.price,
      currency: 'BRL',
    };

    // Meta Pixel
    if (this.config.metaPixelId && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_type: 'product',
        content_ids: [product.id],
        content_name: product.name,
        value: product.price,
        currency: 'BRL',
      });
      this.debugLog('Meta Pixel', 'ViewContent', payload);
    }

    // GA4
    if (this.config.ga4MeasurementId && window.gtag) {
      window.gtag('event', 'view_item', {
        currency: 'BRL',
        value: product.price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
        }],
      });
      this.debugLog('GA4', 'view_item', payload);
    }

    // GTM
    this.pushToDataLayer({
      event: 'view_content',
      ...payload,
    });
  }

  /**
   * Track AddToCart event
   */
  trackAddToCart(product: { id: string; name: string; price: number; quantity: number }) {
    if (!this.initialized) return;

    const payload: TrackingPayload = {
      content_type: 'product',
      content_ids: [product.id],
      value: product.price * product.quantity,
      currency: 'BRL',
      items: [{
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
      }],
    };

    // Meta Pixel
    if (this.config.metaPixelId && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_type: 'product',
        content_ids: [product.id],
        value: product.price * product.quantity,
        currency: 'BRL',
      });
      this.debugLog('Meta Pixel', 'AddToCart', payload);
    }

    // GA4
    if (this.config.ga4MeasurementId && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'BRL',
        value: product.price * product.quantity,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: product.quantity,
        }],
      });
      this.debugLog('GA4', 'add_to_cart', payload);
    }

    // GTM
    this.pushToDataLayer({
      event: 'add_to_cart',
      ...payload,
    });
  }

  /**
   * Track InitiateCheckout event
   */
  trackInitiateCheckout(items: TrackingProduct[], totalValue: number) {
    if (!this.initialized) return;

    const contentIds = items.map(item => item.product_id);
    const payload: TrackingPayload = {
      content_type: 'product',
      content_ids: contentIds,
      value: totalValue,
      currency: 'BRL',
      items,
    };

    // Meta Pixel
    if (this.config.metaPixelId && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_type: 'product',
        content_ids: contentIds,
        value: totalValue,
        currency: 'BRL',
        num_items: items.length,
      });
      this.debugLog('Meta Pixel', 'InitiateCheckout', payload);
    }

    // GA4
    if (this.config.ga4MeasurementId && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'BRL',
        value: totalValue,
        items: items.map(item => ({
          item_id: item.product_id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      this.debugLog('GA4', 'begin_checkout', payload);
    }

    // GTM
    this.pushToDataLayer({
      event: 'initiate_checkout',
      ...payload,
    });
  }

  /**
   * Track Purchase event (order completed)
   */
  trackPurchase(orderId: string, items: TrackingProduct[], totalValue: number) {
    if (!this.initialized) return;

    const contentIds = items.map(item => item.product_id);
    const payload: TrackingPayload = {
      order_id: orderId,
      content_type: 'product',
      content_ids: contentIds,
      value: totalValue,
      currency: 'BRL',
      items,
    };

    // Meta Pixel
    if (this.config.metaPixelId && window.fbq) {
      window.fbq('track', 'Purchase', {
        content_type: 'product',
        content_ids: contentIds,
        value: totalValue,
        currency: 'BRL',
        num_items: items.length,
      });
      this.debugLog('Meta Pixel', 'Purchase', payload);
    }

    // GA4
    if (this.config.ga4MeasurementId && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        currency: 'BRL',
        value: totalValue,
        items: items.map(item => ({
          item_id: item.product_id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      this.debugLog('GA4', 'purchase', payload);
    }

    // GTM
    this.pushToDataLayer({
      event: 'purchase',
      ...payload,
    });
  }

  /**
   * Push event to GTM dataLayer
   */
  private pushToDataLayer(data: Record<string, unknown>) {
    if (!this.config.gtmContainerId) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
    this.debugLog('GTM dataLayer', 'push', data);
  }

  /**
   * Debug log helper
   */
  private debugLog(platform: string, event: string, payload?: unknown) {
    if (this.config.enableDebug) {
      console.log(`[Tracking][${platform}] ${event}`, payload || '');
    }
  }

  /**
   * Reset tracking (for cleanup)
   */
  reset() {
    this.config = {};
    this.initialized = false;
  }
}

// Singleton instance
export const trackingService = new TrackingService();
