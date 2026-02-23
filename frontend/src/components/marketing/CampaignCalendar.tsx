import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Instagram, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduledPost {
  id: string;
  date: Date;
  channel: 'instagram' | 'whatsapp' | 'both';
  productName: string;
  status: 'scheduled' | 'posted' | 'failed';
}

interface CampaignCalendarProps {
  posts?: ScheduledPost[];
}

export function CampaignCalendar({ posts = [] }: CampaignCalendarProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) => isSameDay(new Date(post.date), day));
  };

  const selectedDayPosts = selectedDate ? getPostsForDay(selectedDate) : [];

  // Mock data for demo
  const mockPosts: ScheduledPost[] = [
    {
      id: '1',
      date: new Date(),
      channel: 'both',
      productName: 'Pizza Margherita',
      status: 'scheduled',
    },
    {
      id: '2',
      date: addMonths(new Date(), 0),
      channel: 'whatsapp',
      productName: 'Combo Família',
      status: 'posted',
    },
  ];

  const allPosts = posts.length > 0 ? posts : mockPosts;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          Calendário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendário de Campanhas
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie suas campanhas agendadas
          </DialogDescription>
        </DialogHeader>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-medium capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before start of month */}
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Days */}
          {days.map((day) => {
            const dayPosts = getPostsForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-colors',
                  'hover:bg-muted',
                  isSelected && 'bg-primary text-primary-foreground',
                  isToday && !isSelected && 'border-2 border-primary',
                  !isSameMonth(day, currentMonth) && 'text-muted-foreground'
                )}
              >
                {day.getDate()}
                {dayPosts.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayPosts.slice(0, 3).map((post, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          post.channel === 'instagram' && 'bg-pink-500',
                          post.channel === 'whatsapp' && 'bg-green-500',
                          post.channel === 'both' && 'bg-purple-500'
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Posts */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h4>
            {selectedDayPosts.length > 0 ? (
              selectedDayPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {post.channel === 'instagram' && (
                      <Instagram className="w-4 h-4 text-pink-500" />
                    )}
                    {post.channel === 'whatsapp' && (
                      <MessageSquare className="w-4 h-4 text-green-500" />
                    )}
                    {post.channel === 'both' && (
                      <div className="flex">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <MessageSquare className="w-4 h-4 text-green-500 -ml-1" />
                      </div>
                    )}
                    <span className="text-sm">{post.productName}</span>
                  </div>
                  <Badge
                    variant={
                      post.status === 'posted'
                        ? 'default'
                        : post.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {post.status === 'scheduled'
                      ? 'Agendado'
                      : post.status === 'posted'
                      ? 'Enviado'
                      : 'Falhou'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma campanha agendada para este dia
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            Instagram
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            WhatsApp
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            Ambos
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
