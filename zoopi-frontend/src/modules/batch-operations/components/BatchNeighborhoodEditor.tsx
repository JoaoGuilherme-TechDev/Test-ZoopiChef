import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, MapPin, ArrowRight, Percent } from 'lucide-react';
import { useBatchNeighborhoods, useBatchUpdateNeighborhoods } from '../hooks/useBatchOperations';
import type { BatchNeighborhoodUpdate } from '../types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BatchNeighborhoodEditor() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feeChanges, setFeeChanges] = useState<Record<string, number>>({});
  const [percentChange, setPercentChange] = useState<number>(0);
  const [fixedValue, setFixedValue] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  const { data: neighborhoods = [], isLoading } = useBatchNeighborhoods();
  const batchUpdate = useBatchUpdateNeighborhoods();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Get unique cities for filter
  const cities = useMemo(() => {
    const unique = [...new Set(neighborhoods.map(n => n.city))].filter(Boolean);
    return unique.sort();
  }, [neighborhoods]);

  // Filtered neighborhoods
  const filteredNeighborhoods = useMemo(() => {
    if (!cityFilter) return neighborhoods;
    return neighborhoods.filter(n => n.city === cityFilter);
  }, [neighborhoods, cityFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNeighborhoods.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNeighborhoods.map(n => n.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFeeChange = (neighborhoodId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFeeChanges(prev => ({
      ...prev,
      [neighborhoodId]: numValue >= 0 ? numValue : 0,
    }));
  };

  const applyPercentToSelected = () => {
    if (!percentChange || selectedIds.length === 0) return;

    const newChanges = { ...feeChanges };
    selectedIds.forEach(id => {
      const neighborhood = neighborhoods.find(n => n.id === id);
      if (neighborhood) {
        const multiplier = 1 + percentChange / 100;
        newChanges[id] = Math.round(neighborhood.fee * multiplier * 100) / 100;
      }
    });
    setFeeChanges(newChanges);
    toast.success(`Percentual aplicado a ${selectedIds.length} bairros`);
  };

  const applyFixedToSelected = () => {
    if (fixedValue === 0 || selectedIds.length === 0) return;

    const newChanges = { ...feeChanges };
    selectedIds.forEach(id => {
      newChanges[id] = fixedValue;
    });
    setFeeChanges(newChanges);
    toast.success(`Valor fixo aplicado a ${selectedIds.length} bairros`);
  };

  const pendingChanges: BatchNeighborhoodUpdate[] = useMemo(() => {
    return Object.entries(feeChanges)
      .filter(([id, newFee]) => {
        const neighborhood = neighborhoods.find(n => n.id === id);
        return neighborhood && newFee !== neighborhood.fee;
      })
      .map(([neighborhoodId, newFee]) => {
        const neighborhood = neighborhoods.find(n => n.id === neighborhoodId)!;
        return {
          neighborhoodId,
          neighborhood: neighborhood.neighborhood,
          city: neighborhood.city,
          currentFee: neighborhood.fee,
          newFee,
        };
      });
  }, [feeChanges, neighborhoods]);

  const handleConfirm = () => {
    batchUpdate.mutate(pendingChanges, {
      onSuccess: () => {
        setShowPreview(false);
        setFeeChanges({});
        setSelectedIds([]);
        setPercentChange(0);
        setFixedValue(0);
      },
    });
  };

  const hasChanges = pendingChanges.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Alteração em Lote de Bairros
        </CardTitle>
        <CardDescription>
          Ajuste taxas de entrega de múltiplos bairros de uma vez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtro por cidade */}
        {cities.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filtrar por cidade:</label>
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="border rounded-md px-3 py-2 bg-background"
            >
              <option value="">Todas as cidades</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {cityFilter && (
              <Badge variant="secondary">
                {filteredNeighborhoods.length} bairros
              </Badge>
            )}
          </div>
        )}

        {/* Ações em lote */}
        {filteredNeighborhoods.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            {/* Ajuste percentual */}
            <div className="flex items-center gap-3">
              <Percent className="h-4 w-4" />
              <Input
                type="number"
                value={percentChange || ''}
                onChange={e => setPercentChange(parseFloat(e.target.value) || 0)}
                placeholder="+10 ou -5"
                className="w-24"
              />
              <span className="text-sm">%</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={applyPercentToSelected}
                disabled={!percentChange || selectedIds.length === 0}
              >
                Aplicar %
              </Button>
            </div>

            {/* Valor fixo */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">R$</span>
              <Input
                type="number"
                step="0.01"
                value={fixedValue || ''}
                onChange={e => setFixedValue(parseFloat(e.target.value) || 0)}
                placeholder="Valor fixo"
                className="w-28"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={applyFixedToSelected}
                disabled={!fixedValue || selectedIds.length === 0}
              >
                Aplicar Valor
              </Button>
            </div>

            <div className="col-span-2 text-sm text-muted-foreground">
              {selectedIds.length} bairro(s) selecionado(s)
            </div>
          </div>
        )}

        {/* Tabela de bairros */}
        {filteredNeighborhoods.length > 0 ? (
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.length === filteredNeighborhoods.length && filteredNeighborhoods.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Taxa Atual</TableHead>
                  <TableHead className="text-center w-[50px]"></TableHead>
                  <TableHead>Nova Taxa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNeighborhoods.map(neighborhood => {
                  const newFee = feeChanges[neighborhood.id];
                  const hasChange = newFee !== undefined && newFee !== neighborhood.fee;

                  return (
                    <TableRow key={neighborhood.id} className={hasChange ? 'bg-warning/10' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(neighborhood.id)}
                          onCheckedChange={() => toggleSelect(neighborhood.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{neighborhood.neighborhood}</TableCell>
                      <TableCell>{neighborhood.city}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(neighborhood.fee)}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasChange && <ArrowRight className="h-4 w-4 text-warning" />}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={newFee ?? ''}
                          onChange={e => handleFeeChange(neighborhood.id, e.target.value)}
                          placeholder={String(neighborhood.fee)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={neighborhood.active ? 'default' : 'secondary'}>
                          {neighborhood.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum bairro cadastrado
          </div>
        ) : null}

        {/* Ações */}
        {hasChanges && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium">
                {pendingChanges.length} bairro(s) com alterações pendentes
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFeeChanges({});
                  setSelectedIds([]);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => setShowPreview(true)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Pré-visualizar
              </Button>
            </div>
          </div>
        )}

        {/* Dialog de confirmação */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Confirmar Alterações de Taxas
              </DialogTitle>
              <DialogDescription>
                Revise as alterações antes de confirmar. Esta ação afetará {pendingChanges.length} bairro(s).
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bairro</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-right">Taxa Atual</TableHead>
                    <TableHead className="text-right">Nova Taxa</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingChanges.map(change => (
                    <TableRow key={change.neighborhoodId}>
                      <TableCell>{change.neighborhood}</TableCell>
                      <TableCell>{change.city}</TableCell>
                      <TableCell className="text-right">{formatCurrency(change.currentFee)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(change.newFee)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={change.newFee > change.currentFee ? 'default' : 'destructive'}>
                          {change.newFee > change.currentFee ? '+' : ''}
                          {formatCurrency(change.newFee - change.currentFee)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={batchUpdate.isPending}>
                {batchUpdate.isPending ? 'Salvando...' : `Confirmar ${pendingChanges.length} Alterações`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
