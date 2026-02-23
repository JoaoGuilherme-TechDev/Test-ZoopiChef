import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface FlavorWithPrices {
  id: string;
  name: string;
  prices: Record<string, number>; // size_name -> price
}

interface Props {
  flavorGroupId: string;
  sizes?: string[];
}

export function FlavorPricesEditor({ flavorGroupId, sizes = ['broto', 'média', 'grande'] }: Props) {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch flavors with their prices
  const { data: flavorsWithPrices, isLoading } = useQuery({
    queryKey: ['flavor-prices-editor', flavorGroupId],
    queryFn: async () => {
      // Get flavors from the group
      const { data: flavors, error: flavorsError } = await supabase
        .from('flavors')
        .select('id, name, active')
        .eq('flavor_group_id', flavorGroupId)
        .eq('active', true)
        .order('name');

      if (flavorsError) throw flavorsError;

      // Get all prices for these flavors
      const flavorIds = (flavors || []).map(f => f.id);
      const { data: prices, error: pricesError } = await supabase
        .from('flavor_prices')
        .select('flavor_id, size_name, price_full')
        .in('flavor_id', flavorIds);

      if (pricesError) throw pricesError;

      // Map flavors with their prices
      const result: FlavorWithPrices[] = (flavors || []).map(flavor => {
        const flavorPrices = (prices || []).filter(p => p.flavor_id === flavor.id);
        const pricesMap: Record<string, number> = {};
        flavorPrices.forEach(p => {
          pricesMap[p.size_name] = p.price_full || 0;
        });
        return {
          id: flavor.id,
          name: flavor.name,
          prices: pricesMap,
        };
      });

      return result;
    },
    enabled: !!flavorGroupId,
  });

  // Initialize edited prices when data loads
  useEffect(() => {
    if (flavorsWithPrices) {
      const initialPrices: Record<string, Record<string, number>> = {};
      flavorsWithPrices.forEach(f => {
        initialPrices[f.id] = { ...f.prices };
      });
      setEditedPrices(initialPrices);
      setHasChanges(false);
    }
  }, [flavorsWithPrices]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');
      
      const updates: Array<{ flavor_id: string; size_name: string; price_full: number }> = [];
      
      // Collect all changes
      Object.entries(editedPrices).forEach(([flavorId, sizePrices]) => {
        Object.entries(sizePrices).forEach(([sizeName, price]) => {
          updates.push({
            flavor_id: flavorId,
            size_name: sizeName,
            price_full: price,
          });
        });
      });

      // Upsert all prices one by one
      for (const update of updates) {
        // First check if price exists
        const { data: existing } = await supabase
          .from('flavor_prices')
          .select('id')
          .eq('flavor_id', update.flavor_id)
          .eq('size_name', update.size_name)
          .maybeSingle();
        
        if (existing) {
          // Update existing
          await supabase
            .from('flavor_prices')
            .update({ price_full: update.price_full })
            .eq('id', existing.id);
        } else {
          // Insert new - need company_id
          await supabase
            .from('flavor_prices')
            .insert({
              company_id: company.id,
              flavor_id: update.flavor_id,
              size_name: update.size_name,
              price_full: update.price_full,
            } as any);
        }
      }

      return true;
    },
    onSuccess: () => {
      toast.success('Preços salvos com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['flavor-prices-editor', flavorGroupId] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar preços');
    },
  });

  const handlePriceChange = (flavorId: string, sizeName: string, value: string) => {
    const price = parseFloat(value) || 0;
    setEditedPrices(prev => ({
      ...prev,
      [flavorId]: {
        ...(prev[flavorId] || {}),
        [sizeName]: price,
      },
    }));
    setHasChanges(true);
  };

  const formatSize = (size: string) => {
    const labels: Record<string, string> = {
      'broto': 'Broto',
      'pequena': 'Pequena',
      'média': 'Média',
      'grande': 'Grande',
      'família': 'Família',
    };
    return labels[size] || size;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flavorsWithPrices || flavorsWithPrices.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Nenhum sabor cadastrado neste grupo.
        <br />
        Cadastre sabores em <strong>Sabores</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Preços dos Sabores</Label>
        {hasChanges && (
          <Button 
            size="sm" 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            Salvar Preços
          </Button>
        )}
      </div>
      
      {/* Header */}
      <div className="grid grid-cols-[1fr_repeat(3,80px)] gap-2 text-xs font-medium text-muted-foreground px-2">
        <span>Sabor</span>
        {sizes.map(size => (
          <span key={size} className="text-center">{formatSize(size)}</span>
        ))}
      </div>

      <ScrollArea className="h-[200px] border rounded-lg">
        <div className="divide-y">
          {flavorsWithPrices.map((flavor) => (
            <div 
              key={flavor.id} 
              className="grid grid-cols-[1fr_repeat(3,80px)] gap-2 p-2 items-center hover:bg-muted/50"
            >
              <span className="text-sm font-medium truncate" title={flavor.name}>
                {flavor.name}
              </span>
              {sizes.map(size => (
                <Input
                  key={size}
                  type="number"
                  step="0.01"
                  min={0}
                  className="h-8 text-center text-sm px-1"
                  value={editedPrices[flavor.id]?.[size] ?? flavor.prices[size] ?? ''}
                  onChange={(e) => handlePriceChange(flavor.id, size, e.target.value)}
                  placeholder="0"
                />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Defina o preço da pizza inteira para cada tamanho. O sistema calculará automaticamente quando o cliente escolher múltiplos sabores.
      </p>
    </div>
  );
}