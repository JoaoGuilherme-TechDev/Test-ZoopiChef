/**
 * CustomerInfoScreen - Collect customer name and phone
 * 
 * Required before payment for ticket printing.
 * Includes virtual keyboard for name and numpad for phone.
 */

import { useState, useRef } from 'react';
import { useKioskState, kioskActions } from '@/stores/kioskStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, User, Phone } from 'lucide-react';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { cn } from '@/lib/utils';

type ActiveInput = 'name' | 'phone' | null;

export function CustomerInfoScreen() {
  const storedName = useKioskState(s => s.customerName);
  const storedPhone = useKioskState(s => s.customerPhone);
  const identifiedCustomer = useKioskState(s => s.identifiedCustomer);
  
  // Pre-fill with identified customer data if available
  const [name, setName] = useState(identifiedCustomer?.name || storedName);
  const [phone, setPhone] = useState(identifiedCustomer?.phone || storedPhone);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [activeInput, setActiveInput] = useState<ActiveInput>('name');

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const validate = () => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Digite seu nome';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Nome muito curto';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) {
      newErrors.phone = 'Digite seu telefone';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceed = () => {
    if (validate()) {
      kioskActions.setCustomerInfo(name.trim(), phone);
      kioskActions.setState('PAYMENT');
    }
  };

  const handleBack = () => {
    kioskActions.setState('DINE_MODE');
  };

  // Numeric keypad for phone
  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  const handleNumpadPress = (key: string) => {
    if (key === 'C') {
      setPhone('');
    } else if (key === '⌫') {
      const digits = phone.replace(/\D/g, '');
      setPhone(formatPhone(digits.slice(0, -1)));
    } else {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 11) {
        setPhone(formatPhone(digits + key));
      }
    }
  };

  // Virtual keyboard handlers for name
  const handleNameKeyPress = (key: string) => {
    setName(prev => prev + key);
  };

  const handleNameBackspace = () => {
    setName(prev => prev.slice(0, -1));
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14"
            onClick={handleBack}
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Seus Dados</h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Name field */}
          <div>
            <label className="flex items-center gap-3 text-xl text-gray-300 mb-3">
              <User className="w-6 h-6" />
              Nome
            </label>
            <Input
              type="text"
              value={name}
              readOnly
              onClick={() => setActiveInput('name')}
              placeholder="Toque para digitar seu nome"
              className={cn(
                "h-16 text-2xl bg-gray-800 border-gray-700 text-white cursor-pointer",
                activeInput === 'name' && "ring-2 ring-orange-500 border-orange-500"
              )}
            />
            {errors.name && (
              <p className="text-red-500 text-lg mt-2">{errors.name}</p>
            )}
          </div>

          {/* Virtual keyboard for name */}
          {activeInput === 'name' && (
            <div className="bg-gray-800 rounded-xl p-4">
              <VirtualKeyboard
                onKeyPress={handleNameKeyPress}
                onBackspace={handleNameBackspace}
                onEnter={() => setActiveInput('phone')}
              />
            </div>
          )}

          {/* Phone field */}
          <div>
            <label className="flex items-center gap-3 text-xl text-gray-300 mb-3">
              <Phone className="w-6 h-6" />
              Telefone
            </label>
            <Input
              type="tel"
              value={phone}
              readOnly
              onClick={() => setActiveInput('phone')}
              placeholder="(00) 00000-0000"
              className={cn(
                "h-16 text-2xl bg-gray-800 border-gray-700 text-white text-center cursor-pointer",
                activeInput === 'phone' && "ring-2 ring-orange-500 border-orange-500"
              )}
            />
            {errors.phone && (
              <p className="text-red-500 text-lg mt-2">{errors.phone}</p>
            )}
          </div>

          {/* Numeric keypad for phone */}
          {activeInput === 'phone' && (
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                {numpadKeys.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="h-16 text-2xl font-bold"
                    onClick={() => handleNumpadPress(key)}
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proceed button */}
      <div className="p-6 bg-gray-800 shrink-0">
        <Button
          size="lg"
          className="w-full h-20 text-2xl bg-orange-600 hover:bg-orange-700"
          onClick={handleProceed}
        >
          Continuar para Pagamento
          <ArrowRight className="w-8 h-8 ml-4" />
        </Button>
      </div>
    </div>
  );
}
