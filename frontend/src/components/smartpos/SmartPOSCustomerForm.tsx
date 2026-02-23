import { useState } from 'react';
import { 
  UserPlus,
  Phone,
  User,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCustomers } from '@/hooks/useCustomers';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface SmartPOSCustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: { id: string; name: string; whatsapp: string }) => void;
}

export function SmartPOSCustomerForm({
  open,
  onOpenChange,
  onSuccess,
}: SmartPOSCustomerFormProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [alerts, setAlerts] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: profile } = useProfile();
  const { createCustomer } = useCustomers();

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatPhone(e.target.value));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }

    if (!whatsapp.trim()) {
      toast.error('Informe o WhatsApp do cliente');
      return;
    }

    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      const result = await createCustomer.mutateAsync({
        name: name.trim(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        company_id: profile.company_id,
      });

      setSuccess(true);
      
      setTimeout(() => {
        if (onSuccess) {
          onSuccess({
            id: result.id,
            name: result.name,
            whatsapp: result.whatsapp,
          });
        }
        handleClose();
      }, 1500);
      
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    setName('');
    setWhatsapp('');
    setAlerts('');
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cyan-500" />
            Cadastrar Cliente
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Preencha os dados do novo cliente
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-xl font-medium text-white">Cliente cadastrado!</p>
            <p className="text-gray-400 mt-2">{name}</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cliente"
                className="bg-gray-800 border-gray-700 text-white"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp *
              </Label>
              <Input
                value={whatsapp}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="bg-gray-800 border-gray-700 text-white"
                inputMode="tel"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Alertas/Observações</Label>
              <Textarea
                value={alerts}
                onChange={(e) => setAlerts(e.target.value)}
                placeholder="Ex: Cliente VIP, alergia a amendoim..."
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
              />
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createCustomer.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {createCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
