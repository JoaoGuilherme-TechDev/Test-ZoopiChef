import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Loader2,
  Map as MapIcon,
  Users,
  Package,
  AlertCircle,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fix default marker icons for Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DELIVERER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const getDelivererColor = (index: number) => DELIVERER_COLORS[index % DELIVERER_COLORS.length];

interface DelivererLocation {
  id: string;
  name: string;
  is_online: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  orders_in_transit: Array<{
    id: string;
    order_number?: number;
    customer_address: string | null;
    customer_name: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

interface StoreLocation {
  lat: number;
  lng: number;
  radius: number;
}

const isValidCoord = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);
};

const createDelivererIcon = (isOnline: boolean, hasOrders: boolean, color?: string) => {
  const bgColor = color || (isOnline ? (hasOrders ? '#f97316' : '#22c55e') : '#9ca3af');
  return L.divIcon({
    className: 'custom-deliverer-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${bgColor};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isOnline ? 'animation: pulse 2s infinite;' : ''}
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h1"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const createStoreIcon = () => {
  return L.divIcon({
    className: 'custom-store-marker',
    html: `
      <div style="
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border: 4px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};

const createDestinationIcon = (color: string, orderNumber: number) => {
  return L.divIcon({
    className: 'custom-destination-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border: 2px solid white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: 12px;
        font-weight: bold;
        color: white;
      ">
        ${orderNumber}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

export default function PublicGpsMap() {
  const { token } = useParams<{ token: string }>();
  const [deliverers, setDeliverers] = useState<DelivererLocation[]>([]);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const fetchData = async () => {
    if (!token) {
      setError('Token não fornecido');
      setIsLoading(false);
      return;
    }

    try {
      // Verify token and get company data using RPC or direct query
      const { data: settingsData, error: settingsError } = await supabase
        .from('deliverer_tracking_settings')
        .select('company_id, public_map_enabled, public_map_token')
        .eq('public_map_token', token)
        .maybeSingle();

      if (settingsError || !settingsData || !settingsData.public_map_enabled) {
        setError('Link inválido ou expirado');
        setIsLoading(false);
        return;
      }

      const companyId = settingsData.company_id;

      // Fetch company name separately
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, store_latitude, store_longitude')
        .eq('id', companyId)
        .single();

      setCompanyName(companyData?.name || 'Empresa');

      if (companyData?.store_latitude && companyData?.store_longitude) {
        setStoreLocation({
          lat: companyData.store_latitude,
          lng: companyData.store_longitude,
          radius: 100,
        });
      }

      // Fetch deliverer locations via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliverer-location`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'get_locations',
            company_id: companyId,
            public_token: token,
          }),
        }
      );

      if (!response.ok) throw new Error('Falha ao buscar localizações');
      
      const data = await response.json();
      setDeliverers(data.deliverers || []);
      
      if (data.store_location) {
        setStoreLocation(data.store_location);
      }
      
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching GPS data:', err);
      setError('Erro ao carregar dados');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Calculate stats
  const onlineCount = deliverers.filter(d => d.is_online).length;
  const ordersInTransit = deliverers.reduce((sum, d) => sum + d.orders_in_transit.length, 0);

  const deliverersWithLocation = useMemo(
    () => deliverers.filter(d => isValidCoord(d.last_latitude, d.last_longitude)),
    [deliverers]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
      return [storeLocation.lat, storeLocation.lng];
    }
    if (deliverersWithLocation.length > 0) {
      const latSum = deliverersWithLocation.reduce((sum, d) => sum + (d.last_latitude || 0), 0);
      const lngSum = deliverersWithLocation.reduce((sum, d) => sum + (d.last_longitude || 0), 0);
      return [latSum / deliverersWithLocation.length, lngSum / deliverersWithLocation.length];
    }
    return [-21.18, -47.76];
  }, [deliverersWithLocation, storeLocation]);

  // Init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current || isLoading) return;

    const map = L.map(mapElRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(mapCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isLoading]);

  // Render markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    // Store marker
    if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
      const storeMarker = L.marker([storeLocation.lat, storeLocation.lng], {
        icon: createStoreIcon(),
        zIndexOffset: 1000,
      });
      storeMarker.bindPopup(`
        <div style="padding:8px; text-align:center;">
          <div style="font-weight:600;">🏠 ${companyName}</div>
          <div style="font-size:12px; color:#6b7280;">Origem</div>
        </div>
      `);
      markersLayerRef.current.addLayer(storeMarker);
    }

    // Deliverer markers
    deliverersWithLocation.forEach((d, idx) => {
      const color = getDelivererColor(idx);
      const hasOrders = d.orders_in_transit.length > 0;

      const timeAgo = d.last_location_at
        ? formatDistanceToNow(new Date(d.last_location_at), { addSuffix: true, locale: ptBR })
        : null;

      const popupHtml = `
        <div style="padding:8px; min-width:180px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="width:16px; height:16px; border-radius:50%; background:${color};"></div>
            <div style="font-weight:600;">${d.name}</div>
          </div>
          ${timeAgo ? `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">${timeAgo}</div>` : ''}
          ${hasOrders ? `<div style="color:${color}; font-size:12px;">${d.orders_in_transit.length} entrega(s)</div>` : '<div style="color:#22c55e; font-size:12px;">Disponível</div>'}
        </div>
      `;

      const marker = L.marker([d.last_latitude!, d.last_longitude!], {
        icon: createDelivererIcon(d.is_online, hasOrders, hasOrders ? color : undefined),
      });
      marker.bindPopup(popupHtml);
      markersLayerRef.current!.addLayer(marker);

      // Routes
      if (storeLocation && hasOrders && isValidCoord(storeLocation.lat, storeLocation.lng)) {
        const line = L.polyline(
          [[storeLocation.lat, storeLocation.lng], [d.last_latitude!, d.last_longitude!]],
          { color, weight: 2, opacity: 0.4, dashArray: '4, 8' }
        );
        routesLayerRef.current!.addLayer(line);
      }

      // Destination markers
      d.orders_in_transit.forEach((order, orderIdx) => {
        if (!isValidCoord(order.latitude, order.longitude)) return;

        const routeLine = L.polyline(
          [[d.last_latitude!, d.last_longitude!], [order.latitude!, order.longitude!]],
          { color, weight: 3, opacity: 0.7, dashArray: '8, 8' }
        );
        routesLayerRef.current!.addLayer(routeLine);

        const destMarker = L.marker([order.latitude!, order.longitude!], {
          icon: createDestinationIcon(color, orderIdx + 1),
        });
        destMarker.bindPopup(`
          <div style="padding:8px;">
            <div style="font-weight:600;">${order.customer_name || 'Cliente'}</div>
            ${order.order_number ? `<div style="font-size:11px; color:#6b7280;">Pedido #${order.order_number}</div>` : ''}
            <div style="font-size:12px; color:#6b7280;">${order.customer_address || 'Endereço não informado'}</div>
          </div>
        `);
        markersLayerRef.current!.addLayer(destMarker);
      });
    });
  }, [deliverersWithLocation, storeLocation, companyName]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando mapa GPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .leaflet-container { height: 100%; width: 100%; z-index: 0; }
        `}
      </style>

      {/* Header */}
      <header className="bg-card border-b p-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <MapIcon className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">{companyName}</h1>
              <p className="text-xs text-muted-foreground">Rastreio GPS em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-card border-b px-4 py-3">
        <div className="flex items-center gap-6 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{onlineCount} online</span>
            <span className="text-xs text-muted-foreground">de {deliverers.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">{ordersInTransit} entregas</span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground ml-auto">
              Atualizado {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapElRef} className="absolute inset-0" />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg shadow-lg z-[1000]">
          <p className="text-xs font-semibold mb-2">Legenda</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
              <span>Estabelecimento</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              <span>Entregador disponível</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ background: '#3b82f6' }} />
              <span>Em entrega</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
