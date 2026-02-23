import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DelivererDetailsSheet } from './DelivererDetailsSheet';

// Fix default marker icons for Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Paleta de cores para diferenciar entregadores
const DELIVERER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export const getDelivererColor = (index: number) => DELIVERER_COLORS[index % DELIVERER_COLORS.length];

// Cache for OSRM routes
const routeCache = new Map<string, [number, number][]>();

// Fetch route from OSRM
async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> {
  const cacheKey = `${startLat},${startLng}-${endLat},${endLng}`;
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }
  
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch route');
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
      routeCache.set(cacheKey, coordinates);
      return coordinates;
    }
  } catch (error) {
    console.warn('OSRM route fetch failed, falling back to straight line:', error);
  }
  
  // Fallback to straight line
  return [[startLat, startLng], [endLat, endLng]];
}

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
        cursor: pointer;
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

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  is_at_store?: boolean;
  arrived_at_store_at?: string | null;
  orders_in_transit: Array<{
    id: string;
    order_number?: number;
    customer_address: string | null;
    customer_name: string | null;
    status: string;
    latitude?: number | null;
    longitude?: number | null;
    delivery_eta_minutes?: number | null;
    dispatched_at?: string | null;
  }>;
}

interface StoreLocation {
  lat: number;
  lng: number;
  radius: number;
}

interface DelivererMapProps {
  deliverers: DelivererLocation[];
  selectedDeliverer: string | null;
  onSelectDeliverer: (id: string | null) => void;
  storeLocation?: StoreLocation | null;
  centerLat?: number;
  centerLng?: number;
  showRegions?: boolean;
  groupingRadius?: number;
}

// Helper to validate coordinates
const isValidCoord = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
};

export function DelivererMap({
  deliverers,
  selectedDeliverer,
  onSelectDeliverer,
  storeLocation,
  centerLat = -21.18,
  centerLng = -47.76,
  showRegions = false,
  groupingRadius = 2,
}: DelivererMapProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDelivererForDetails, setSelectedDelivererForDetails] = useState<DelivererLocation | null>(null);
  const [selectedDelivererIndex, setSelectedDelivererIndex] = useState(0);

  // Filter deliverers with valid coordinates
  const deliverersWithLocation = useMemo(
    () =>
      deliverers.filter(d => isValidCoord(d.last_latitude, d.last_longitude)),
    [deliverers]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    // Prioritize store location if available
    if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
      return [storeLocation.lat, storeLocation.lng];
    }
    if (deliverersWithLocation.length > 0) {
      const latSum = deliverersWithLocation.reduce((sum, d) => sum + (d.last_latitude || 0), 0);
      const lngSum = deliverersWithLocation.reduce((sum, d) => sum + (d.last_longitude || 0), 0);
      const avgLat = latSum / deliverersWithLocation.length;
      const avgLng = lngSum / deliverersWithLocation.length;
      if (Number.isFinite(avgLat) && Number.isFinite(avgLng) && avgLat !== 0 && avgLng !== 0) {
        return [avgLat, avgLng];
      }
    }
    const lat = typeof centerLat === 'number' && Number.isFinite(centerLat) ? centerLat : -21.18;
    const lng = typeof centerLng === 'number' && Number.isFinite(centerLng) ? centerLng : -47.76;
    return [lat, lng];
  }, [deliverersWithLocation, storeLocation, centerLat, centerLng]);

  // Open details handler
  const handleOpenDetails = (deliverer: DelivererLocation, index: number) => {
    setSelectedDelivererForDetails(deliverer);
    setSelectedDelivererIndex(index);
    setDetailsOpen(true);
  };

  // Init map once
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const validCenter: [number, number] = [
      Number.isFinite(mapCenter[0]) ? mapCenter[0] : -21.18,
      Number.isFinite(mapCenter[1]) ? mapCenter[1] : -47.76,
    ];

    const map = L.map(mapElRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(validCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    circlesLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      circlesLayerRef.current = null;
      routesLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FlyTo selected deliverer
  useEffect(() => {
    if (!mapRef.current || !selectedDeliverer) return;
    const d = deliverers.find(x => x.id === selectedDeliverer);
    if (d && isValidCoord(d.last_latitude, d.last_longitude)) {
      try {
        mapRef.current.flyTo([d.last_latitude!, d.last_longitude!], 15, { duration: 0.5 });
      } catch {
        // Ignore flyTo errors
      }
    }
  }, [selectedDeliverer, deliverers]);

  // Render markers, routes, and circles
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !circlesLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    circlesLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    // Build deliverer summary for store popup
    const deliverersSummary = deliverersWithLocation
      .filter(d => d.orders_in_transit.length > 0)
      .map(d => {
        const color = getDelivererColor(deliverersWithLocation.indexOf(d));
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
            <span>${d.name}</span>
          </div>
          <strong style="color:${color};">${d.orders_in_transit.length} entrega(s)</strong>
        </div>`;
      }).join('');

    const totalOrdersInTransit = deliverersWithLocation.reduce((sum, d) => sum + d.orders_in_transit.length, 0);

    // Store marker (origin) with enhanced popup
    if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
      const storePopupHtml = `
        <div style="padding:12px; min-width:260px;">
          <div style="font-weight:700; font-size:16px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            🏠 Estabelecimento
            <span style="background:#f59e0b20;color:#d97706;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:500;">
              ${totalOrdersInTransit} em rota
            </span>
          </div>
          ${deliverersSummary ? `
            <div style="border-top:1px solid #f3f4f6;padding-top:8px;">
              <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;">Entregadores em Rota:</div>
              ${deliverersSummary}
            </div>
          ` : '<div style="font-size:12px;color:#6b7280;">Nenhum entregador em rota</div>'}
        </div>
      `;
      
      const storeMarker = L.marker([storeLocation.lat, storeLocation.lng], {
        icon: createStoreIcon(),
        zIndexOffset: 1000,
      });
      storeMarker.bindPopup(storePopupHtml, { maxWidth: 300 });
      markersLayerRef.current.addLayer(storeMarker);

      // Store radius circle
      circlesLayerRef.current.addLayer(
        L.circle([storeLocation.lat, storeLocation.lng], {
          radius: storeLocation.radius || 100,
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.1,
          weight: 2,
        })
      );
    }

    // Region circles
    if (showRegions) {
      for (const d of deliverersWithLocation) {
        circlesLayerRef.current.addLayer(
          L.circle([d.last_latitude!, d.last_longitude!], {
            radius: groupingRadius * 1000,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
            dashArray: '5, 5',
          })
        );
      }
    }

    // Render each deliverer
    deliverersWithLocation.forEach((d, delivererIndex) => {
      const delivererColor = getDelivererColor(delivererIndex);
      const hasOrders = d.orders_in_transit.length > 0;

      const timeAgo = d.last_location_at
        ? formatDistanceToNow(new Date(d.last_location_at), { addSuffix: true, locale: ptBR })
        : null;

      const mapsUrl = `https://www.google.com/maps?q=${d.last_latitude},${d.last_longitude}`;
      const telUrl = d.whatsapp ? `tel:${d.whatsapp.replace(/\D/g, '')}` : null;
      const safeName = (d.name || '').replace(/</g, '&lt;');

      // Deliverer popup with details button
      const popupHtml = `
        <div style="padding:8px; min-width:220px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="width:16px; height:16px; border-radius:9999px; background:${delivererColor};"></div>
            <div style="font-weight:600; font-size:14px;">${safeName}</div>
          </div>
          ${timeAgo ? `<div style="font-size:12px; color:#6b7280; margin-bottom:8px;">${timeAgo}</div>` : ''}
          ${
            hasOrders
              ? `<div style="margin-bottom:8px;"><span style="display:inline-flex; align-items:center; border-radius:9999px; background:${delivererColor}20; color:${delivererColor}; padding:2px 10px; font-size:12px; font-weight:500;">${d.orders_in_transit.length} entrega(s)</span></div>`
              : ''
          }
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button 
              id="details-btn-${d.id}" 
              style="display:inline-flex; align-items:center; justify-content:center; font-size:12px; height:28px; padding:0 12px; border-radius:4px; border:none; background:${delivererColor}; color:white; cursor:pointer; font-weight:500;"
            >
              Ver Detalhes
            </button>
            <a href="${mapsUrl}" target="_blank" rel="noreferrer" style="display:inline-flex; align-items:center; justify-content:center; font-size:12px; height:28px; padding:0 8px; border-radius:4px; border:1px solid #e5e7eb; background:#fff; text-decoration:none; color:#111827;">Maps</a>
            ${
              telUrl
                ? `<a href="${telUrl}" style="display:inline-flex; align-items:center; justify-content:center; font-size:12px; height:28px; padding:0 8px; border-radius:4px; border:1px solid #e5e7eb; background:#fff; text-decoration:none; color:#111827;">Ligar</a>`
                : ''
            }
          </div>
        </div>
      `;

      // Deliverer marker with unique color if has orders
      const marker = L.marker([d.last_latitude!, d.last_longitude!], {
        icon: createDelivererIcon(d.is_online, hasOrders, hasOrders ? delivererColor : undefined),
      });

      marker.on('click', () => onSelectDeliverer(d.id));
      
      const popup = L.popup().setContent(popupHtml);
      marker.bindPopup(popup);
      
      // Add click handler for details button after popup opens
      marker.on('popupopen', () => {
        const btn = document.getElementById(`details-btn-${d.id}`);
        if (btn) {
          btn.onclick = () => {
            marker.closePopup();
            handleOpenDetails(d, delivererIndex);
          };
        }
      });
      
      markersLayerRef.current!.addLayer(marker);

      // Draw routes from store to deliverer (if store exists)
      if (storeLocation && hasOrders && isValidCoord(storeLocation.lat, storeLocation.lng)) {
        const storeToDelivererLine = L.polyline(
          [
            [storeLocation.lat, storeLocation.lng],
            [d.last_latitude!, d.last_longitude!],
          ],
          {
            color: delivererColor,
            weight: 2,
            opacity: 0.4,
            dashArray: '4, 8',
          }
        );
        routesLayerRef.current!.addLayer(storeToDelivererLine);
      }

      // Draw sequential routes: Deliverer → Order1 → Order2 → Order3
      const ordersWithValidCoords = d.orders_in_transit.filter(o => isValidCoord(o.latitude, o.longitude));
      
      ordersWithValidCoords.forEach((order, orderIndex) => {
        const destLat = order.latitude!;
        const destLng = order.longitude!;

        // Get the origin point for this segment
        let originLat: number;
        let originLng: number;
        
        if (orderIndex === 0) {
          // First order: line from deliverer position
          originLat = d.last_latitude!;
          originLng = d.last_longitude!;
        } else {
          // Subsequent orders: line from previous order
          const prevOrder = ordersWithValidCoords[orderIndex - 1];
          originLat = prevOrder.latitude!;
          originLng = prevOrder.longitude!;
        }

        // Route line in sequence
        const routeLine = L.polyline(
          [
            [originLat, originLng],
            [destLat, destLng],
          ],
          {
            color: delivererColor,
            weight: 3,
            opacity: 0.7,
            dashArray: '8, 8',
          }
        );
        routesLayerRef.current!.addLayer(routeLine);

        // Destination marker
        const destMarker = L.marker([destLat, destLng], {
          icon: createDestinationIcon(delivererColor, orderIndex + 1),
        });

        const safeCustomerName = (order.customer_name || 'Cliente').replace(/</g, '&lt;');
        const safeAddress = (order.customer_address || 'Endereço não informado').replace(/</g, '&lt;');
        const destMapsUrl = `https://www.google.com/maps?q=${destLat},${destLng}`;

        const destPopupHtml = `
          <div style="padding:8px; min-width:180px;">
            <div style="font-weight:600; margin-bottom:4px;">${safeCustomerName}</div>
            ${order.order_number ? `<div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Pedido #${order.order_number}</div>` : ''}
            <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">${safeAddress}</div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:8px;">
              <div style="width:10px; height:10px; border-radius:2px; background:${delivererColor};"></div>
              <span style="font-size:11px; color:#6b7280;">${safeName}</span>
            </div>
            <a href="${destMapsUrl}" target="_blank" rel="noreferrer" style="display:inline-flex; align-items:center; justify-content:center; font-size:12px; height:28px; padding:0 8px; border-radius:4px; border:1px solid #e5e7eb; background:#fff; text-decoration:none; color:#111827;">Abrir no Maps</a>
          </div>
        `;

        destMarker.bindPopup(destPopupHtml);
        markersLayerRef.current!.addLayer(destMarker);
      });
    });
  }, [deliverersWithLocation, storeLocation, onSelectDeliverer, showRegions, groupingRadius]);

  return (
    <>
      <div className="relative h-full w-full rounded-lg overflow-hidden border">
        <style>
          {`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            .leaflet-container { height: 100%; width: 100%; z-index: 0; }
          `}
        </style>

        <div ref={mapElRef} className="h-full w-full" />

        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg shadow-lg z-[1000]">
          <p className="text-xs font-semibold mb-2">Legenda</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
              <span>Estabelecimento (origem)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              <span>Entregador livre</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ background: '#3b82f6' }} />
              <span>Em entrega (cor única)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
              <span>Destino da entrega</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ background: '#9ca3af' }} />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>
      
      <DelivererDetailsSheet
        deliverer={selectedDelivererForDetails}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        delivererColor={getDelivererColor(selectedDelivererIndex)}
      />
    </>
  );
}
