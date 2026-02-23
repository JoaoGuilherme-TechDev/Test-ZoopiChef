import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, AlertTriangle } from 'lucide-react';

interface TableItem {
  id: string;
  product_name: string;
  quantity: number;
  total_price_cents: number;
  order_index?: number;
  command?: {
    id: string;
    name: string | null;
    number: number | null;
  } | null;
}

interface TableDeleteItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: TableItem[];
  sessionId?: string;
  onDeleteItem?: (itemId: string) => Promise<void>;
}

export function TableDeleteItemDialog({ 
  open, 
  onOpenChange,
  items,
  sessionId,
  onDeleteItem
}: TableDeleteItemDialogProps) {
  const [searchNumber, setSearchNumber] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearchNumber('');
      setSelectedItemId(null);
    }
  }, [open]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  // Index items for display
  const indexedItems = items.map((item, idx) => ({
    ...item,
    order_index: idx + 1,
  }));

  // Filter by search
  const filteredItems = searchNumber 
    ? indexedItems.filter(item => 
        item.order_index?.toString() === searchNumber ||
        item.product_name.toLowerCase().includes(searchNumber.toLowerCase())
      )
    : indexedItems;

  const handleDelete = async () => {
    if (!selectedItemId) return;
    
    setIsDeleting(true);
    try {
      if (onDeleteItem) {
        await onDeleteItem(selectedItemId);
      } else {
        // Default: cancel item in database
        const { error } = await supabase
          .from('table_command_items')
          .update({ status: 'cancelled' })
          .eq('id', selectedItemId);
          
        if (error) throw error;
        toast.success('Item excluído');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao excluir item');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedItem = indexedItems.find(i => i.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Deletar Item
          </DialogTitle>
          <DialogDescription>
            Digite o número do item na lista ou selecione para excluir
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="space-y-2">
          <Label>Número ou nome do item</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: 1, 2, 3 ou nome do produto..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Items List */}
        <ScrollArea className="h-[200px] border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum item encontrado
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                    selectedItemId === item.id 
                      ? 'bg-destructive/10 border border-destructive' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center text-lg font-bold">
                      {item.order_index}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x • {formatCurrency(item.total_price_cents)}
                        {item.command && (
                          <span className="ml-2">
                            • {item.command.name || `#${item.command.number}`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedItemId === item.id && (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selected Item Confirmation */}
        {selectedItem && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Confirmar exclusão:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.quantity}x {selectedItem.product_name} - {formatCurrency(selectedItem.total_price_cents)}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!selectedItemId || isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
