import { useEffect, useState } from 'react';
import { 
  ShoppingCart, X, MessageSquare, Trash2, Plus, Minus, 
  ChevronRight, ChevronLeft, Truck, Store, Utensils, 
  Check, Loader2, ShoppingBag, MapPin, User, Phone, CreditCard,
  MessageCircle
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from '../../contexts/CartContext'; 
import { formatCurrency, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { DeliveryCompany } from '../../types';

type CheckoutStep = 'cart' | 'receipt_type' | 'address' | 'payment' | 'confirm';
type ReceiptType = 'retirada' | 'entrega' | 'balcao';

export function CartSheet({ isOpen, onOpenChange, company }: { isOpen: boolean, onOpenChange: any, company: DeliveryCompany }) {
  const { items, totalPrice, totalItems, clearCart, updateQuantity, removeItem, updateItemNotes } = useCart();
  
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [receiptType, setReceiptType] = useState<ReceiptType>('entrega');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState<{ id: string; orderNumber: number } | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('16996207284');
  const [customerAddress, setCustomerAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [cep, setCep] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [changeFor, setChangeFor] = useState('');
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  // --- FORMATADORES ---
 const handlePhoneChange = (val: string) => {
  let v = val.replace(/\D/g, "");
  
  // Se o usuário apagar o telefone, podemos resetar a busca
  if (v.length < 11 && customerName !== "") {
     // Opcional: setCustomerName(""); // Descomente se quiser limpar ao apagar
  }

  if (v.length > 11) v = v.substring(0, 11);
  
  // Aplica a máscara (mesmo código anterior)
  let masked = v;
  if (v.length > 10) masked = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  else if (v.length > 6) masked = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  else if (v.length > 2) masked = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  
  setCustomerPhone(masked);
};

useEffect(() => {
  const phoneDigits = customerPhone.replace(/\D/g, "");
  
  // Gatilho: Só dispara se tiver 11 dígitos (Celular completo)
  // E se o passo atual for 'address'
  if (phoneDigits.length === 11 && step === 'address') {
    
    const lookupCustomer = async () => {
      try {
        const { data } = await api.get(`/public/customer-lookup/${phoneDigits}`, {
          params: { company_id: company.id }
        });

        if (data) {
          // Só preenche se houver um nome retornado
          if (data.name) {
            toast.success(`Bem-vindo de volta, ${data.name.split(' ')[0]}!`, {
              description: "Recuperamos seu endereço automaticamente.",
              icon: "⚡",
            });

            // Lógica de preenchimento inteligente:
            // Se o campo estiver vazio, nós preenchemos.
            setCustomerName(prev => prev || data.name);
            setCustomerAddress(prev => prev || data.address);
            setNeighborhood(prev => prev || data.neighborhood);
            setCity(prev => prev || data.city);
            if (data.zip_code) setCep(prev => prev || data.zip_code);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar cliente", error);
      }
    };

    // Debounce de 800ms: espera o usuário "descansar" o dedo após digitar o último número
    const timer = setTimeout(lookupCustomer, 800);
    return () => clearTimeout(timer);
  }
}, [customerPhone, step, company.id]);

  const handleCEPChange = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    setCep(v);
  };

  const toggleNote = (cartItemId: string) => {
    setOpenNotes(prev => ({ ...prev, [cartItemId]: !prev[cartItemId] }));
  };

  const goNext = () => {
    if (step === 'cart') setStep('receipt_type');
    else if (step === 'receipt_type') setStep('address');
    else if (step === 'address') setStep('payment');
    else if (step === 'payment') setStep('confirm');
  };

  const goBack = () => {
    if (step === 'receipt_type') setStep('cart');
    else if (step === 'address') setStep('receipt_type');
    else if (step === 'payment') setStep('address');
    else if (step === 'confirm') setStep('payment');
  };

 

  const handleSendOrder = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        company_id: company.id,
        customer_name: customerName,
        customer_phone: customerPhone.replace(/\D/g, ""),
        receipt_type: receiptType,
        address: receiptType === 'entrega' ? `${customerAddress}, ${neighborhood}, ${city}` : null,
        table_number: tableNumber,
        payment_method: paymentMethod,
        change_for: changeFor,
        items: items.map(i => ({ product_id: i.productId, quantity: i.quantity, options: i.options, notes: i.notes })),
        total: totalPrice
      };

      const { data } = await api.post('/public/orders', payload);
      setOrderCreated({ id: data.id, orderNumber: data.order_number });
      window.open(`https://wa.me/${company.whatsapp.replace(/\D/g, '')}?text=Pedido #${data.order_number}`, '_blank');
      clearCart();
    } catch (error) {
      toast.error("Erro ao finalizar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px] p-0 flex flex-col bg-[#050214] border-l border-white/5 text-white">
        
        <SheetHeader className="p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
            </div>
            <SheetTitle className="text-sm font-black text-white uppercase tracking-tight">
              {step === 'cart' ? 'Carrinho' : step === 'address' ? (receiptType === 'entrega' ? 'Endereço de Entrega' : 'Seus Dados') : 'Pagamento'}
            </SheetTitle>
          </div>
          <div className="flex gap-1 mt-4">
            {['cart', 'receipt_type', 'address', 'payment', 'confirm'].map((s) => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", step === s ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-white/5")} />
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5">
          <div className="py-5 space-y-3">
            
            {step === 'cart' && (
              items.length === 0 ? (
                <div className="py-20 text-center opacity-20 font-black uppercase text-[15px]">Vazio</div>
              ) : (
                items.map((item) => (
                  <div key={item.cartItemId} className="bg-[#0d0b1a] border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="text-[14px] font-black uppercase leading-tight">{item.name}</h4>
                        {item.options?.map((opt: any, idx: number) => (
                          <p key={idx} className="text-[12px] font-bold text-blue-500/80 uppercase">+ {opt.name} {opt.price ? `(+${formatCurrency(opt.price)})` : ''}</p>
                        ))}
                        <p className="text-[12px] font-bold text-white/80">Total: {formatCurrency(item.quantity * item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="h-6 w-6"><Minus className="h-3 w-3"/></button>
                        <span className="text-[12px] font-black w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="h-6 w-6"><Plus className="h-3 w-3"/></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button onClick={() => toggleNote(item.cartItemId)} className="flex items-center gap-2 text-[12px] font-black text-white/20 uppercase">
                        <MessageSquare className="h-3 w-3" /> {item.notes || "Adicionar Nota"}
                      </button>
                      <button onClick={() => removeItem(item.cartItemId)} className="ml-4 text-red-500/30"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))
              )
            )}

            {step === 'receipt_type' && (
              <div className="grid gap-2">
                {[
                  { id: 'entrega', label: 'Entrega', desc: 'Receber em casa', icon: Truck },
                  { id: 'retirada', label: 'Retirada no local', desc: 'Buscar pessoalmente', icon: Store },
                  { id: 'balcao', label: 'Consumir no local', desc: 'Ficar no estabelecimento', icon: Utensils },
                ].map((t) => (
                  <button key={t.id} onClick={() => setReceiptType(t.id as ReceiptType)} className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all text-left", receiptType === t.id ? "border-blue-600 bg-blue-600/10 shadow-lg" : "border-white/5 bg-[#0d0b1a]")}>
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", receiptType === t.id ? "bg-blue-600 text-white" : "bg-white/5 text-white/20")}> <t.icon className="h-5 w-5" /> </div>
                    <div className='grid p-2'><span className="text-[12px] font-black uppercase">{t.label}</span><span className="text-[9px] text-white/40 uppercase">{t.desc}</span></div>
                    {receiptType === t.id && <Check className="ml-auto h-4 w-4 text-blue-500" />}
                  </button>
                ))}
              </div>
            )}

            {step === 'address' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-500 mb-1">
                  {receiptType === 'entrega' ? <MapPin className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  <span className="text-[11px] font-bold uppercase">{receiptType === 'entrega' ? 'Dados para entrega' : 'Seus Dados'}</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-white/70">Seu nome *</Label>
                  <Input placeholder="Digite seu nome" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-white/70">WhatsApp *</Label>
                  <Input placeholder="Seu celular" value={customerPhone} onChange={e => handlePhoneChange(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" />
                </div>
                {receiptType === 'balcao' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-white/70">Número da mesa (opcional)</Label>
                    <Input placeholder="Ex: 5" value={tableNumber} onChange={e => setTableNumber(e.target.value.replace(/\D/g, ""))} className="bg-[#020414] border-white/5 h-12 rounded-lg" />
                    <p className="text-[9px] text-white/40 uppercase">Informe a mesa onde você vai sentar</p>
                  </div>
                )}
                {receiptType === 'entrega' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-white/70">CEP *</Label>
                      <Input placeholder="00000-000" value={cep} onChange={e => handleCEPChange(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-white/70">Endereço completo *</Label>
                      <Input placeholder="Rua, número, complemento..." value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" />

                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-white/70">Observação do endereço</Label>
                      <Input placeholder="Ex: casa dos fundos..." value={addressNotes} onChange={e => setAddressNotes(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-white/70">Bairro *</Label><Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-white/70">Cidade</Label><Input value={city} onChange={e => setCity(e.target.value)} className="bg-[#020414] border-white/5 h-12 rounded-lg" /></div>
                    </div>
                    <div className="p-3 bg-blue-600/5 border border-blue-600/10 rounded-lg flex justify-between items-center"><span className="text-[10px] font-bold uppercase">Taxa de entrega</span><span className="text-blue-500 font-black">{formatCurrency(5)}</span></div>
                  </>
                )}
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-500 mb-2"><CreditCard className="h-4 w-4" /><span className="text-[11px] font-bold uppercase">Forma de pagamento</span></div>
                <div className="grid gap-2">
                  {[
                    { id: 'pix', label: 'PIX', icon: '💠' },
                    { id: 'dinheiro', label: 'Dinheiro', icon: '💵' },
                    { id: 'cartao_credito', label: 'Cartão de Crédito', icon: '💳' },
                    { id: 'cartao_debito', label: 'Cartão de Débito', icon: '💳' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all text-[11px] font-bold uppercase", paymentMethod === m.id ? "border-blue-600 bg-blue-600/10" : "border-white/5 bg-[#0d0b1a]")}>
                      <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", paymentMethod === m.id ? "border-blue-600" : "border-white/20")}>{paymentMethod === m.id && <div className="h-2 w-2 rounded-full bg-blue-600" />}</div>
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
             {step === 'confirm' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-3">
                  <h3 className="text-[14px] font-black text-white tracking-tight">Resumo do Pedido</h3>
                  <div className="bg-[#0d0b1a] border border-white/5 rounded-xl p-5 space-y-2.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">Tipo:</span><span className="text-white flex items-center gap-1.5"><Truck className="h-3 w-3" /> {receiptType === 'entrega' ? 'Entrega' : receiptType === 'retirada' ? 'Retirada' : 'Na Mesa'}</span></div>
                    <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">Cliente:</span><span className="text-white">{customerName}</span></div>
                    <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">WhatsApp:</span><span className="text-white">{customerPhone}</span></div>
                    {receiptType === 'entrega' && (
                      <><div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">Endereço:</span><span className="text-white">{customerAddress}</span></div>
                      <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">Bairro:</span><span className="text-white">{neighborhood}</span></div>
                      <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">Taxa de entrega:</span><span className="text-blue-500">{formatCurrency(5)}</span></div></>
                    )}
                    <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-white/40">Pagamento:</span><span className="text-white">{paymentMethod.toUpperCase()}</span></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[14px] font-black text-white">Itens ({totalItems})</h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.cartItemId} className="space-y-1">
                        <div className="flex justify-between text-[12px] font-bold uppercase">
                          <span className="text-white">{item.quantity}x {item.name}</span>
                          <span className="text-white">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                        {item.options?.map((opt: any, idx: number) => (
                          <p key={idx} className="text-[10px] text-white/40 font-bold uppercase ml-4">+ {opt.name}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex justify-between text-[13px] font-bold uppercase"><span className="text-white/40">Subtotal</span><span className="text-white">{formatCurrency(totalPrice)}</span></div>
                  {receiptType === 'entrega' && <div className="flex justify-between text-[13px] font-bold uppercase"><span className="text-white/40">Taxa de entrega</span><span className="text-white">{formatCurrency(5)}</span></div>}
                  <div className="flex justify-between items-center text-[18px] font-black pt-1 uppercase">
                    <span className="text-white">Total</span>
                    <span className="text-[#2563eb]">{formatCurrency(totalPrice + (receiptType === 'entrega' ? 5 : 0))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-[#050214] border-t border-white/5">
          {step !== 'confirm' && (
            <div className="flex justify-between items-center mb-5">
              <span className="text-[14px] font-black uppercase text-white tracking-widest">Total</span>
              <span className="text-2xl font-black text-blue-500 tracking-tighter">{formatCurrency(totalPrice + (receiptType === 'entrega' ? 5 : 0))}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => step === 'cart' ? onOpenChange(false) : goBack()} className="h-12 px-6 rounded-xl border border-white/10 text-white font-black uppercase text-[10px] flex items-center justify-center gap-2">
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>
            <button 
              onClick={step === 'confirm' ? handleSendOrder : goNext}
              className="flex-1 h-12 rounded-xl bg-[#2563eb] text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <> {step === 'confirm' ? <><MessageCircle className="h-4 w-4" /> Finalizar Pedido</> : 'Continuar'} {step !== 'confirm' && <ChevronRight className="h-3 w-3" />} </>
              )}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}