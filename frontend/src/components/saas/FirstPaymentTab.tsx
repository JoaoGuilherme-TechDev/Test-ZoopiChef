/**
 * First Payment Tab - SaaS Admin
 * 
 * Tab for generating and managing first payment for a company.
 * Supports PIX and Boleto via Asaas.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  QrCode, 
  FileText, 
  Loader2, 
  Copy, 
  Check,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useCompanyFirstPayment, useGenerateFirstPayment } from '@/hooks/useSaasCompanyOnboarding';
import { usePlans } from '@/hooks/useSaasAdmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface FirstPaymentTabProps {
  companyId: string;
  companyName: string;
  onPaymentSuccess?: () => void;
}

export function FirstPaymentTab({ companyId, companyName, onPaymentSuccess }: FirstPaymentTabProps) {
  const { data: payment, isLoading: paymentLoading, refetch } = useCompanyFirstPayment(companyId);
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const generatePayment = useGenerateFirstPayment();

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto'>('pix');
  const [copied, setCopied] = useState(false);

  const activePlans = plans.filter(p => p.is_active);

  const handleGeneratePayment = async () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano');
      return;
    }

    await generatePayment.mutateAsync({
      companyId,
      planId: selectedPlan,
      paymentMethod,
    });

    refetch();
  };

  const handleCopyPix = () => {
    if (payment?.asaas_pix_code) {
      navigator.clipboard.writeText(payment.asaas_pix_code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Pago</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Aguardando</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Pendente</Badge>;
      case 'expired':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50">Expirado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Cancelado</Badge>;
      default:
        return null;
    }
  };

  if (paymentLoading || plansLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  // Payment already exists and is paid
  if (payment?.status === 'paid') {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Pagamento Confirmado!</h3>
              <p className="text-slate-400 mt-1">
                Empresa ativada em {payment.paid_at ? format(new Date(payment.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'data não disponível'}
              </p>
            </div>
            <div className="text-sm text-slate-500">
              Plano: {payment.plan_name} • R$ {(payment.amount_cents / 100).toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paymentStatus = payment?.status as string | undefined;
  const isPaidStatus = paymentStatus === 'paid';

  // Payment exists but not paid - show payment details
  if (payment && !isPaidStatus) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Primeiro Pagamento</CardTitle>
              <CardDescription className="text-slate-400">
                Cobrança gerada para {companyName}
              </CardDescription>
            </div>
            {getStatusBadge(payment.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-sm text-slate-400">Valor</p>
              <p className="text-2xl font-bold text-white">
                R$ {(payment.amount_cents / 100).toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-sm text-slate-400">Vencimento</p>
              <p className="text-lg font-medium text-white">
                {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* PIX Payment */}
          {payment.payment_method === 'pix' && payment.asaas_pix_code && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <QrCode className="w-5 h-5" />
                <span className="font-medium">Pagamento via PIX</span>
              </div>

              {payment.asaas_pix_qr_code_url && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={`data:image/png;base64,${payment.asaas_pix_qr_code_url}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 rounded bg-slate-800 text-slate-300 text-xs overflow-auto break-all">
                    {payment.asaas_pix_code}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopyPix}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Boleto Payment */}
          {payment.payment_method === 'boleto' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Pagamento via Boleto</span>
              </div>

              {payment.asaas_boleto_barcode && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Código de Barras</Label>
                  <code className="block p-3 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                    {payment.asaas_boleto_barcode}
                  </code>
                </div>
              )}

              {payment.asaas_boleto_url && (
                <Button asChild className="w-full">
                  <a href={payment.asaas_boleto_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Boleto
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Payment Link */}
          {payment.asaas_payment_url && (
            <Button asChild variant="outline" className="w-full">
              <a href={payment.asaas_payment_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Link de Pagamento
              </a>
            </Button>
          )}

          {/* Regenerate button for expired/cancelled */}
          {['expired', 'cancelled'].includes(payment.status) && (
            <div className="pt-4">
              <Button 
                onClick={handleGeneratePayment} 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={generatePayment.isPending}
              >
                {generatePayment.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Gerar Nova Cobrança
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // No payment - show form to generate
  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Gerar Primeiro Pagamento</CardTitle>
        <CardDescription className="text-slate-400">
          Selecione o plano e método de pagamento para ativar a empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Selection */}
        <div className="space-y-3">
          <Label className="text-slate-300">Plano</Label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} - R$ {((plan.price_cents || 0) / 100).toFixed(2)}/mês
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label className="text-slate-300">Método de Pagamento</Label>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'pix' | 'boleto')}>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                paymentMethod === 'pix' 
                  ? 'bg-purple-600/20 border-purple-500' 
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}>
                <RadioGroupItem value="pix" id="pix" />
                <QrCode className="w-5 h-5 text-green-400" />
                <div>
                  <p className="font-medium text-white">PIX</p>
                  <p className="text-xs text-slate-400">Pagamento instantâneo</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                paymentMethod === 'boleto' 
                  ? 'bg-purple-600/20 border-purple-500' 
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}>
                <RadioGroupItem value="boleto" id="boleto" />
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-medium text-white">Boleto</p>
                  <p className="text-xs text-slate-400">Até 3 dias úteis</p>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Selected Plan Summary */}
        {selectedPlan && (
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Valor a pagar</p>
                <p className="text-2xl font-bold text-white">
                  R$ {((activePlans.find(p => p.id === selectedPlan)?.price_cents || 0) / 100).toFixed(2)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGeneratePayment}
          disabled={!selectedPlan || generatePayment.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {generatePayment.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando Cobrança...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Gerar Cobrança
            </>
          )}
        </Button>

        <p className="text-xs text-center text-slate-500">
          A empresa será ativada automaticamente após a confirmação do pagamento.
        </p>
      </CardContent>
    </Card>
  );
}
