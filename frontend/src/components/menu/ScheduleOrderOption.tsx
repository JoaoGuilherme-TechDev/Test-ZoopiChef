/**
 * ScheduleOrderOption
 * 
 * A component that allows customers to schedule their order for a future date/time
 * during the checkout process.
 */

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, setHours, setMinutes, isBefore, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, CalendarClock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ScheduleOrderOptionProps {
  isScheduled: boolean;
  setIsScheduled: (value: boolean) => void;
  scheduledDate: Date | undefined;
  setScheduledDate: (date: Date | undefined) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  className?: string;
}

// Generate time slots from 8:00 to 22:00 in 30-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 22; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function ScheduleOrderOption({
  isScheduled,
  setIsScheduled,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  className,
}: ScheduleOrderOptionProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Set default date to tomorrow if scheduling is enabled
  useEffect(() => {
    if (isScheduled && !scheduledDate) {
      setScheduledDate(addDays(new Date(), 1));
      setScheduledTime('12:00');
    }
  }, [isScheduled, scheduledDate, setScheduledDate, setScheduledTime]);

  // Filter available time slots based on selected date
  const availableTimeSlots = useMemo(() => {
    if (!scheduledDate) return TIME_SLOTS;
    
    const now = new Date();
    const minAdvanceHours = 2; // Minimum 2 hours in advance
    
    if (isToday(scheduledDate)) {
      const minTime = addDays(now, 0);
      minTime.setHours(now.getHours() + minAdvanceHours);
      
      return TIME_SLOTS.filter(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = setMinutes(setHours(new Date(), hours), minutes);
        return isBefore(minTime, slotTime);
      });
    }
    
    return TIME_SLOTS;
  }, [scheduledDate]);

  // Ensure selected time is valid when date changes
  useEffect(() => {
    if (scheduledTime && !availableTimeSlots.includes(scheduledTime)) {
      if (availableTimeSlots.length > 0) {
        setScheduledTime(availableTimeSlots[0]);
      }
    }
  }, [availableTimeSlots, scheduledTime, setScheduledTime]);

  // Format the scheduled datetime for display
  const formattedSchedule = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return null;
    
    const dateStr = format(scheduledDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
    return `${dateStr} às ${scheduledTime}`;
  }, [scheduledDate, scheduledTime]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle switch */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <div>
            <Label htmlFor="schedule-order" className="text-sm font-medium cursor-pointer">
              Agendar pedido
            </Label>
            <p className="text-xs text-muted-foreground">
              Receba em uma data/hora específica
            </p>
          </div>
        </div>
        <Switch
          id="schedule-order"
          checked={isScheduled}
          onCheckedChange={setIsScheduled}
        />
      </div>

      {/* Date and time selection */}
      {isScheduled && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Data e Hora de Entrega</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal h-10",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {scheduledDate ? (
                    format(scheduledDate, 'dd/MM/yyyy')
                  ) : (
                    <span>Selecione</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => {
                    setScheduledDate(date);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Time picker */}
            <Select value={scheduledTime} onValueChange={setScheduledTime}>
              <SelectTrigger className="h-10">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Horário" />
              </SelectTrigger>
              <SelectContent>
                {availableTimeSlots.length > 0 ? (
                  availableTimeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum horário disponível hoje
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {formattedSchedule && (
            <div className="text-sm text-center text-muted-foreground bg-background/50 p-2 rounded">
              📅 {formattedSchedule}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
