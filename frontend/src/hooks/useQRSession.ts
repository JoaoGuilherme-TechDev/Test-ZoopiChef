import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

export interface QRSession {
  id: string;
  company_id: string;
  session_type: 'table' | 'comanda';
  table_id: string | null;
  comanda_number: number | null;
  customer_name: string;
  customer_phone: string;
  status: 'active' | 'closed';
  last_activity_at: string;
  opened_at: string;
  closed_at: string | null;
}

export interface CustomerDietaryInfo {
  has_gluten_intolerance?: boolean;
  has_lactose_intolerance?: boolean;
  dietary_restrictions?: string[];
  allergy_notes?: string;
}

interface UseQRSessionParams {
  companyId: string | null;
  sessionType: 'table' | 'comanda';
  tableId?: string | null;
  tableNumber?: number | null;
  comandaNumber?: number | null;
}

const SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos

export function useQRSession({ 
  companyId, 
  sessionType, 
  tableId, 
  tableNumber,
  comandaNumber 
}: UseQRSessionParams) {
  const [session, setSession] = useState<QRSession | null>(null);
  const [customerDietary, setCustomerDietary] = useState<CustomerDietaryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIdentifying, setIsIdentifying] = useState(false);

  // Storage key para persistir sessão localmente
  const getStorageKey = useCallback(() => {
    if (sessionType === 'table' && tableId) {
      return `qr_session_table_${tableId}`;
    }
    if (sessionType === 'comanda' && companyId && comandaNumber) {
      return `qr_session_comanda_${companyId}_${comandaNumber}`;
    }
    return null;
  }, [sessionType, tableId, companyId, comandaNumber]);

  // Buscar sessão existente
  const fetchSession = useCallback(async () => {
    if (!companyId) return null;

    try {
      let query = supabase
        .from('qr_sessions')
        .select('*')
        .eq('company_id', companyId)
        .eq('session_type', sessionType)
        .eq('status', 'active');

      if (sessionType === 'table' && tableId) {
        query = query.eq('table_id', tableId);
      } else if (sessionType === 'comanda' && comandaNumber) {
        query = query.eq('comanda_number', comandaNumber);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as QRSession | null;
    } catch (error) {
      console.error('Error fetching QR session:', error);
      return null;
    }
  }, [companyId, sessionType, tableId, comandaNumber]);

  // Verificar timeout de inatividade
  const checkTimeout = useCallback((sessionData: QRSession): boolean => {
    const lastActivity = new Date(sessionData.last_activity_at).getTime();
    const now = Date.now();
    return (now - lastActivity) > SESSION_TIMEOUT_MS;
  }, []);

  // Criar nova sessão
  const createSession = useCallback(async (
    customerName: string, 
    customerPhone: string,
    dietaryInfo?: CustomerDietaryInfo
  ): Promise<QRSession | null> => {
    if (!companyId) return null;

    setIsIdentifying(true);
    try {
      const phoneDigits = customerPhone.replace(/\D/g, '');
      
      // Save/update dietary info in customer table if provided
      if (dietaryInfo) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .or(`whatsapp.eq.${phoneDigits},whatsapp.eq.55${phoneDigits}`)
          .maybeSingle();

        if (existingCustomer) {
          await supabase
            .from('customers')
            .update({
              has_gluten_intolerance: dietaryInfo.has_gluten_intolerance || false,
              has_lactose_intolerance: dietaryInfo.has_lactose_intolerance || false,
              dietary_restrictions: dietaryInfo.dietary_restrictions || [],
              allergy_notes: dietaryInfo.allergy_notes || null,
            })
            .eq('id', existingCustomer.id);
        }
        
        setCustomerDietary(dietaryInfo);
      }

      const insertData: any = {
        company_id: companyId,
        session_type: sessionType,
        customer_name: customerName.trim(),
        customer_phone: phoneDigits,
        status: 'active',
        last_activity_at: new Date().toISOString(),
      };

      if (sessionType === 'table' && tableId) {
        insertData.table_id = tableId;
      }
      if (sessionType === 'comanda' && comandaNumber) {
        insertData.comanda_number = comandaNumber;
      }

      const { data, error } = await supabase
        .from('qr_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newSession = data as QRSession;
      setSession(newSession);

      // Salvar no localStorage
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({
          sessionId: newSession.id,
          customerName: newSession.customer_name,
          customerPhone: newSession.customer_phone,
          dietaryInfo: dietaryInfo || null,
        }));
      }

      toast.success('Bem-vindo! Você pode fazer seus pedidos agora.');
      return newSession;
    } catch (error) {
      console.error('Error creating QR session:', error);
      toast.error('Erro ao iniciar sessão. Tente novamente.');
      return null;
    } finally {
      setIsIdentifying(false);
    }
  }, [companyId, sessionType, tableId, comandaNumber, getStorageKey]);

  // Atualizar atividade da sessão
  const updateActivity = useCallback(async () => {
    if (!session) return;

    try {
      await supabase
        .from('qr_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', session.id);

      setSession(prev => prev ? { ...prev, last_activity_at: new Date().toISOString() } : null);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }, [session]);

  // Fechar sessão
  const closeSession = useCallback(async () => {
    if (!session) return;

    try {
      await supabase
        .from('qr_sessions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      // Limpar localStorage
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      setSession(null);
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }, [session, getStorageKey]);

  // Chamar garçom
  const callWaiter = useCallback(async () => {
    if (!companyId) {
      toast.error('Não foi possível chamar o garçom: empresa não identificada.');
      return false;
    }

    if (!session) {
      toast.error('Sessão não encontrada. Recarregue a página e tente novamente.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('service_calls')
        .insert({
          company_id: companyId,
          qr_session_id: session.id,
          call_type: 'waiter',
          table_number: tableNumber || null,
          comanda_number: comandaNumber || null,
          customer_name: session.customer_name,
          status: 'pending',
        });

      if (error) throw error;

      await updateActivity();
      toast.success('Garçom chamado! Aguarde um momento.');
      return true;
    } catch (error) {
      console.error('Error calling waiter:', error);
      toast.error('Erro ao chamar garçom. Tente novamente.');
      return false;
    }
  }, [session, companyId, tableNumber, comandaNumber, updateActivity]);

  // Pedir conta
  const requestBill = useCallback(async (paymentPreference?: 'pix' | 'other') => {
    if (!companyId) {
      toast.error('Não foi possível pedir a conta: empresa não identificada.');
      return false;
    }

    if (!session) {
      toast.error('Sessão não encontrada. Recarregue a página e tente novamente.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('service_calls')
        .insert({
          company_id: companyId,
          qr_session_id: session.id,
          call_type: 'bill',
          table_number: tableNumber || null,
          comanda_number: comandaNumber || null,
          customer_name: session.customer_name,
          status: 'pending',
          payment_preference: paymentPreference || null,
        });

      if (error) throw error;

      await updateActivity();
      toast.success('Conta solicitada! A conta será impressa no caixa.');
      return true;
    } catch (error) {
      console.error('Error requesting bill:', error);
      toast.error('Erro ao pedir conta. Tente novamente.');
      return false;
    }
  }, [session, companyId, tableNumber, comandaNumber, updateActivity]);

  // Carregar sessão inicial
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);

      // Tentar recuperar do localStorage primeiro
      const storageKey = getStorageKey();
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const { sessionId } = JSON.parse(stored);
            const { data } = await supabase
              .from('qr_sessions')
              .select('*')
              .eq('id', sessionId)
              .eq('status', 'active')
              .maybeSingle();

            if (data) {
              const sessionData = data as QRSession;
              
              // Verificar timeout
              if (checkTimeout(sessionData)) {
                // Sessão expirou por inatividade
                await supabase
                  .from('qr_sessions')
                  .update({ status: 'closed', closed_at: new Date().toISOString() })
                  .eq('id', sessionData.id);
                localStorage.removeItem(storageKey);
              } else {
                setSession(sessionData);
                setIsLoading(false);
                return;
              }
            } else {
              localStorage.removeItem(storageKey);
            }
          } catch (e) {
            localStorage.removeItem(storageKey);
          }
        }
      }

      // Buscar sessão ativa no banco
      const existingSession = await fetchSession();
      if (existingSession) {
        if (checkTimeout(existingSession)) {
          await supabase
            .from('qr_sessions')
            .update({ status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', existingSession.id);
        } else {
          setSession(existingSession);
          // Salvar no localStorage
          if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify({
              sessionId: existingSession.id,
              customerName: existingSession.customer_name,
              customerPhone: existingSession.customer_phone,
            }));
          }
        }
      }

      setIsLoading(false);
    };

    if (companyId) {
      loadSession();
    } else {
      setIsLoading(false);
    }
  }, [companyId, getStorageKey, fetchSession, checkTimeout]);

  // Timer para verificar timeout
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      if (checkTimeout(session)) {
        closeSession();
        toast.info('Sessão encerrada por inatividade.');
      }
    }, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(interval);
  }, [session, checkTimeout, closeSession]);

  return {
    session,
    customerDietary,
    isLoading,
    isIdentifying,
    isIdentified: !!session,
    customerName: session?.customer_name || '',
    customerPhone: session?.customer_phone || '',
    createSession,
    updateActivity,
    closeSession,
    callWaiter,
    requestBill,
  };
}
