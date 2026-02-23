import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Check, Loader2, ScanBarcode, Settings, Wifi, WifiOff, RefreshCw, Plus, Minus, Package, ListChecks, ShoppingCart, Trash2, Send, Pizza } from "lucide-react";
import { supabase } from '@/lib/supabase-shim';
import { toast } from "sonner";
import type { ScaleConfig } from "@/hooks/useScaleConfig";
import { useScaleConnection } from "@/hooks/useScaleConnection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCheckProductHasOptionals } from "@/hooks/useProductOptionalGroups";
import { ProductOptionalsDialog } from "@/components/orders/ProductOptionalsDialog";
import { PizzaConfiguratorDialog } from "@/components/menu/PizzaConfiguratorDialog";
import { isPizzaCategory } from "@/utils/pizzaCategoryHelper";
import { Badge } from "@/components/ui/badge";
import { createPrintJobsForOrder } from "@/utils/createPrintJobsForOrder";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

interface SelfServiceEntry {
  id: string;
  comanda_code: string;
  table_code?: string;
  weight_kg: number;
  total_value: number;
  product_name: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface Product {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  is_weighted: boolean;
  // Category info for pizza detection
  subcategory?: {
    id: string;
    name: string;
    category_id: string;
    category?: {
      id: string;
      name: string;
    };
  };
}

interface SelectedOptional {
  groupId: string;
  groupName: string;
  items: Array<{
    id: string;
    label: string;
    price: number;
    quantity?: number;
  }>;
}

// Cart item interface
interface CartItem {
  id: string; // unique cart item id
  productId: string;
  productName: string;
  isWeighted: boolean;
  weight: number; // weight in kg (for weighted) or quantity (for unit)
  pricePerUnit: number; // price per kg or per unit (in reais)
  totalValueCents: number;
  optionalsDescription?: string;
  optionals: SelectedOptional[];
}

interface SelfServiceOperatorScreenProps {
  companyId: string;
  pricePerKgCents: number;
  productName: string;
  scaleConfig?: ScaleConfig | null;
  onChangeMode?: () => void;
}

export function SelfServiceOperatorScreen({
  companyId,
  pricePerKgCents,
  productName,
  scaleConfig,
  onChangeMode,
}: SelfServiceOperatorScreenProps) {
  // State for form
  const [comandaCode, setComandaCode] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // State for selected product (unit products with quantity)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // State for product optionals (like ice, lemon for drinks)
  const [showOptionalsDialog, setShowOptionalsDialog] = useState(false);
  const [productForOptionals, setProductForOptionals] = useState<Product | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptional[]>([]);
  const [optionalsDescription, setOptionalsDescription] = useState("");
  
  // Pizza state
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [pizzaProduct, setPizzaProduct] = useState<Product | null>(null);
  
  // State for data
  const [recentEntries, setRecentEntries] = useState<SelfServiceEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Refs
  const comandaInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  
  // Scale connection
  const { 
    weight: scaleWeight, 
    isConnected, 
    stable: isStable, 
    connect
  } = useScaleConnection({ config: scaleConfig });
  
  // Check if product has optionals
  const { checkProduct } = useCheckProductHasOptionals();

  // Calculate values based on mode
  const isWeightMode = !selectedProduct || selectedProduct.is_weighted;
  const currentWeight = isConnected && scaleWeight > 0 ? scaleWeight : parseFloat(manualWeight.replace(",", ".")) || 0;
  
  // Calculate value for current item (before adding to cart)
  const calculateCurrentValue = () => {
    let baseValue = 0;
    
    if (selectedProduct) {
      if (selectedProduct.is_weighted) {
        baseValue = Math.round(currentWeight * selectedProduct.price * 100);
      } else {
        baseValue = Math.round(selectedProduct.price * quantity * 100);
      }
    } else {
      baseValue = Math.round(currentWeight * pricePerKgCents);
    }
    
    const optionalsValue = selectedOptionals.reduce((total, group) => {
      return total + group.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1) * 100), 0);
    }, 0);
    
    return baseValue + optionalsValue;
  };
  
  const currentValueCents = calculateCurrentValue();
  
  // Cart total
  const cartTotalCents = cart.reduce((sum, item) => sum + item.totalValueCents, 0);

  // Load initial data
  useEffect(() => {
    loadRecentEntries();
    loadCategories();
    loadProducts();
  }, [companyId]);

  // Focus on weight input initially
  useEffect(() => {
    if (!isConnected && isWeightMode) {
      weightInputRef.current?.focus();
    }
  }, [isConnected, isWeightMode]);

  const loadRecentEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("self_service_entries")
        .select(`
          id,
          weight_kg,
          total_value,
          product_name,
          created_at,
          comanda:comandas(command_number),
          table:tables(number)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentEntries(data.map((entry: any) => ({
          id: entry.id,
          comanda_code: entry.comanda?.command_number?.toString() || "-",
          table_code: entry.table?.number?.toString(),
          weight_kg: entry.weight_kg,
          total_value: entry.total_value,
          product_name: entry.product_name,
          created_at: entry.created_at,
        })));
      }
    } catch (err) {
      console.error("Error loading entries:", err);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, image_url")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name");

      if (!error && data) {
        setCategories(data);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, image_url, price, is_weighted,
          subcategory:subcategories(
            id, name, category_id,
            category:categories(id, name)
          )
        `)
        .eq("company_id", companyId)
        .eq("active", true)
        .eq("is_featured", true)
        .order("name");

      if (!error && data) {
        setProducts(data as unknown as Product[]);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const handleProductSelect = async (product: Product) => {
    // PIZZA CHECK FIRST - STRICT: Only category name === "Pizza" enables pizza behavior
    if (isPizzaCategory(product)) {
      setPizzaProduct(product);
      setShowPizzaDialog(true);
      return;
    }
    
    const hasOptionals = await checkProduct(product.id);
    
    if (hasOptionals) {
      setProductForOptionals(product);
      setShowOptionalsDialog(true);
    } else {
      setSelectedProduct(product);
      setSelectedOptionals([]);
      setOptionalsDescription("");
      setQuantity(1);
      
      if (!product.is_weighted) {
        // For unit products, focus nothing special
      } else if (!isConnected) {
        weightInputRef.current?.focus();
      }
    }
  };
  
  // Handle pizza confirmation
  const handlePizzaConfirm = (selection: any) => {
    if (!pizzaProduct) return;
    
    const flavorsDetails = (selection.flavors || []).map((f: any) => {
      let detail = f.name;
      if (f.removedIngredients?.length > 0) {
        detail += ` (sem ${f.removedIngredients.join(', ')})`;
      }
      if (f.observation) {
        detail += ` [${f.observation}]`;
      }
      return detail;
    }).join(', ');
    
    const borderNote = selection.selectedBorder ? ` | Borda: ${selection.selectedBorder.name}` : '';
    const doughTypeNote = selection.selectedDoughType ? ` | Massa: ${selection.selectedDoughType.name}` : '';
    const borderTypeNote = selection.selectedBorderType ? ` | Tipo Borda: ${selection.selectedBorderType.name}` : '';
    const doughDelta = selection.selectedDoughType?.price_delta || 0;
    const borderTypeDelta = selection.selectedBorderType?.price_delta || 0;
    const totalPrice = (selection.totalPrice || 0) + (selection.borderTotal || 0) + (selection.optionalsTotal || 0) + doughDelta + borderTypeDelta;
    const description = `${selection.size} - ${flavorsDetails}${doughTypeNote}${borderNote}${borderTypeNote}`;
    
    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: pizzaProduct.id,
      productName: `${pizzaProduct.name} (${description})`,
      isWeighted: false,
      weight: 1,
      pricePerUnit: totalPrice,
      totalValueCents: Math.round(totalPrice * 100),
      optionalsDescription: description,
      optionals: [{
        groupId: 'pizza_snapshot',
        groupName: 'Pizza',
        items: [{
          id: 'pizza',
          label: description,
          price: totalPrice,
        }]
      }],
    };
    
    setCart(prev => [...prev, cartItem]);
    setPizzaProduct(null);
    setShowPizzaDialog(false);
  };

  const handleOptionalsConfirm = (optionals: SelectedOptional[], totalPrice: number, description: string) => {
    if (productForOptionals) {
      setSelectedProduct(productForOptionals);
      setSelectedOptionals(optionals);
      setOptionalsDescription(description);
      setQuantity(1);
      setProductForOptionals(null);
      
      if (!productForOptionals.is_weighted && !isConnected) {
        // nothing special
      } else if (!isConnected) {
        weightInputRef.current?.focus();
      }
    }
  };

  const handleOptionalsCancel = () => {
    setShowOptionalsDialog(false);
    setProductForOptionals(null);
  };

  const clearProductSelection = () => {
    setSelectedProduct(null);
    setSelectedOptionals([]);
    setOptionalsDescription("");
    setQuantity(1);
    if (!isConnected) {
      weightInputRef.current?.focus();
    }
  };

  // Add item to cart
  const handleAddToCart = () => {
    if (isWeightMode && currentWeight <= 0) {
      toast.error("Peso inválido");
      if (!isConnected) {
        weightInputRef.current?.focus();
      }
      return;
    }

    if (!isWeightMode && quantity <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    const productWithOptionals = optionalsDescription 
      ? `${selectedProduct?.name || productName} (${optionalsDescription})`
      : (selectedProduct?.name || productName);

    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: selectedProduct?.id || 'selfservice',
      productName: productWithOptionals,
      isWeighted: isWeightMode,
      weight: isWeightMode ? currentWeight : quantity,
      pricePerUnit: selectedProduct 
        ? selectedProduct.price 
        : pricePerKgCents / 100,
      totalValueCents: currentValueCents,
      optionalsDescription,
      optionals: selectedOptionals,
    };

    setCart(prev => [...prev, cartItem]);

    // Reset for next item
    setManualWeight("");
    setSelectedProduct(null);
    setSelectedOptionals([]);
    setOptionalsDescription("");
    setQuantity(1);
    
    if (!isConnected) {
      weightInputRef.current?.focus();
    }
  };

  // Remove item from cart
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  // Clear entire cart
  const handleClearCart = () => {
    setCart([]);
  };

  // Send all cart items to comanda
  const handleSendCart = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    if (!comandaCode.trim()) {
      toast.error("Digite ou escaneie o código da comanda");
      comandaInputRef.current?.focus();
      return;
    }

    setIsProcessing(true);

    try {
      // Find comanda by command_number
      const { data: comanda, error: comandaError } = await supabase
        .from("comandas")
        .select("id, status")
        .eq("company_id", companyId)
        .eq("command_number", parseInt(comandaCode.trim()) || 0)
        .maybeSingle();

      if (comandaError) throw comandaError;

      if (!comanda) {
        toast.error("Comanda não encontrada");
        setComandaCode("");
        comandaInputRef.current?.focus();
        setIsProcessing(false);
        return;
      }

      // Accept 'open' and 'no_activity' status (or closed status is 'closed')
      if (comanda.status === "closed") {
        toast.error("Comanda está fechada");
        setComandaCode("");
        comandaInputRef.current?.focus();
        setIsProcessing(false);
        return;
      }

      // Find table if provided (optional)
      let tableId: string | null = null;
      if (tableCode.trim()) {
        const { data: table, error: tableError } = await supabase
          .from("tables")
          .select("id")
          .eq("company_id", companyId)
          .eq("number", parseInt(tableCode.trim()) || 0)
          .maybeSingle();

        if (!tableError && table) {
          tableId = table.id;
        }
      }

      // Insert all cart items into self_service_entries
      const entries = cart.map(item => ({
        company_id: companyId,
        comanda_id: comanda.id,
        table_id: tableId,
        product_name: item.productName,
        weight_kg: item.weight,
        price_per_kg: Math.round(item.pricePerUnit * 100),
        total_value: item.totalValueCents,
      }));

      const { error: insertError } = await supabase
        .from("self_service_entries")
        .insert(entries);

      if (insertError) throw insertError;

      // =============================================
      // TAMBÉM inserir em comanda_items para aparecer na comanda
      // =============================================
      const comandaItemsToInsert = cart.map(item => ({
        company_id: companyId,
        comanda_id: comanda.id,
        product_id: item.productId === 'selfservice' ? null : item.productId,
        product_name_snapshot: item.productName,
        qty: item.isWeighted ? item.weight : item.weight, // weight is qty for unit products
        unit_price_snapshot: item.pricePerUnit,
        notes: item.optionalsDescription || null,
        options_json: item.optionals.length > 0 ? JSON.parse(JSON.stringify(item.optionals)) : null,
      }));

      const { error: comandaItemsError } = await supabase
        .from("comanda_items")
        .insert(comandaItemsToInsert);

      if (comandaItemsError) {
        console.error("Error inserting comanda_items:", comandaItemsError);
        // Continue - self_service_entries already inserted
      }

      // =============================================
      // Criar order + order_items para KDS e impressão de produção
      // =============================================
      const itemsWithProductId = cart.filter(item => item.productId && item.productId !== 'selfservice');
      
      if (itemsWithProductId.length > 0) {
        try {
          const comandaNumber = parseInt(comandaCode.trim()) || 0;
          const total = itemsWithProductId.reduce((sum, item) => sum + (item.totalValueCents / 100), 0);
          const customerNameForKDS = `COMANDA ${comandaNumber} (Balança)`;

          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              company_id: companyId,
              order_type: 'dine_in',
              receipt_type: 'dine_in',
              fulfillment_type: 'dine_in',
              customer_name: customerNameForKDS,
              notes: `Comanda ${comandaNumber} - Balança`,
              source: 'pos',
              total,
              status: 'preparo',
              accepted_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!orderError && order) {
            // Create order items
            const orderItems = itemsWithProductId.map(item => ({
              order_id: order.id,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.isWeighted ? item.weight : item.weight,
              unit_price: item.pricePerUnit,
              notes: item.optionalsDescription || null,
              selected_options_json: item.optionals.length > 0 ? JSON.parse(JSON.stringify(item.optionals)) : null,
            }));

            await supabase.from('order_items').insert(orderItems);

            // Create print jobs for KDS and production printers
            await createPrintJobsForOrder(companyId, order.id);
            
            console.log('[SelfServiceOperator] Created order for KDS/production:', order.id);
          }
        } catch (orderErr) {
          console.error('[SelfServiceOperator] Error creating order for production:', orderErr);
          // Continue - items were added to comanda, just no production print
        }
      }

      // Show success
      setShowSuccess(true);
      toast.success(`${cart.length} item(s) lançado(s) na comanda ${comandaCode}`);

      // Reload entries
      loadRecentEntries();

      // Reset after delay
      setTimeout(() => {
        setShowSuccess(false);
        setManualWeight("");
        setComandaCode("");
        setTableCode("");
        setSelectedProduct(null);
        setSelectedOptionals([]);
        setOptionalsDescription("");
        setQuantity(1);
        setCart([]);
        if (!isConnected) {
          weightInputRef.current?.focus();
        } else {
          comandaInputRef.current?.focus();
        }
      }, 2000);
    } catch (error) {
      console.error("Error launching:", error);
      toast.error("Erro ao lançar");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddToCart();
    }
  };

  const handleComandaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (cart.length > 0) {
        handleSendCart();
      }
    }
  };

  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      comandaInputRef.current?.focus();
    }
  };

  // Success overlay
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-500">
        <div className="text-center text-white animate-scale-in">
          <Check className="w-32 h-32 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-2">Lançado!</h1>
          <p className="text-2xl opacity-90 mb-1">{cart.length} item(s)</p>
          <p className="text-xl opacity-80">
            Total: {formatCurrency(cartTotalCents / 100)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header Bar */}
      <header className="h-16 border-b bg-card flex items-center px-6 gap-6 shrink-0">
        {onChangeMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeMode}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Modo
          </Button>
        )}
        
        <div className="flex-1 grid grid-cols-4 gap-6 text-center">
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-xs text-muted-foreground">Comanda</span>
            <p className="font-mono font-bold text-xl text-primary">{comandaCode || "-"}</p>
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-xs text-muted-foreground">Mesa</span>
            <p className="font-mono font-bold text-xl">{tableCode || "-"}</p>
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {isWeightMode ? "Peso" : "Quantidade"}
            </span>
            <p className="font-mono font-bold text-xl text-primary">
              {isWeightMode ? `${currentWeight.toFixed(3)} kg` : `${quantity} un`}
            </p>
          </div>
          <div className="bg-primary/10 rounded-lg px-4 py-2 border border-primary/30">
            <span className="text-xs text-muted-foreground">Carrinho</span>
            <p className="font-mono font-bold text-xl text-primary">
              {formatCurrency(cartTotalCents / 100)}
            </p>
          </div>
        </div>

        {/* Scale connection status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isStable ? "Estável" : "Lendo..."}
              </span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={connect}
              className="gap-2 text-muted-foreground"
            >
              <WifiOff className="w-4 h-4" />
              Conectar Balança
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Categories & Products */}
        <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r flex flex-col shrink-0 bg-card/50 max-h-[40vh] lg:max-h-none">
          {/* Categories */}
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Categorias
            </h3>
            <ScrollArea className="h-24">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="px-4 py-2 bg-muted rounded-lg text-sm font-medium cursor-pointer 
                      hover:bg-primary hover:text-primary-foreground 
                      active:scale-95 active:bg-primary/80
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      transition-all duration-150"
                  >
                    {cat.name}
                  </button>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Featured Products */}
          <div className="flex-1 p-4 overflow-hidden">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Produtos em Destaque
            </h3>
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
                    className={`
                      aspect-square rounded-xl border-2 bg-card flex flex-col items-center justify-center p-3 
                      cursor-pointer transition-all duration-150
                      hover:border-primary hover:shadow-lg hover:scale-[1.02]
                      active:scale-95 active:shadow-inner
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      ${selectedProduct?.id === product.id 
                        ? 'border-primary bg-primary/10 ring-2 ring-primary shadow-lg shadow-primary/20' 
                        : 'border-border hover:bg-card/80'}
                    `}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                    ) : (
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                        selectedProduct?.id === product.id ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        {product.is_weighted ? (
                          <Scale className={`w-7 h-7 ${
                            selectedProduct?.id === product.id ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        ) : (
                          <Package className={`w-7 h-7 ${
                            selectedProduct?.id === product.id ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        )}
                      </div>
                    )}
                    <span className={`text-xs mt-2 text-center line-clamp-2 font-medium ${
                      selectedProduct?.id === product.id ? 'text-primary' : ''
                    }`}>
                      {product.name}
                    </span>
                    <span className="text-xs text-primary font-semibold mt-1">
                      {formatCurrency(product.price)}
                      {product.is_weighted && '/kg'}
                    </span>
                  </button>
                ))}
                {products.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-3 text-center py-8">
                    Nenhum produto em destaque
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Center - Main Form */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col overflow-auto">
          <div className="w-full max-w-lg mx-auto space-y-4">
            {/* Title */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
                {isWeightMode ? (
                  <Scale className="w-8 h-8 text-primary" />
                ) : (
                  <Package className="w-8 h-8 text-primary" />
                )}
              </div>
              <h1 className="text-xl font-bold">Adicionar Item</h1>
              <p className="text-sm text-muted-foreground">
                {selectedProduct?.name || productName}
              </p>
              {optionalsDescription && (
                <div className="flex items-center gap-2 mt-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                  <ListChecks className="w-3.5 h-3.5" />
                  <span className="font-medium">{optionalsDescription}</span>
                </div>
              )}
              {selectedProduct && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearProductSelection}
                  className="mt-2 text-xs"
                >
                  Voltar para Self-Service
                </Button>
              )}
            </div>

            {/* Price info */}
            <div className="text-center py-2 px-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">
                {isWeightMode ? "Preço por kg" : "Preço unitário"}
              </p>
              <p className="text-lg font-bold text-primary">
                {selectedProduct 
                  ? formatCurrency(selectedProduct.price)
                  : formatCurrency(pricePerKgCents / 100)
                }
                {isWeightMode && !selectedProduct && '/kg'}
              </p>
            </div>

            {/* Weight Input OR Quantity Selector */}
            {isWeightMode ? (
              !isConnected && (
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-medium">
                    Peso (kg)
                  </Label>
                  <Input
                    ref={weightInputRef}
                    id="weight"
                    type="text"
                    inputMode="decimal"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    onKeyDown={handleWeightKeyDown}
                    placeholder="0,000"
                    className="text-center text-2xl h-14 font-mono"
                    disabled={isProcessing}
                  />
                </div>
              )
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantidade</Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isProcessing || quantity <= 1}
                    className="h-14 w-14 text-xl"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <div className="w-24 h-14 flex items-center justify-center bg-muted rounded-xl">
                    <span className="text-3xl font-bold font-mono">{quantity}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={isProcessing}
                    className="h-14 w-14 text-xl"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Current Value Display */}
            <div className="text-center py-3 px-6 rounded-xl bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-1">Valor do item</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(currentValueCents / 100)}
              </p>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={isProcessing || (isWeightMode && currentWeight <= 0) || (!isWeightMode && quantity <= 0)}
              className="w-full h-12 text-lg gap-2"
              variant="secondary"
            >
              <Plus className="w-5 h-5" />
              Adicionar ao Carrinho
            </Button>

            {/* Cart Section */}
            {cart.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Carrinho</h3>
                    <Badge variant="secondary">{cart.length} item(s)</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCart}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </div>
                
                <ScrollArea className="max-h-40">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.isWeighted 
                              ? `${item.weight.toFixed(3)} kg` 
                              : `${item.weight} un`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {formatCurrency(item.totalValueCents / 100)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(cartTotalCents / 100)}
                  </span>
                </div>
              </div>
            )}

            {/* Table Input */}
            <div className="space-y-2">
              <Label htmlFor="table" className="text-sm font-medium">
                Mesa (opcional)
              </Label>
              <Input
                id="table"
                type="text"
                inputMode="numeric"
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                onKeyDown={handleTableKeyDown}
                placeholder="Número da mesa"
                className="text-center h-12 text-lg"
                disabled={isProcessing}
              />
            </div>

            {/* Comanda Input */}
            <div className="space-y-2">
              <Label htmlFor="comanda" className="text-sm font-medium flex items-center gap-2">
                <ScanBarcode className="w-4 h-4" />
                Código da Comanda
              </Label>
              <Input
                ref={comandaInputRef}
                id="comanda"
                type="text"
                inputMode="numeric"
                value={comandaCode}
                onChange={(e) => setComandaCode(e.target.value)}
                onKeyDown={handleComandaKeyDown}
                placeholder="Digite ou escaneie"
                className="text-center text-xl h-14"
                disabled={isProcessing}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendCart}
              disabled={isProcessing || cart.length === 0 || !comandaCode.trim()}
              className="w-full h-14 text-xl gap-3"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Enviar para Comanda ({cart.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Side - Recent Entries (hidden on small screens) */}
        <div className="hidden xl:flex lg:w-80 xl:w-96 border-l flex-col shrink-0 bg-card/50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Últimos Lançamentos
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={loadRecentEntries}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-xl border bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex gap-3">
                      <span className="font-mono font-semibold bg-primary/10 px-2 py-0.5 rounded text-primary">
                        #{entry.comanda_code}
                      </span>
                      {entry.table_code && (
                        <span className="font-mono text-muted-foreground">
                          Mesa {entry.table_code}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(new Date(entry.created_at))}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1 line-clamp-1">{entry.product_name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">
                      {entry.weight_kg.toFixed(3)} kg
                    </span>
                    <span className="font-bold text-primary">
                      {formatCurrency(entry.total_value / 100)}
                    </span>
                  </div>
                </div>
              ))}
              {recentEntries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Nenhum lançamento ainda
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Product Optionals Dialog */}
      {productForOptionals && (
        <ProductOptionalsDialog
          open={showOptionalsDialog}
          onOpenChange={(open) => {
            if (!open) handleOptionalsCancel();
          }}
          product={{
            id: productForOptionals.id,
            name: productForOptionals.name,
            price: productForOptionals.price,
          }}
          onConfirm={handleOptionalsConfirm}
        />
      )}
      
      {/* Pizza Configurator Dialog */}
      {pizzaProduct && (
        <PizzaConfiguratorDialog
          open={showPizzaDialog}
          onClose={() => {
            setShowPizzaDialog(false);
            setPizzaProduct(null);
          }}
          companyId={companyId}
          productId={pizzaProduct.id}
          productName={pizzaProduct.name}
          onConfirm={handlePizzaConfirm}
        />
      )}
    </div>
  );
}
