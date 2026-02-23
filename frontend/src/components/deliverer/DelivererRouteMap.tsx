import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navigation, Locate, Maximize2, Minimize2 } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string | null;
  customer_address: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface DelivererRouteMapProps {
  orders: Order[];
  delivererLocation?: { latitude: number; longitude: number } | null;
  onNavigate?: (address: string) => void;
}

// Create numbered marker icon
function createNumberedIcon(number: number, status: string) {
  const color = status === 'em_rota' ? '#3b82f6' : '#f59e0b';
  const size = 32;
  
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Deliverer location icon
const delivererIcon = L.divIcon({
  className: 'deliverer-marker',
  html: `
    <div style="
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      border: 4px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.5), 0 4px 12px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
      </svg>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// Map bounds updater component
function MapBoundsUpdater({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions, map]);
  
  return null;
}

// Center on deliverer button component
function CenterOnDeliverer({ position }: { position: [number, number] | null }) {
  const map = useMap();
  
  const handleCenter = () => {
    if (position) {
      map.setView(position, 16, { animate: true });
    }
  };
  
  if (!position) return null;
  
  return (
    <Button
      size="icon"
      variant="secondary"
      className="absolute top-4 right-4 z-[1000] shadow-lg"
      onClick={handleCenter}
    >
      <Locate className="h-4 w-4" />
    </Button>
  );
}

export function DelivererRouteMap({ orders, delivererLocation, onNavigate }: DelivererRouteMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter orders with coordinates
  const ordersWithCoords = useMemo(() => {
    return orders.filter(o => o.latitude && o.longitude);
  }, [orders]);
  
  // Build route positions (deliverer first, then orders in sequence)
  const routePositions = useMemo(() => {
    const positions: [number, number][] = [];
    
    if (delivererLocation) {
      positions.push([delivererLocation.latitude, delivererLocation.longitude]);
    }
    
    ordersWithCoords.forEach(order => {
      if (order.latitude && order.longitude) {
        positions.push([order.latitude, order.longitude]);
      }
    });
    
    return positions;
  }, [delivererLocation, ordersWithCoords]);
  
  // All positions for bounds
  const allPositions = useMemo(() => {
    const positions: [number, number][] = [];
    
    if (delivererLocation) {
      positions.push([delivererLocation.latitude, delivererLocation.longitude]);
    }
    
    ordersWithCoords.forEach(order => {
      if (order.latitude && order.longitude) {
        positions.push([order.latitude, order.longitude]);
      }
    });
    
    return positions;
  }, [delivererLocation, ordersWithCoords]);
  
  // Default center (Brazil)
  const defaultCenter: [number, number] = delivererLocation 
    ? [delivererLocation.latitude, delivererLocation.longitude]
    : ordersWithCoords.length > 0 && ordersWithCoords[0].latitude && ordersWithCoords[0].longitude
      ? [ordersWithCoords[0].latitude, ordersWithCoords[0].longitude]
      : [-23.55, -46.63];
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  if (ordersWithCoords.length === 0 && !delivererLocation) {
    return (
      <div className="h-48 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground text-sm">
        <Navigation className="w-5 h-5 mr-2" />
        Mapa disponível quando houver coordenadas
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden ${isFullscreen ? 'h-screen' : 'h-64 sm:h-80'}`}
    >
      {/* Fullscreen toggle */}
      <Button
        size="icon"
        variant="secondary"
        className="absolute top-4 left-4 z-[1000] shadow-lg"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur rounded-lg p-2 text-xs space-y-1 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#8b5cf6] border-2 border-white" />
          <span>Você</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">1</div>
          <span>Pronto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">2</div>
          <span>Em rota</span>
        </div>
      </div>
      
      <MapContainer
        center={defaultCenter}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Update bounds */}
        {allPositions.length > 0 && <MapBoundsUpdater positions={allPositions} />}
        
        {/* Center button */}
        <CenterOnDeliverer 
          position={delivererLocation ? [delivererLocation.latitude, delivererLocation.longitude] : null} 
        />
        
        {/* Route lines - sequential from origin to each delivery in order */}
        {routePositions.length > 1 && (
          <>
            {routePositions.slice(0, -1).map((pos, idx) => (
              <Polyline
                key={`route-segment-${idx}`}
                positions={[pos, routePositions[idx + 1]]}
                color="#8b5cf6"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            ))}
          </>
        )}
        
        {/* Deliverer marker */}
        {delivererLocation && (
          <Marker
            position={[delivererLocation.latitude, delivererLocation.longitude]}
            icon={delivererIcon}
          >
            <Popup>
              <div className="text-center font-medium">📍 Sua localização</div>
            </Popup>
          </Marker>
        )}
        
        {/* Order markers */}
        {ordersWithCoords.map((order, index) => (
          <Marker
            key={order.id}
            position={[order.latitude!, order.longitude!]}
            icon={createNumberedIcon(index + 1, order.status)}
          >
            <Popup>
              <div className="space-y-2 min-w-[180px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Entrega #{index + 1}</span>
                  <Badge variant={order.status === 'em_rota' ? 'default' : 'secondary'} className="text-xs">
                    {order.status === 'em_rota' ? 'Em Rota' : 'Pronto'}
                  </Badge>
                </div>
                <p className="text-sm">{order.customer_name || 'Cliente'}</p>
                <p className="text-xs text-muted-foreground">{order.customer_address}</p>
                {onNavigate && order.customer_address && (
                  <Button 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => onNavigate(order.customer_address!)}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Navegar
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .deliverer-marker > div {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
