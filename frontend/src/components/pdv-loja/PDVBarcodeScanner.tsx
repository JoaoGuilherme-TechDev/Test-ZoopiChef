import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Barcode, Package, Tag, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useActiveProducts, Product } from '@/hooks/useProducts';
import { Comanda } from '@/hooks/useComandas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PDVBarcodeScannerProps {
  onProductScanned: (product: Product) => void;
  onComandaScanned: (comanda: Comanda) => void;
  openComandas: Comanda[];
  linkedComanda: Comanda | null;
  primaryColor?: string;
}

type ScanMode = 'product' | 'comanda';

type ProductMatch = {
  product: Product;
  reason: 'exact_code' | 'partial_code' | 'name';
};

export function PDVBarcodeScanner({
  onProductScanned,
  onComandaScanned,
  openComandas,
  linkedComanda,
  primaryColor = '#10b981',
}: PDVBarcodeScannerProps) {
  const [mode, setMode] = useState<ScanMode>('product');
  const [productCode, setProductCode] = useState('');
  const [comandaCode, setComandaCode] = useState('');
  const [lastScanStatus, setLastScanStatus] = useState<'success' | 'error' | null>(null);

  const productInputRef = useRef<HTMLInputElement>(null);
  const comandaInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useActiveProducts();

  // Auto-focus no campo ativo
  useEffect(() => {
    if (mode === 'product') {
      productInputRef.current?.focus();
    } else {
      comandaInputRef.current?.focus();
    }
  }, [mode]);

  // Limpar status após 2 segundos
  useEffect(() => {
    if (lastScanStatus) {
      const timer = setTimeout(() => setLastScanStatus(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastScanStatus]);

  const addProductToSale = useCallback(
    (product: Product) => {
      onProductScanned(product);
      setProductCode('');
      setLastScanStatus('success');
      // manter foco para sequência rápida
      setTimeout(() => productInputRef.current?.focus(), 0);
    },
    [onProductScanned]
  );

  const productMatches = useMemo<ProductMatch[]>(() => {
    const q = productCode.trim();
    if (!q) return [];

    const qLower = q.toLowerCase();

    // 1) Match exato por EAN/código interno
    const exact = products.find((p) => p.ean_code === q || p.internal_code === q);
    if (exact) return [{ product: exact, reason: 'exact_code' }];

    // 2) Match parcial por códigos (começa com)
    const byCode = products
      .filter((p) =>
        (p.ean_code && p.ean_code.startsWith(q)) || (p.internal_code && p.internal_code.startsWith(q))
      )
      .slice(0, 8)
      .map((p) => ({ product: p, reason: 'partial_code' as const }));

    // 3) Match por nome (contém)
    const byName = products
      .filter((p) => p.name.toLowerCase().includes(qLower))
      .slice(0, 8)
      .map((p) => ({ product: p, reason: 'name' as const }));

    // Combina (sem duplicar)
    const seen = new Set<string>();
    const merged: ProductMatch[] = [];
    for (const m of [...byCode, ...byName]) {
      if (seen.has(m.product.id)) continue;
      seen.add(m.product.id);
      merged.push(m);
      if (merged.length >= 8) break;
    }
    return merged;
  }, [products, productCode]);

  const submitProduct = useCallback(() => {
    const q = productCode.trim();
    if (!q) return;

    // Se tiver 1 match (ou exato), adiciona direto
    if (productMatches.length === 1) {
      addProductToSale(productMatches[0].product);
      return;
    }

    // Se houver múltiplos, adiciona o primeiro (o mais provável) no ENTER
    if (productMatches.length > 1) {
      addProductToSale(productMatches[0].product);
      return;
    }

    // Nada encontrado
    setLastScanStatus('error');
    toast.error('Produto não encontrado');
  }, [addProductToSale, productCode, productMatches]);

  // Buscar comanda por número
  const handleComandaScan = useCallback(
    (code: string) => {
      if (!code.trim()) return;

      const comandaNumber = parseInt(code.trim(), 10);

      if (isNaN(comandaNumber)) {
        setLastScanStatus('error');
        toast.error('Número de comanda inválido');
        return;
      }

      const comanda = openComandas.find((c) => c.command_number === comandaNumber);

      if (comanda) {
        onComandaScanned(comanda);
        setComandaCode('');
        setLastScanStatus('success');
        toast.success(`Comanda #${comanda.command_number} vinculada`);
      } else {
        setLastScanStatus('error');
        toast.error(`Comanda #${comandaNumber} não encontrada ou já fechada`);
      }
    },
    [openComandas, onComandaScanned]
  );

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-muted/20 border-b border-border">
      {/* Scanner de Produto */}
      <div className="flex items-center gap-2 flex-1">
        <div
          className={cn(
            'relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all flex-1',
            mode === 'product' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50',
            lastScanStatus === 'success' && mode === 'product' && 'border-green-500 bg-green-500/10',
            lastScanStatus === 'error' && mode === 'product' && 'border-red-500 bg-red-500/10'
          )}
          onClick={() => {
            setMode('product');
            productInputRef.current?.focus();
          }}
        >
          <Barcode className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={productInputRef}
            type="text"
            placeholder="Código de barras / Código interno / Nome"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitProduct();
              }
            }}
            onFocus={() => setMode('product')}
            className="border-0 bg-transparent focus-visible:ring-0 text-base h-8 px-0"
          />

          {lastScanStatus === 'success' && mode === 'product' && (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          )}
          {lastScanStatus === 'error' && mode === 'product' && (
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
          )}

          <Badge variant="outline" className="shrink-0 text-xs">
            <Package className="h-3 w-3 mr-1" />
            Produto
          </Badge>

          {/* Sugestões ao digitar */}
          {mode === 'product' && productCode.trim() && productMatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-border bg-popover shadow-lg z-50">
              <ScrollArea className="max-h-64">
                <div className="p-2 space-y-1">
                  {productMatches.map((m) => (
                    <button
                      key={m.product.id}
                      type="button"
                      className="w-full text-left rounded-md px-2 py-2 hover:bg-muted flex items-center justify-between gap-3"
                      onClick={() => addProductToSale(m.product)}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.product.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.product.internal_code ? `Cód: ${m.product.internal_code}` : ''}
                          {m.product.internal_code && m.product.ean_code ? ' • ' : ''}
                          {m.product.ean_code ? `EAN: ${m.product.ean_code}` : ''}
                        </div>
                      </div>
                      <span className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md bg-muted">
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border" />

      {/* Scanner de Comanda */}
      <div className="flex items-center gap-2 w-[280px]">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all flex-1',
            mode === 'comanda' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50',
            lastScanStatus === 'success' && mode === 'comanda' && 'border-green-500 bg-green-500/10',
            lastScanStatus === 'error' && mode === 'comanda' && 'border-red-500 bg-red-500/10',
            linkedComanda && 'border-green-500/50 bg-green-500/5'
          )}
          onClick={() => {
            setMode('comanda');
            comandaInputRef.current?.focus();
          }}
        >
          <Tag className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={comandaInputRef}
            type="text"
            placeholder={linkedComanda ? `#${linkedComanda.command_number}` : 'Nº Comanda'}
            value={comandaCode}
            onChange={(e) => setComandaCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleComandaScan(comandaCode);
              }
            }}
            onFocus={() => setMode('comanda')}
            className="border-0 bg-transparent focus-visible:ring-0 text-base h-8 px-0"
          />
          {linkedComanda ? (
            <Badge variant="default" className="shrink-0 text-xs" style={{ backgroundColor: primaryColor }}>
              #{linkedComanda.command_number}
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-xs">
              Comanda
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
