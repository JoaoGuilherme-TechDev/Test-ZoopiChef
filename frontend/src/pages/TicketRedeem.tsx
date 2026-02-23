/**
 * TicketRedeem - Página pública para validação de ticket via QR Code
 * 
 * Rota: /ticket/:code
 * Permite consultar e resgatar um ticket de produto.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { CheckCircle, XCircle, Ticket, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TicketData {
  id: string;
  product_name: string;
  ticket_index: number;
  ticket_total: number;
  ticket_code: string;
  status: string;
  used_at: string | null;
  customer_name: string | null;
  attendant_name: string | null;
  created_at: string;
}

export default function TicketRedeem() {
  const { code } = useParams<{ code: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    loadTicket(code);
  }, [code]);

  async function loadTicket(ticketCode: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('product_tickets')
        .select('*')
        .eq('ticket_code', ticketCode)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Ticket não encontrado');
        return;
      }
      setTicket(data);
      if (data.status === 'used') {
        setRedeemed(true);
      }
    } catch {
      setError('Erro ao carregar ticket');
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!ticket || ticket.status === 'used') return;
    setRedeeming(true);
    try {
      const { error: updateError } = await (supabase as any)
        .from('product_tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', ticket.id)
        .eq('status', 'available');

      if (updateError) throw updateError;
      setRedeemed(true);
      setTicket(prev => prev ? { ...prev, status: 'used', used_at: new Date().toISOString() } : null);
    } catch {
      setError('Erro ao resgatar ticket');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">
              {error || 'Ticket não encontrado'}
            </h2>
            <p className="text-muted-foreground">
              Verifique o código e tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isUsed = ticket.status === 'used' || redeemed;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center pb-2">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isUsed ? 'bg-destructive/10' : 'bg-green-500/10'
          }`}>
            {isUsed ? (
              <XCircle className="w-10 h-10 text-destructive" />
            ) : (
              <Ticket className="w-10 h-10 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isUsed ? 'Ticket Já Utilizado' : 'Ticket Disponível'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Produto */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Produto</p>
            <p className="text-xl font-bold text-foreground">{ticket.product_name}</p>
            <p className="text-lg font-semibold text-primary mt-1">
              ({ticket.ticket_index}/{ticket.ticket_total})
            </p>
          </div>

          {/* Detalhes */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Código:</span>
              <span className="font-mono font-bold text-foreground">{ticket.ticket_code}</span>
            </div>
            {ticket.customer_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="text-foreground">{ticket.customer_name}</span>
              </div>
            )}
            {ticket.attendant_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atendente:</span>
                <span className="text-foreground">{ticket.attendant_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-bold ${isUsed ? 'text-destructive' : 'text-green-500'}`}>
                {isUsed ? 'Utilizado' : 'Disponível'}
              </span>
            </div>
            {ticket.used_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usado em:</span>
                <span className="text-foreground">
                  {new Date(ticket.used_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* Botão de resgate */}
          {!isUsed && (
            <Button 
              onClick={handleRedeem} 
              disabled={redeeming}
              className="w-full"
              size="lg"
            >
              {redeeming ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              Confirmar Entrega
            </Button>
          )}

          {isUsed && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <p className="text-destructive font-bold">
                Este ticket já foi utilizado e não pode ser reutilizado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
