import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Phone, Users } from 'lucide-react';

interface TableOpenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number;
  tableName?: string | null;
  requireCustomerIdentification: boolean;
  requestPeopleCount: 'none' | 'on_open' | 'on_close';
  onConfirm: (data: {
    customerName?: string;
    customerPhone?: string;
    peopleCount?: number;
  }) => void;
  isLoading?: boolean;
}

export function TableOpenDialog({
  open,
  onOpenChange,
  tableNumber,
  tableName,
  requireCustomerIdentification,
  requestPeopleCount,
  onConfirm,
  isLoading = false,
}: TableOpenDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [peopleCount, setPeopleCount] = useState('');

  const showCustomerFields = requireCustomerIdentification;
  const showPeopleCount = requestPeopleCount === 'on_open';

  const canSubmit = () => {
    if (requireCustomerIdentification && !customerName.trim()) {
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    onConfirm({
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      peopleCount: peopleCount ? parseInt(peopleCount) : undefined,
    });
    // Reset form
    setCustomerName('');
    setCustomerPhone('');
    setPeopleCount('');
  };

  // If no fields required, just confirm immediately
  if (!showCustomerFields && !showPeopleCount) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Mesa {tableNumber}</DialogTitle>
          <DialogDescription>
            {tableName || 'Preencha as informações para abrir a mesa'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showCustomerFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome do Cliente *
                </Label>
                <Input
                  id="customerName"
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone (opcional)
                </Label>
                <Input
                  id="customerPhone"
                  placeholder="(11) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </>
          )}

          {showPeopleCount && (
            <div className="space-y-2">
              <Label htmlFor="peopleCount" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Número de Pessoas
              </Label>
              <Input
                id="peopleCount"
                type="number"
                min="1"
                placeholder="Quantas pessoas?"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir Mesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
