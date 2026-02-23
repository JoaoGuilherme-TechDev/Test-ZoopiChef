import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TabletRodizioMenu } from '@/components/tablet/TabletRodizioMenu';
import type { RodizioSession } from '@/hooks/useRodizio';

interface ComandaRodizioMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  comandaId: string;
  comandaNumber: number;
  comandaName?: string | null;
  rodizioSession: RodizioSession;
}

/**
 * Dialog de lançamento de itens do Rodízio na Comanda (módulo Operador/PDV).
 * Reaproveita o mesmo componente do módulo Mesa/Tablet para manter paridade.
 */
export function ComandaRodizioMenuDialog({
  open,
  onOpenChange,
  companyId,
  comandaId,
  comandaNumber,
  comandaName,
  rodizioSession,
}: ComandaRodizioMenuDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle>Itens do Rodízio</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TabletRodizioMenu
            rodizioSessionId={rodizioSession.id}
            rodizioTypeId={rodizioSession.rodizio_type_id}
            rodizioTypeName={(rodizioSession as any).rodizio_types?.name || 'Rodízio'}
            companyId={companyId}
            mode="comanda"
            comandaId={comandaId}
            comandaNumber={comandaNumber}
            comandaName={comandaName ?? null}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
