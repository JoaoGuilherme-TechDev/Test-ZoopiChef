import { useState } from 'react';
import { Bell, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRBillDialog } from './QRBillDialog';

interface QRActionButtonsProps {
  onCallWaiter: () => Promise<boolean>;
  onRequestBill: (paymentPreference?: 'pix' | 'other') => Promise<boolean>;
  customerName: string;
  tableNumber?: number | null;
  comandaNumber?: number | null;
  companyId?: string | null;
  tableId?: string | null;
  pixKey?: string | null;
  companyName?: string;
}

export function QRActionButtons({
  onCallWaiter,
  onRequestBill,
  customerName,
  tableNumber,
  comandaNumber,
  companyId,
  tableId,
  pixKey,
  companyName,
}: QRActionButtonsProps) {
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [showBillDialog, setShowBillDialog] = useState(false);

  const handleCallWaiter = async () => {
    setIsCallingWaiter(true);
    await onCallWaiter();
    setIsCallingWaiter(false);
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="shadow-lg rounded-full h-12 px-4 gap-2"
          onClick={handleCallWaiter}
          disabled={isCallingWaiter}
        >
          {isCallingWaiter ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Chamar Garçom
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="shadow-lg rounded-full h-12 px-4 gap-2 bg-background"
          onClick={() => setShowBillDialog(true)}
        >
          <Receipt className="h-4 w-4" />
          Ver Conta
        </Button>
      </div>

      <QRBillDialog
        open={showBillDialog}
        onOpenChange={setShowBillDialog}
        companyId={companyId || null}
        tableId={tableId}
        tableNumber={tableNumber}
        comandaNumber={comandaNumber}
        customerName={customerName}
        onRequestBill={onRequestBill}
        pixKey={pixKey}
        companyName={companyName}
      />
    </>
  );
}
