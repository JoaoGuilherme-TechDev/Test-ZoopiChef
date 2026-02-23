import { useState } from 'react';
import { X, Plus, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { WineProduct } from '../types';

interface WineComparisonProps {
  wines: WineProduct[];
  selectedWines?: WineProduct[];
  onToggleWine?: (wine: WineProduct) => void;
  onRemoveWine?: (wineId: string) => void;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function WineComparison({ 
  wines, 
  selectedWines = [], 
  onToggleWine,
  onRemoveWine,
  onClose,
  trigger 
}: WineComparisonProps) {
  const [isOpen, setIsOpen] = useState(trigger ? false : true);
  const [localSelected, setLocalSelected] = useState<WineProduct[]>(selectedWines);

  // Use wines prop directly if no trigger (inline mode)
  const comparisonWines = trigger ? (onToggleWine ? selectedWines : localSelected) : wines;

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleToggle = (wine: WineProduct) => {
    if (onRemoveWine) {
      onRemoveWine(wine.id);
      return;
    }
    if (onToggleWine) {
      onToggleWine(wine);
    } else {
      setLocalSelected(prev => {
        const exists = prev.find(w => w.id === wine.id);
        if (exists) {
          return prev.filter(w => w.id !== wine.id);
        }
        if (prev.length >= 3) {
          return [...prev.slice(1), wine];
        }
        return [...prev, wine];
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getWineTagValue = (wine: WineProduct, tagType: string): string | null => {
    const tag = wine.tags?.find(t => t.tag_type === tagType);
    return tag?.tag_value || null;
  };

  const getComparisonValue = (wine: WineProduct, key: string): string => {
    switch (key) {
      case 'price':
        return formatCurrency(wine.price);
      case 'type':
        return getWineTagValue(wine, 'tipo') || getWineTagValue(wine, 'wine_type') || '-';
      case 'profile':
        return wine.sensoryProfile || '-';
      case 'badge':
        return wine.badge || '-';
      case 'destaque':
        const destaque = getWineTagValue(wine, 'destaque');
        if (destaque === 'sommelier_pick') return '⭐ Escolha do Sommelier';
        if (destaque === 'best_sellers') return '🔥 Mais Vendido';
        if (destaque === 'best_value') return '💰 Custo-Benefício';
        return destaque || '-';
      default:
        return '-';
    }
  };

  const comparisonRows = [
    { key: 'price', label: 'Preço' },
    { key: 'type', label: 'Tipo' },
    { key: 'profile', label: 'Perfil Sensorial' },
    { key: 'destaque', label: 'Destaque' },
    { key: 'badge', label: 'Categoria' },
  ];

  const renderComparisonContent = () => {
    if (comparisonWines.length === 0) {
      return (
        <div className="text-center py-12">
          <GitCompare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Selecione até 3 vinhos para comparar
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Wine Cards Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonWines.length}, 1fr)` }}>
          {comparisonWines.map((wine) => (
            <Card key={wine.id} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => handleToggle(wine)}
              >
                <X className="w-4 h-4" />
              </Button>
              <CardContent className="p-4 text-center">
                <div className="w-20 h-28 mx-auto mb-3">
                  {wine.image_url ? (
                    <img 
                      src={wine.image_url} 
                      alt={wine.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                      <span className="text-3xl">🍷</span>
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-sm line-clamp-2">{wine.name}</h4>
                {wine.tags?.some(t => t.tag_value === 'sommelier_pick') && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    ⭐ Sommelier Pick
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
          {comparisonWines.length < 3 && (
            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-muted-foreground">
                  <Plus className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Adicionar vinho</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Características</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {comparisonRows.map((row) => (
                <div 
                  key={row.key}
                  className="grid gap-4 py-3 px-4"
                  style={{ gridTemplateColumns: `120px repeat(${comparisonWines.length}, 1fr)` }}
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {row.label}
                  </span>
                  {comparisonWines.map((wine) => (
                    <span key={wine.id} className="text-sm text-center">
                      {getComparisonValue(wine, row.key)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Inline mode (no trigger)
  if (!trigger) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Comparar Vinhos
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[70vh]">
            {renderComparisonContent()}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <GitCompare className="w-4 h-4" />
            Comparar ({comparisonWines.length}/3)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Comparar Vinhos
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          {renderComparisonContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
