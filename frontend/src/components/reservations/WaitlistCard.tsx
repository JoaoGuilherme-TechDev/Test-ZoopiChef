import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Phone, Calendar, ArrowRight, X } from 'lucide-react';
import { WaitlistEntry, useWaitlist } from '@/hooks/useReservations';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WaitlistCardProps {
  entry: WaitlistEntry;
}

export function WaitlistCard({ entry }: WaitlistCardProps) {
  const { removeFromWaitlist } = useWaitlist();

  return (
    <Card className="border-2 border-dashed border-muted-foreground/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            {/* Position indicator */}
            <div className="flex flex-col items-center justify-center bg-muted rounded-lg px-3 py-2 min-w-[50px]">
              <Users className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-lg font-bold">{entry.party_size}</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{entry.customer_name}</h3>
                <Badge variant="outline">Lista de Espera</Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(entry.desired_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {entry.desired_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {entry.desired_time.slice(0, 5)}
                    {entry.flexible_time && ' (flexível)'}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {entry.customer_phone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <ArrowRight className="h-4 w-4 mr-1" />
              Converter
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => removeFromWaitlist.mutate(entry.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
