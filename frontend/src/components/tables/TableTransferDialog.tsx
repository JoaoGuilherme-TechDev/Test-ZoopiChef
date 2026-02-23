import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTableTransfers } from '@/hooks/useTableTransfers';
import { useTableSessions } from '@/hooks/useTableSessions';
import { useTableCommands, useAllSessionItems } from '@/hooks/useTableCommands';
import { useTables } from '@/hooks/useTables';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Minus, Plus } from 'lucide-react';

interface TableTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tableId: string;
  tableNumber: number;
}

export function TableTransferDialog({ 
  open, 
  onOpenChange,
  sessionId,
  tableId,
  tableNumber
}: TableTransferDialogProps) {
  const { tables } = useTables();
  const { sessions } = useTableSessions();
  const { commands } = useTableCommands(sessionId);
  const { items } = useAllSessionItems(sessionId);
  const { transferItemsToCommand, transferSessionToTable, mergeSessions } = useTableTransfers();

  const [transferType, setTransferType] = useState<'items' | 'table' | 'merge'>('items');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [targetTableId, setTargetTableId] = useState<string | null>(null);
  const [targetCommandId, setTargetCommandId] = useState<string | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);

  const availableTables = tables.filter(t => t.id !== tableId && t.active);
  const otherSessions = sessions.filter(s => s.id !== sessionId);
  const targetSession = otherSessions.find(s => s.table_id === targetTableId);
  const targetCommands = targetSession 
    ? commands.filter(c => c.session_id === targetSession.id) 
    : [];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const toggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: maxQty };
    });
  };

  const updateItemQuantity = (itemId: string, delta: number, maxQty: number) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      const newQty = Math.max(0, Math.min(maxQty, current + delta));
      if (newQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const handleTransferItems = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.error('Selecione ao menos um item');
      return;
    }

    if (!targetCommandId) {
      toast.error('Selecione a comanda de destino');
      return;
    }

    try {
      await transferItemsToCommand.mutateAsync({
        itemIds: Object.keys(selectedItems),
        targetCommandId,
        quantities: selectedItems,
      });
      toast.success('Itens transferidos!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao transferir itens');
    }
  };

  const handleTransferTable = async () => {
    if (!targetTableId) {
      toast.error('Selecione a mesa de destino');
      return;
    }

    // Check if target table has active session
    const targetHasSession = sessions.some(s => s.table_id === targetTableId);
    if (targetHasSession) {
      toast.error('Mesa de destino já está ocupada. Use "Unir Mesas" para juntar.');
      return;
    }

    try {
      await transferSessionToTable.mutateAsync({
        sessionId,
        targetTableId,
      });
      toast.success('Mesa transferida!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao transferir mesa');
    }
  };

  const handleMergeTables = async () => {
    if (!targetSessionId) {
      toast.error('Selecione a mesa para unir');
      return;
    }

    try {
      await mergeSessions.mutateAsync({
        sourceSessionId: sessionId,
        targetSessionId,
      });
      toast.success('Mesas unidas!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao unir mesas');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir - Mesa {tableNumber}</DialogTitle>
        </DialogHeader>

        <Tabs value={transferType} onValueChange={(v) => setTransferType(v as typeof transferType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items">Transferir Itens</TabsTrigger>
            <TabsTrigger value="table">Transferir Mesa</TabsTrigger>
            <TabsTrigger value="merge">Unir Mesas</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Selecione os itens para transferir</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-32">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.filter(i => i.status !== 'cancelled').map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selectedItems[item.id]}
                          onCheckedChange={() => toggleItem(item.id, item.quantity)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.product_name}</span>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {selectedItems[item.id] && item.quantity > 1 ? (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => updateItemQuantity(item.id, -1, item.quantity)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{selectedItems[item.id]}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => updateItemQuantity(item.id, 1, item.quantity)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-muted-foreground">/ {item.quantity}</span>
                          </div>
                        ) : (
                          <span>{item.quantity}x</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total_price_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label>Mesa / Comanda de Destino</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Mesa</Label>
                  <RadioGroup 
                    value={targetTableId || ''} 
                    onValueChange={(v) => {
                      setTargetTableId(v);
                      setTargetCommandId(null);
                    }}
                  >
                    {availableTables.filter(t => sessions.some(s => s.table_id === t.id)).map((table) => (
                      <div key={table.id} className="flex items-center space-x-2 p-2 border rounded">
                        <RadioGroupItem value={table.id} id={`table-${table.id}`} />
                        <Label htmlFor={`table-${table.id}`} className="cursor-pointer">
                          Mesa {table.number} {table.name && `(${table.name})`}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                {targetTableId && targetSession && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Comanda</Label>
                    <RadioGroup 
                      value={targetCommandId || ''} 
                      onValueChange={setTargetCommandId}
                    >
                      {commands.filter(c => c.session_id === targetSession.id).map((cmd) => (
                        <div key={cmd.id} className="flex items-center space-x-2 p-2 border rounded">
                          <RadioGroupItem value={cmd.id} id={`cmd-${cmd.id}`} />
                          <Label htmlFor={`cmd-${cmd.id}`} className="cursor-pointer">
                            {cmd.name || `Comanda ${cmd.number}`}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleTransferItems}
              disabled={transferItemsToCommand.isPending}
            >
              {transferItemsToCommand.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ArrowRight className="mr-2 h-4 w-4" />
              Transferir Itens Selecionados
            </Button>
          </TabsContent>

          <TabsContent value="table" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Transferir toda a mesa (incluindo comandas, itens e pagamentos) para outra mesa livre.
            </p>

            <div className="space-y-2">
              <Label>Selecione a Mesa de Destino</Label>
              <RadioGroup 
                value={targetTableId || ''} 
                onValueChange={setTargetTableId}
              >
                {availableTables
                  .filter(t => !sessions.some(s => s.table_id === t.id))
                  .map((table) => (
                    <div key={table.id} className="flex items-center space-x-2 p-2 border rounded">
                      <RadioGroupItem value={table.id} id={`transfer-${table.id}`} />
                      <Label htmlFor={`transfer-${table.id}`} className="cursor-pointer">
                        Mesa {table.number} {table.name && `(${table.name})`}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </div>

            <Button 
              className="w-full" 
              onClick={handleTransferTable}
              disabled={transferSessionToTable.isPending || !targetTableId}
            >
              {transferSessionToTable.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ArrowRight className="mr-2 h-4 w-4" />
              Transferir Mesa Completa
            </Button>
          </TabsContent>

          <TabsContent value="merge" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Unir esta mesa com outra ocupada. Todos os itens e comandas serão movidos para a mesa selecionada.
            </p>

            <div className="space-y-2">
              <Label>Selecione a Mesa para Unir</Label>
              <RadioGroup 
                value={targetSessionId || ''} 
                onValueChange={setTargetSessionId}
              >
                {otherSessions.map((s) => {
                  const table = tables.find(t => t.id === s.table_id);
                  return (
                    <div key={s.id} className="flex items-center space-x-2 p-2 border rounded">
                      <RadioGroupItem value={s.id} id={`merge-${s.id}`} />
                      <Label htmlFor={`merge-${s.id}`} className="cursor-pointer flex-1">
                        <div className="flex justify-between">
                          <span>Mesa {table?.number} {table?.name && `(${table.name})`}</span>
                          <span className="text-muted-foreground">{formatCurrency(s.total_amount_cents)}</span>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <Button 
              className="w-full" 
              onClick={handleMergeTables}
              disabled={mergeSessions.isPending || !targetSessionId}
            >
              {mergeSessions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unir Mesas
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
