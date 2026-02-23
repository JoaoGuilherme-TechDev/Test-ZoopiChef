import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { useReservations, useReservationSettings, useAvailableSlots, Reservation } from '@/hooks/useReservations';
import { useTables } from '@/hooks/useTables';
import { useCustomerPhoneField } from '@/hooks/useCustomerLookup';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation | null;
  selectedDate?: Date;
}

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  selectedDate = new Date(),
}: ReservationDialogProps) {
  const { createReservation, updateReservation } = useReservations();
  const { settings } = useReservationSettings();
  const { tables } = useTables();

  const [date, setDate] = useState<Date>(selectedDate);
  const [formData, setFormData] = useState({
    customer_id: null as string | null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_time: '',
    table_id: '',
    duration_minutes: 120,
    notes: '',
    special_requests: '',
  });

  // Track manual edits so we don't override what the operator typed.
  const [touched, setTouched] = useState({
    customer_name: false,
    customer_email: false,
  });

  const { slots, isLoading: slotsLoading } = useAvailableSlots(date);

  const lookup = useCustomerPhoneField({
    minDigits: 8,
    onFillForm: (customer) => {
      setFormData((prev) => ({
        ...prev,
        customer_id: customer.id,
        customer_name: touched.customer_name ? prev.customer_name : customer.name,
        customer_email: touched.customer_email ? prev.customer_email : (customer.email ?? prev.customer_email),
      }));
    },
  });

  const lookupHint = useMemo(() => {
    if (!formData.customer_phone) return null;
    const digits = lookup.normalizePhone(formData.customer_phone);
    if (digits.length < 8) return 'Digite ao menos 8 dígitos para buscar.';
    if (lookup.isSearching) return 'Buscando cliente...';
    if (lookup.customer) return `Cliente: ${lookup.customer.name}`;
    return 'Cliente não encontrado.';
  }, [formData.customer_phone, lookup.customer, lookup.isSearching, lookup.normalizePhone]);

  // Reset form when dialog opens - lookup.reset excluded from deps to prevent infinite loop
  useEffect(() => {
    if (open) {
      setTouched({ customer_name: false, customer_email: false });

      if (reservation) {
        setDate(new Date(reservation.reservation_date));
        setFormData({
          customer_id: reservation.customer_id,
          customer_name: reservation.customer_name,
          customer_phone: reservation.customer_phone,
          customer_email: reservation.customer_email || '',
          party_size: reservation.party_size,
          reservation_time: reservation.reservation_time.slice(0, 5),
          table_id: reservation.table_id || '',
          duration_minutes: reservation.duration_minutes,
          notes: reservation.notes || '',
          special_requests: reservation.special_requests || '',
        });
      } else {
        setDate(selectedDate);
        setFormData({
          customer_id: null,
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          party_size: 2,
          reservation_time: '',
          table_id: '',
          duration_minutes: settings?.default_duration_minutes || 120,
          notes: '',
          special_requests: '',
        });
      }

      lookup.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation, selectedDate, settings?.default_duration_minutes]);

  const handleSubmit = async () => {
    if (!formData.customer_phone || !formData.customer_name || !formData.reservation_time) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const status: 'pending' | 'confirmed' = settings?.auto_confirm ? 'confirmed' : 'pending';

    const data = {
      customer_id: formData.customer_id,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      customer_email: formData.customer_email || null,
      party_size: formData.party_size,
      reservation_date: format(date, 'yyyy-MM-dd'),
      reservation_time: formData.reservation_time,
      table_id: formData.table_id || null,
      duration_minutes: formData.duration_minutes,
      notes: formData.notes || null,
      special_requests: formData.special_requests || null,
      status,
      confirmed_at: settings?.auto_confirm ? new Date().toISOString() : null,
      confirmed_via: settings?.auto_confirm ? 'system' : null,
      confirmation_token: null,
      cancelled_at: null,
      cancel_reason: null,
    };

    try {
      if (reservation) {
        await updateReservation.mutateAsync({ id: reservation.id, ...data });
      } else {
        await createReservation.mutateAsync(data as any);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving reservation:', error);
    }
  };

  const availableTables = tables?.filter(t => t.status === 'available' || t.id === formData.table_id) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reservation ? 'Editar Reserva' : 'Nova Reserva'}
          </DialogTitle>
          <DialogDescription>
            {reservation 
              ? 'Atualize os dados da reserva abaixo'
              : 'Preencha os dados para criar uma nova reserva'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="customer_phone">Telefone/WhatsApp *</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((p) => ({ ...p, customer_phone: v, customer_id: null }));
                  lookup.handlePhoneChange(v);
                }}
                onBlur={() => lookup.handlePhoneBlur(formData.customer_phone)}
                placeholder="(00) 00000-0000"
              />
              {lookupHint && (
                <p className="mt-1 text-xs text-muted-foreground">{lookupHint}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="customer_name">Nome do Cliente *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => {
                  setTouched((t) => ({ ...t, customer_name: true }));
                  setFormData({ ...formData, customer_name: e.target.value });
                }}
                placeholder="Nome completo"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="customer_email">E-mail</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => {
                  setTouched((t) => ({ ...t, customer_email: true }));
                  setFormData({ ...formData, customer_email: e.target.value });
                }}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    locale={ptBR}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Horário *</Label>
              <Select
                value={formData.reservation_time}
                onValueChange={(v) => setFormData({ ...formData, reservation_time: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione">
                    {formData.reservation_time && (
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formData.reservation_time}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-[200px]">
                  {slotsLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Sem horários disponíveis
                    </div>
                  ) : (
                    slots.map((slot) => (
                      <SelectItem 
                        key={slot.time} 
                        value={slot.time}
                        disabled={!slot.available}
                      >
                        <span className="flex items-center gap-2">
                          {slot.time}
                          {!slot.available && (
                            <Badge variant="outline" className="text-xs">
                              {slot.reason}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party Size and Table */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="party_size">Nº de Pessoas *</Label>
              <Select
                value={formData.party_size.toString()}
                onValueChange={(v) => setFormData({ ...formData, party_size: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Array.from({ length: settings?.max_party_size || 20 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? 'pessoa' : 'pessoas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mesa (opcional)</Label>
              <Select
                value={formData.table_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, table_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Sem mesa definida</SelectItem>
                  {availableTables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Mesa {table.number} {table.name && `- ${table.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label>Duração</Label>
            <Select
              value={formData.duration_minutes.toString()}
              onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h 30min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="150">2h 30min</SelectItem>
                <SelectItem value="180">3 horas</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Special Requests */}
          <div>
            <Label htmlFor="special_requests">Pedidos Especiais</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              placeholder="Ex: Mesa perto da janela, cadeirinha para bebê..."
              rows={2}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações Internas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas internas (não visíveis ao cliente)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createReservation.isPending || updateReservation.isPending}
          >
            {(createReservation.isPending || updateReservation.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {reservation ? 'Salvar' : 'Criar Reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
