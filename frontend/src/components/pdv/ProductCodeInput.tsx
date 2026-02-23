import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Barcode, Search, Hash } from 'lucide-react';
import { useActiveProducts, Product } from '@/hooks/useProducts';
import { toast } from 'sonner';

interface ProductCodeInputProps {
  onProductFound: (product: Product) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function ProductCodeInput({ 
  onProductFound, 
  placeholder = "Digite código ou nome...",
  autoFocus = false,
  className = ""
}: ProductCodeInputProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: products = [] } = useActiveProducts();

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const findProduct = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return null;

    const term = searchTerm.trim().toLowerCase();

    // First try exact internal_code match
    let found = products.find(p => 
      p.internal_code?.toLowerCase() === term
    );

    // Then try exact EAN code match
    if (!found) {
      found = products.find(p => 
        p.ean_code === searchTerm.trim()
      );
    }

    // Then try partial code match (starts with)
    if (!found) {
      found = products.find(p => 
        p.internal_code?.toLowerCase().startsWith(term)
      );
    }

    // Then try name match
    if (!found) {
      found = products.find(p => 
        p.name.toLowerCase().includes(term)
      );
    }

    return found;
  }, [products]);

  const handleSubmit = useCallback(() => {
    const product = findProduct(code);
    
    if (product) {
      onProductFound(product);
      setCode('');
      inputRef.current?.focus();
    } else if (code.trim()) {
      toast.error(`Produto não encontrado: ${code}`);
    }
  }, [code, findProduct, onProductFound]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 font-mono"
        />
      </div>
      <Button 
        type="button" 
        variant="secondary" 
        size="icon"
        onClick={handleSubmit}
        title="Buscar produto (Enter)"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
