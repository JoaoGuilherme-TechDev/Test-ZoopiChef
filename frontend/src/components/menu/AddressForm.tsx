import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Truck, AlertCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DeliveryNeighborhood {
  id: string;
  neighborhood: string;
  fee: number;
}

interface DeliveryConfig {
  mode: 'neighborhood' | 'radius' | 'fixed';
  allow_manual_override?: boolean;
  origin_latitude?: number;
  origin_longitude?: number;
  fallback_fee?: number;
}

interface CustomerData {
  name: string;
  address: string;
  addressNotes: string;
  neighborhood: string;
  city: string;
  cep: string;
  latitude?: number;
  longitude?: number;
}

interface AddressFormProps {
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
  addressNotes: string;
  setAddressNotes: (value: string) => void;
  customerCep: string;
  setCustomerCep: (value: string) => void;
  customerLatitude: number | undefined;
  setCustomerLatitude: (value: number | undefined) => void;
  customerLongitude: number | undefined;
  setCustomerLongitude: (value: number | undefined) => void;
  deliveryConfig: DeliveryConfig | null;
  neighborhoods: DeliveryNeighborhood[];
  effectiveDeliveryFee: number;
  deliveryDistance: number | null;
  isServiced: boolean;
  deliveryMessage: string;
  formatCurrency: (value: number) => string;
}

export function AddressForm({
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
  addressNotes,
  setAddressNotes,
  customerCep,
  setCustomerCep,
  customerLatitude,
  setCustomerLatitude,
  customerLongitude,
  setCustomerLongitude,
  deliveryConfig,
  neighborhoods,
  effectiveDeliveryFee,
  deliveryDistance,
  isServiced,
  deliveryMessage,
  formatCurrency,
}: AddressFormProps) {
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

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

  // Fetch address from CEP
  const handleCepBlur = useCallback(async () => {
    const cleanCep = customerCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setCustomerAddress(data.logradouro || '');
        setCustomerNeighborhood(data.bairro || '');
        setCustomerCity(data.localidade || '');
        
        // Try to geocode the address
        if (data.logradouro && data.localidade) {
          try {
            const geocodeResponse = await supabase.functions.invoke('geocode-address', {
              body: {
                address: data.logradouro,
                city: data.localidade,
                state: data.uf,
                cep: cleanCep,
              },
            });
            
            if (geocodeResponse.data?.latitude && geocodeResponse.data?.longitude) {
              setCustomerLatitude(geocodeResponse.data.latitude);
              setCustomerLongitude(geocodeResponse.data.longitude);
            }
          } catch (geoError) {
            console.warn('Geocoding failed:', geoError);
          }
        }
        
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
  }, [customerCep, setCustomerAddress, setCustomerNeighborhood, setCustomerCity, setCustomerLatitude, setCustomerLongitude]);

  // Fetch customer data from phone
  const handlePhoneBlur = useCallback(async () => {
    if (!companyId) return;
    
    const cleanPhone = customerPhoneInput.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;

    setIsLoadingCustomer(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('company_id', companyId)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (customer) {
        setCustomerFound(true);
        if (customer.name && !customerName) setCustomerName(customer.name);
        toast.success('Cliente encontrado!');
      } else {
        setCustomerFound(false);
      }
    } catch (error) {
      console.error('Customer lookup failed:', error);
    } finally {
      setIsLoadingCustomer(false);
    }
  }, [companyId, customerPhoneInput, customerName, setCustomerName]);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-primary mb-2">
        <MapPin className="h-5 w-5" />
        <span className="font-medium">Dados para entrega</span>
      </div>
      
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
          <p className="text-xs text-green-600">✓ Cliente encontrado - dados preenchidos automaticamente</p>
        )}
      </div>

      {/* CEP */}
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
      
      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="customer-address">Endereço completo *</Label>
        <Input
          id="customer-address"
          placeholder="Rua, número, complemento..."
          value={customerAddress}
          onChange={(e) => setCustomerAddress(e.target.value)}
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-city">Cidade</Label>
            <Input
              id="customer-city"
              placeholder="Sua cidade"
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
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
              {deliveryDistance && deliveryDistance > 0 && (
                <p className="text-xs text-muted-foreground">
                  Distância: {deliveryDistance.toFixed(1)} km
                </p>
              )}
            </div>
          </div>
          <span className="font-bold text-primary">{formatCurrency(effectiveDeliveryFee)}</span>
        </div>
      )}

      {!isServiced && deliveryMessage && (
        <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <p className="text-sm text-destructive">{deliveryMessage}</p>
        </div>
      )}
    </div>
  );
}
