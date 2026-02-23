import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanLine, CheckCircle2, AlertTriangle, XCircle, Lock, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

interface ValidationResult {
  number: number;
  name: string | null;
  status: 'livre' | 'com_consumo' | 'fechada' | 'nao_encontrada';
  statusLabel: string;
  totalAmount: number;
  itemsCount: number;
}

export default function ComandaValidatorPublic() {
  const { token } = useParams<{ token: string }>();
  const [comandaNumber, setComandaNumber] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<ValidationResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString(),
    };
  };

  const handleValidate = async () => {
    if (!comandaNumber.trim()) {
      toast.error('Digite o número da comanda');
      return;
    }

    const num = parseInt(comandaNumber.trim(), 10);
    if (isNaN(num) || num <= 0) {
      toast.error('Número inválido');
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-comanda', {
        body: {
          token,
          comandaNumber: num,
          deviceInfo: getDeviceInfo(),
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const validationResult = data.comanda as ValidationResult;
      setResult(validationResult);
      setHistory(prev => [validationResult, ...prev.slice(0, 9)]);
      setComandaNumber('');

      // Vibrar se disponível
      if (navigator.vibrate) {
        navigator.vibrate(validationResult.status === 'livre' ? 100 : 300);
      }
    } catch (error) {
      console.error('Erro ao validar:', error);
      toast.error('Erro ao validar comanda');
    } finally {
      setIsValidating(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'livre':
        return <CheckCircle2 className="w-16 h-16 text-green-500" />;
      case 'com_consumo':
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
      case 'fechada':
        return <Lock className="w-16 h-16 text-gray-500" />;
      case 'nao_encontrada':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'com_consumo':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'fechada':
        return 'bg-gray-100 border-gray-500 text-gray-800';
      case 'nao_encontrada':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto bg-primary rounded-2xl flex items-center justify-center mb-3">
            <ScanLine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Validador de Comanda</h1>
          <p className="text-muted-foreground text-sm">Digite ou escaneie o número da comanda</p>
        </div>

        {/* Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Número da comanda"
                value={comandaNumber}
                onChange={(e) => setComandaNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-2xl text-center h-14 font-mono"
                disabled={isValidating}
                autoFocus
              />
              <Button 
                onClick={handleValidate} 
                disabled={isValidating}
                className="h-14 px-6"
              >
                {isValidating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ScanLine className="w-5 h-5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result && (
          <Card className={`border-2 ${getStatusColor(result.status)}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                {getStatusIcon(result.status)}
                
                <div>
                  <p className="text-3xl font-bold">Comanda {result.number}</p>
                  {result.name && (
                    <p className="text-lg text-muted-foreground">{result.name}</p>
                  )}
                </div>

                <Badge 
                  variant="outline" 
                  className={`text-lg py-2 px-4 ${getStatusColor(result.status)}`}
                >
                  {result.statusLabel}
                </Badge>

                {result.status === 'com_consumo' && (
                  <div className="w-full bg-background/50 rounded-lg p-4 mt-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Itens</p>
                        <p className="text-2xl font-bold">{result.itemsCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {formatCurrency(result.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.status === 'fechada' && result.totalAmount > 0 && (
                  <p className="text-lg">
                    Total pago: <strong>{formatCurrency(result.totalAmount)}</strong>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Últimas consultas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {item.number}
                    </Badge>
                    {item.name && (
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    )}
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`text-xs ${
                      item.status === 'livre' ? 'bg-green-100 text-green-800' :
                      item.status === 'com_consumo' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'fechada' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status === 'livre' ? '✓ Livre' :
                     item.status === 'com_consumo' ? `R$ ${(item.totalAmount / 100).toFixed(2)}` :
                     item.status === 'fechada' ? 'Fechada' : 'N/E'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Smartphone className="w-4 h-4" />
          <span>Todas as consultas são registradas para auditoria</span>
        </div>
      </div>
    </div>
  );
}
