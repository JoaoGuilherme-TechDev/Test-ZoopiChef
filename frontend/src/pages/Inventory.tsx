import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useInventory, InventoryItem } from '@/hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Inventory() {
  const { items, movements, lowStockItems, isLoading, createItem, addMovement, isCreating } = useInventory();
  const [itemDialog, setItemDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState<{ open: boolean; itemId: string; itemName: string }>({
    open: false,
    itemId: '',
    itemName: '',
  });

  const [newItem, setNewItem] = useState({
    name: '',
    unit: 'un',
    current_stock: 0,
    min_stock: 0,
    cost_per_unit: 0,
    supplier_name: '',
  });

  const [newMovement, setNewMovement] = useState({
    movement_type: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    quantity: 0,
    notes: '',
  });

  const handleCreateItem = () => {
    createItem(newItem);
    setItemDialog(false);
    setNewItem({ name: '', unit: 'un', current_stock: 0, min_stock: 0, cost_per_unit: 0, supplier_name: '' });
  };

  const handleAddMovement = () => {
    addMovement({
      inventory_item_id: movementDialog.itemId,
      movement_type: newMovement.movement_type,
      quantity: newMovement.quantity,
      notes: newMovement.notes,
    });
    setMovementDialog({ open: false, itemId: '', itemName: '' });
    setNewMovement({ movement_type: 'entrada', quantity: 0, notes: '' });
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'entrada': return <Badge className="bg-green-500">Entrada</Badge>;
      case 'saida': return <Badge className="bg-red-500">Saída</Badge>;
      case 'ajuste': return <Badge className="bg-blue-500">Ajuste</Badge>;
      case 'venda': return <Badge className="bg-orange-500">Venda</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Controle de Estoque</h1>
          <Button onClick={() => setItemDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>

        {/* Alert for low stock */}
        {lowStockItems.length > 0 && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map((item) => (
                  <Badge key={item.id} variant="outline" className="border-orange-500 text-orange-700">
                    {item.name}: {item.current_stock} {item.unit}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : items.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum item cadastrado.</p>
                    <Button onClick={() => setItemDialog(true)} className="mt-4">
                      Cadastrar primeiro item
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Estoque Atual</TableHead>
                        <TableHead>Mínimo</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <span className={item.current_stock <= item.min_stock ? 'text-red-600 font-bold' : ''}>
                              {item.current_stock} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell>{item.min_stock} {item.unit}</TableCell>
                          <TableCell>R$ {item.cost_per_unit.toFixed(2)}</TableCell>
                          <TableCell>{item.supplier_name || '-'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMovementDialog({ open: true, itemId: item.id, itemName: item.name })}
                            >
                              <Settings2 className="w-4 h-4 mr-1" />
                              Movimentar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card>
              <CardContent className="pt-6">
                {movements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma movimentação registrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Saldo Após</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            {format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{mov.inventory_items?.name}</TableCell>
                          <TableCell>{getMovementBadge(mov.movement_type)}</TableCell>
                          <TableCell>
                            <span className={mov.movement_type === 'entrada' ? 'text-green-600' : mov.movement_type === 'saida' ? 'text-red-600' : ''}>
                              {mov.movement_type === 'entrada' ? '+' : mov.movement_type === 'saida' ? '-' : ''}
                              {mov.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{mov.balance_after}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{mov.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Item de Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Farinha de Trigo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unidade</Label>
                <Select value={newItem.unit} onValueChange={(v) => setNewItem(prev => ({ ...prev, unit: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="g">Gramas</SelectItem>
                    <SelectItem value="l">Litros</SelectItem>
                    <SelectItem value="ml">ML</SelectItem>
                    <SelectItem value="cx">Caixa</SelectItem>
                    <SelectItem value="pct">Pacote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estoque Inicial</Label>
                <Input
                  type="number"
                  value={newItem.current_stock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estoque Mínimo</Label>
                <Input
                  type="number"
                  value={newItem.min_stock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, min_stock: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Custo Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.cost_per_unit}
                  onChange={(e) => setNewItem(prev => ({ ...prev, cost_per_unit: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input
                value={newItem.supplier_name}
                onChange={(e) => setNewItem(prev => ({ ...prev, supplier_name: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateItem} disabled={!newItem.name || isCreating}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={movementDialog.open} onOpenChange={(open) => setMovementDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentar: {movementDialog.itemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Movimentação</Label>
              <Select
                value={newMovement.movement_type}
                onValueChange={(v) => setNewMovement(prev => ({ ...prev, movement_type: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4 text-red-600" />
                      Saída
                    </div>
                  </SelectItem>
                  <SelectItem value="ajuste">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-blue-600" />
                      Ajuste (define valor absoluto)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.001"
                value={newMovement.quantity}
                onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Input
                value={newMovement.notes}
                onChange={(e) => setNewMovement(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ex: Compra do dia"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={handleAddMovement} disabled={newMovement.quantity <= 0}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
