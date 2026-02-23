import { useState, useCallback, useEffect } from 'react';
import { MapPin, Truck, AlertCircle, User, Loader2, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DeliveryFeeConfig, DeliveryNeighborhood, DeliveryFeeResult } from '@/hooks/useDeliveryConfig';

interface SavedAddress {
  id: string;
  label: string | null;
  cep: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

interface AddressStepProps {
  companyId?: string;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhoneInput: string;
  setCustomerPhoneInput: (value: string) => void;
  customerAddress: string;
  setCustomerAddress: (value: string) => void;
  customerNeighborhood: string;
  setCustomerNeighborhood: (value: string) => void;
  customerCity: string;
  setCustomerCity: (value: string) => void;
  customerCep: string;
  setCustomerCep: (value: string) => void;
  customerLatitude: number | undefined;
  setCustomerLatitude: (value: number | undefined) => void;
  customerLongitude: number | undefined;
  setCustomerLongitude: (value: number | undefined) => void;
  addressNotes: string;
  setAddressNotes: (value: string) => void;
  deliveryConfig: DeliveryFeeConfig | null;
  neighborhoods: DeliveryNeighborhood[];
  effectiveDeliveryFee: number;
  deliveryFeeResult: DeliveryFeeResult | null;
  canProceedFromAddress: boolean;
  getAddressBlockReason: () => string | null;
  goBack: () => void;
  goNext: () => void;
  formatCurrency: (value: number) => string;
}

export function AddressStep({
  companyId,
  customerName,
  setCustomerName,
  customerPhoneInput,
  setCustomerPhoneInput,
  customerAddress,
  setCustomerAddress,
  customerNeighborhood,
  setCustomerNeighborhood,
  customerCity,
  setCustomerCity,
  customerCep,
  setCustomerCep,
  customerLatitude,
  setCustomerLatitude,
  customerLongitude,
  setCustomerLongitude,
  addressNotes,
  setAddressNotes,
  deliveryConfig,
  neighborhoods,
  effectiveDeliveryFee,
  deliveryFeeResult,
  canProceedFromAddress,
  getAddressBlockReason,
  goBack,
  goNext,
  formatCurrency,
}: AddressStepProps) {
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isNewAddress, setIsNewAddress] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Format CEP input
  const handleCepChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 8) {
      const formatted = cleaned.length > 5 
        ? `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
        : cleaned;
      setCustomerCep(formatted);
    }
  };

  // Geocode address for KM calculation
  const geocodeAddress = useCallback(async (
    street: string,
    city: string,
    state: string,
    cep: string,
    neighborhood: string
  ) => {
    try {
      const { data } = await supabase.functions.invoke('geocode-address', {
        body: {
          action: 'geocode_only',
          address: street,
          city: city,
          state: state,
          cep: cep.replace(/\D/g, ''),
          neighborhood: neighborhood,
        },
      });
      
      if (data?.latitude && data?.longitude) {
        setCustomerLatitude(parseFloat(data.latitude));
        setCustomerLongitude(parseFloat(data.longitude));
        return true;
      }
    } catch (error) {
      console.warn('Geocoding failed:', error);
    }
    return false;
  }, [setCustomerLatitude, setCustomerLongitude]);

  // Fetch address from CEP
  const handleCepBlur = useCallback(async () => {
    const cleanCep = customerCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        const street = data.logradouro || '';
        const neighborhood = data.bairro || '';
        const city = data.localidade || '';
        const state = data.uf || '';
        
        setCustomerAddress(street);
        setCustomerNeighborhood(neighborhood);
        setCustomerCity(city);
        
        // Geocode for KM calculation
        await geocodeAddress(street, city, state, cleanCep, neighborhood);
        
        toast.success('Endereço encontrado!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('CEP lookup failed:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsLoadingCep(false);
    }
  }, [customerCep, setCustomerAddress, setCustomerNeighborhood, setCustomerCity, geocodeAddress]);

  // Fetch customer data and saved addresses
  const handlePhoneBlur = useCallback(async () => {
    if (!companyId) return;
    
    const cleanPhone = customerPhoneInput.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;

    setIsLoadingCustomer(true);
    try {
      // Fetch customer
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (customer) {
        setCustomerFound(true);
        setCustomerId(customer.id);
        if (customer.name && !customerName) {
          setCustomerName(customer.name);
        }

        // Fetch saved addresses
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('company_id', companyId)
          .order('is_default', { ascending: false });

        if (addresses && addresses.length > 0) {
          setSavedAddresses(addresses);
          // Auto-select default address
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            fillAddressFromSaved(defaultAddr);
            setIsNewAddress(false);
          }
          toast.success(`Cliente encontrado com ${addresses.length} endereço(s) salvo(s)!`);
        } else {
          toast.success('Cliente encontrado!');
        }
      } else {
        setCustomerFound(false);
        setCustomerId(null);
        setSavedAddresses([]);
        setIsNewAddress(true);
      }
    } catch (error) {
      console.error('Customer lookup failed:', error);
    } finally {
      setIsLoadingCustomer(false);
    }
  }, [companyId, customerPhoneInput, customerName, setCustomerName]);

  // Fill form from saved address
  const fillAddressFromSaved = useCallback((addr: SavedAddress) => {
    const fullAddress = [addr.street, addr.number, addr.complement].filter(Boolean).join(', ');
    setCustomerAddress(fullAddress);
    setCustomerNeighborhood(addr.neighborhood);
    setCustomerCity(addr.city);
    setCustomerCep(addr.cep || '');
    setAddressNotes(addr.reference || '');
    
    if (addr.latitude && addr.longitude) {
      setCustomerLatitude(addr.latitude);
      setCustomerLongitude(addr.longitude);
    }
  }, [setCustomerAddress, setCustomerNeighborhood, setCustomerCity, setCustomerCep, setAddressNotes, setCustomerLatitude, setCustomerLongitude]);

  // Handle saved address selection
  const handleAddressSelect = useCallback((addressId: string) => {
    if (addressId === 'new') {
      setIsNewAddress(true);
      setSelectedAddressId('');
      setCustomerAddress('');
      setCustomerNeighborhood('');
      setCustomerCity('');
      setCustomerCep('');
      setAddressNotes('');
      setCustomerLatitude(undefined);
      setCustomerLongitude(undefined);
    } else {
      setIsNewAddress(false);
      setSelectedAddressId(addressId);
      const addr = savedAddresses.find(a => a.id === addressId);
      if (addr) {
        fillAddressFromSaved(addr);
      }
    }
  }, [savedAddresses, fillAddressFromSaved, setCustomerAddress, setCustomerNeighborhood, setCustomerCity, setCustomerCep, setAddressNotes, setCustomerLatitude, setCustomerLongitude]);

  // Format phone input
  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 2) {
      formatted = `(${cleaned.slice(0, 2)}`;
      if (cleaned.length > 2) {
        formatted += `) ${cleaned.slice(2, 7)}`;
        if (cleaned.length > 7) {
          formatted += `-${cleaned.slice(7, 11)}`;
        }
      }
    }
    
    setCustomerPhoneInput(formatted);
  };

  // Trigger geocode when address fields change (for manual input)
  useEffect(() => {
    if (isNewAddress && customerAddress && customerNeighborhood && customerCity && !customerLatitude) {
      const timer = setTimeout(() => {
        geocodeAddress(customerAddress, customerCity, '', customerCep, customerNeighborhood);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isNewAddress, customerAddress, customerNeighborhood, customerCity, customerCep, customerLatitude, geocodeAddress]);

  return (
    <>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-2">
          <MapPin className="h-5 w-5" />
          <span className="font-medium">Dados para entrega</span>
        </div>
        
        <div className="space-y-3">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="customer-name">Seu nome *</Label>
            <div className="relative">
              <Input
                id="customer-name"
                placeholder="Digite seu nome"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={cn(customerFound && customerName && "border-green-500")}
              />
              {customerFound && customerName && (
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
          
          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="customer-phone">WhatsApp *</Label>
            <div className="relative">
              <Input
                id="customer-phone"
                placeholder="(00) 00000-0000"
                value={customerPhoneInput}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={handlePhoneBlur}
                className={cn(customerFound && "border-green-500")}
              />
              {isLoadingCustomer && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {customerFound && (
              <p className="text-xs text-green-600">✓ Cliente encontrado</p>
            )}
          </div>

          {/* Saved addresses selector */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Select value={isNewAddress ? 'new' : selectedAddressId} onValueChange={handleAddressSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um endereço" />
                </SelectTrigger>
                <SelectContent>
                  {savedAddresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id}>
                      <div className="flex items-center gap-2">
                        <Home className="h-3 w-3" />
                        <span>{addr.label || addr.street}</span>
                        {addr.is_default && <span className="text-xs text-primary">(Padrão)</span>}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 text-primary">
                      <MapPin className="h-3 w-3" />
                      <span>Novo endereço</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* CEP - only show if new address */}
          {(isNewAddress || savedAddresses.length === 0) && (
            <div className="space-y-2">
              <Label htmlFor="customer-cep">CEP *</Label>
              <div className="relative">
                <Input
                  id="customer-cep"
                  placeholder="00000-000"
                  value={customerCep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={handleCepBlur}
                  maxLength={9}
                />
                {isLoadingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o CEP para preencher automaticamente
              </p>
            </div>
          )}
          
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="customer-address">Endereço completo *</Label>
            <Input
              id="customer-address"
              placeholder="Rua, número, complemento..."
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              disabled={!isNewAddress && savedAddresses.length > 0}
            />
          </div>

          {/* Address notes */}
          <div className="space-y-2">
            <Label htmlFor="address-notes">Observação do endereço</Label>
            <Input
              id="address-notes"
              placeholder="Ex: casa dos fundos, portão azul, sem campainha..."
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
            />
          </div>

          {/* Neighborhood */}
          {deliveryConfig?.mode === 'neighborhood' && neighborhoods.length > 0 ? (
            <div className="space-y-2">
              <Label>Bairro *</Label>
              <Select value={customerNeighborhood} onValueChange={setCustomerNeighborhood}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu bairro" />
                </SelectTrigger>
                <SelectContent>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n.id} value={n.neighborhood}>
                      {n.neighborhood} - {formatCurrency(n.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="customer-neighborhood">Bairro *</Label>
                <Input
                  id="customer-neighborhood"
                  placeholder="Seu bairro"
                  value={customerNeighborhood}
                  onChange={(e) => setCustomerNeighborhood(e.target.value)}
                  disabled={!isNewAddress && savedAddresses.length > 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-city">Cidade</Label>
                <Input
                  id="customer-city"
                  placeholder="Sua cidade"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  disabled={!isNewAddress && savedAddresses.length > 0}
                />
              </div>
            </div>
          )}

          {/* Delivery fee display */}
          {effectiveDeliveryFee > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-sm font-medium">Taxa de entrega</span>
                  {deliveryFeeResult?.distanceKm && deliveryFeeResult.distanceKm > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Distância: {deliveryFeeResult.distanceKm.toFixed(1)} km
                    </p>
                  )}
                </div>
              </div>
              <span className="font-bold text-primary">{formatCurrency(effectiveDeliveryFee)}</span>
            </div>
          )}

          {deliveryFeeResult?.isServiced === false && (
            <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{deliveryFeeResult.message}</p>
            </div>
          )}
        </div>
      </div>
      
      <SheetFooter className="p-4 border-t flex-col gap-2">
        {getAddressBlockReason() && (
          <div className="w-full flex items-center gap-2 text-sm text-destructive justify-center">
            <AlertCircle className="h-4 w-4" />
            <span>{getAddressBlockReason()}</span>
          </div>
        )}
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={goBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button className="flex-1" onClick={goNext} disabled={!canProceedFromAddress}>
            Continuar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
