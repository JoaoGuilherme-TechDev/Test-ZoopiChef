import { useState, useEffect } from 'react';
import { Phone, Loader2, AlertTriangle, ChevronDown, ChevronUp, Wheat, Milk } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase-shim';
import { COMMON_DIETARY_RESTRICTIONS } from '@/hooks/usePublicCustomerIdentification';

interface QRIdentificationDialogEnhancedProps {
  open: boolean;
  onIdentify: (name: string, phone: string, dietaryInfo?: {
    has_gluten_intolerance?: boolean;
    has_lactose_intolerance?: boolean;
    dietary_restrictions?: string[];
    allergy_notes?: string;
  }) => Promise<boolean>;
  isLoading?: boolean;
  tableNumber?: number | null;
  comandaNumber?: number | null;
  companyName?: string;
  companyLogo?: string | null;
  companyId?: string;
  showDietarySection?: boolean;
}

export function QRIdentificationDialogEnhanced({
  open,
  onIdentify,
  isLoading = false,
  tableNumber,
  comandaNumber,
  companyName,
  companyLogo,
  companyId,
  showDietarySection = true,
}: QRIdentificationDialogEnhancedProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [dietaryOpen, setDietaryOpen] = useState(false);
  
  // Dietary info state
  const [hasGlutenIntolerance, setHasGlutenIntolerance] = useState(false);
  const [hasLactoseIntolerance, setHasLactoseIntolerance] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergyNotes, setAllergyNotes] = useState('');
  const [existingDietaryInfo, setExistingDietaryInfo] = useState(false);
  
  const [errors, setErrors] = useState<{ phone?: string; name?: string }>({});

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setErrors({});
    
    // Auto-lookup when phone is complete
    const phoneDigits = e.target.value.replace(/\D/g, '');
    if (phoneDigits.length >= 10 && companyId) {
      lookupCustomer(phoneDigits);
    }
  };

  const lookupCustomer = async (phoneDigits: string) => {
    if (!companyId) return;
    
    setIsLookingUp(true);
    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, name, has_gluten_intolerance, has_lactose_intolerance, dietary_restrictions, allergy_notes')
        .eq('company_id', companyId)
        .or(`whatsapp.eq.${phoneDigits},whatsapp.eq.55${phoneDigits}`)
        .maybeSingle();
      
      if (existingCustomer) {
        setName(existingCustomer.name || '');
        setIsExistingCustomer(true);
        
        // Load dietary info
        if (existingCustomer.has_gluten_intolerance) setHasGlutenIntolerance(true);
        if (existingCustomer.has_lactose_intolerance) setHasLactoseIntolerance(true);
        if (existingCustomer.dietary_restrictions) setDietaryRestrictions(existingCustomer.dietary_restrictions);
        if (existingCustomer.allergy_notes) setAllergyNotes(existingCustomer.allergy_notes);
        
        // Check if has existing dietary info
        if (existingCustomer.has_gluten_intolerance || 
            existingCustomer.has_lactose_intolerance || 
            (existingCustomer.dietary_restrictions && existingCustomer.dietary_restrictions.length > 0) ||
            existingCustomer.allergy_notes) {
          setExistingDietaryInfo(true);
        }
      } else {
        setIsExistingCustomer(false);
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const toggleRestriction = (id: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const newErrors: { phone?: string; name?: string } = {};
    const phoneNumbers = phone.replace(/\D/g, '');
    
    if (!phoneNumbers) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.phone = 'Telefone inválido';
    }

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dietaryInfo = showDietarySection ? {
      has_gluten_intolerance: hasGlutenIntolerance,
      has_lactose_intolerance: hasLactoseIntolerance,
      dietary_restrictions: dietaryRestrictions,
      allergy_notes: allergyNotes,
    } : undefined;

    const success = await onIdentify(name.trim(), phone, dietaryInfo);
    if (success) {
      // Reset form
      setPhone('');
      setName('');
      setErrors({});
      setHasGlutenIntolerance(false);
      setHasLactoseIntolerance(false);
      setDietaryRestrictions([]);
      setAllergyNotes('');
      setIsExistingCustomer(false);
      setExistingDietaryInfo(false);
    }
  };

  const locationLabel = tableNumber 
    ? `Mesa ${tableNumber}` 
    : comandaNumber 
      ? `Comanda ${comandaNumber}` 
      : '';

  const loading = isLoading || isLookingUp;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          {companyLogo && (
            <div className="flex justify-center mb-4">
              <img 
                src={companyLogo} 
                alt={companyName || 'Logo'} 
                className="h-16 object-contain"
              />
            </div>
          )}
          <DialogTitle className="text-xl">
            {companyName && <span className="block text-lg text-muted-foreground mb-1">{companyName}</span>}
            Bem-vindo! {locationLabel}
          </DialogTitle>
          <DialogDescription>
            Para fazer seu pedido, informe seus dados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Seu WhatsApp
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              autoComplete="tel"
              disabled={loading}
              className={`text-lg h-12 text-center font-medium ${errors.phone ? 'border-destructive' : ''}`}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Seu Nome</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors({}); }}
              placeholder="Digite seu nome"
              disabled={loading}
              className={`text-lg h-12 ${errors.name ? 'border-destructive' : ''}`}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
            {isExistingCustomer && (
              <p className="text-sm text-primary">✓ Olá de novo! Já te conhecemos.</p>
            )}
          </div>

          {/* Existing Dietary Info Alert */}
          {existingDietaryInfo && (
            <Alert className="border-orange-500/50 bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-sm">
                <strong>Restrições cadastradas:</strong>
                {hasGlutenIntolerance && ' Sem glúten'}
                {hasLactoseIntolerance && ' Sem lactose'}
                {dietaryRestrictions.length > 0 && ` ${dietaryRestrictions.join(', ')}`}
                {allergyNotes && ` - ${allergyNotes}`}
              </AlertDescription>
            </Alert>
          )}

          {/* Dietary Restrictions Section */}
          {showDietarySection && (
            <Collapsible open={dietaryOpen} onOpenChange={setDietaryOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Restrições Alimentares
                  </span>
                  {dietaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4">
                {/* Main intolerances */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setHasGlutenIntolerance(!hasGlutenIntolerance)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      hasGlutenIntolerance ? 'border-orange-500 bg-orange-500/10' : 'border-border'
                    }`}
                  >
                    <Checkbox checked={hasGlutenIntolerance} />
                    <div className="flex items-center gap-2">
                      <Wheat className="h-4 w-4" />
                      <span className="text-sm font-medium">Sem Glúten</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => setHasLactoseIntolerance(!hasLactoseIntolerance)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      hasLactoseIntolerance ? 'border-orange-500 bg-orange-500/10' : 'border-border'
                    }`}
                  >
                    <Checkbox checked={hasLactoseIntolerance} />
                    <div className="flex items-center gap-2">
                      <Milk className="h-4 w-4" />
                      <span className="text-sm font-medium">Sem Lactose</span>
                    </div>
                  </div>
                </div>

                {/* Other restrictions */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Outras restrições</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_DIETARY_RESTRICTIONS.map((restriction) => (
                      <button
                        key={restriction.id}
                        type="button"
                        onClick={() => toggleRestriction(restriction.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          dietaryRestrictions.includes(restriction.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {restriction.icon} {restriction.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allergy notes */}
                <div className="space-y-2">
                  <Label htmlFor="allergy-notes" className="text-sm text-muted-foreground">
                    Alergias ou observações
                  </Label>
                  <Textarea
                    id="allergy-notes"
                    value={allergyNotes}
                    onChange={(e) => setAllergyNotes(e.target.value)}
                    placeholder="Ex: Alergia a camarão, amendoim..."
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              'Começar a Pedir'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
