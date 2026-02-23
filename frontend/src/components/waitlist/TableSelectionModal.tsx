import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Check } from 'lucide-react';
import { useState } from 'react';

interface AvailableTable {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
}

interface TableSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: AvailableTable[];
  customerName: string;
  partySize: number;
  onSelectTable: (table: AvailableTable) => void;
  isLoading?: boolean;
}

export function TableSelectionModal({
  open,
  onOpenChange,
  tables,
  customerName,
  partySize,
  onSelectTable,
  isLoading,
}: TableSelectionModalProps) {
  const [selectedTable, setSelectedTable] = useState<AvailableTable | null>(null);

  // Sort tables by capacity (prefer smallest that fits)
  const sortedTables = [...tables].sort((a, b) => {
    const aFits = a.capacity >= partySize;
    const bFits = b.capacity >= partySize;
    if (aFits && !bFits) return -1;
    if (!aFits && bFits) return 1;
    return a.capacity - b.capacity;
  });

  const handleConfirm = () => {
    if (selectedTable) {
      onSelectTable(selectedTable);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Selecionar Mesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-semibold">{customerName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {partySize} {partySize === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>

          {/* Table Grid */}
          <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
            {sortedTables.map((table) => {
              const fits = table.capacity >= partySize;
              const isSelected = selectedTable?.id === table.id;
              
              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : fits
                      ? 'border-muted-foreground/20 hover:border-primary/50'
                      : 'border-destructive/30 bg-destructive/5 opacity-60'
                  }`}
                  disabled={!fits}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold">{table.number}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  {table.name && (
                    <p className="text-xs text-muted-foreground truncate">{table.name}</p>
                  )}
                  <Badge 
                    variant={fits ? 'secondary' : 'destructive'} 
                    className="text-xs mt-1"
                  >
                    {table.capacity} lugares
                  </Badge>
                </button>
              );
            })}
          </div>

          {sortedTables.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma mesa disponível
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!selectedTable || isLoading}
            >
              {isLoading ? 'Acomodando...' : `Mesa ${selectedTable?.number || ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
