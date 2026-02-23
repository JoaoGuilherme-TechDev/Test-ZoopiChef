/**
 * PublicOrderTracker - Painel de Senha PWA para Cliente
 * 
 * Página pública PWA que permite ao cliente acompanhar o status do seu pedido
 * em tempo real via QR code impresso no ticket.
 * 
 * Acesso: /acompanhar/:orderId
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ChefHat, 
  Package, 
  CheckCircle2, 
  Truck, 
  MapPin,
  Bell,
  RefreshCw,
  Home,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Status steps do pedido
const ORDER_STEPS = [
  { status: 'novo', label: 'Recebido', icon: Clock, color: 'text-amber-500' },
  { status: 'preparo', label: 'Em Preparo', icon: ChefHat, color: 'text-orange-500' },
  { status: 'pronto', label: 'Pronto!', icon: Package, color: 'text-green-500' },
  { status: 'em_rota', label: 'Em Rota', icon: Truck, color: 'text-blue-500' },
  { status: 'entregue', label: 'Entregue', icon: CheckCircle2, color: 'text-emerald-500' },
];

interface OrderData {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  order_type: string | null;
  total: number | null;
  ready_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

function getStatusIndex(status: string): number {
  return ORDER_STEPS.findIndex(s => s.status === status);
}

function getWaitTimeMessage(createdAt: string, status: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  
  if (status === 'pronto' || status === 'entregue') {
    return 'Pedido finalizado';
  }
  
  if (minutes < 1) return 'Agora mesmo';
  if (minutes < 60) return `${minutes} min de espera`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min de espera`;
}

export default function PublicOrderTracker() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Buscar pedido e configurar realtime
  useEffect(() => {
    if (!orderId) {
      setError('Pedido não encontrado');
      setIsLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            customer_name,
            status,
            created_at,
            updated_at,
            order_type,
            total,
            ready_at,
            dispatched_at,
            delivered_at,
            company_id
          `)
          .eq('id', orderId)
          .single();

        if (fetchError || !data) {
          setError('Pedido não encontrado');
          setIsLoading(false);
          return;
        }

        // Buscar dados da empresa
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('id', data.company_id)
          .single();

        setOrder({
          ...data,
          company: companyData
        });
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Erro ao carregar pedido');
        setIsLoading(false);
      }
    }

    fetchOrder();

    // Realtime subscription
    const channel = supabase
      .channel(`order-tracker-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(prev => prev ? { ...prev, ...payload.new } : null);
          
          // Notificar se pedido ficou pronto
          if (notificationsEnabled && payload.new.status === 'pronto') {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎉 Seu pedido está pronto!', {
                body: `Pedido #${payload.new.order_number} está aguardando retirada`,
                icon: '/pwa-192x192.png',
              });
              // Vibrar se disponível
              if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, notificationsEnabled]);

  // Solicitar permissão de notificação
  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  // Verificar permissão inicial
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Pedido não encontrado</h1>
          <p className="text-slate-400 mb-6">{error || 'Este link pode estar expirado ou o pedido foi removido.'}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const isReady = order.status === 'pronto';
  const isDelivered = order.status === 'entregue';
  const isDelivery = order.order_type === 'delivery';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-4 safe-area-inset">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {order.company?.logo_url ? (
              <img
                src={order.company.logo_url}
                alt={order.company.name}
                className="h-10 w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">{order.company?.name || 'Seu Pedido'}</h1>
              <p className="text-slate-400 text-xs">Acompanhamento em tempo real</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Order Number Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl p-6 text-center transition-all",
              isReady 
                ? "bg-gradient-to-br from-green-600 to-emerald-600 shadow-xl shadow-green-500/20" 
                : isDelivered
                  ? "bg-gradient-to-br from-emerald-700 to-teal-700"
                  : "bg-slate-800/80 border border-slate-700/50"
            )}
          >
            {isReady && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 mb-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </motion.div>
                <span className="text-white font-semibold text-sm uppercase tracking-wider">
                  Retire seu Pedido!
                </span>
              </motion.div>
            )}
            
            <p className={cn(
              "text-sm mb-2",
              isReady || isDelivered ? "text-white/80" : "text-slate-400"
            )}>
              Pedido
            </p>
            <motion.p
              key={order.order_number}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-6xl font-black tracking-tight",
                isReady || isDelivered ? "text-white" : "text-white"
              )}
            >
              #{String(order.order_number || 0).padStart(3, '0')}
            </motion.p>
            
            {order.customer_name && (
              <p className={cn(
                "mt-3 font-medium",
                isReady || isDelivered ? "text-white/90" : "text-slate-300"
              )}>
                {order.customer_name}
              </p>
            )}
            
            <p className={cn(
              "text-sm mt-2",
              isReady || isDelivered ? "text-white/70" : "text-slate-500"
            )}>
              {getWaitTimeMessage(order.created_at, order.status)}
            </p>
          </motion.div>

          {/* Status Progress */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Status do Pedido
            </h3>
            
            <div className="space-y-4">
              {ORDER_STEPS
                .filter(step => isDelivery || (step.status !== 'em_rota'))
                .map((step, index) => {
                  const stepIndex = ORDER_STEPS.findIndex(s => s.status === step.status);
                  const isActive = stepIndex === currentStatusIndex;
                  const isCompleted = stepIndex < currentStatusIndex;
                  const Icon = step.icon;
                  
                  return (
                    <motion.div
                      key={step.status}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-xl transition-all",
                        isActive && "bg-primary/10 border border-primary/30",
                        isCompleted && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
                        isActive && "bg-primary text-white shadow-lg shadow-primary/30",
                        isCompleted && "bg-green-500/20 text-green-400",
                        !isActive && !isCompleted && "bg-slate-700 text-slate-500"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className={cn(
                          "font-medium",
                          isActive && "text-white",
                          isCompleted && "text-green-400",
                          !isActive && !isCompleted && "text-slate-500"
                        )}>
                          {step.label}
                        </p>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-primary mt-0.5"
                          >
                            Status atual
                          </motion.p>
                        )}
                      </div>
                      
                      {isActive && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-3 h-3 rounded-full bg-primary"
                        />
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </div>

          {/* Notifications Card */}
          {!notificationsEnabled && !isDelivered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-500/20"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">Quer ser avisado?</h4>
                  <p className="text-slate-400 text-sm mb-3">
                    Ative as notificações para saber quando seu pedido ficar pronto.
                  </p>
                  <Button
                    size="sm"
                    onClick={requestNotifications}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Ativar Notificações
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Order Details */}
          <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Tipo</p>
                <p className="text-white font-medium capitalize">
                  {order.order_type === 'delivery' ? 'Entrega' : 
                   order.order_type === 'counter' ? 'Balcão' :
                   order.order_type === 'kiosk' ? 'Totem' :
                   order.order_type || 'Retirada'}
                </p>
              </div>
              {order.total && (
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="text-white font-medium">
                    R$ {order.total.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Pedido em</p>
                <p className="text-white font-medium">
                  {new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              {order.ready_at && (
                <div>
                  <p className="text-slate-500">Pronto em</p>
                  <p className="text-green-400 font-medium">
                    {new Date(order.ready_at).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 safe-area-inset">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Atualização automática
          </div>
          <p className="text-slate-500 text-xs">
            Tecnologia Zoopi
          </p>
        </div>
      </footer>
    </div>
  );
}
