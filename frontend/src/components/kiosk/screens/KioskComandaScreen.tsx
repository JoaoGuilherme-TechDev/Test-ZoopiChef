/**
 * Kiosk Comanda Screen
 * 
 * Tela para o totem trabalhar com comandas:
 * - Cliente escaneia o código de barras da comanda (leitor USB)
 * - Ou digita o número manualmente
 * - Pode escolher: Lançar produtos ou Pagar
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ScanBarcode, 
  ShoppingCart, 
  CreditCard, 
  ArrowLeft,
  Loader2,
  Package,
  Keyboard,
  Focus
} from 'lucide-react';

interface ComandaData {
  id: string;
  number: number;
  name: string | null;
  total: number;
}

interface KioskComandaScreenProps {
  companyId: string;
  onSelectComanda: (comandaId: string, mode: 'add' | 'pay') => void;
  onBack: () => void;
}

export function KioskComandaScreen({ 
  companyId, 
  onSelectComanda, 
  onBack 
}: KioskComandaScreenProps) {
  const [barcode, setBarcode] = useState('');
  const [comanda, setComanda] = useState<ComandaData | null>(null);
  const [scanMode, setScanMode] = useState<'scan' | 'manual'>('scan');
  const [isListening, setIsListening] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef<string>('');
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input
  useEffect(() => {
    if (!comanda && inputRef.current) {
      inputRef.current.focus();
    }
  }, [comanda, scanMode]);

  // Barcode scanner detection (USB scanner sends keystrokes rapidly)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isListening || comanda) return;

    // Clear timeout if exists
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    // If Enter, process the buffer
    if (e.key === 'Enter') {
      const scannedCode = scanBufferRef.current.trim();
      if (scannedCode) {
        setBarcode(scannedCode);
        searchComanda.mutate(scannedCode);
      }
      scanBufferRef.current = '';
      return;
    }

    // Add character to buffer (only numbers)
    if (/^\d$/.test(e.key)) {
      scanBufferRef.current += e.key;
    }

    // Clear buffer after 100ms of inactivity (scanner sends all chars quickly)
    scanTimeoutRef.current = setTimeout(() => {
      scanBufferRef.current = '';
    }, 100);
  }, [isListening, comanda]);

  // Attach global key listener for barcode scanner
  useEffect(() => {
    if (scanMode === 'scan') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [scanMode, handleKeyDown]);

  // Search comanda by number
  const searchComanda = useMutation({
    mutationFn: async (code: string) => {
      const number = parseInt(code.replace(/\D/g, ''));
      
      if (isNaN(number) || number <= 0) {
        throw new Error('Número inválido');
      }
      
      // Find order with this comanda_number
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, comanda_number, customer_name, total')
        .eq('company_id', companyId)
        .eq('comanda_number', number)
        .in('status', ['novo', 'preparo', 'pronto'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!order) throw new Error('Comanda não encontrada');
      
      return {
        id: order.id,
        number: order.comanda_number || 0,
        name: order.customer_name,
        total: (order.total || 0) / 100,
      } as ComandaData;
    },
    onSuccess: (data) => {
      setComanda(data);
      setBarcode('');
      setIsListening(false);
    },
    onError: () => {
      setBarcode('');
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      searchComanda.mutate(barcode.trim());
    }
  };

  const handleReset = () => {
    setComanda(null);
    setBarcode('');
    setIsListening(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // If comanda is selected, show options
  if (comanda) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-8">
              {/* Comanda Info */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  <Badge variant="outline" className="text-3xl px-8 py-4 mb-4 border-primary text-primary">
                    Comanda #{comanda.number}
                  </Badge>
                </motion.div>
                {comanda.name && (
                  <h2 className="text-3xl font-bold text-white">{comanda.name}</h2>
                )}
                {comanda.total > 0 && (
                  <p className="text-2xl text-muted-foreground mt-2">
                    Total atual: <span className="font-bold text-primary">{formatCurrency(comanda.total)}</span>
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-6">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-40 flex-col gap-4 text-xl border-2 border-primary/50 hover:border-primary hover:bg-primary/10"
                    onClick={() => onSelectComanda(comanda.id, 'add')}
                  >
                    <ShoppingCart className="h-16 w-16 text-primary" />
                    <span className="text-white">Adicionar Produtos</span>
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    className="w-full h-40 flex-col gap-4 text-xl bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    onClick={() => onSelectComanda(comanda.id, 'pay')}
                  >
                    <CreditCard className="h-16 w-16" />
                    <span>Pagar Conta</span>
                  </Button>
                </motion.div>
              </div>

              {/* Back button */}
              <Button
                variant="ghost"
                className="w-full mt-6 text-muted-foreground hover:text-white"
                onClick={handleReset}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Outra Comanda
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Initial scan screen
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-zinc-900 to-zinc-950">
      <Card className="w-full max-w-lg bg-zinc-800 border-zinc-700">
        <CardContent className="p-8 text-center">
          {/* Icon Animation */}
          <motion.div
            className="w-28 h-28 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center relative"
            animate={{ scale: scanMode === 'scan' ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: scanMode === 'scan' ? Infinity : 0 }}
          >
            <ScanBarcode className="w-14 h-14 text-primary" />
            {scanMode === 'scan' && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary"
                animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-2 text-white">
            {scanMode === 'scan' ? 'Passe sua Comanda' : 'Digite o Número'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {scanMode === 'scan' 
              ? 'Posicione o código de barras no leitor'
              : 'Digite o número da sua comanda'
            }
          </p>

          {/* Mode Toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={scanMode === 'scan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setScanMode('scan');
                setIsListening(true);
              }}
              className={scanMode === 'scan' ? 'bg-primary' : 'border-zinc-600'}
            >
              <Focus className="w-4 h-4 mr-2" />
              Leitor
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setScanMode('manual');
                setIsListening(false);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={scanMode === 'manual' ? 'bg-primary' : 'border-zinc-600'}
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Digitar
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={scanMode === 'scan' ? 'Aguardando leitura...' : 'Número da comanda'}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-3xl h-16 bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500"
                autoFocus
                readOnly={scanMode === 'scan'}
              />
              {searchComanda.isPending && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 animate-spin text-primary" />
              )}
            </div>
            
            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
              disabled={searchComanda.isPending || !barcode}
            >
              {searchComanda.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Package className="mr-2 h-5 w-5" />
              )}
              Buscar Comanda
            </Button>

            <AnimatePresence>
              {searchComanda.isError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-destructive text-center"
                >
                  Comanda não encontrada ou já fechada
                </motion.p>
              )}
            </AnimatePresence>
          </form>

          <Button
            variant="ghost"
            className="mt-6 text-muted-foreground hover:text-white"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}