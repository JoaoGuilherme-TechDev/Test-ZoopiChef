import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Users, 
  Phone, 
  MoreVertical, 
  Check, 
  X, 
  Edit, 
  Trash2,
  UserX,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { Reservation } from '@/hooks/useReservations';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ReservationCardProps {
  reservation: Reservation;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: (reason?: string) => void;
  onNoShow: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function ReservationCard({
  reservation,
  onEdit,
  onConfirm,
  onCancel,
  onNoShow,
  onComplete,
  onDelete,
}: ReservationCardProps) {
  const [cancelReason, setCancelReason] = useState('');

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { label: 'Pendente', variant: 'secondary', className: 'bg-yellow-500/10 border-yellow-500/50' },
      confirmed: { label: 'Confirmada', variant: 'default', className: 'bg-green-500/10 border-green-500/50' },
      completed: { label: 'Concluída', variant: 'outline', className: 'bg-blue-500/10 border-blue-500/50' },
      cancelled: { label: 'Cancelada', variant: 'destructive', className: 'bg-red-500/10 border-red-500/50 opacity-60' },
      no_show: { label: 'Não compareceu', variant: 'destructive', className: 'bg-orange-500/10 border-orange-500/50 opacity-60' },
    };
    return config[status] || { label: status, variant: 'secondary', className: '' };
  };

  const statusConfig = getStatusConfig(reservation.status);
  const isActionable = reservation.status === 'pending' || reservation.status === 'confirmed';

  return (
    <Card className={cn('border-2 transition-all', statusConfig.className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Time and Info */}
          <div className="flex gap-4">
            {/* Time Badge */}
            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2 min-w-[70px]">
              <Clock className="h-4 w-4 text-primary mb-1" />
              <span className="text-lg font-bold">{reservation.reservation_time.slice(0, 5)}</span>
            </div>

            {/* Details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{reservation.customer_name}</h3>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {reservation.party_size} pessoas
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {reservation.customer_phone}
                </span>
                {reservation.table && (
                  <span className="font-medium text-foreground">
                    Mesa {reservation.table.number}
                  </span>
                )}
              </div>

              {reservation.special_requests && (
                <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="italic">{reservation.special_requests}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Actions for pending/confirmed */}
            {reservation.status === 'pending' && (
              <Button size="sm" onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-1" />
                Confirmar
              </Button>
            )}

            {reservation.status === 'confirmed' && (
              <Button size="sm" onClick={onComplete} variant="outline">
                <CheckCircle className="h-4 w-4 mr-1" />
                Concluir
              </Button>
            )}

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>

                {reservation.status === 'pending' && (
                  <DropdownMenuItem onClick={onConfirm}>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar
                  </DropdownMenuItem>
                )}

                {reservation.status === 'confirmed' && (
                  <>
                    <DropdownMenuItem onClick={onComplete}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como concluída
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onNoShow} className="text-orange-600">
                      <UserX className="h-4 w-4 mr-2" />
                      Não compareceu
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                {isActionable && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar reserva
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A reserva de {reservation.customer_name} será cancelada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Label htmlFor="cancel-reason">Motivo do cancelamento (opcional)</Label>
                        <Input
                          id="cancel-reason"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Ex: Cliente solicitou cancelamento"
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onCancel(cancelReason)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Cancelar Reserva
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Reserva</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A reserva será permanentemente removida do sistema.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={onDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
