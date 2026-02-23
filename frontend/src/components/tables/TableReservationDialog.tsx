import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  Mail,
  FileText,
  Accessibility,
  Baby,
  AlertCircle,
  PartyPopper,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { TableReservation } from '@/hooks/useTableReservations';

const RESERVATION_REASONS: Record<string, string> = {
  confraternizacao: 'Confraternização',
  reuniao: 'Reunião',
  aniversario: 'Aniversário',
  ocasiao_especial: 'Ocasião Especial',
  outro: 'Outro',
};

interface TableReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: TableReservation | null;
  tableNumber: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  canManage?: boolean; // Whether the user can confirm/cancel (cashier only)
}

export function TableReservationDialog({
  open,
  onOpenChange,
  reservation,
  tableNumber,
  onConfirm,
  onCancel,
  canManage = false,
}: TableReservationDialogProps) {
  if (!reservation) return null;

  const resDateTime = parse(
    `${reservation.reservation_date} ${reservation.reservation_time.slice(0, 5)}`,
    'yyyy-MM-dd HH:mm',
    new Date()
  );

  const reasonLabel = reservation.reservation_reason
    ? RESERVATION_REASONS[reservation.reservation_reason] || reservation.reservation_reason
    : null;

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
              {tableNumber}
            </div>
            <div>
              <DialogTitle>Reserva - Mesa {tableNumber}</DialogTitle>
              <DialogDescription>
                Detalhes da reserva
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}
              className={reservation.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}
            >
              {reservation.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
            </Badge>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(resDateTime, "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Horário</p>
                <p className="font-medium">{reservation.reservation_time.slice(0, 5)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Lugares</p>
              <p className="font-medium">{reservation.party_size} pessoas</p>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Responsável</h4>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{reservation.customer_name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${reservation.customer_phone}`}
                className="text-primary hover:underline"
              >
                {formatPhone(reservation.customer_phone)}
              </a>
            </div>

            {reservation.customer_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{reservation.customer_email}</span>
              </div>
            )}

            {reservation.customer_cpf && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">CPF: {reservation.customer_cpf}</span>
              </div>
            )}
          </div>

          {/* Reason */}
          {(reasonLabel || reservation.reservation_reason_other) && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <PartyPopper className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Motivo</p>
                  <p className="font-medium">
                    {reservation.reservation_reason === 'outro'
                      ? reservation.reservation_reason_other
                      : reasonLabel}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Special Needs */}
          {(reservation.needs_wheelchair_access ||
            reservation.needs_disability_access ||
            reservation.needs_baby_chair ||
            reservation.other_needs) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Necessidades Especiais
                </h4>
                <div className="flex flex-wrap gap-2">
                  {reservation.needs_wheelchair_access && (
                    <Badge variant="outline" className="text-xs">
                      <Accessibility className="h-3 w-3 mr-1" />
                      Cadeirante
                    </Badge>
                  )}
                  {reservation.needs_disability_access && (
                    <Badge variant="outline" className="text-xs">
                      <Accessibility className="h-3 w-3 mr-1" />
                      PcD
                    </Badge>
                  )}
                  {reservation.needs_baby_chair && (
                    <Badge variant="outline" className="text-xs">
                      <Baby className="h-3 w-3 mr-1" />
                      Cadeira para bebê
                    </Badge>
                  )}
                </div>
                {reservation.other_needs && (
                  <p className="text-sm text-muted-foreground">
                    Outros: {reservation.other_needs}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {(reservation.notes || reservation.special_requests) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observações
                </h4>
                {reservation.notes && (
                  <p className="text-sm text-muted-foreground">{reservation.notes}</p>
                )}
                {reservation.special_requests && (
                  <p className="text-sm text-muted-foreground">{reservation.special_requests}</p>
                )}
              </div>
            </>
          )}
        </div>

        {canManage && (
          <DialogFooter className="flex gap-2 sm:gap-2">
            {reservation.status === 'pending' && onConfirm && (
              <Button onClick={onConfirm} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Reserva
              </Button>
            )}
            {onCancel && (
              <Button 
                variant="destructive" 
                onClick={onCancel}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Reserva
              </Button>
            )}
          </DialogFooter>
        )}

        {!canManage && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Mesa reservada. Apenas o operador do caixa pode confirmar ou cancelar esta reserva.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
