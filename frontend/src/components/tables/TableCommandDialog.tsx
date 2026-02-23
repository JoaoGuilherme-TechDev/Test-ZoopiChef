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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTableCommands, useAllSessionItems, TableCommand } from '@/hooks/useTableCommands';
import { useProducts } from '@/hooks/useProducts';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, User, Hash, Search, Trash2, ArrowRightLeft } from 'lucide-react';

interface TableCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tableId: string;
  tableNumber: number;
  onOpenTransfer?: () => void;
}

export function TableCommandDialog({ 
  open, 
  onOpenChange,
  sessionId,
  tableId,
  tableNumber,
  onOpenTransfer
}: TableCommandDialogProps) {
  const { commands, createCommand } = useTableCommands(sessionId);
  const { items, activeItems, totalCents } = useAllSessionItems(sessionId);
  const productsQuery = useProducts();
  const products = productsQuery.data || [];
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isCreatingCommand, setIsCreatingCommand] = useState(false);
  const [commandType, setCommandType] = useState<'number' | 'name'>('number');
  const [commandName, setCommandName] = useState('');
  const [commandNumber, setCommandNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getNextCommandNumber = () => {
    const numbers = commands.filter(c => c.number).map(c => c.number as number);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  };

  const handleCreateCommand = async () => {
    try {
      if (commandType === 'number') {
        const num = parseInt(commandNumber) || getNextCommandNumber();
        await createCommand.mutateAsync({
          sessionId,
          tableId,
          number: num,
        });
        toast.success(`Comanda ${num} criada!`);
      } else {
        if (!commandName.trim()) {
          toast.error('Digite o nome da comanda');
          return;
        }
        await createCommand.mutateAsync({
          sessionId,
          tableId,
          name: commandName.trim(),
        });
        toast.success(`Comanda "${commandName}" criada!`);
      }
      
      setIsCreatingCommand(false);
      setCommandName('');
      setCommandNumber('');
    } catch (error) {
      toast.error('Erro ao criar comanda');
    }
  };

  const filteredProducts = products.filter(p => 
    p.active && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCommandItems = (commandId: string) => {
    return items.filter(i => i.command_id === commandId && i.status !== 'cancelled');
  };

  const getCommandTotal = (commandId: string) => {
    return getCommandItems(commandId).reduce((sum, i) => sum + i.total_price_cents, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Mesa {tableNumber} - Comandas</span>
            <Badge variant="outline" className="text-lg">
              Total: {formatCurrency(totalCents)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Left: Commands List */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Comandas</h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsCreatingCommand(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {isCreatingCommand && (
              <div className="p-3 border rounded-lg mb-4 space-y-3">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={commandType === 'number' ? 'default' : 'outline'}
                    onClick={() => setCommandType('number')}
                  >
                    <Hash className="h-4 w-4 mr-1" />
                    Número
                  </Button>
                  <Button 
                    size="sm" 
                    variant={commandType === 'name' ? 'default' : 'outline'}
                    onClick={() => setCommandType('name')}
                  >
                    <User className="h-4 w-4 mr-1" />
                    Nome
                  </Button>
                </div>
                
                {commandType === 'number' ? (
                  <Input
                    type="number"
                    placeholder={`Número (próximo: ${getNextCommandNumber()})`}
                    value={commandNumber}
                    onChange={(e) => setCommandNumber(e.target.value)}
                  />
                ) : (
                  <Input
                    placeholder="Nome (ex: João, Maria)"
                    value={commandName}
                    onChange={(e) => setCommandName(e.target.value)}
                  />
                )}
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsCreatingCommand(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleCreateCommand}
                    disabled={createCommand.isPending}
                  >
                    {createCommand.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Criar
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="space-y-2">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  className="w-full justify-between"
                  onClick={() => setActiveTab('all')}
                >
                  <span>Todos os itens</span>
                  <Badge variant="secondary">{activeItems.length}</Badge>
                </Button>
                
                {commands.map((cmd) => (
                  <Button
                    key={cmd.id}
                    variant={activeTab === cmd.id ? 'default' : 'ghost'}
                    className="w-full justify-between"
                    onClick={() => setActiveTab(cmd.id)}
                  >
                    <span>{cmd.name || `Comanda ${cmd.number}`}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{getCommandItems(cmd.id).length}</Badge>
                      <span className="text-xs">{formatCurrency(getCommandTotal(cmd.id))}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Items */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">
                {activeTab === 'all' 
                  ? 'Todos os Itens' 
                  : `Itens - ${commands.find(c => c.id === activeTab)?.name || `Comanda ${commands.find(c => c.id === activeTab)?.number}`}`
                }
              </h3>
              {onOpenTransfer && (
                <Button size="sm" variant="outline" onClick={onOpenTransfer}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir
                </Button>
              )}
            </div>

            <ScrollArea className="h-[calc(100%-40px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">Qtd</TableHead>
                    <TableHead className="text-right w-24">Valor</TableHead>
                    {activeTab === 'all' && <TableHead className="w-24">Comanda</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeTab === 'all' ? activeItems : getCommandItems(activeTab)).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.product_name}</span>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}x</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total_price_cents)}
                      </TableCell>
                      {activeTab === 'all' && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.command?.name || `#${item.command?.number}`}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(activeTab === 'all' ? activeItems : getCommandItems(activeTab)).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={activeTab === 'all' ? 4 : 3} className="text-center text-muted-foreground py-8">
                        Nenhum item lançado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
