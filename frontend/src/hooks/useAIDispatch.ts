import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
  is_at_store?: boolean;
  arrived_at_store_at?: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  orders_in_transit: Array<{
    id: string;
    customer_address: string | null;
    customer_name: string | null;
    status: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

interface PendingOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_address: string | null;
  destination_address: string | null;
  total: number;
  status: string;
  created_at: string;
  order_type: string;
  latitude?: number | null;
  longitude?: number | null;
  company_id?: string;
}

interface OrderWithCoords extends PendingOrder {
  coords: { lat: number; lng: number } | null;
  waitingMinutes: number;
}

interface DispatchSuggestion {
  id: string;
  deliverer: DelivererLocation;
  orders: PendingOrder[];
  orderedRoute: PendingOrder[]; // Orders in optimal delivery sequence
  totalDistance: number;
  estimatedTime: number;
  reason: string;
  score: number;
  neighborhood: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface UseAIDispatchOptions {
  maxOrdersPerTrip?: number;
  maxDistanceBetweenOrders?: number; // km
  prioritizeOldest?: boolean;
}

// Constants
const MAX_DISTANCE_BETWEEN_ORDERS_KM = 4; // 4km max between any two orders in same route
const CRITICAL_WAIT_MINUTES = 45;
const HIGH_WAIT_MINUTES = 30;
const MEDIUM_WAIT_MINUTES = 20;

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get urgency level based on waiting time
function getUrgencyLevel(waitingMinutes: number): 'low' | 'medium' | 'high' | 'critical' {
  if (waitingMinutes >= CRITICAL_WAIT_MINUTES) return 'critical';
  if (waitingMinutes >= HIGH_WAIT_MINUTES) return 'high';
  if (waitingMinutes >= MEDIUM_WAIT_MINUTES) return 'medium';
  return 'low';
}

// Extract neighborhood from address
function extractNeighborhood(address: string | null): string {
  if (!address) return 'Sem endereço';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return parts[1] || parts[0];
  }
  return parts[0];
}

// Check if two orders are within acceptable distance
function areOrdersNearby(
  order1: OrderWithCoords,
  order2: OrderWithCoords,
  maxDistance: number
): boolean {
  if (!order1.coords || !order2.coords) {
    // If no coords, group by neighborhood text
    const n1 = extractNeighborhood(order1.destination_address || order1.customer_address);
    const n2 = extractNeighborhood(order2.destination_address || order2.customer_address);
    return n1 === n2;
  }
  
  const distance = calculateDistance(
    order1.coords.lat,
    order1.coords.lng,
    order2.coords.lat,
    order2.coords.lng
  );
  
  return distance <= maxDistance;
}

// Find clusters of nearby orders
function clusterOrders(
  orders: OrderWithCoords[],
  maxDistance: number,
  maxPerCluster: number
): OrderWithCoords[][] {
  const clusters: OrderWithCoords[][] = [];
  const used = new Set<string>();
  
  // Sort by urgency (oldest first)
  const sortedOrders = [...orders].sort((a, b) => b.waitingMinutes - a.waitingMinutes);
  
  for (const order of sortedOrders) {
    if (used.has(order.id)) continue;
    
    const cluster: OrderWithCoords[] = [order];
    used.add(order.id);
    
    // Find nearby orders that fit in this cluster
    for (const candidate of sortedOrders) {
      if (used.has(candidate.id)) continue;
      if (cluster.length >= maxPerCluster) break;
      
      // Check if candidate is near ALL orders in cluster
      const isNearAll = cluster.every(o => areOrdersNearby(o, candidate, maxDistance));
      
      if (isNearAll) {
        cluster.push(candidate);
        used.add(candidate.id);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

// Calculate optimal route order (simple nearest-neighbor TSP)
function optimizeRouteOrder(
  orders: OrderWithCoords[],
  startLat?: number | null,
  startLng?: number | null
): OrderWithCoords[] {
  if (orders.length <= 1) return orders;
  
  const result: OrderWithCoords[] = [];
  const remaining = [...orders];
  
  // Start from deliverer location or first order
  let currentLat = startLat ?? orders[0]?.coords?.lat ?? 0;
  let currentLng = startLng ?? orders[0]?.coords?.lng ?? 0;
  
  while (remaining.length > 0) {
    // Find nearest unvisited order
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const order = remaining[i];
      if (!order.coords) {
        // Orders without coords go first (can't optimize)
        nearestIdx = i;
        break;
      }
      
      const dist = calculateDistance(currentLat, currentLng, order.coords.lat, order.coords.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    const next = remaining.splice(nearestIdx, 1)[0];
    result.push(next);
    
    if (next.coords) {
      currentLat = next.coords.lat;
      currentLng = next.coords.lng;
    }
  }
  
  return result;
}

// Calculate total route distance
function calculateTotalRouteDistance(orders: OrderWithCoords[], startLat?: number | null, startLng?: number | null): number {
  if (orders.length === 0) return 0;
  
  let total = 0;
  let prevLat = startLat ?? orders[0]?.coords?.lat;
  let prevLng = startLng ?? orders[0]?.coords?.lng;
  
  for (const order of orders) {
    if (order.coords && prevLat != null && prevLng != null) {
      total += calculateDistance(prevLat, prevLng, order.coords.lat, order.coords.lng);
      prevLat = order.coords.lat;
      prevLng = order.coords.lng;
    }
  }
  
  return total;
}

export function useAIDispatch(
  deliverers: DelivererLocation[],
  orders: PendingOrder[],
  options: UseAIDispatchOptions = {}
) {
  const { 
    maxOrdersPerTrip = 5, 
    maxDistanceBetweenOrders = MAX_DISTANCE_BETWEEN_ORDERS_KM,
  } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Deliverers at the store (ready to dispatch)
  const deliverersAtStore = useMemo(() => {
    return deliverers.filter(d => 
      d.is_online && 
      d.is_at_store && 
      d.orders_in_transit.length < maxOrdersPerTrip
    );
  }, [deliverers, maxOrdersPerTrip]);

  // All available deliverers (online with capacity)
  const availableDeliverers = useMemo(() => {
    return deliverers.filter(
      d => d.is_online && d.orders_in_transit.length < maxOrdersPerTrip
    );
  }, [deliverers, maxOrdersPerTrip]);

  // Orders with coords and waiting time
  const ordersWithData = useMemo((): OrderWithCoords[] => {
    return orders.map(order => ({
      ...order,
      coords: order.latitude && order.longitude 
        ? { lat: order.latitude, lng: order.longitude }
        : null,
      waitingMinutes: Math.round((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60)),
    }));
  }, [orders]);

  // Get deliverer queue position and score
  const scoreDeliverer = useCallback((
    deliverer: DelivererLocation,
    cluster: OrderWithCoords[]
  ): number => {
    let score = 0;
    
    // Base score for being at store (highest priority)
    if (deliverer.is_at_store) {
      score += 100;
      
      // Bonus for arriving earlier (FIFO queue)
      if (deliverer.arrived_at_store_at) {
        const waitingMinutes = (Date.now() - new Date(deliverer.arrived_at_store_at).getTime()) / (1000 * 60);
        score += Math.min(waitingMinutes * 2, 50);
      }
    }
    
    // Online but not at store
    if (deliverer.is_online && !deliverer.is_at_store) {
      score += 30;
    }
    
    // Proximity bonus (if deliverer has location and cluster has coords)
    if (deliverer.last_latitude && deliverer.last_longitude) {
      const ordersWithCoords = cluster.filter(o => o.coords);
      if (ordersWithCoords.length > 0) {
        const avgLat = ordersWithCoords.reduce((sum, o) => sum + (o.coords?.lat || 0), 0) / ordersWithCoords.length;
        const avgLng = ordersWithCoords.reduce((sum, o) => sum + (o.coords?.lng || 0), 0) / ordersWithCoords.length;
        const distance = calculateDistance(deliverer.last_latitude, deliverer.last_longitude, avgLat, avgLng);
        
        // Closer = higher score (up to 40 points)
        score += Math.max(0, 40 - distance * 5);
      }
    }
    
    // Penalty for already having orders (prefer empty deliverers)
    score -= deliverer.orders_in_transit.length * 15;
    
    // Penalty for too many orders if route would be long
    const remainingCapacity = maxOrdersPerTrip - deliverer.orders_in_transit.length;
    if (cluster.length > remainingCapacity) {
      score -= 20;
    }
    
    return score;
  }, [maxOrdersPerTrip]);

  // Generate smart dispatch suggestions
  const suggestions = useMemo((): DispatchSuggestion[] => {
    if (orders.length === 0 || availableDeliverers.length === 0) {
      return [];
    }

    const generatedSuggestions: DispatchSuggestion[] = [];
    const usedOrderIds = new Set<string>();
    const usedDelivererIds = new Set<string>();
    
    // Step 1: Cluster orders by proximity
    const clusters = clusterOrders(ordersWithData, maxDistanceBetweenOrders, maxOrdersPerTrip);
    
    // Step 2: Assign best deliverer to each cluster
    for (const cluster of clusters) {
      // Skip if all orders in cluster are already used
      const availableInCluster = cluster.filter(o => !usedOrderIds.has(o.id));
      if (availableInCluster.length === 0) continue;
      
      // Find best deliverer for this cluster
      let bestDeliverer: DelivererLocation | null = null;
      let bestScore = -Infinity;
      
      // Prefer deliverers at store, then others
      const candidateDeliverers = [
        ...deliverersAtStore.filter(d => !usedDelivererIds.has(d.id)),
        ...availableDeliverers.filter(d => !usedDelivererIds.has(d.id) && !d.is_at_store),
      ];
      
      for (const deliverer of candidateDeliverers) {
        const remainingCapacity = maxOrdersPerTrip - deliverer.orders_in_transit.length;
        if (remainingCapacity <= 0) continue;
        
        const score = scoreDeliverer(deliverer, availableInCluster);
        if (score > bestScore) {
          bestScore = score;
          bestDeliverer = deliverer;
        }
      }
      
      if (!bestDeliverer) continue;
      
      // Limit orders to deliverer's remaining capacity
      const remainingCapacity = maxOrdersPerTrip - bestDeliverer.orders_in_transit.length;
      const ordersToAssign = availableInCluster.slice(0, remainingCapacity);
      
      // Optimize route order
      const optimizedRoute = optimizeRouteOrder(
        ordersToAssign,
        bestDeliverer.last_latitude,
        bestDeliverer.last_longitude
      );
      
      // Calculate metrics
      const totalDistance = calculateTotalRouteDistance(
        optimizedRoute,
        bestDeliverer.last_latitude,
        bestDeliverer.last_longitude
      );
      
      // Estimate time: 5 min per delivery + 3 min per km
      const estimatedTime = ordersToAssign.length * 5 + Math.round(totalDistance * 3);
      
      // Determine urgency
      const maxWaitingTime = Math.max(...ordersToAssign.map(o => o.waitingMinutes));
      const urgencyLevel = getUrgencyLevel(maxWaitingTime);
      
      // Get main neighborhood
      const neighborhoods = ordersToAssign.map(o => 
        extractNeighborhood(o.destination_address || o.customer_address)
      );
      const mainNeighborhood = neighborhoods[0] || 'Região';
      
      // Generate reason
      let reason = '';
      if (urgencyLevel === 'critical') {
        reason = `⚠️ URGENTE: Pedido aguardando há ${maxWaitingTime} min! `;
      } else if (urgencyLevel === 'high') {
        reason = `Pedido antigo (${maxWaitingTime} min). `;
      }
      
      if (ordersToAssign.length >= 3) {
        reason += `${ordersToAssign.length} pedidos agrupados na mesma região`;
      } else if (ordersToAssign.length === 2) {
        reason += `2 pedidos próximos (rota otimizada)`;
      } else {
        reason += `Entrega única`;
      }
      
      if (bestDeliverer.is_at_store) {
        reason += ' • Entregador na casa';
      } else if (bestDeliverer.orders_in_transit.length > 0) {
        reason += ` • +${ordersToAssign.length} à rota atual`;
      }
      
      generatedSuggestions.push({
        id: `${bestDeliverer.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        deliverer: bestDeliverer,
        orders: ordersToAssign,
        orderedRoute: optimizedRoute,
        totalDistance,
        estimatedTime,
        reason,
        score: bestScore + (maxWaitingTime * 2), // Boost score by urgency
        neighborhood: mainNeighborhood,
        urgencyLevel,
      });
      
      // Mark as used
      usedDelivererIds.add(bestDeliverer.id);
      ordersToAssign.forEach(o => usedOrderIds.add(o.id));
    }
    
    // Sort by urgency then score
    return generatedSuggestions.sort((a, b) => {
      // Critical/high urgency first
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Then by score
      return b.score - a.score;
    });
  }, [orders, availableDeliverers, deliverersAtStore, ordersWithData, maxOrdersPerTrip, maxDistanceBetweenOrders, scoreDeliverer]);

  // Approve and dispatch a suggestion
  const approveSuggestion = useCallback(async (suggestion: DispatchSuggestion) => {
    setApprovingId(suggestion.id);
    
    try {
      const orderIds = suggestion.orders.map(o => o.id);
      
      // Calculate ETA for each order based on route position
      const baseEta = 10; // Base time to leave store
      const updates = suggestion.orderedRoute.map((order, index) => ({
        id: order.id,
        deliverer_id: suggestion.deliverer.id,
        status: 'em_rota' as const,
        dispatched_at: new Date().toISOString(),
        delivery_eta_minutes: baseEta + (index * 8), // 8 min between deliveries
        delivery_order: index + 1, // Order in route
      }));
      
      // Update orders in batch
      for (const update of updates) {
        const { error } = await supabase
          .from('orders')
          .update({
            deliverer_id: update.deliverer_id,
            status: update.status,
            dispatched_at: update.dispatched_at,
            delivery_eta_minutes: update.delivery_eta_minutes,
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      toast.success(
        `${suggestion.orders.length} pedido(s) despachado(s) para ${suggestion.deliverer.name}!`,
        {
          description: `Rota otimizada: ~${suggestion.estimatedTime} min`,
        }
      );

      queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliverer-locations'] });

      return true;
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('Erro ao despachar pedidos');
      return false;
    } finally {
      setApprovingId(null);
    }
  }, [queryClient]);

  // Approve all suggestions
  const approveAll = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const suggestion of suggestions) {
        const success = await approveSuggestion(suggestion);
        if (success) successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} despacho(s) realizados!`);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [suggestions, approveSuggestion]);

  // Get queue info for a deliverer
  const getDelivererQueueInfo = useCallback((deliverer: DelivererLocation) => {
    const isAtStore = deliverer.is_at_store ?? false;
    const queuePosition = deliverersAtStore.findIndex(d => d.id === deliverer.id) + 1;
    const waitingTime = deliverer.arrived_at_store_at
      ? Math.round((Date.now() - new Date(deliverer.arrived_at_store_at).getTime()) / (1000 * 60))
      : 0;
    const currentOrders = deliverer.orders_in_transit.length;
    const remainingCapacity = maxOrdersPerTrip - currentOrders;

    return {
      isAtStore,
      queuePosition: isAtStore ? queuePosition : 0,
      waitingTime,
      currentOrders,
      remainingCapacity,
    };
  }, [deliverersAtStore, maxOrdersPerTrip]);

  return {
    suggestions,
    availableDeliverers,
    deliverersAtStore,
    isProcessing,
    approvingId,
    approveSuggestion,
    approveAll,
    getDelivererQueueInfo,
    stats: {
      totalPendingOrders: orders.length,
      totalAvailableDeliverers: availableDeliverers.length,
      totalAtStore: deliverersAtStore.length,
      totalSuggestions: suggestions.length,
      ordersInSuggestions: suggestions.reduce((sum, s) => sum + s.orders.length, 0),
      urgentOrders: ordersWithData.filter(o => o.waitingMinutes >= HIGH_WAIT_MINUTES).length,
    },
  };
}
