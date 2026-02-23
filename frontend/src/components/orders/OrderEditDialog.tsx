import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, Plus, Minus, Trash2, Edit3, ShieldAlert, Search, Package, Printer, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { useActiveProducts, Product } from '@/hooks/useProducts';
import { toast } from 'sonner';
import { Order, OrderItem, OrderStatus } from '@/hooks/useOrders';

interface EditableItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onSuccess?: () => void;
}

export function OrderEditDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: OrderEditDialogProps) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  const { data: profile } = useProfile();
  const { data: products = [] } = useActiveProducts();
  const queryClient = useQueryClient();

  // Regras de negócio por status
  const canEdit = ['novo', 'preparo'].includes(order.status);
  const requiresReason = ['pronto', 'em_rota'].includes(order.status);
  const cannotEdit = ['entregue', 'cancelado'].includes(order.status);

  // Initialize items from order
  useEffect(() => {
    if (open && order.items) {
      setItems(order.items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes,
      })));
      setDeliveryFee(order.delivery_fee || 0);
      setEditReason('');
    }
  }, [open, order]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return items
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }, [items]);

  const total = subtotal + deliveryFee;

  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (!order.items) return false;
    
    const originalItems = order.items;
    const currentItems = items.filter(i => !i.isDeleted);
    
    // Check for new items
    if (items.some(i => i.isNew && !i.isDeleted)) return true;
    
    // Check for deleted items
    if (items.some(i => i.isDeleted && !i.isNew)) return true;
    
    // Check for modified items
    for (const current of currentItems) {
      if (current.isNew) continue;
      const original = originalItems.find(o => o.id === current.id);
      if (!original) return true;
      if (
        original.quantity !== current.quantity ||
        original.notes !== current.notes
      ) return true;
    }
    
    // Check delivery fee
    if ((order.delivery_fee || 0) !== deliveryFee) return true;
    
    return false;
  }, [items, order, deliveryFee]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 20);
    const search = productSearch.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(search))
      .slice(0, 20);
  }, [products, productSearch]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity, isModified: !item.isNew };
      }
      return item;
    }));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, notes: notes || null, isModified: !item.isNew };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // If it's a new item, just filter it out
        if (item.isNew) {
          return { ...item, isDeleted: true };
        }
        // Otherwise mark as deleted
        return { ...item, isDeleted: true };
      }
      return item;
    }));
  };

  const handleAddProduct = (product: Product) => {
    const existingItem = items.find(i => i.product_id === product.id && !i.isDeleted);
    
    if (existingItem) {
      // Increment quantity of existing item
      handleQuantityChange(existingItem.id, 1);
    } else {
      // Add new item
      const newItem: EditableItem = {
        id: `new_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.is_on_sale && product.sale_price ? product.sale_price : product.price,
        notes: null,
        isNew: true,
      };
      setItems(prev => [...prev, newItem]);
    }
    
    setProductSearchOpen(false);
    setProductSearch('');
  };

  // Track changes for printing
  const [lastChanges, setLastChanges] = useState<{
    added: EditableItem[];
    modified: EditableItem[];
    removed: EditableItem[];
  } | null>(null);
  const [showPrintOption, setShowPrintOption] = useState(false);

  const saveChanges = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não identificado');
      if (!profile?.company_id) throw new Error('Empresa não identificada');
      
      if (requiresReason && !editReason.trim()) {
        throw new Error('Informe o motivo da edição');
      }

      const activeItems = items.filter(i => !i.isDeleted);
      if (activeItems.length === 0) {
        throw new Error('O pedido deve ter pelo menos um item');
      }

      // Identify changes
      const addedItems = items.filter(i => i.isNew && !i.isDeleted);
      const removedItems = items.filter(i => i.isDeleted && !i.isNew);
      const modifiedItems = items.filter(i => i.isModified && !i.isNew && !i.isDeleted);

      // Build changes log
      const changes: Record<string, unknown> = {
        items_removed: removedItems.map(i => ({
          id: i.id,
          product_name: i.product_name,
          quantity: i.quantity,
        })),
        items_added: addedItems.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        items_modified: modifiedItems.map(i => {
          const original = order.items?.find(o => o.id === i.id);
          return {
            id: i.id,
            product_name: i.product_name,
            from_quantity: original?.quantity,
            to_quantity: i.quantity,
            from_notes: original?.notes,
            to_notes: i.notes,
          };
        }),
        delivery_fee_changed: (order.delivery_fee || 0) !== deliveryFee ? {
          from: order.delivery_fee || 0,
          to: deliveryFee,
        } : null,
        subtotal_changed: {
          from: order.items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) || 0,
          to: subtotal,
        },
        total_changed: {
          from: order.total,
          to: total,
        },
      };

      // 1. Mark removed items with edit_status instead of deleting
      // This preserves them for display in KDS with [REMOVIDO]
      for (const item of removedItems) {
        const original = order.items?.find(o => o.id === item.id);
        const { error } = await supabase
          .from('order_items')
          .update({
            edit_status: 'removed',
            previous_quantity: original?.quantity,
            previous_notes: original?.notes,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // 2. Insert new items with edit_status 'new'
      if (addedItems.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .insert(addedItems.map(i => ({
            order_id: order.id,
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            notes: i.notes,
            edit_status: 'new',
          })));
        if (error) throw error;
      }

      // 3. Update modified items with edit_status 'modified'
      for (const item of modifiedItems) {
        const original = order.items?.find(o => o.id === item.id);
        const { error } = await supabase
          .from('order_items')
          .update({
            quantity: item.quantity,
            notes: item.notes,
            edit_status: 'modified',
            previous_quantity: original?.quantity,
            previous_notes: original?.notes,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // 4. Update order totals and increment version
      // Note: orders table doesn't have subtotal column, only total and delivery_fee
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          delivery_fee: deliveryFee,
          total: total,
          edit_version: (order as any).edit_version ? (order as any).edit_version + 1 : 1,
          last_edit_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      if (orderError) throw orderError;

      // 5. Log edit event for audit trail
      const { error: eventError } = await supabase
        .from('order_status_events')
        .insert([{
          order_id: order.id,
          company_id: profile.company_id,
          from_status: order.status,
          to_status: order.status, // Status doesn't change
          changed_by_user_id: profile.id,
          meta: JSON.parse(JSON.stringify({
            source: 'order_edit',
            reason: editReason || 'Edição de itens',
            changes: changes,
            edited_at: new Date().toISOString(),
            version: (order as any).edit_version ? (order as any).edit_version + 1 : 1,
          })),
        }]);

      if (eventError) {
        console.error('Erro ao registrar evento de edição:', eventError);
      }

      // Store changes for printing option
      return { addedItems, modifiedItems, removedItems };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      
      // If there are changes and it's a delivery order, offer print option
      if (data && order.order_type === 'delivery' && 
          (data.addedItems.length > 0 || data.modifiedItems.length > 0 || data.removedItems.length > 0)) {
        setLastChanges({
          added: data.addedItems,
          modified: data.modifiedItems,
          removed: data.removedItems,
        });
        setShowPrintOption(true);
        toast.success('Pedido atualizado! Deseja imprimir as alterações?');
      } else {
        toast.success('Pedido atualizado com sucesso');
        onOpenChange(false);
        onSuccess?.();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar pedido');
    },
  });

  // Print changes function
  const printChanges = () => {
    if (!lastChanges) return;
    
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }

    const orderNumber = order.id.slice(0, 8).toUpperCase();
    
    const addedHtml = lastChanges.added.map(i => `
      <div class="item new">
        <span class="badge">[NOVO]</span>
        <strong>${i.quantity}x ${i.product_name}</strong>
        ${i.notes ? `<div class="notes">📝 ${i.notes}</div>` : ''}
      </div>
    `).join('');

    const modifiedHtml = lastChanges.modified.map(i => {
      const original = order.items?.find(o => o.id === i.id);
      return `
        <div class="item modified">
          <span class="badge">[ALTERADO]</span>
          <strong>${i.product_name}</strong>
          ${original?.quantity !== i.quantity ? `<div class="change">Qtd: ${original?.quantity}x → ${i.quantity}x</div>` : ''}
          ${original?.notes !== i.notes ? `<div class="change">Obs: "${original?.notes || '-'}" → "${i.notes || '-'}"</div>` : ''}
        </div>
      `;
    }).join('');

    const removedHtml = lastChanges.removed.map(i => `
      <div class="item removed">
        <span class="badge">[REMOVIDO]</span>
        <s>${i.quantity}x ${i.product_name}</s>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Alterações Pedido #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 76mm;
      padding: 4px;
      background: #fff;
      color: #000;
    }
    .header {
      background: #000 !important;
      color: #fff !important;
      padding: 10px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .order-info {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 8px 0;
    }
    .separator { border-top: 1px dashed #000; margin: 8px 0; }
    .section-title {
      font-weight: bold;
      font-size: 14px;
      margin: 8px 0 4px;
      text-decoration: underline;
    }
    .item {
      padding: 6px;
      margin: 4px 0;
      border: 1px solid #000;
    }
    .item.new {
      background: #d4edda !important;
      border-color: #28a745;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .item.modified {
      background: #fff3cd !important;
      border-color: #ffc107;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .item.removed {
      background: #f8d7da !important;
      border-color: #dc3545;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .badge {
      font-weight: bold;
      font-size: 14px;
      display: block;
      margin-bottom: 4px;
    }
    .new .badge { color: #28a745; }
    .modified .badge { color: #856404; }
    .removed .badge { color: #dc3545; }
    .change { font-size: 11px; margin-top: 2px; }
    .notes { font-size: 11px; font-style: italic; }
    .footer { text-align: center; margin-top: 12px; font-size: 10px; }
    .time { font-size: 14px; font-weight: bold; text-align: center; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="header">⚠️ ALTERAÇÃO DE PEDIDO ⚠️</div>
  <div class="order-info">PEDIDO #${orderNumber}</div>
  <div class="time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
  
  <hr class="separator" />
  
  ${addedHtml ? `<div class="section-title">✅ ITENS ADICIONADOS:</div>${addedHtml}` : ''}
  ${modifiedHtml ? `<div class="section-title">✏️ ITENS ALTERADOS:</div>${modifiedHtml}` : ''}
  ${removedHtml ? `<div class="section-title">❌ ITENS REMOVIDOS:</div>${removedHtml}` : ''}
  
  <hr class="separator" />
  
  <div class="footer">
    Impresso em ${new Date().toLocaleString('pt-BR')}
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 200);
    };

    // Close dialog after printing
    setTimeout(() => {
      setShowPrintOption(false);
      onOpenChange(false);
      onSuccess?.();
    }, 500);
  };

  const closePrintOption = () => {
    setShowPrintOption(false);
    onOpenChange(false);
    onSuccess?.();
  };

  if (cannotEdit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Edição Não Permitida
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Não é possível editar pedidos com status "{order.status}".
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const activeItems = items.filter(i => !i.isDeleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Pedido #{order.id.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Altere os itens, quantidades ou observações do pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!canEdit && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Pedido em status "{order.status}". Edição requer justificativa.
              </AlertDescription>
            </Alert>
          )}

          {/* Add Product Button */}
          <div className="flex items-center gap-2">
            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar produto..." 
                    value={productSearch}
                    onValueChange={setProductSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => handleAddProduct(product)}
                          className="cursor-pointer"
                        >
                          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Items List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-3 space-y-3">
              {activeItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum item no pedido
                </div>
              ) : (
                activeItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg space-y-2 ${
                      item.isNew ? 'border-green-500 bg-green-50/50' : 
                      item.isModified ? 'border-amber-500 bg-amber-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.product_name}</span>
                          {item.isNew && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Novo
                            </Badge>
                          )}
                          {item.isModified && !item.isNew && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Alterado
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          R$ {item.unit_price.toFixed(2)} cada
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Item Notes */}
                    <Input
                      placeholder="Observação do item (ex: sem cebola)"
                      value={item.notes || ''}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      className="text-sm"
                    />

                    <div className="text-right text-sm font-medium">
                      Subtotal: R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Delivery Fee */}
          {order.order_type === 'delivery' && (
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">Taxa de Entrega:</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-32"
              />
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega:</span>
                <span>R$ {deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Edit Reason (when required) */}
          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="editReason">Motivo da Edição *</Label>
              <Textarea
                id="editReason"
                placeholder="Informe o motivo da edição..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          )}
        </div>

        {/* Print Option Dialog */}
        {showPrintOption && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Pedido atualizado com sucesso! Deseja imprimir as alterações para a cozinha?
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={closePrintOption}
                className="flex-1"
              >
                Não Imprimir
              </Button>
              <Button 
                onClick={printChanges}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Alterações
              </Button>
            </div>
          </div>
        )}

        {!showPrintOption && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveChanges.mutate()}
              disabled={saveChanges.isPending || !hasChanges || activeItems.length === 0 || (requiresReason && !editReason.trim())}
            >
              {saveChanges.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
