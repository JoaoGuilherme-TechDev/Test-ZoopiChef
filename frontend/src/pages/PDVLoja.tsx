import { useState, useEffect, useCallback } from 'react';
import { Store, Clock, User, Search, Tag, Merge, XCircle, Wallet, Settings, RotateCcw, Printer, History, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { usePDVLoja } from '@/hooks/usePDVLoja';
import { useComandaItems } from '@/hooks/useComandaItems';
import { Product } from '@/hooks/useProducts';
import { Comanda } from '@/hooks/useComandas';
import { PDVProductSearch } from '@/components/pdv-loja/PDVProductSearch';
import { PDVBarcodeScanner } from '@/components/pdv-loja/PDVBarcodeScanner';
import { PDVCart } from '@/components/pdv-loja/PDVCart';
import { PDVPaymentPanel } from '@/components/pdv-loja/PDVPaymentPanel';
import { ComandaSearchModal } from '@/components/pdv-loja/ComandaSearchModal';
import { MergeComandasModal } from '@/components/pdv-loja/MergeComandasModal';
import { PDVCreditSearchModal } from '@/components/pdv-loja/PDVCreditSearchModal';
import { PDVReceiveCreditModal } from '@/components/pdv-loja/PDVReceiveCreditModal';
import { PDVStationConfig, loadStationConfig } from '@/components/pdv-loja/PDVStationConfig';
import { PDVSaleReverse } from '@/components/pdv-loja/PDVSaleReverse';
import { PDVSaleReprint } from '@/components/pdv-loja/PDVSaleReprint';
import { PDVSaleSearch } from '@/components/pdv-loja/PDVSaleSearch';
import { PDVSaleSuccessModal } from '@/components/pdv-loja/PDVSaleSuccessModal';
import { ProductOptionalsDialog } from '@/components/orders/ProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function PDVLoja() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showComandaSearch, setShowComandaSearch] = useState(false);
  const [showMergeComandas, setShowMergeComandas] = useState(false);
  const [showCreditSearch, setShowCreditSearch] = useState(false);
  const [showReceiveCredit, setShowReceiveCredit] = useState(false);
  const [showStationConfig, setShowStationConfig] = useState(false);
  const [showSaleReverse, setShowSaleReverse] = useState(false);
  const [showSaleReprint, setShowSaleReprint] = useState(false);
  const [showSaleSearch, setShowSaleSearch] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSaleSuccess, setShowSaleSuccess] = useState(false);
  const [showOptionalsDialog, setShowOptionalsDialog] = useState(false);
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pizzaProduct, setPizzaProduct] = useState<Product | null>(null);
  const [lastSaleData, setLastSaleData] = useState<{
    orderId?: string;
    total?: number;
    paymentMethod?: string;
  } | null>(null);
  const [stationConfig, setStationConfig] = useState(() => loadStationConfig());
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<{
    id: string;
    name: string;
    whatsapp: string;
    credit_balance: number;
  } | null>(null);
  const [saleCustomer, setSaleCustomer] = useState<{
    id: string;
    name: string;
    cpf_cnpj?: string | null;
    email?: string | null;
    address?: string | null;
  } | null>(null);

  const {
    cartItems,
    linkedComanda,
    payments,
    openComandas,
    adjustments,
    cartSubtotal,
    cartTotal,
    paidTotal,
    remainingBalance,
    serviceFeeValue,
    addToCart,
    removeFromCart,
    updateCartItemQty,
    updateItemDiscount,
    linkComanda,
    addPayment,
    removePayment,
    updateAdjustments,
    finalizeSale,
    cancelSale,
    deleteComandaItem,
    mergeComandasMutation,
  } = usePDVLoja();

  // Comanda selecionada para carregar itens
  const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);
  const { items: comandaItemsData } = useComandaItems(selectedComandaId);

  // Verificar se produto tem opcionais antes de adicionar
  const handleAddProduct = useCallback((product: Product) => {
    // PIZZA CHECK FIRST - STRICT: Only category name === "Pizza" enables pizza behavior
    if (isPizzaCategory(product)) {
      setPizzaProduct(product);
      setShowPizzaDialog(true);
      return;
    }
    
    // Por enquanto, adiciona diretamente - o suporte a opcionais 
    // pode ser ativado verificando product_optional_group_links
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
    addToCart({
      productId: product.id,
      name: product.name,
      qty: 1,
      unitPrice: price,
    });
  }, [addToCart]);

  // Handler para produtos com opcionais (usado pelo ProductOptionalsDialog)
  const handleProductWithOptionals = useCallback((product: Product) => {
    setPendingProduct(product);
    setShowOptionalsDialog(true);
  }, []);

  // Confirmar seleção de opcionais
  const handleConfirmOptionals = useCallback((
    selectedOptionals: Array<{ groupId: string; groupName: string; items: Array<{ id: string; label: string; price: number }> }>,
    totalPrice: number,
    optionalsDescription: string
  ) => {
    if (!pendingProduct) return;
    
    addToCart({
      productId: pendingProduct.id,
      name: pendingProduct.name,
      qty: 1,
      unitPrice: totalPrice,
      notes: optionalsDescription,
      optionsJson: { selected_options: selectedOptionals },
    });
    
    setShowOptionalsDialog(false);
    setPendingProduct(null);
  }, [pendingProduct, addToCart]);
  
  // Handle pizza confirmation
  const handlePizzaConfirm = useCallback((selection: any) => {
    if (!pizzaProduct) return;
    
    // Build notes string including removed ingredients and observations
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
    const optionalsNote = selection.selectedOptionals?.length > 0 
      ? ` | Adicionais: ${selection.selectedOptionals.map((o: any) => `${o.quantity}x ${o.name}`).join(', ')}`
      : '';
    
    const doughDelta = selection.selectedDoughType?.price_delta || 0;
    const borderTypeDelta = selection.selectedBorderType?.price_delta || 0;
    const totalPrice = (selection.totalPrice || 0) + (selection.borderTotal || 0) + (selection.optionalsTotal || 0) + doughDelta + borderTypeDelta;
    const description = `${selection.size} - ${flavorsDetails}${doughTypeNote}${borderNote}${borderTypeNote}${optionalsNote}`;
    
    addToCart({
      productId: pizzaProduct.id,
      name: pizzaProduct.name,
      qty: 1,
      unitPrice: totalPrice,
      notes: description,
      optionsJson: {
        pizza_snapshot: {
          size: selection.size,
          pricing_model: selection.pricing_model,
          selected_flavors: selection.flavors || [],
          selected_border: selection.selectedBorder || null,
          border_total: selection.borderTotal || 0,
          selected_optionals: selection.selectedOptionals || [],
          optionals_total: selection.optionalsTotal || 0,
          selected_dough_type: selection.selectedDoughType || null,
          selected_border_type: selection.selectedBorderType || null,
        },
      },
    });
    
    setShowPizzaDialog(false);
    setPizzaProduct(null);
  }, [pizzaProduct, addToCart]);


  // Quando a comanda selecionada muda, espera os itens carregarem
  const handleSelectComanda = (comanda: any) => {
    setSelectedComandaId(comanda.id);
  };

  // Efeito para vincular quando os itens forem carregados
  useEffect(() => {
    if (selectedComandaId && comandaItemsData) {
      const comanda = openComandas.find(c => c.id === selectedComandaId);
      if (comanda) {
        linkComanda(comanda, comandaItemsData);
        setShowComandaSearch(false);
        setSelectedComandaId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComandaId, comandaItemsData]);

  const handleMergeComandas = (sourceIds: string[], targetId: string) => {
    mergeComandasMutation.mutate({ sourceIds, targetId }, {
      onSuccess: () => {
        setShowMergeComandas(false);
      },
    });
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não capturar se estiver em input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          setShowProductSearch(true);
          break;
        case 'F2':
          e.preventDefault();
          setShowComandaSearch(true);
          break;
        case 'F3':
          e.preventDefault();
          setShowMergeComandas(true);
          break;
        case 'F4':
          e.preventDefault();
          setShowCreditSearch(true);
          break;
        case 'F5':
          e.preventDefault();
          setShowSaleSearch(true);
          break;
        case 'F6':
          e.preventDefault();
          setShowSaleReverse(true);
          break;
        case 'F7':
          e.preventDefault();
          setShowSaleReprint(true);
          break;
        case 'F9':
          e.preventDefault();
          setShowStationConfig(true);
          break;
        case 'Escape':
          setShowProductSearch(false);
          setShowComandaSearch(false);
          setShowMergeComandas(false);
          setShowCreditSearch(false);
          setShowReceiveCredit(false);
          setShowStationConfig(false);
          setShowSaleReverse(false);
          setShowSaleReprint(false);
          setShowSaleSearch(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!company) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Estilo dinâmico baseado nas configurações da estação
  const customStyles = {
    '--pdv-primary': stationConfig.primaryColor,
    '--pdv-accent': stationConfig.accentColor,
  } as React.CSSProperties;

  return (
    <div 
      className={`h-screen flex flex-col bg-background relative ${stationConfig.darkMode ? 'dark' : ''}`}
      style={customStyles}
    >
      {/* Header */}
      <header 
        className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0"
        style={{ backgroundColor: stationConfig.primaryColor + '10' }}
      >
        <div className="flex items-center gap-4">
          {stationConfig.logoUrl ? (
            <img 
              src={stationConfig.logoUrl} 
              alt="Logo" 
              className="h-10 w-10 object-contain rounded"
            />
          ) : (
            <Store className="h-7 w-7" style={{ color: stationConfig.primaryColor }} />
          )}
          <div>
            <h1 className="font-bold text-xl" style={{ color: stationConfig.primaryColor }}>
              PDV Loja
            </h1>
            <span className="text-sm text-muted-foreground">{company.name}</span>
          </div>
          <div 
            className="ml-4 px-3 py-1 rounded-full text-sm font-medium"
            style={{ 
              backgroundColor: stationConfig.primaryColor + '20', 
              color: stationConfig.primaryColor 
            }}
          >
            {stationConfig.stationName}
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStationConfig(true)}
            className="text-muted-foreground"
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
            <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-xs">F9</kbd>
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{profile?.full_name || 'Operador'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(), "HH:mm - dd/MM", { locale: ptBR })}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      {/* Barra de leitores de código de barras */}
      <PDVBarcodeScanner
        onProductScanned={handleAddProduct}
        onComandaScanned={handleSelectComanda}
        openComandas={openComandas}
        linkedComanda={linkedComanda}
        primaryColor={stationConfig.primaryColor}
      />

      {/* Barra de ações rápidas */}
      <div className="min-h-14 h-auto py-2 bg-muted/30 border-b border-border flex flex-wrap items-center gap-3 px-3 sm:px-6 overflow-x-auto">
        <Button
          size="lg"
          className="h-12 px-6 text-base text-white"
          style={{ backgroundColor: stationConfig.primaryColor }}
          onClick={() => setShowProductSearch(true)}
        >
          <Search className="h-5 w-5 mr-2" />
          Buscar Produto
          <kbd className="ml-3 px-2 py-1 bg-white/20 rounded text-xs">F1</kbd>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 px-6 text-base"
          onClick={() => setShowComandaSearch(true)}
        >
          <Tag className="h-5 w-5 mr-2" />
          {linkedComanda ? `Comanda #${linkedComanda.command_number}` : 'Buscar Comanda'}
          <kbd className="ml-3 px-2 py-1 bg-muted rounded text-xs">F2</kbd>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 px-6 text-base"
          onClick={() => setShowMergeComandas(true)}
        >
          <Merge className="h-5 w-5 mr-2" />
          Juntar
          <kbd className="ml-3 px-2 py-1 bg-muted rounded text-xs">F3</kbd>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 px-6 text-base border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
          onClick={() => setShowCreditSearch(true)}
        >
          <Wallet className="h-5 w-5 mr-2" />
          Fiado
          <kbd className="ml-3 px-2 py-1 bg-muted rounded text-xs">F4</kbd>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 px-4 text-base"
          onClick={() => setShowSaleSearch(true)}
        >
          <History className="h-5 w-5 mr-2" />
          Vendas
          <kbd className="ml-3 px-2 py-1 bg-muted rounded text-xs">F5</kbd>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 px-4 text-base border-rose-500/50 text-rose-600 hover:bg-rose-500/10"
          onClick={() => setShowSaleReverse(true)}
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Estorno
          <kbd className="ml-3 px-2 py-1 bg-muted rounded text-xs">F6</kbd>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 px-4 text-base"
          onClick={() => setShowSaleReprint(true)}
        >
          <Printer className="h-5 w-5 mr-2" />
          Reimprimir
          <kbd className="ml-3 px-2 py-1 bg-muted rounded text-xs">F7</kbd>
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="h-12 px-6 text-base text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
          onClick={cancelSale}
          disabled={!cartItems.length && !linkedComanda}
        >
          <XCircle className="h-5 w-5 mr-2" />
          Cancelar
        </Button>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Área central - Carrinho */}
        <div className="flex-1 flex flex-col">
          <PDVCart
            items={cartItems}
            linkedComanda={linkedComanda}
            onUpdateQty={updateCartItemQty}
            onRemove={removeFromCart}
            onDeleteComandaItem={(itemId, reason) => 
              deleteComandaItem.mutate({ itemId, reason })
            }
            onUpdateItemDiscount={updateItemDiscount}
          />
        </div>

        {/* Coluna direita - Pagamento */}
        <div className="w-[360px] border-l border-border bg-card">
          <PDVPaymentPanel
            cartSubtotal={cartSubtotal}
            cartTotal={cartTotal}
            paidTotal={paidTotal}
            remainingBalance={remainingBalance}
            payments={payments}
            adjustments={adjustments}
            serviceFeeValue={serviceFeeValue}
            customer={saleCustomer}
            onAddPayment={addPayment}
            onRemovePayment={removePayment}
            onUpdateAdjustments={updateAdjustments}
            onFinalize={(type) => {
              // Pass the finalize type to the mutation
              finalizeSale.mutate({ finalizeType: type } as any, {
                onSuccess: (data: any) => {
                  // Mostrar modal de sucesso após finalizar
                  setLastSaleData({
                    orderId: data?.orderId,
                    total: cartTotal,
                    paymentMethod: payments.length > 0 ? payments.map(p => p.method).join(', ') : undefined,
                  });
                  setShowSaleSuccess(true);
                },
              });
            }}
            onCancel={cancelSale}
            onRequestCustomer={() => setShowCustomerForm(true)}
            isLoading={finalizeSale.isPending}
          />
        </div>
      </div>

      {/* Overlay de busca de produtos */}
      <PDVProductSearch
        onAddProduct={handleAddProduct}
        showSearch={showProductSearch}
        onToggleSearch={setShowProductSearch}
      />

      {/* Modais */}
      <ComandaSearchModal
        open={showComandaSearch}
        onOpenChange={setShowComandaSearch}
        comandas={openComandas}
        onSelect={handleSelectComanda}
        title={cartItems.length > 0 ? 'Vincular Comanda' : 'Buscar Comanda'}
      />

      <MergeComandasModal
        open={showMergeComandas}
        onOpenChange={setShowMergeComandas}
        comandas={openComandas}
        onMerge={handleMergeComandas}
        isLoading={mergeComandasMutation.isPending}
      />

      {/* Modais de Fiado */}
      <PDVCreditSearchModal
        open={showCreditSearch}
        onOpenChange={setShowCreditSearch}
        onSelect={(customer) => {
          setSelectedCreditCustomer(customer);
          setShowCreditSearch(false);
          setShowReceiveCredit(true);
        }}
      />

      <PDVReceiveCreditModal
        open={showReceiveCredit}
        onOpenChange={setShowReceiveCredit}
        customer={selectedCreditCustomer}
        onSuccess={() => {
          // Mantém o modal aberto para continuar recebendo se necessário
        }}
      />

      {/* Modal de configuração da estação */}
      <PDVStationConfig
        open={showStationConfig}
        onOpenChange={(open) => {
          setShowStationConfig(open);
          if (!open) {
            setStationConfig(loadStationConfig());
          }
        }}
      />

      {/* Modais de Vendas */}
      <PDVSaleSearch
        open={showSaleSearch}
        onOpenChange={setShowSaleSearch}
      />

      <PDVSaleReverse
        open={showSaleReverse}
        onOpenChange={setShowSaleReverse}
      />

      <PDVSaleReprint
        open={showSaleReprint}
        onOpenChange={setShowSaleReprint}
      />

      {/* Modal de Sucesso da Venda */}
      <PDVSaleSuccessModal
        open={showSaleSuccess}
        onOpenChange={setShowSaleSuccess}
        saleData={lastSaleData || undefined}
        onPrintReceipt={async () => {
          if (!lastSaleData?.orderId || !company?.id) return;
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { toast } = await import('sonner');
            const { error } = await supabase.from('print_job_queue').insert({
              company_id: company.id,
              order_id: lastSaleData.orderId,
              job_type: 'full_order',
              source: 'pdv_comprovante',
              status: 'pending',
              metadata: { type: 'client_receipt' },
            });
            if (error) throw error;
            toast.success('Comprovante enviado para impressão');
          } catch (err) {
            const { toast } = await import('sonner');
            toast.error('Erro ao imprimir comprovante');
          }
        }}
        onPrintFiscal={async () => {
          if (!lastSaleData?.orderId) return;
          const { toast } = await import('sonner');
          toast.info('Cupom fiscal em desenvolvimento');
        }}
        onNewSale={() => {
          setShowSaleSuccess(false);
          setLastSaleData(null);
          cancelSale();
        }}
      />

      {/* Modal de Opcionais do Produto */}
      {pendingProduct && (
        <ProductOptionalsDialog
          open={showOptionalsDialog}
          onOpenChange={(open) => {
            setShowOptionalsDialog(open);
            if (!open) setPendingProduct(null);
          }}
          product={{
            id: pendingProduct.id,
            name: pendingProduct.name,
            price: pendingProduct.is_on_sale && pendingProduct.sale_price 
              ? pendingProduct.sale_price 
              : pendingProduct.price,
          }}
          onConfirm={handleConfirmOptionals}
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
          companyId={company?.id}
          productId={pizzaProduct.id}
          productName={pizzaProduct.name}
          onConfirm={handlePizzaConfirm}
        />
      )}
    </div>
  );
}
