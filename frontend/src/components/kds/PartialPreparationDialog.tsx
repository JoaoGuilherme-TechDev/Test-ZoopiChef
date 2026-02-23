import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Loader2, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KDSOrderItem } from '@/hooks/useKDS';
import { ItemStatus } from '@/hooks/useItemStatus';

interface PartialPreparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: (KDSOrderItem & { item_status?: ItemStatus })[];
  onConfirm: (selectedItemIds: string[], printSelected: boolean) => void;
  isLoading?: boolean;
  orderId: string;
  orderNumber?: string;
}

const itemStatusLabels: Record<ItemStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-muted' },
  preparo: { label: 'Em Preparo', color: 'bg-warning' },
  pronto: { label: 'Pronto', color: 'bg-success' },
  cancelado: { label: 'Cancelado', color: 'bg-destructive' },
};

export function PartialPreparationDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isLoading = false,
  orderId,
  orderNumber,
}: PartialPreparationDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printAfter, setPrintAfter] = useState(true);

  // Filter only pending items that can be started
  const pendingItems = items.filter(
    (item) => 
      (!item.item_status || item.item_status === 'pendente') && 
      item.edit_status !== 'removed'
  );

  const handleToggleItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((i) => i.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds), printAfter);
    setSelectedIds(new Set());
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-warning" />
            Iniciar Preparo Parcial
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber || orderId.slice(0, 8)} - Selecione os itens para iniciar produção
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
          {/* Select All */}
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
              onCheckedChange={handleSelectAll}
              disabled={pendingItems.length === 0}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              Selecionar todos ({pendingItems.length} pendentes)
            </label>
          </div>

          {/* Items List */}
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item pendente para iniciar preparo
            </p>
          ) : (
            pendingItems.map((item) => {
              const status = item.item_status || 'pendente';
              const statusInfo = itemStatusLabels[status];

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                    selectedIds.has(item.id)
                      ? "bg-warning/10 border-warning"
                      : "bg-muted/30 border-transparent hover:border-muted"
                  )}
                >
                  <Checkbox
                    id={item.id}
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => handleToggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={item.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="font-bold text-primary">
                        {item.quantity}x
                      </span>
                      <span className="font-medium truncate">
                        {item.product_name}
                      </span>
                    </label>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        📝 {item.notes}
                      </p>
                    )}
                    {item.sector_name && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs"
                        style={{
                          borderColor: item.sector_color,
                          color: item.sector_color,
                        }}
                      >
                        {item.sector_name}
                      </Badge>
                    )}
                  </div>
                  <Badge className={cn("text-xs", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>
              );
            })
          )}
        </div>

        {/* Print Option */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id="print-after"
            checked={printAfter}
            onCheckedChange={(checked) => setPrintAfter(!!checked)}
          />
          <label htmlFor="print-after" className="text-sm flex items-center gap-2 cursor-pointer">
            <Printer className="h-4 w-4" />
            Imprimir ticket dos itens selecionados
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || isLoading}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChefHat className="h-4 w-4 mr-2" />
            )}
            Iniciar Preparo ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
