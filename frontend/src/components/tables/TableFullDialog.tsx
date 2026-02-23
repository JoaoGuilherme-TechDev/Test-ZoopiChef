import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTableCommands, useAllSessionItems, useTableCommandItems } from '@/hooks/useTableCommands';
import { useTableSessions } from '@/hooks/useTableSessions';
import { useTableTransfers } from '@/hooks/useTableTransfers';
import { useTables } from '@/hooks/useTables';
import { useProducts, Product } from '@/hooks/useProducts';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useCompany } from '@/hooks/useCompany';
import { useTableOrderProduction } from '@/hooks/useTableOrderProduction';
import { useCheckProductHasOptionals } from '@/hooks/useProductOptionalGroups';
import { usePanicButton } from '@/hooks/usePanicButton';
import { useTablePDVKeyboardShortcuts } from '@/hooks/useTablePDVKeyboardShortcuts';
import { ProductOptionalsDialog } from '@/components/orders/ProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { TableManagerReportDialog } from '@/components/tables/TableManagerReportDialog';
import { TableDeleteItemDialog } from '@/components/tables/TableDeleteItemDialog';
import { TableLinkCustomerDialog } from '@/components/tables/TableLinkCustomerDialog';
import { TablePDVShortcutsHelp } from '@/components/tables/TablePDVShortcutsHelp';
import { RodizioActivateDialog } from '@/components/tables/RodizioActivateDialog';
import { RodizioSessionBadge } from '@/components/tables/RodizioSessionBadge';
import { TabletRodizioMenu } from '@/components/tablet/TabletRodizioMenu';
import { useActiveRodizioSession } from '@/hooks/useRodizio';
import { WithdrawalDialog } from '@/components/cash/WithdrawalDialog';
import { CashClosingDialog } from '@/components/orders/CashClosingDialog';
import { printTableBillDirect, TableBillData, TableBillCommand } from '@/lib/print/tableBill';
import { openCashDrawer } from '@/lib/print/drawerOpen';
import { supabase } from '@/lib/supabase-shim';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { toast } from 'sonner';
import { 
  Loader2, 
  Plus, 
  Minus, 
  User, 
  Hash, 
  Search, 
  Trash2, 
  ArrowRightLeft,
  ShoppingCart,
  Receipt,
  X,
  Send,
  ArrowLeft,
  Edit,
  DoorOpen,
  Lock,
  CreditCard,
  Printer,
  Image,
  Keyboard,
  FileText,
  Wallet,
  Calculator,
  AlertTriangle,
  UtensilsCrossed
} from 'lucide-react';

interface TableFullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tableId: string;
  tableNumber: number;
  tableName?: string | null;
  onCloseTable: () => void;
  onPayment: () => void;
  onBackToMap?: () => void;
}

export function TableFullDialog({ 
  open, 
  onOpenChange,
  sessionId,
  tableId,
  tableNumber,
  tableName,
  onCloseTable,
  onPayment,
  onBackToMap
}: TableFullDialogProps) {
  const queryClient = useQueryClient();
  // Hooks
  const { commands, createCommand, closeCommand, deleteCommand } = useTableCommands(sessionId);
  const { items, activeItems, totalCents } = useAllSessionItems(sessionId);
  const { sessions, reopenTable, updateSessionStatus, openTable } = useTableSessions();
  const { tables } = useTables();
  const { transferItemsToCommand, transferSessionToTable, mergeSessions } = useTableTransfers();
  const { data: company } = useCompany();
  const { createTableOrder } = useTableOrderProduction();
  const productsQuery = useProducts();
  const subcategoriesQuery = useSubcategories();
  const products = productsQuery.data || [];
  const subcategories = subcategoriesQuery.data || [];
  
  // Check product has optionals
  const { checkProduct } = useCheckProductHasOptionals();
  
  // Rodizio session for this table
  const { data: rodizioSession } = useActiveRodizioSession(sessionId);

  // Backfill: if Rodízio is active but the charge wasn't inserted, insert it automatically
  useEffect(() => {
    if (!rodizioSession) return;
    // If there's already a rodízio charge item, do nothing
    const hasCharge = items.some(
      (i) =>
        i.status !== 'cancelled' &&
        typeof i.product_name === 'string' &&
        i.product_name.startsWith('RODÍZIO -')
    );
    if (hasCharge) return;

    // Fire and forget; toast errors are handled inside
    void addRodizioChargeToBill(rodizioSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodizioSession, items.length]);
  
  // State
  // Default em "Lançar" para não parecer que "sumiu a lista de produtos"
  const [activeTab, setActiveTab] = useState<'items' | 'order' | 'commands' | 'transfer' | 'settings' | 'rodizio'>('order');
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [isCreatingCommand, setIsCreatingCommand] = useState(false);
  const [commandType, setCommandType] = useState<'number' | 'name'>('number');
  const [commandName, setCommandName] = useState('');
  const [commandNumber, setCommandNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, { quantity: number; notes: string; selectedOptionsJson?: any; optionalsPrice?: number; productId?: string; productName?: string }>>({});
  const [isPrintingPreBill, setIsPrintingPreBill] = useState(false);
  
  // Optionals dialog state
  const [optionalsDialogOpen, setOptionalsDialogOpen] = useState(false);
  const [selectedProductForOptionals, setSelectedProductForOptionals] = useState<Product | null>(null);
  
  // Pizza dialog state
  const [pizzaDialogOpen, setPizzaDialogOpen] = useState(false);
  const [selectedProductForPizza, setSelectedProductForPizza] = useState<Product | null>(null);
  
  // Transfer state
  const [transferType, setTransferType] = useState<'items' | 'table' | 'merge'>('items');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [targetTableId, setTargetTableId] = useState<string | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [targetCommandId, setTargetCommandId] = useState<string | null>(null);
  const [transferCommandFilter, setTransferCommandFilter] = useState<string | null>(null);
  const [targetTableCommands, setTargetTableCommands] = useState<any[]>([]);
  
  // PDV Dialogs state
  const [managerReportOpen, setManagerReportOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [linkCustomerDialogOpen, setLinkCustomerDialogOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [cashClosingDialogOpen, setCashClosingDialogOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [rodizioActivateDialogOpen, setRodizioActivateDialogOpen] = useState(false);

  // When activating rodízio at the table, also add the main rodízio charge to the bill.
  const addRodizioChargeToBill = async (activatedSession: any) => {
    try {
      if (!company?.id) throw new Error('Empresa não encontrada');
      const rodizioType = activatedSession?.rodizio_types as any;
      const peopleCount = Number(activatedSession?.people_count || 0);
      const unitPriceCents = Number(rodizioType?.price_cents || 0);

      if (!rodizioType?.name || peopleCount <= 0 || unitPriceCents < 0) {
        // Don't block activation if payload is unexpected
        return;
      }

      // Ensure we have a command to attach billing items to
      let commandId = selectedCommandId;
      if (!commandId) {
        const openCmd = commands.find((c) => c.status === 'open');
        if (openCmd) {
          commandId = openCmd.id;
          setSelectedCommandId(openCmd.id);
        } else {
          const newCmd = await createCommand.mutateAsync({
            sessionId,
            tableId,
            number: getNextCommandNumber(),
          });
          commandId = newCmd.id;
          setSelectedCommandId(newCmd.id);
        }
      }

      const productName = `RODÍZIO - ${rodizioType.name}`;

      // Insert via mutation hook (ensures invalidations + total recalculation)
      await addItem.mutateAsync({
        commandId,
        sessionId,
        tableId,
        productId: undefined,
        productName,
        quantity: peopleCount,
        unitPriceCents,
      });

      // Extra invalidations to guarantee UI refresh (avoid stale list “sumindo”)
      queryClient.invalidateQueries({ queryKey: ['table-session-items', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['table-commands', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });

      // sem toast de sucesso (usuário não quer balões)
    } catch (e: any) {
      console.error('[TableFullDialog] Failed to add rodizio charge:', e);
      toast.error(e?.message || 'Erro ao lançar rodízio na conta');
    }
  };
  
  // Panic button
  const { triggerPanic } = usePanicButton();
  
  // Get current session for customer info
  const currentSession = sessions.find(s => s.id === sessionId);
  
  // Keyboard shortcuts
  useTablePDVKeyboardShortcuts({
    onPrintAndClose: async () => {
      await handlePrintPreBill();
      onPayment();
    },
    onTransfer: () => setActiveTab('transfer'),
    onReopen: () => {
      reopenTable.mutateAsync(sessionId);
        // sem toast de sucesso (usuário não quer balões)
    },
    onMerge: () => {
      setTransferType('merge');
      setActiveTab('transfer');
    },
    onPayment: onPayment,
    onOpenDrawer: async () => {
      const result = await openCashDrawer((company as any)?.default_printer, company?.id);
      if (result.success) {
       // sem toast de sucesso (usuário não quer balões)
      } else {
        toast.error(result.error || 'Erro ao abrir gaveta');
      }
    },
    onLinkCustomer: () => setLinkCustomerDialogOpen(true),
    onClearAllItems: () => setClearAllConfirmOpen(true),
    onDeleteItem: () => setDeleteItemDialogOpen(true),
    onBackToMap: () => {
      onOpenChange(false);
      onBackToMap?.();
    },
    onPanic: async () => {
      await triggerPanic();
    },
    onWithdrawal: () => setWithdrawalDialogOpen(true),
    onCloseCash: () => setCashClosingDialogOpen(true),
    onReceiveFiado: () => toast.info('Funcionalidade de receber fiado em desenvolvimento'),
    onManagerReport: () => setManagerReportOpen(true),
  }, open);

  // Fetch commands from target table when changed
  useEffect(() => {
    const fetchTargetCommands = async () => {
      if (!targetTableId) {
        setTargetTableCommands([]);
        return;
      }
      
      const targetSession = sessions.find(s => s.table_id === targetTableId && s.status !== 'closed');
      if (!targetSession) {
        setTargetTableCommands([]);
        return;
      }
      
      const { data } = await supabase
        .from('table_commands')
        .select('*')
        .eq('session_id', targetSession.id)
        .eq('status', 'open')
        .order('created_at', { ascending: true });
      
      setTargetTableCommands(data || []);
    };
    
    fetchTargetCommands();
  }, [targetTableId, sessions]);

  // Get command items hook
  const { addItem, removeItem } = useTableCommandItems(selectedCommandId || undefined);

  // Command colors for visual separation
  const commandColors = [
    { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300' },
    { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-300' },
    { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300' },
    { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300' },
    { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300' },
    { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300' },
    { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-300' },
    { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300' },
  ];

  const getCommandColor = (commandId: string) => {
    const cmdIndex = commands.findIndex(c => c.id === commandId);
    if (cmdIndex < 0) return commandColors[0];
    return commandColors[cmdIndex % commandColors.length];
  };

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
        const newCmd = await createCommand.mutateAsync({
          sessionId,
          tableId,
          number: num,
        });
        setSelectedCommandId(newCmd.id);
        // sem toast de sucesso (usuário não quer balões)
      } else {
        if (!commandName.trim()) {
          toast.error('Digite o nome da comanda');
          return;
        }
        const newCmd = await createCommand.mutateAsync({
          sessionId,
          tableId,
          name: commandName.trim(),
        });
        setSelectedCommandId(newCmd.id);
        // sem toast de sucesso (usuário não quer balões)
      }
      
      setIsCreatingCommand(false);
      setCommandName('');
      setCommandNumber('');
    } catch (error) {
      toast.error('Erro ao criar comanda');
    }
  };

  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    if (selectedSubcategoryId && p.subcategory_id !== selectedSubcategoryId) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getCommandItems = (commandId: string) => {
    return items.filter(i => i.command_id === commandId && i.status !== 'cancelled');
  };

  const getCommandTotal = (commandId: string) => {
    return getCommandItems(commandId).reduce((sum, i) => sum + i.total_price_cents, 0);
  };

  // Handle product click - check for pizza FIRST, then optionals
  // PRIORITY: Pizza > Optionals > Simple
  const handleProductClick = async (product: Product) => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog first
    // Pizza dialog handles optionals internally
    if (isPizzaCategory(product)) {
      setSelectedProductForPizza(product);
      setPizzaDialogOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setSelectedProductForOptionals(product);
      setOptionalsDialogOpen(true);
      return;
    }
    
    // PRIORITY 3: Simple product - add directly to cart
    updateCart(product.id, 1);
  };

  // Handle confirm from optionals dialog
  const handleConfirmOptionals = (
    selectedOptionals: Array<{ groupId: string; groupName: string; items: Array<{ id: string; label: string; price: number }> }>,
    totalPrice: number,
    _optionalsDescription: string
  ) => {
    if (!selectedProductForOptionals) return;

    // Build selected_options_json structure for proper printing
    const selectedOptionsJson = {
      selected_options: selectedOptionals.map(g => ({
        group_id: g.groupId,
        group_name: g.groupName,
        items: g.items.map(i => ({
          id: i.id,
          label: i.label,
          price: i.price,
        })),
      })),
    };

    // Add to cart with optionals - ensure all properties are properly typed
    const cartKey = `${selectedProductForOptionals.id}-${Date.now()}`;
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        quantity: 1,
        notes: '',
        selectedOptionsJson,
        optionalsPrice: totalPrice,
        productId: selectedProductForOptionals.id,
        productName: selectedProductForOptionals.name,
      },
    }));
    
    // Removed toast to reduce notification spam
    setSelectedProductForOptionals(null);
  };

  // Handle confirm from pizza dialog
  const handleConfirmPizza = (selection: any) => {
    if (!selectedProductForPizza) return;

    // Build description for the pizza
    const flavorsDetails = (selection.flavors || []).map((f: any) => {
      let detail = f.name;
      if (f.removedIngredients?.length > 0) detail += ` (sem ${f.removedIngredients.join(', ')})`;
      if (f.observation) detail += ` [${f.observation}]`;
      return detail;
    }).join(', ');
    
    const borderNote = selection.selectedBorder ? ` | Borda: ${selection.selectedBorder.name}` : '';
    const totalPrice = (Number(selection.totalPrice) || 0) + (Number(selection.borderTotal) || 0) + (Number(selection.optionalsTotal) || 0);

    // Build selected_options_json for pizza
    const selectedOptionsJson = {
      is_pizza: true,
      size: selection.size,
      flavors: (selection.flavors || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        removedIngredients: f.removedIngredients || [],
        observation: f.observation || '',
      })),
      border: selection.selectedBorder || null,
      optionals: selection.selectedOptionals || [],
      description: `${selection.size} - ${flavorsDetails}${borderNote}`,
    };

    // Add to cart with pizza config
    const cartKey = `${selectedProductForPizza.id}-pizza-${Date.now()}`;
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        quantity: 1,
        notes: '',
        selectedOptionsJson,
        optionalsPrice: totalPrice,
        productId: selectedProductForPizza.id,
        productName: selectedProductForPizza.name,
      },
    }));

    setSelectedProductForPizza(null);
    setPizzaDialogOpen(false);
  };

  // Cart functions
  const updateCart = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId]?.quantity || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { 
        ...prev, 
        [productId]: { 
          quantity: newQty, 
          notes: prev[productId]?.notes || '',
          selectedOptionsJson: prev[productId]?.selectedOptionsJson,
          optionalsPrice: prev[productId]?.optionalsPrice,
        } 
      };
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [key, cartItem]) => {
    if (cartItem.optionalsPrice) {
      // Item with optionals uses optionalsPrice
      return sum + cartItem.optionalsPrice * 100 * cartItem.quantity;
    }
    const productId = cartItem.productId || key;
    const product = products.find(p => p.id === productId);
    return sum + (product?.price || 0) * 100 * cartItem.quantity;
  }, 0);

  const cartItems = Object.keys(cart).length;

  // Submit order - creates table_command_items AND sends to production (KDS)
  const handleSubmitOrder = async (returnToMap: boolean = false) => {
    if (cartItems === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    let cmdId = selectedCommandId;
    let cmdNumber: number | null = null;
    let cmdName: string | null = null;
    
    if (!cmdId) {
      // Create new command
      try {
        const nextNumber = getNextCommandNumber();
        const newCmd = await createCommand.mutateAsync({
          sessionId,
          tableId,
          number: nextNumber,
        });
        cmdId = newCmd.id;
        cmdNumber = nextNumber;
        setSelectedCommandId(cmdId);
        toast.info(`Comanda ${nextNumber} criada`);
      } catch (error) {
        toast.error('Erro ao criar comanda');
        return;
      }
    } else {
      // Get existing command info
      const existingCmd = commands.find(c => c.id === cmdId);
      if (existingCmd) {
        cmdNumber = existingCmd.number;
        cmdName = existingCmd.name;
      }
    }

    try {
      // Prepare items for production
      const orderItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPriceCents: number;
        notes?: string;
        selectedOptionsJson?: any;
      }> = [];

      for (const [key, cartItem] of Object.entries(cart)) {
        const productId = cartItem.productId || key;
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        const quantity = cartItem.quantity;
        const notes = cartItem.notes || undefined;
        const selectedOptionsJson = cartItem.selectedOptionsJson;
        const unitPriceCents = cartItem.optionalsPrice 
          ? Math.round(cartItem.optionalsPrice * 100) 
          : Math.round(product.price * 100);

        // Add to table_command_items (for table billing)
        await addItem.mutateAsync({
          commandId: cmdId,
          sessionId,
          tableId,
          productId,
          productName: product.name,
          quantity,
          unitPriceCents,
          notes,
        });

        // Collect for production order
        orderItems.push({
          productId,
          productName: product.name,
          quantity,
          unitPriceCents,
          notes,
          selectedOptionsJson,
        });
      }

      // Send to production (KDS) - creates order for kitchen
      // Print jobs are automatically created by useTableOrderProduction hook
      // and will be processed by KitchenPrintListener
      if (orderItems.length > 0) {
        await createTableOrder.mutateAsync({
          sessionId,
          tableId,
          tableNumber,
          commandName: cmdName,
          commandNumber: cmdNumber,
          items: orderItems,
        });
      }

      // Removed toast to reduce notification spam - production ticket is sufficient confirmation
      setCart({});
      
      if (returnToMap) {
        onOpenChange(false);
        onBackToMap?.();
      } else {
        setActiveTab('items');
      }
    } catch (error) {
      toast.error('Erro ao lançar pedido');
    }
  };

  // Print pre-bill
  const handlePrintPreBill = async () => {
    if (!company) {
      toast.error('Empresa não carregada ainda');
      return;
    }

    // Get current session
    const currentSession = sessions.find(s => s.id === sessionId);
    if (!currentSession) {
      toast.error('Sessão da mesa não encontrada');
      return;
    }

    setIsPrintingPreBill(true);
    try {
      // Buscar setor CAIXA para impressão
      let printerConfig: { printMode?: string; printerName?: string; printerHost?: string; printerPort?: number } | null = null;
      
      const { data: caixaSector } = await supabase
        .from('print_sectors')
        .select('print_mode, printer_name, printer_host, printer_port')
        .eq('company_id', company.id)
        .ilike('name', '%caixa%')
        .eq('active', true)
        .limit(1)
        .single();
      
      if (caixaSector) {
        printerConfig = {
          printMode: caixaSector.print_mode,
          printerName: caixaSector.printer_name || undefined,
          printerHost: caixaSector.printer_host || undefined,
          printerPort: caixaSector.printer_port,
        };
        console.log('[TableFullDialog] Usando setor CAIXA para impressão:', printerConfig);
      }
      
      // Build commands data for printing
      const billCommands: TableBillCommand[] = commands
        .filter(cmd => cmd.status === 'open')
        .map(cmd => {
          const cmdItems = items.filter(i => i.command_id === cmd.id && i.status !== 'cancelled');
          return {
            id: cmd.id,
            name: cmd.name,
            number: cmd.number,
            items: cmdItems.map(item => ({
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price_cents: item.unit_price_cents,
              total_price_cents: item.total_price_cents,
              notes: item.notes,
              command_name: cmd.name,
              command_number: cmd.number,
            })),
            total_cents: cmdItems.reduce((sum, i) => sum + i.total_price_cents, 0),
          };
        })
        .filter(cmd => cmd.items.length > 0);

      // Gerar URL de rastreio para QR Code
      const baseUrl = window.location.origin;
      const trackingUrl = `${baseUrl}/acompanhar/mesa/${currentSession.id}`;

      const billData: TableBillData = {
        tableNumber,
        tableName,
        companyName: company.name,
        openedAt: currentSession.opened_at,
        commands: billCommands,
        subtotalCents: totalCents,
        totalCents: totalCents,
        trackingUrl,
        tableSessionId: currentSession.id,
      };

      const result = await printTableBillDirect(billData, (company as any).default_printer, company.id, printerConfig);
      if (result.success) {
        toast.success('Pré-conta enviada para impressão');
      } else {
        toast.error(result.error || 'Erro ao imprimir pré-conta');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao imprimir pré-conta');
    } finally {
      setIsPrintingPreBill(false);
    }
  };

  // Handle payment with pre-bill print
  const handlePaymentWithPrint = async () => {
    await handlePrintPreBill();
    onPayment();
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast.success('Item removido');
    } catch (error) {
      toast.error('Erro ao remover item');
    }
  };

  // Toggle item selection for transfer
  const toggleItemSelection = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: maxQty };
    });
  };

  // Handle transfers
  const handleTransferItems = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.error('Selecione itens para transferir');
      return;
    }
    if (!targetCommandId) {
      toast.error('Selecione a comanda destino');
      return;
    }

    try {
      await transferItemsToCommand.mutateAsync({
        itemIds: Object.keys(selectedItems),
        targetCommandId,
        quantities: selectedItems,
      });
      toast.success('Itens transferidos!');
      setSelectedItems({});
      setActiveTab('items');
    } catch (error) {
      toast.error('Erro ao transferir itens');
    }
  };

  const handleTransferTable = async () => {
    if (!targetTableId) {
      toast.error('Selecione a mesa destino');
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

  // Available tables (empty ones for transfer)
  const emptyTables = tables.filter(t => {
    const session = sessions.find(s => s.table_id === t.id && s.status !== 'closed');
    return !session && t.id !== tableId && t.active;
  });

  // Occupied tables (for merge)
  const occupiedTables = sessions.filter(s => s.status !== 'closed' && s.id !== sessionId);

  // All available tables for transfer (both occupied and empty)
  const allTablesForTransfer = tables.filter(t => t.active && t.id !== tableId).map(t => {
    const session = sessions.find(s => s.table_id === t.id && s.status !== 'closed');
    return {
      ...t,
      hasSession: !!session,
      sessionId: session?.id,
      totalCents: session?.total_amount_cents || 0,
    };
  }).sort((a, b) => a.number - b.number);

  // Open commands
  const openCommands = commands.filter(c => c.status === 'open');
  
  // Open commands with items (for sidebar display - hide empty ones)
  const openCommandsWithItems = openCommands.filter(cmd => getCommandItems(cmd.id).length > 0);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">Mesa {tableNumber}</span>
              {tableName && <Badge variant="outline" className="text-sm">{tableName}</Badge>}
              <RodizioSessionBadge 
                tableSessionId={sessionId} 
                onActivate={() => setRodizioActivateDialogOpen(true)} 
              />
              {openCommands.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Hash className="h-3 w-3 mr-1" />
                  {openCommands.length} comanda{openCommands.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedCommandId && (
                <Badge variant="outline" className={`text-sm px-3 py-1 ${getCommandColor(selectedCommandId).bg} ${getCommandColor(selectedCommandId).text} ${getCommandColor(selectedCommandId).border} border`}>
                  {(() => {
                    const cmd = commands.find(c => c.id === selectedCommandId);
                    return cmd?.name || `#${cmd?.number}`;
                  })()}: {formatCurrency(getCommandTotal(selectedCommandId))}
                </Badge>
              )}
              <Badge variant="default" className="text-lg px-4 py-2 bg-primary">
                Total: {formatCurrency(totalCents)}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gerenciamento da mesa {tableNumber}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4">
            <TabsList className={`grid w-full ${rodizioSession ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Itens
              </TabsTrigger>
              <TabsTrigger value="order" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Lançar
              </TabsTrigger>
              {rodizioSession && (
                <TabsTrigger value="rodizio" className="flex items-center gap-2 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <UtensilsCrossed className="h-4 w-4" />
                  Rodízio
                </TabsTrigger>
              )}
              <TabsTrigger value="commands" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Comandas
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transferir
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Opções
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab: Items - With command colors and unified display */}
          <TabsContent value="items" className="p-4 pt-2 flex-1 min-h-0 overflow-hidden">
            <div className="flex gap-4 h-full">
              {/* Commands sidebar with colors */}
              <div className="w-48 border-r pr-4">
                <h4 className="font-medium mb-2 text-sm">Comandas</h4>
                <ScrollArea className="h-[calc(100%-30px)]">
                  <div className="space-y-1">
                    <Button
                      variant={!selectedCommandId ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => setSelectedCommandId(null)}
                    >
                      <span>Todos</span>
                      <Badge variant="secondary" className="text-xs">{activeItems.length}</Badge>
                    </Button>
                    {openCommandsWithItems.map(cmd => {
                      const cmdColor = getCommandColor(cmd.id);
                      return (
                        <Button
                          key={cmd.id}
                          variant={selectedCommandId === cmd.id ? 'default' : 'ghost'}
                          size="sm"
                          className={`w-full justify-between ${selectedCommandId !== cmd.id ? `${cmdColor.bg} ${cmdColor.text}` : ''}`}
                          onClick={() => setSelectedCommandId(cmd.id)}
                        >
                          <span className="truncate">{cmd.name || `#${cmd.number}`}</span>
                          <Badge variant="secondary" className="text-xs">{getCommandItems(cmd.id).length}</Badge>
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Items table with unified products and command colors */}
              <div className="flex-1">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-16">Qtd</TableHead>
                        <TableHead className="text-right w-24">Valor</TableHead>
                        <TableHead className="w-28">Comanda</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Unify equal products by product_id + command_id + notes
                        const itemsToShow = selectedCommandId ? getCommandItems(selectedCommandId) : activeItems;
                        const unifiedMap = new Map<string, { 
                          ids: string[]; 
                          product_name: string; 
                          quantity: number; 
                          total_price_cents: number;
                          command: any;
                          notes: string | null;
                        }>();
                        
                        itemsToShow.forEach(item => {
                          const key = `${item.product_id}-${item.command_id || 'none'}-${item.notes || ''}`;
                          const existing = unifiedMap.get(key);
                          if (existing) {
                            existing.ids.push(item.id);
                            existing.quantity += item.quantity;
                            existing.total_price_cents += item.total_price_cents;
                          } else {
                            unifiedMap.set(key, {
                              ids: [item.id],
                              product_name: item.product_name,
                              quantity: item.quantity,
                              total_price_cents: item.total_price_cents,
                              command: item.command,
                              notes: item.notes,
                            });
                          }
                        });
                        
                        return Array.from(unifiedMap.values()).map((unified, idx) => {
                          const cmdColor = unified.command ? getCommandColor(unified.command.id) : null;
                          return (
                            <TableRow key={unified.ids.join('-')} className={cmdColor ? `${cmdColor.bg}` : ''}>
                              <TableCell>
                                <div>
                                  <span className={`font-medium ${cmdColor?.text || ''}`}>
                                    {unified.product_name}
                                  </span>
                                  {unified.notes && (
                                    <p className="text-xs text-muted-foreground">{unified.notes}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className={`font-semibold ${cmdColor?.text || ''}`}>
                                {unified.quantity}x
                              </TableCell>
                              <TableCell className={`text-right font-medium ${cmdColor?.text || ''}`}>
                                {formatCurrency(unified.total_price_cents)}
                              </TableCell>
                              <TableCell>
                                {unified.command ? (
                                  <Badge className={`text-xs ${cmdColor?.bg} ${cmdColor?.text} ${cmdColor?.border} border`}>
                                    {unified.command.name || `#${unified.command.number}`}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-400">
                                    Sem comanda
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    // Delete all items in this unified group
                                    unified.ids.forEach(id => handleDeleteItem(id));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                      {(selectedCommandId ? getCommandItems(selectedCommandId) : activeItems).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                            Nenhum item lançado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Order */}
          <TabsContent value="order" className="p-4 pt-2 flex-1 min-h-0 overflow-hidden">
            <div className="grid grid-cols-3 gap-4 h-full min-h-0">
              {/* Products */}
              <div className="col-span-2 flex flex-col h-full min-h-0">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Categorias em Badges com scroll horizontal */}
                <div className="w-full overflow-x-auto whitespace-nowrap mb-3">
                  <div className="flex gap-2 pb-2">
                    <Badge
                      variant={selectedSubcategoryId === null ? 'default' : 'outline'}
                      className="cursor-pointer shrink-0 px-3 py-1"
                      onClick={() => setSelectedSubcategoryId(null)}
                    >
                      Todos
                    </Badge>
                    {subcategories.filter(s => s.active).map((sub) => (
                      <Badge
                        key={sub.id}
                        variant={selectedSubcategoryId === sub.id ? 'default' : 'outline'}
                        className="cursor-pointer shrink-0 px-3 py-1"
                        onClick={() => setSelectedSubcategoryId(sub.id)}
                      >
                        {sub.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 h-full">
                  <div className="grid grid-cols-2 gap-3 pr-4">
                    {filteredProducts.map(product => {
                      const inCart = cart[product.id]?.quantity || 0;
                      return (
                        <div 
                          key={product.id}
                          className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
                            inCart > 0 
                              ? 'border-primary bg-primary/10 shadow-md' 
                              : 'hover:border-primary/50 hover:bg-muted/50'
                          }`}
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="flex gap-3">
                            {/* Product image placeholder */}
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                              {product.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
                              )}
                              <p className="font-bold text-primary mt-1">{formatCurrency(product.price * 100)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 mt-2">
                            {inCart > 0 ? (
                              <div className="flex items-center gap-2 bg-primary/20 rounded-lg p-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 rounded-full bg-background"
                                  onClick={(e) => { e.stopPropagation(); updateCart(product.id, -1); }}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-6 text-center font-bold">{inCart}</span>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 rounded-full bg-background"
                                  onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="h-7"
                                onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Cart - Visual melhorado */}
              <div className="border-l-2 border-primary/20 pl-4 flex flex-col bg-muted/30 rounded-r-lg">
                <div className="mb-3">
                  <Label className="text-sm font-semibold">Comanda</Label>
                  <Select value={selectedCommandId || 'new'} onValueChange={(v) => setSelectedCommandId(v === 'new' ? null : v)}>
                    <SelectTrigger className="mt-1 bg-background">
                      <SelectValue placeholder="Nova comanda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Nova Comanda</SelectItem>
                      {openCommands.map(cmd => (
                        <SelectItem key={cmd.id} value={cmd.id}>
                          {cmd.name || `Comanda ${cmd.number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Carrinho ({cartItems} itens)
                  </h4>
                  <ScrollArea className="h-48 pr-2">
                    <div className="space-y-2">
                      {Object.entries(cart).map(([key, cartItem]) => {
                        // Support both regular productId keys and composite keys for items with optionals
                        const productId = cartItem.productId || key;
                        const product = products.find(p => p.id === productId);
                        const displayName = cartItem.productName || product?.name || 'Produto';
                        const quantity = cartItem.quantity;
                        
                        // Calculate price - use optionalsPrice if available, otherwise product price
                        const unitPriceCents = cartItem.optionalsPrice 
                          ? Math.round(cartItem.optionalsPrice * 100)
                          : (product?.price || 0) * 100;
                        const totalCentsItem = unitPriceCents * quantity;
                        
                        return (
                          <div key={key} className="flex flex-col gap-2 p-2 bg-background rounded-lg border text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{displayName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(unitPriceCents)} / un
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 hover:bg-destructive/10"
                                onClick={() => {
                                  setCart(prev => {
                                    const { [key]: _, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                aria-label="Remover item"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setCart(prev => {
                                      const curr = prev[key];
                                      if (!curr) return prev;
                                      const newQty = Math.max(0, (curr.quantity || 0) - 1);
                                      if (newQty === 0) {
                                        const { [key]: __, ...rest } = prev;
                                        return rest;
                                      }
                                      return { ...prev, [key]: { ...curr, quantity: newQty } };
                                    });
                                  }}
                                  aria-label="Diminuir"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>

                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  value={quantity}
                                  onChange={(e) => {
                                    const next = Math.max(1, Number(e.target.value || 1));
                                    setCart(prev => ({
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        quantity: next,
                                      },
                                    }));
                                  }}
                                  className="h-8 w-16 text-center"
                                />

                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setCart(prev => {
                                      const curr = prev[key];
                                      if (!curr) return prev;
                                      return { ...prev, [key]: { ...curr, quantity: (curr.quantity || 0) + 1 } };
                                    });
                                  }}
                                  aria-label="Aumentar"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              <span className="font-bold text-primary">
                                {formatCurrency(totalCentsItem)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {cartItems === 0 && (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">
                            Clique nos produtos para adicionar
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="pt-3 border-t-2 border-primary/20 space-y-2 mt-auto">
                  <div className="flex justify-between items-center mb-3 p-2 bg-primary/10 rounded-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(cartTotal)}</span>
                  </div>
                  
                  <Button 
                    className="w-full h-12 text-lg" 
                    disabled={cartItems === 0 || addItem.isPending || createTableOrder.isPending}
                    onClick={() => {
                      // toast.info removed to reduce notification spam
                      handleSubmitOrder(true);
                    }}
                  >
                    {(addItem.isPending || createTableOrder.isPending) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    <Send className="h-5 w-5 mr-2" />
                    Lançar Pedido
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Commands */}
          <TabsContent value="commands" className="p-4 pt-2 flex-1 min-h-0 overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Gerenciar Comandas</h3>
                <Button size="sm" onClick={() => setIsCreatingCommand(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Comanda
                </Button>
              </div>

              {isCreatingCommand && (
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant={commandType === 'number' ? 'default' : 'outline'} onClick={() => setCommandType('number')}>
                      <Hash className="h-4 w-4 mr-1" />
                      Número
                    </Button>
                    <Button size="sm" variant={commandType === 'name' ? 'default' : 'outline'} onClick={() => setCommandType('name')}>
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
                      placeholder="Nome (ex: João)"
                      value={commandName}
                      onChange={(e) => setCommandName(e.target.value)}
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsCreatingCommand(false)}>Cancelar</Button>
                    <Button size="sm" onClick={handleCreateCommand} disabled={createCommand.isPending}>
                      {createCommand.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Criar
                    </Button>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[calc(100%-100px)]">
                <div className="grid grid-cols-2 gap-3">
                  {commands.map(cmd => {
                    const cmdItemCount = getCommandItems(cmd.id).length;
                    const canDelete = cmdItemCount === 0;
                    const cmdColor = getCommandColor(cmd.id);
                    
                    return (
                      <div key={cmd.id} className={`p-4 border-2 rounded-lg ${cmdColor.bg} ${cmdColor.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-medium ${cmdColor.text}`}>{cmd.name || `Comanda ${cmd.number}`}</h4>
                          <Badge variant={cmd.status === 'open' ? 'default' : 'secondary'}>{cmd.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {cmdItemCount} itens • {formatCurrency(getCommandTotal(cmd.id))}
                        </div>
                        <div className="flex gap-2">
                          {cmd.status === 'open' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => closeCommand.mutateAsync(cmd.id)}
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Fechar
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  await deleteCommand.mutateAsync(cmd.id);
                                  toast.success('Comanda excluída');
                                } catch (error: any) {
                                  toast.error(error.message || 'Erro ao excluir comanda');
                                }
                              }}
                              disabled={deleteCommand.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Tab: Transfer */}
          <TabsContent value="transfer" className="p-4 pt-2 flex-1 min-h-0 overflow-hidden">
            <Tabs value={transferType} onValueChange={(v) => setTransferType(v as any)}>
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="items">Transferir Itens</TabsTrigger>
                <TabsTrigger value="table">Transferir Mesa</TabsTrigger>
                <TabsTrigger value="merge">Unir Mesas</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Selecione os itens:</Label>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const filteredItems = transferCommandFilter 
                            ? activeItems.filter(i => i.command_id === transferCommandFilter)
                            : activeItems;
                          if (Object.keys(selectedItems).length === filteredItems.length && filteredItems.length > 0) {
                            // Deselect all
                            setSelectedItems({});
                          } else {
                            // Select all (filtered)
                            const allSelected: Record<string, number> = {};
                            filteredItems.forEach(item => {
                              allSelected[item.id] = item.quantity;
                            });
                            setSelectedItems(allSelected);
                          }
                        }}
                      >
                        {Object.keys(selectedItems).length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </Button>
                    </div>
                    
                    {/* Filter by command */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={!transferCommandFilter ? 'default' : 'outline'}
                        onClick={() => setTransferCommandFilter(null)}
                        className="text-xs"
                      >
                        Todos
                      </Button>
                      <Button
                        size="sm"
                        variant={transferCommandFilter === 'unlinked' ? 'default' : 'outline'}
                        onClick={() => setTransferCommandFilter('unlinked')}
                        className="text-xs bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-yellow-200"
                      >
                        Sem Comanda
                      </Button>
                      {openCommands.map(cmd => {
                        const cmdColor = getCommandColor(cmd.id);
                        return (
                          <Button
                            key={cmd.id}
                            size="sm"
                            variant={transferCommandFilter === cmd.id ? 'default' : 'outline'}
                            onClick={() => setTransferCommandFilter(cmd.id)}
                            className={`text-xs ${transferCommandFilter !== cmd.id ? `${cmdColor.bg} ${cmdColor.text} ${cmdColor.border} border` : ''}`}
                          >
                            {cmd.name || `#${cmd.number}`}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <ScrollArea className="h-64 border rounded-lg p-2">
                      {(() => {
                        const filteredItems = transferCommandFilter === 'unlinked'
                          ? activeItems.filter(i => !i.command_id)
                          : transferCommandFilter
                            ? activeItems.filter(i => i.command_id === transferCommandFilter)
                            : activeItems;
                        
                        return filteredItems.map(item => {
                          const isUnlinked = !item.command_id;
                          const cmdColor = item.command ? getCommandColor(item.command.id) : null;
                          const isSelected = !!selectedItems[item.id];
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`p-2 rounded cursor-pointer mb-1 border-2 transition-all ${
                                isSelected 
                                  ? 'border-primary bg-primary/20 ring-2 ring-primary/30' 
                                  : isUnlinked 
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 hover:border-yellow-500' 
                                    : cmdColor 
                                      ? `${cmdColor.bg} ${cmdColor.border} hover:opacity-80`
                                      : 'hover:bg-muted border-muted'
                              }`}
                              onClick={() => toggleItemSelection(item.id, item.quantity)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(item.id, item.quantity)}
                                    className={`${isSelected ? 'data-[state=checked]:bg-primary data-[state=checked]:border-primary' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className={`font-medium ${isUnlinked ? 'text-yellow-700 dark:text-yellow-400' : cmdColor?.text || ''}`}>
                                    {item.product_name}
                                  </span>
                                  {isUnlinked && (
                                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-500">
                                      Sem comanda
                                    </Badge>
                                  )}
                                </div>
                                <span className={`font-semibold ${cmdColor?.text || ''}`}>{item.quantity}x</span>
                              </div>
                              {item.command && (
                                <Badge className={`text-xs mt-1 ml-7 ${cmdColor?.bg} ${cmdColor?.text} ${cmdColor?.border} border`}>
                                  {item.command.name || `#${item.command.number}`}
                                </Badge>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </ScrollArea>
                  </div>
                  <div className="space-y-4">
                    {/* Seleção de mesa destino */}
                    <div>
                      <Label className="mb-2 block">Mesa destino:</Label>
                      <Select 
                        value={targetTableId || 'current'} 
                        onValueChange={(v) => {
                          if (v === 'current') {
                            setTargetTableId(null);
                            setTargetSessionId(null);
                          } else {
                            setTargetTableId(v);
                            // Find session for this table
                            const tableInfo = allTablesForTransfer.find(t => t.id === v);
                            setTargetSessionId(tableInfo?.sessionId || null);
                          }
                          setTargetCommandId(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a mesa destino..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">
                            <span className="font-medium">Mesa {tableNumber} (Esta mesa)</span>
                          </SelectItem>
                          {allTablesForTransfer.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Mesa {t.number}</span>
                                {t.name && <span className="text-muted-foreground">({t.name})</span>}
                                {t.hasSession ? (
                                  <Badge variant="secondary" className="text-xs ml-1">
                                    {formatCurrency(t.totalCents)}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs ml-1 bg-green-100 text-green-700 border-green-400">
                                    Livre
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Seleção de comanda destino */}
                    <div>
                      <Label className="mb-2 block">Comanda destino:</Label>
                      <Select 
                        value={targetCommandId || 'new'} 
                        onValueChange={(v) => setTargetCommandId(v === 'new' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione ou crie nova..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Criar Nova Comanda</SelectItem>
                          {(() => {
                            // Show commands from target table or current table
                            const commandsToShow = targetTableId 
                              ? targetTableCommands 
                              : openCommands;
                            
                            return commandsToShow.map(cmd => (
                              <SelectItem key={cmd.id} value={cmd.id}>
                                {cmd.name || `Comanda ${cmd.number}`}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Criar nova comanda inline */}
                    {!targetCommandId && (
                      <div className="p-3 border rounded-lg bg-muted/50 space-y-3">
                        <Label className="text-sm font-semibold">Criar nova comanda:</Label>
                        <div className="flex gap-2">
                          <Button size="sm" variant={commandType === 'number' ? 'default' : 'outline'} onClick={() => setCommandType('number')}>
                            <Hash className="h-4 w-4 mr-1" />
                            Número
                          </Button>
                          <Button size="sm" variant={commandType === 'name' ? 'default' : 'outline'} onClick={() => setCommandType('name')}>
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
                            placeholder="Nome (ex: João, Pedro)"
                            value={commandName}
                            onChange={(e) => setCommandName(e.target.value)}
                          />
                        )}
                      </div>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={async () => {
                        if (Object.keys(selectedItems).length === 0) {
                          toast.error('Selecione itens para transferir');
                          return;
                        }
                        
                        let cmdId = targetCommandId;
                        let targetSessionForTransfer = targetSessionId;
                        
                        // If target table has no session, we need to handle creation
                        if (targetTableId && !targetSessionForTransfer) {
                          // Empty table - need to create session first via opening the table
                          const tableInfo = allTablesForTransfer.find(t => t.id === targetTableId);
                          if (!tableInfo) {
                            toast.error('Mesa destino não encontrada');
                            return;
                          }
                          
                          try {
                            // Create session for the empty table
                            const result = await openTable.mutateAsync({ tableId: targetTableId });
                            // CRITICAL: Use the session ID from the result, not from cache
                            targetSessionForTransfer = result.id;
                            // Force update target table commands with new session
                            setTargetSessionId(result.id);
                            toast.success(`Mesa ${tableInfo.number} aberta!`);
                            
                            // Wait for session to be created and committed
                            await new Promise(resolve => setTimeout(resolve, 500));
                          } catch (error) {
                            console.error('Error opening table:', error);
                            toast.error('Erro ao abrir mesa destino');
                            return;
                          }
                        }
                        
                        // Use current session if no target table selected
                        if (!targetTableId) {
                          targetSessionForTransfer = sessionId;
                        }
                        
                        // Validate we have a target session
                        if (!targetSessionForTransfer) {
                          toast.error('Erro: sessão destino não encontrada');
                          return;
                        }
                        
                        // Se não tem comanda selecionada, cria uma nova na mesa destino
                        if (!cmdId) {
                          try {
                            if (commandType === 'number') {
                              const num = parseInt(commandNumber) || getNextCommandNumber();
                              const newCmd = await createCommand.mutateAsync({
                                sessionId: targetSessionForTransfer || sessionId,
                                tableId: targetTableId || tableId,
                                number: num,
                              });
                              cmdId = newCmd.id;
                              toast.success(`Comanda ${num} criada!`);
                            } else {
                              if (!commandName.trim()) {
                                toast.error('Digite o nome da comanda');
                                return;
                              }
                              const newCmd = await createCommand.mutateAsync({
                                sessionId: targetSessionForTransfer || sessionId,
                                tableId: targetTableId || tableId,
                                name: commandName.trim(),
                              });
                              cmdId = newCmd.id;
                              toast.success(`Comanda "${commandName}" criada!`);
                            }
                            setCommandName('');
                            setCommandNumber('');
                          } catch (error) {
                            toast.error('Erro ao criar comanda');
                            return;
                          }
                        }
                        
                        // Transferir itens
                        try {
                          await transferItemsToCommand.mutateAsync({
                            itemIds: Object.keys(selectedItems),
                            targetCommandId: cmdId,
                            quantities: selectedItems,
                          });
                          toast.success(targetTableId ? 'Itens transferidos para outra mesa!' : 'Itens vinculados com sucesso!');
                          setSelectedItems({});
                          setTargetCommandId(null);
                          setTargetTableId(null);
                          setTargetSessionId(null);
                          setActiveTab('items');
                        } catch (error) {
                          toast.error('Erro ao transferir itens');
                        }
                      }} 
                      disabled={transferItemsToCommand.isPending || createCommand.isPending || openTable.isPending}
                    >
                      {(transferItemsToCommand.isPending || createCommand.isPending || openTable.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {targetTableId 
                        ? (targetCommandId ? 'Transferir para Outra Mesa' : 'Criar Comanda e Transferir')
                        : (targetCommandId ? 'Vincular a Comanda Existente' : 'Criar Comanda e Vincular')
                      }
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {targetTableId 
                        ? 'Transferindo itens para outra mesa ocupada.'
                        : 'Itens sem comanda (em amarelo) podem ser vinculados a uma comanda existente ou nova.'
                      }
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="table" className="space-y-4">
                <Label className="block">Transferir toda a mesa para:</Label>
                {emptyTables.length === 0 ? (
                  <div className="p-8 border rounded-lg text-center text-muted-foreground">
                    <p>Nenhuma mesa livre disponível para transferência.</p>
                    <p className="text-xs mt-2">Todas as mesas estão ocupadas ou não há outras mesas cadastradas.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {emptyTables.map(t => (
                        <div 
                          key={t.id}
                          className={`p-4 border rounded-lg text-center cursor-pointer transition-all ${targetTableId === t.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}
                          onClick={() => setTargetTableId(t.id)}
                        >
                          <span className="text-lg font-bold">Mesa {t.number}</span>
                          {t.name && <p className="text-xs text-muted-foreground">{t.name}</p>}
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" onClick={handleTransferTable} disabled={!targetTableId || transferSessionToTable.isPending}>
                      {transferSessionToTable.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Transferir Mesa
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="merge" className="space-y-4">
                <Label className="block">Unir esta mesa com:</Label>
                {occupiedTables.length === 0 ? (
                  <div className="p-8 border rounded-lg text-center text-muted-foreground">
                    <p>Nenhuma outra mesa ocupada disponível para unir.</p>
                    <p className="text-xs mt-2">Apenas mesas com consumo ativo podem ser unidas.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {occupiedTables.map(s => {
                        const t = tables.find(t => t.id === s.table_id);
                        return (
                          <div 
                            key={s.id}
                            className={`p-4 border rounded-lg text-center cursor-pointer transition-all ${targetSessionId === s.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}
                            onClick={() => setTargetSessionId(s.id)}
                          >
                            <span className="text-lg font-bold">Mesa {t?.number}</span>
                            <p className="text-xs text-muted-foreground">{formatCurrency(s.total_amount_cents)}</p>
                          </div>
                        );
                      })}
                    </div>
                    <Button className="w-full" onClick={handleMergeTables} disabled={!targetSessionId || mergeSessions.isPending}>
                      {mergeSessions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Unir Mesas
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab: Settings */}
          <TabsContent value="settings" className="p-4 pt-2 flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {/* Ações Principais - Blue */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-400">
                    <CreditCard className="h-4 w-4" />
                    Ações Principais
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Printer, label: 'Imprimir e Fechar', badge: 'F', onClick: async () => { await handlePrintPreBill(); onPayment(); } },
                      { icon: CreditCard, label: 'Pagamento', badge: 'P', onClick: onPayment },
                      { icon: ArrowRightLeft, label: 'Transferir', badge: 'T', onClick: () => setActiveTab('transfer') },
                      { icon: DoorOpen, label: 'Reabrir Mesa', badge: 'R', onClick: () => { reopenTable.mutateAsync(sessionId); toast.success('Mesa reaberta'); } },
                      { icon: FileText, label: 'Juntar Comandas', badge: 'J', onClick: () => { setTransferType('merge'); setActiveTab('transfer'); } },
                      { icon: ArrowLeft, label: 'Voltar ao Mapa', badge: 'V', onClick: () => { onOpenChange(false); onBackToMap?.(); } },
                    ].map(({ icon: Icon, label, badge, onClick }) => (
                      <Button
                        key={label}
                        variant="outline"
                        className="h-24 min-h-[96px] max-h-[96px] flex-col text-xs border-blue-600 bg-blue-900 hover:bg-blue-800 hover:border-blue-500 transition-all active:scale-[0.97]"
                        onClick={onClick}
                      >
                        <Icon className="h-6 w-6 mb-1 text-blue-200" />
                        <span className="text-blue-100 font-medium truncate w-full text-center">{label}</span>
                        <Badge variant="secondary" className="text-[10px] mt-1 bg-blue-800 text-blue-200 border-blue-600">{badge}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Cliente e Itens - Emerald */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-emerald-400">
                    <User className="h-4 w-4" />
                    Cliente e Itens
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: User, label: 'Vincular Cliente', badge: 'C', onClick: () => setLinkCustomerDialogOpen(true) },
                      { icon: X, label: 'Deletar Item', badge: 'Del', onClick: () => setDeleteItemDialogOpen(true) },
                      { icon: Trash2, label: 'Excluir Todos', badge: 'X', onClick: () => setClearAllConfirmOpen(true) },
                      { icon: Keyboard, label: 'Atalhos de Teclado', badge: ' ', onClick: () => setShortcutsHelpOpen(true) },
                    ].map(({ icon: Icon, label, badge, onClick }) => (
                      <Button
                        key={label}
                        variant="outline"
                        className="h-24 min-h-[96px] max-h-[96px] flex-col text-xs border-emerald-600 bg-emerald-900 hover:bg-emerald-800 hover:border-emerald-500 transition-all active:scale-[0.97]"
                        onClick={onClick}
                      >
                        <Icon className="h-6 w-6 mb-1 text-emerald-200" />
                        <span className="text-emerald-100 font-medium truncate w-full text-center">{label}</span>
                        <Badge variant="secondary" className="text-[10px] mt-1 bg-emerald-800 text-emerald-200 border-emerald-600">{badge}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Caixa e Financeiro - Amber */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-amber-400">
                    <Wallet className="h-4 w-4" />
                    Caixa e Financeiro
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: DoorOpen, label: 'Abrir Gaveta', badge: 'G', onClick: async () => { const result = await openCashDrawer((company as any)?.default_printer, company?.id); if (result.success) { toast.success('Gaveta aberta'); } else { toast.error(result.error || 'Erro ao abrir gaveta'); } } },
                      { icon: Wallet, label: 'Sangria', badge: 'S', onClick: () => setWithdrawalDialogOpen(true) },
                      { icon: Calculator, label: 'Fechar Caixa', badge: 'M', onClick: () => setCashClosingDialogOpen(true) },
                      { icon: Receipt, label: 'Receber Fiado', badge: 'Y', onClick: () => toast.info('Funcionalidade de receber fiado em desenvolvimento') },
                      { icon: FileText, label: 'Relatório Gerencial', badge: 'Z', onClick: () => setManagerReportOpen(true) },
                      { icon: AlertTriangle, label: 'Botão Pânico', badge: '5x Espaço', onClick: async () => { await triggerPanic(); } },
                    ].map(({ icon: Icon, label, badge, onClick }) => (
                      <Button
                        key={label}
                        variant="outline"
                        className="h-24 min-h-[96px] max-h-[96px] flex-col text-xs border-amber-600 bg-amber-900 hover:bg-amber-800 hover:border-amber-500 transition-all active:scale-[0.97]"
                        onClick={onClick}
                      >
                        <Icon className="h-6 w-6 mb-1 text-amber-200" />
                        <span className="text-amber-100 font-medium truncate w-full text-center">{label}</span>
                        <Badge variant="secondary" className="text-[10px] mt-1 bg-amber-800 text-amber-200 border-amber-600">{badge}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Ações Avançadas - Red */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-red-400">
                    <Lock className="h-4 w-4" />
                    Ações Avançadas
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="h-24 min-h-[96px] max-h-[96px] flex-col text-xs border-red-600 bg-red-900 hover:bg-red-800 hover:border-red-500 transition-all active:scale-[0.97] disabled:opacity-40"
                      disabled={activeItems.length > 0 || totalCents > 0 || updateSessionStatus.isPending}
                      onClick={async () => {
                        try {
                          if (activeItems.length > 0 || totalCents > 0) {
                            toast.error('Não é possível liberar: existe consumo na mesa');
                            return;
                          }
                          const cmds = commands.filter((c) => c.status === 'open');
                          for (const c of cmds) {
                            try {
                              await deleteCommand.mutateAsync(c.id);
                            } catch {
                              // ignore
                            }
                          }
                          await updateSessionStatus.mutateAsync({ sessionId, status: 'closed' });
                          toast.success('Mesa liberada sem consumo');
                          onOpenChange(false);
                          onBackToMap?.();
                        } catch (e) {
                          console.error('Error closing table without consumption:', e);
                          toast.error('Erro ao liberar mesa');
                        }
                      }}
                    >
                      <DoorOpen className="h-6 w-6 mb-1 text-red-200" />
                      <span className="text-red-100 font-medium truncate w-full text-center leading-tight">Liberar mesa sem consumo</span>
                    </Button>

                    <Button variant="outline" className="h-24 min-h-[96px] max-h-[96px] flex-col text-xs border-red-600 bg-red-900 hover:bg-red-800 hover:border-red-500 transition-all active:scale-[0.97]" onClick={onCloseTable}>
                      <Lock className="h-6 w-6 mb-1 text-red-200" />
                      <span className="text-red-100 font-medium truncate w-full text-center leading-tight">Fechar Mesa (sem pagamento)</span>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Rodizio - Only visible when rodizio session is active */}
          {rodizioSession && company?.id && (
            <TabsContent value="rodizio" className="flex-1 flex flex-col min-h-0">
              <TabletRodizioMenu
                rodizioSessionId={rodizioSession.id}
                rodizioTypeId={rodizioSession.rodizio_type_id}
                rodizioTypeName={(rodizioSession.rodizio_types as any)?.name || 'Rodízio'}
                companyId={company.id}
                mode="table"
                tableSessionId={sessionId}
                tableId={tableId}
                tableNumber={tableNumber}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Footer with actions - hidden on Rodizio tab (it has its own footer) */}
        {activeTab !== 'rodizio' && (
        <div className="p-4 border-t border-border/50 flex justify-between items-center bg-background/80 backdrop-blur-sm">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Mapa
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={handlePrintPreBill} disabled={isPrintingPreBill} className="h-10 min-w-[140px] border-slate-500/30 hover:border-slate-500/50">
              {isPrintingPreBill ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Imprimir Conta
            </Button>
            <Button 
              variant="outline" 
              type="button"
              onClick={() => {
                if (cartItems > 0) {
                  handleSubmitOrder(true);
                } else {
                  setActiveTab('order');
                }
              }}
              disabled={addItem.isPending || createTableOrder.isPending}
              className="h-10 min-w-[140px] border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
            >
              {(addItem.isPending || createTableOrder.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              Lançar Pedido{cartItems > 0 ? ` (${cartItems})` : ''}
            </Button>
            <Button type="button" onClick={handlePaymentWithPrint} className="h-10 min-w-[140px] bg-primary hover:bg-primary/90 shadow-[0_0_12px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
              <CreditCard className="h-4 w-4 mr-2" />
              Fechar Conta
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Pizza Configurator Dialog - OUTSIDE the main dialog */}
    {selectedProductForPizza && company && (
      <PizzaConfiguratorDialog
        open={pizzaDialogOpen}
        onClose={() => {
          setPizzaDialogOpen(false);
          setSelectedProductForPizza(null);
        }}
        productId={selectedProductForPizza.id}
        productName={selectedProductForPizza.name}
        companyId={company.id}
        onConfirm={handleConfirmPizza}
      />
    )}
    
    {/* Optionals Dialog for products with optionals - OUTSIDE the main dialog */}
    {selectedProductForOptionals && (
      <ProductOptionalsDialog
        open={optionalsDialogOpen}
        onOpenChange={(open) => {
          setOptionalsDialogOpen(open);
          if (!open) setSelectedProductForOptionals(null);
        }}
        product={{
          id: selectedProductForOptionals.id,
          name: selectedProductForOptionals.name,
          price: selectedProductForOptionals.price,
        }}
        onConfirm={handleConfirmOptionals}
      />
    )}
    
    {/* Manager Report Dialog */}
    <TableManagerReportDialog
      open={managerReportOpen}
      onOpenChange={setManagerReportOpen}
    />
    
    {/* Delete Item Dialog */}
    <TableDeleteItemDialog
      open={deleteItemDialogOpen}
      onOpenChange={setDeleteItemDialogOpen}
      sessionId={sessionId}
      items={activeItems}
    />
    
    {/* Link Customer Dialog */}
    <TableLinkCustomerDialog
      open={linkCustomerDialogOpen}
      onOpenChange={setLinkCustomerDialogOpen}
      sessionId={sessionId}
      currentCustomerName={currentSession?.customer_name || undefined}
      currentCustomerPhone={currentSession?.customer_phone || undefined}
    />
    
    {/* Shortcuts Help Dialog */}
    <TablePDVShortcutsHelp
      open={shortcutsHelpOpen}
      onOpenChange={setShortcutsHelpOpen}
    />
    
    {/* Withdrawal Dialog */}
    <WithdrawalDialog
      open={withdrawalDialogOpen}
      onOpenChange={setWithdrawalDialogOpen}
    />
    
    {/* Cash Closing Dialog */}
    <CashClosingDialog
      open={cashClosingDialogOpen}
      onOpenChange={setCashClosingDialogOpen}
    />
    
    {/* Clear All Confirm Dialog */}
    <Dialog open={clearAllConfirmOpen} onOpenChange={setClearAllConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Todos os Pedidos
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir TODOS os pedidos desta mesa/comanda?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setClearAllConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={async () => {
              try {
                // Cancel all items from session
                const { error } = await supabase
                  .from('table_command_items')
                  .update({ status: 'cancelled' })
                  .eq('session_id', sessionId)
                  .neq('status', 'cancelled');
                  
                if (error) throw error;
                
                toast.success('Todos os pedidos foram excluídos');
                setClearAllConfirmOpen(false);
              } catch (error) {
                toast.error('Erro ao excluir pedidos');
              }
            }}
          >
            Sim, Excluir Todos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Rodizio Activate Dialog */}
    <RodizioActivateDialog
      open={rodizioActivateDialogOpen}
      onOpenChange={setRodizioActivateDialogOpen}
      tableSessionId={sessionId}
    />
    </>
  );
}
