import { useState } from 'react';
import { Phone, User, Loader2, CheckCircle2, Wheat, Milk, ChevronDown, AlertTriangle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  usePublicCustomerIdentification, 
  COMMON_DIETARY_RESTRICTIONS,
  type IdentifiedCustomer 
} from '@/hooks/usePublicCustomerIdentification';
import { DietaryAlertBanner } from './DietaryAlertBanner';
interface CustomerIdentificationScreenProps {
  companyId: string;
  companyName?: string;
  logoUrl?: string | null;
  title?: string;
  subtitle?: string;
  onContinue: (customer: IdentifiedCustomer | { phone: string; name: string }) => void;
  showDietarySection?: boolean;
  primaryColor?: string;
  className?: string;
}

export function CustomerIdentificationScreen({
  companyId,
  companyName,
  logoUrl,
  title = 'Identificação',
  subtitle = 'Para uma experiência personalizada, informe seus dados',
  onContinue,
  showDietarySection = true,
  primaryColor,
  className,
}: CustomerIdentificationScreenProps) {
  const [dietaryOpen, setDietaryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    phone,
    name,
    customer,
    isSearching,
    isNewCustomer,
    isSaving,
    hasGlutenIntolerance,
    hasLactoseIntolerance,
    dietaryRestrictions,
    allergyNotes,
    hasDietaryRestrictions,
    setPhone,
    setName,
    handlePhoneBlur,
    setHasGlutenIntolerance,
    setHasLactoseIntolerance,
    toggleDietaryRestriction,
    setAllergyNotes,
    saveDietaryInfo,
  } = usePublicCustomerIdentification({ companyId });

  const normalizedPhone = phone.replace(/\D/g, '');
  const isPhoneValid = normalizedPhone.length >= 10;
  const isNameValid = name.trim().length >= 2;
  const canContinue = isPhoneValid && isNameValid;

  const handleContinue = async () => {
    if (!canContinue) return;
    
    setErrorMessage(null);

    // Save dietary info if new customer or info changed
    const success = await saveDietaryInfo();
    if (!success) {
      setErrorMessage('Erro ao salvar dados. Por favor, tente novamente.');
      return;
    }

    if (customer) {
      onContinue(customer);
    } else {
      onContinue({ phone: normalizedPhone, name: name.trim() });
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30',
        className
      )}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-16 mx-auto" />
          ) : companyName ? (
            <h2 className="text-lg font-medium text-muted-foreground">{companyName}</h2>
          ) : null}

          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl shadow-lg border p-6 space-y-5">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Telefone / WhatsApp
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={formatPhone(phone)}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                className="pr-10"
                autoComplete="tel"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {customer && !isSearching && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!customer}
              className={cn(customer && 'bg-muted')}
              autoComplete="name"
            />
          </div>

          {/* Welcome back message */}
          {customer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-green-700 font-medium">
                🎉 Olá {customer.name}, que bom te ver novamente!
              </p>
            </div>
          )}

          {/* Dietary Restrictions Alert (if already has) */}
          {customer && hasDietaryRestrictions && (
            <DietaryAlertBanner
              hasGlutenIntolerance={hasGlutenIntolerance}
              hasLactoseIntolerance={hasLactoseIntolerance}
              dietaryRestrictions={dietaryRestrictions}
              allergyNotes={allergyNotes}
              variant="compact"
            />
          )}

          {/* Dietary Section */}
          {showDietarySection && (
            <Collapsible open={dietaryOpen} onOpenChange={setDietaryOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      Restrições Alimentares / Alergias
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-amber-600 transition-transform',
                      dietaryOpen && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3 space-y-4">
                {/* Quick toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Checkbox
                      checked={hasGlutenIntolerance}
                      onCheckedChange={(c) => setHasGlutenIntolerance(!!c)}
                    />
                    <Wheat className="w-4 h-4 text-amber-600" />
                    <span className="text-sm">Intolerante a Glúten</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Checkbox
                      checked={hasLactoseIntolerance}
                      onCheckedChange={(c) => setHasLactoseIntolerance(!!c)}
                    />
                    <Milk className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Intolerante a Lactose</span>
                  </label>
                </div>

                {/* Other restrictions */}
                <div>
                  <Label className="text-sm mb-2 block">Outras restrições/alergias:</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_DIETARY_RESTRICTIONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleDietaryRestriction(r.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-colors',
                          dietaryRestrictions.includes(r.id)
                            ? 'bg-red-100 border-red-300 text-red-800'
                            : 'bg-muted border-transparent hover:bg-muted/80'
                        )}
                      >
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="allergy-notes" className="text-sm">
                    Observações adicionais:
                  </Label>
                  <Textarea
                    id="allergy-notes"
                    placeholder="Descreva outras alergias ou restrições..."
                    value={allergyNotes}
                    onChange={(e) => setAllergyNotes(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!canContinue || isSaving}
            className="w-full h-12 text-lg"
            style={primaryColor ? { backgroundColor: primaryColor } : undefined}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-center text-muted-foreground">
          Seus dados são usados apenas para melhorar sua experiência e nunca serão compartilhados.
        </p>
      </div>
    </div>
  );
}
