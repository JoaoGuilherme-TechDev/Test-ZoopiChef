/**
 * PublicDeliveryTracker - Rastreamento de Entrega em Tempo Real
 * 
 * Página pública que permite ao cliente acompanhar a localização
 * do entregador e tempo estimado de chegada.
 * 
 * Acesso: /rastrear/:token
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  CheckCircle2,
  Phone,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OrderData {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  status: string;
  delivery_eta_minutes: number | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  company_id: string;
  deliverer_id: string | null;
}

interface DelivererData {
  id: string;
  name: string;
  whatsapp: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
}

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

const createDelivererIcon = () => {
  return L.divIcon({
    className: 'deliverer-marker',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
        animation: pulse-deliverer 2s infinite;
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h1"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'destination-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border: 3px solid white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3" fill="none" stroke="white" stroke-width="2"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatETA(minutes: number | null, dispatchedAt: string | null): string {
  if (!minutes && !dispatchedAt) return 'Calculando...';
  
  if (minutes) {
    if (minutes < 1) return 'Chegando!';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  }
  
  return 'Em breve';
}

export default function PublicDeliveryTracker() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [deliverer, setDeliverer] = useState<DelivererData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicETA, setDynamicETA] = useState<number | null>(null);
  
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const delivererMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Fetch order data
  useEffect(() => {
    if (!token) {
      setError('Link inválido');
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      try {
        // Get order by tracking token
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, status, delivery_eta_minutes, delivery_latitude, delivery_longitude, dispatched_at, delivered_at, company_id, deliverer_id')
          .eq('tracking_token', token)
          .single();

        if (orderError || !orderData) {
          setError('Pedido não encontrado');
          setIsLoading(false);
          return;
        }

        setOrder(orderData);

        // Get company
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, logo_url, primary_color')
          .eq('id', orderData.company_id)
          .single();
        
        if (companyData) setCompany(companyData);

        // Get deliverer
        if (orderData.deliverer_id) {
          const { data: delivererData } = await supabase
            .from('deliverers')
            .select('id, name, whatsapp, last_latitude, last_longitude, last_location_at')
            .eq('id', orderData.deliverer_id)
            .single();
          
          if (delivererData) setDeliverer(delivererData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erro ao carregar rastreamento');
        setIsLoading(false);
      }
    }

    fetchData();

    // Realtime for order updates
    const orderChannel = supabase
      .channel(`delivery-tracker-order-${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `tracking_token=eq.${token}`,
        },
        (payload) => {
          setOrder(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [token]);

  // Realtime for deliverer location
  useEffect(() => {
    if (!order?.deliverer_id) return;

    const fetchDeliverer = async () => {
      const { data } = await supabase
        .from('deliverers')
        .select('id, name, whatsapp, last_latitude, last_longitude, last_location_at')
        .eq('id', order.deliverer_id)
        .single();
      
      if (data) setDeliverer(data);
    };

    // Poll every 10 seconds for location updates
    const interval = setInterval(fetchDeliverer, 10000);

    // Realtime channel for deliverer updates
    const channel = supabase
      .channel(`deliverer-location-${order.deliverer_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliverers',
          filter: `id=eq.${order.deliverer_id}`,
        },
        (payload) => {
          setDeliverer(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [order?.deliverer_id]);

  // Initialize map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current || isLoading || error) return;

    const defaultCenter: [number, number] = [-21.18, -47.76];
    
    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(defaultCenter, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isLoading, error]);

  // Update map markers and route
  useEffect(() => {
    if (!mapRef.current) return;

    const delivererLat = deliverer?.last_latitude;
    const delivererLng = deliverer?.last_longitude;
    const destLat = order?.delivery_latitude;
    const destLng = order?.delivery_longitude;

    const hasDeliverer = delivererLat && delivererLng && 
      Number.isFinite(delivererLat) && Number.isFinite(delivererLng);
    const hasDest = destLat && destLng && 
      Number.isFinite(Number(destLat)) && Number.isFinite(Number(destLng));

    // Update deliverer marker
    if (hasDeliverer) {
      if (delivererMarkerRef.current) {
        delivererMarkerRef.current.setLatLng([delivererLat, delivererLng]);
      } else {
        delivererMarkerRef.current = L.marker([delivererLat, delivererLng], {
          icon: createDelivererIcon(),
        }).addTo(mapRef.current);
      }
    }

    // Update destination marker
    if (hasDest) {
      const dLat = Number(destLat);
      const dLng = Number(destLng);
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng([dLat, dLng]);
      } else {
        destinationMarkerRef.current = L.marker([dLat, dLng], {
          icon: createDestinationIcon(),
        }).addTo(mapRef.current);
      }
    }

    // Draw route line
    if (hasDeliverer && hasDest) {
      const dLat = Number(destLat);
      const dLng = Number(destLng);
      
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs([[delivererLat, delivererLng], [dLat, dLng]]);
      } else {
        routeLineRef.current = L.polyline(
          [[delivererLat, delivererLng], [dLat, dLng]],
          { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '10, 10' }
        ).addTo(mapRef.current);
      }

      // Calculate dynamic ETA (3 min/km average)
      const distance = calculateDistance(delivererLat, delivererLng, dLat, dLng);
      const eta = Math.round(distance * 3);
      setDynamicETA(eta);

      // Fit bounds
      const bounds = L.latLngBounds([
        [delivererLat, delivererLng],
        [dLat, dLng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    } else if (hasDeliverer) {
      mapRef.current.setView([delivererLat, delivererLng], 15);
    } else if (hasDest) {
      mapRef.current.setView([Number(destLat), Number(destLng)], 15);
    }
  }, [deliverer, order]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white">Carregando rastreamento...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link Inválido</h1>
          <p className="text-slate-400">{error || 'Este link de rastreamento não existe ou expirou.'}</p>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'entregue';
  const displayETA = dynamicETA ?? order.delivery_eta_minutes;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <style>
        {`
          @keyframes pulse-deliverer {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5); }
            50% { transform: scale(1.05); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.7); }
          }
          .leaflet-container { background: #1e293b; }
        `}
      </style>

      {/* Header */}
      <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-8 w-auto rounded" />
            ) : (
              <div className="h-8 w-8 rounded bg-blue-500/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-400" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-semibold text-white">{company?.name || 'Rastreamento'}</h1>
              <p className="text-xs text-slate-400">Pedido #{order.order_number}</p>
            </div>
          </div>
          {deliverer?.whatsapp && (
            <a
              href={`https://wa.me/55${deliverer.whatsapp.replace(/\D/g, '')}`}
              className="p-2 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
        </div>
      </header>

      {/* Map */}
      <div ref={mapElRef} className="flex-1 min-h-[300px]" />

      {/* Bottom Card */}
      <div className="bg-slate-800 border-t border-slate-700/50 rounded-t-3xl -mt-6 z-10 relative">
        <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
        
        <div className="px-4 pb-6 max-w-lg mx-auto">
          {/* Status Badge */}
          <div className={cn(
            "flex items-center justify-center gap-2 py-3 px-4 rounded-xl mb-4",
            isDelivered 
              ? "bg-green-500/20 text-green-400" 
              : "bg-blue-500/20 text-blue-400"
          )}>
            {isDelivered ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Entregue!</span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Truck className="w-5 h-5" />
                </motion.div>
                <span className="font-semibold">A caminho</span>
              </>
            )}
          </div>

          {/* ETA Card */}
          {!isDelivered && (
            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Previsão de chegada</p>
                    <p className="text-2xl font-bold text-white">
                      {formatETA(displayETA, order.dispatched_at)}
                    </p>
                  </div>
                </div>
                <Navigation className="w-8 h-8 text-slate-500" />
              </div>
            </div>
          )}

          {/* Deliverer Info */}
          {deliverer && (
            <div className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {deliverer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{deliverer.name}</p>
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Seu entregador
                </p>
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-start gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Pedido para: {order.customer_name || 'Cliente'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
