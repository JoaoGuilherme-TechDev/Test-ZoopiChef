import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FREQUENCY_OPTIONS, DAYS_OF_WEEK } from '../types';

interface BackupScheduleConfigProps {
  frequency: string;
  frequencyValue: number;
  scheduledTime: string;
  scheduledDayOfWeek: number;
  scheduledDayOfMonth: number;
  retentionDays: number;
  onFrequencyChange: (value: string) => void;
  onFrequencyValueChange: (value: number) => void;
  onScheduledTimeChange: (value: string) => void;
  onScheduledDayOfWeekChange: (value: number) => void;
  onScheduledDayOfMonthChange: (value: number) => void;
  onRetentionDaysChange: (value: number) => void;
  disabled?: boolean;
}

export function BackupScheduleConfig({
  frequency,
  frequencyValue,
  scheduledTime,
  scheduledDayOfWeek,
  scheduledDayOfMonth,
  retentionDays,
  onFrequencyChange,
  onFrequencyValueChange,
  onScheduledTimeChange,
  onScheduledDayOfWeekChange,
  onScheduledDayOfMonthChange,
  onRetentionDaysChange,
  disabled = false,
}: BackupScheduleConfigProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Agendamento</Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Frequency */}
        <div className="space-y-2">
          <Label>Frequência</Label>
          <Select value={frequency} onValueChange={onFrequencyChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Frequency Value - for hourly */}
        {frequency === 'hourly' && (
          <div className="space-y-2">
            <Label>A cada quantas horas</Label>
            <Select 
              value={String(frequencyValue)} 
              onValueChange={(v) => onFrequencyValueChange(Number(v))}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 6, 8, 12].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} {h === 1 ? 'hora' : 'horas'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Time - for daily, weekly, monthly */}
        {frequency !== 'hourly' && (
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => onScheduledTimeChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Day of week - for weekly */}
        {frequency === 'weekly' && (
          <div className="space-y-2">
            <Label>Dia da Semana</Label>
            <Select 
              value={String(scheduledDayOfWeek)} 
              onValueChange={(v) => onScheduledDayOfWeekChange(Number(v))}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Day of month - for monthly */}
        {frequency === 'monthly' && (
          <div className="space-y-2">
            <Label>Dia do Mês</Label>
            <Select 
              value={String(scheduledDayOfMonth)} 
              onValueChange={(v) => onScheduledDayOfMonthChange(Number(v))}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    Dia {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Retention */}
        <div className="space-y-2">
          <Label>Manter backups por</Label>
          <Select 
            value={String(retentionDays)} 
            onValueChange={(v) => onRetentionDaysChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">180 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
