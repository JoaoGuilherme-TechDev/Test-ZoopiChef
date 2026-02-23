/**
 * PublicCallPanel - Painel de Chamada de Pedidos (Estilo McDonald's)
 * 
 * Módulo totalmente independente para exibição em TVs/monitores.
 * Apenas CONSOME dados existentes - não cria nem altera pedidos.
 * Reage automaticamente quando status muda para "PRONTO" via realtime.
 * 
 * Acesso: /painel-chamada/:token
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { useOrderReadyCallsListener } from '@/hooks/useOrderReadyCalls';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CheckCircle2, Users } from 'lucide-react';

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
}

interface PendingOrder {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  status: string;
  created_at: string;
  source: string | null;
}

export default function PublicCallPanel() {
  const { token } = useParams<{ token: string }>();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Valida token e busca empresa
  useEffect(() => {
    async function validateAndFetch() {
      if (!token) {
        setError('Token não informado');
        setIsLoading(false);
        return;
      }

      try {
        // Buscar empresa pelo token de TV (usado pelo painel de chamada)
        // Suporta tv_token e tv_token_v2
        const { data: linkData, error: linkError } = await supabase
          .from('company_public_links')
          .select('company_id')
          .or(`tv_token.eq.${token},tv_token_v2.eq.${token}`)
          .single();

        if (linkError || !linkData) {
          setError('Link inválido ou expirado');
          setIsLoading(false);
          return;
        }

        // Buscar dados da empresa
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('id', linkData.company_id)
          .single();

        if (companyError || !company) {
          setError('Empresa não encontrada');
          setIsLoading(false);
          return;
        }

        setCompanyData(company as CompanyData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error validating token:', err);
        setError('Erro ao carregar painel');
        setIsLoading(false);
      }
    }

    validateAndFetch();
  }, [token]);

  // Busca pedidos em preparo (para exibir na lista de espera)
  useEffect(() => {
    if (!companyData?.id) return;

    async function fetchPendingOrders() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, created_at, source')
        .eq('company_id', companyData.id)
        .in('status', ['novo', 'preparo'])
        .in('source', ['kiosk', 'counter', 'balcao', 'totem'])
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true })
        .limit(20);

      if (!error && data) {
        setPendingOrders(data);
      }
    }

    fetchPendingOrders();

    // Polling a cada 10 segundos
    const interval = setInterval(fetchPendingOrders, 10000);

    // Realtime subscription para atualizar lista
    const channel = supabase
      .channel('call-panel-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyData.id}`,
        },
        () => {
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [companyData?.id]);

  // Atualiza relógio
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hook para escutar chamadas de pedidos prontos
  const { currentCall, recentCalls } = useOrderReadyCallsListener(companyData?.id);

  // Últimos 3 chamados (excluindo o atual)
  const lastCalledOrders = useMemo(() => {
    if (!currentCall) return recentCalls.slice(0, 3);
    return recentCalls.filter(c => c.id !== currentCall.id).slice(0, 3);
  }, [currentCall, recentCalls]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !companyData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
          <p className="text-slate-400">{error || 'Este link não está mais disponível.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header com Logo */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            {companyData.logo_url ? (
              <img
                src={companyData.logo_url}
                alt={companyData.name}
                className="h-14 w-auto object-contain"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Package className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{companyData.name}</h1>
              <p className="text-slate-400 text-sm">Painel de Chamada</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-slate-400 text-sm">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 max-w-screen-2xl mx-auto w-full">
        {/* Coluna Principal - Pedido em Chamada */}
        <div className="col-span-7 flex flex-col">
          {/* Pedido Atual em Destaque */}
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {currentCall ? (
                <motion.div
                  key={currentCall.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="text-center"
                >
                  {/* Badge "RETIRE SEU PEDIDO" */}
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-full px-6 py-2 mb-6"
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    <span className="text-green-400 font-semibold text-xl uppercase tracking-wider">
                      Retire seu Pedido
                    </span>
                  </motion.div>

                  {/* Número do Pedido GRANDE */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 0 60px rgba(34, 197, 94, 0.3)',
                        '0 0 80px rgba(34, 197, 94, 0.5)',
                        '0 0 60px rgba(34, 197, 94, 0.3)',
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-12 mb-6 shadow-2xl"
                  >
                    <p className="text-white/80 text-2xl font-medium mb-2">Pedido</p>
                    <p className="text-white text-[12rem] font-black leading-none tracking-tight">
                      {String(currentCall.order_number).padStart(3, '0')}
                    </p>
                  </motion.div>

                  {/* Nome do Cliente */}
                  {currentCall.customer_name && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-3"
                    >
                      <Users className="w-8 h-8 text-slate-400" />
                      <p className="text-4xl font-bold text-white">
                        {currentCall.customer_name}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <Clock className="w-24 h-24 text-slate-500 mx-auto mb-6" />
                  <p className="text-3xl text-slate-400">Aguardando próximo pedido...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Últimos Chamados */}
          <div className="mt-auto">
            <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Últimos Chamados
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {lastCalledOrders.length > 0 ? (
                  lastCalledOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50"
                    >
                      <p className="text-3xl font-bold text-green-400">
                        #{String(order.order_number).padStart(3, '0')}
                      </p>
                      {order.customer_name && (
                        <p className="text-slate-400 text-sm mt-1 truncate">
                          {order.customer_name}
                        </p>
                      )}
                    </motion.div>
                  ))
                ) : (
                  [1, 2, 3].map((i) => (
                    <div
                      key={`empty-${i}`}
                      className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30"
                    >
                      <p className="text-2xl font-bold text-slate-600">---</p>
                      <p className="text-slate-600 text-sm mt-1">Aguardando</p>
                    </div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Coluna Lateral - Pedidos em Preparo */}
        <div className="col-span-5 flex flex-col">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Em Preparo</h2>
                <p className="text-slate-400 text-sm">Aguardando ficar pronto</p>
              </div>
              <div className="ml-auto bg-amber-500/20 rounded-full px-4 py-1">
                <span className="text-amber-400 font-bold">{pendingOrders.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingOrders.length > 0 ? (
                  pendingOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-700/40 rounded-xl p-4 flex items-center gap-4 border border-slate-600/30"
                    >
                      <div className="w-16 h-16 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-amber-400">
                          {order.order_number ? String(order.order_number).padStart(3, '0') : '--'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {order.customer_name || 'Cliente'}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {order.status === 'novo' ? 'Aguardando' : 'Em preparo'}
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                        className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Package className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-500 text-lg">Nenhum pedido em preparo</p>
                    <p className="text-slate-600 text-sm mt-1">
                      Os pedidos aparecerão aqui automaticamente
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/50 border-t border-slate-700/50 px-8 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Conectado
            </span>
            <span>
              Pedidos em espera: <span className="text-slate-400 font-medium">{pendingOrders.length}</span>
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Tecnologia Zoopi
          </p>
        </div>
      </footer>
    </div>
  );
}
