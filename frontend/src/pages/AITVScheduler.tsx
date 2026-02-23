import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tv, Calendar, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ScheduleItem {
  id: string;
  product_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  duration_seconds: number;
  priority: number;
  generated_by_ai: boolean;
  ai_reason: string | null;
  active: boolean;
  products?: { name: string };
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function AITVScheduler() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['tv-schedules', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tv_schedules')
        .select('*, products(name)')
        .eq('company_id', profile!.company_id)
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as ScheduleItem[];
    },
    enabled: !!profile?.company_id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-tv-scheduler', {
        body: { companyId: profile!.company_id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(data.result?.message || 'Programação gerada!');
        queryClient.invalidateQueries({ queryKey: ['tv-schedules'] });
      } else {
        toast.error(data.errors?.[0] || 'Erro ao gerar programação');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const aiSchedules = schedules?.filter(s => s.generated_by_ai) || [];
  const manualSchedules = schedules?.filter(s => !s.generated_by_ai) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Agenda de TV por IA</h1>
            <p className="text-muted-foreground">Programação inteligente para exibição na TV</p>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
            Gerar Programação
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            {aiSchedules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tv className="h-5 w-5" />
                    Programação IA ({aiSchedules.length} itens)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.products?.name || 'Produto'}</TableCell>
                          <TableCell>{schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {schedule.days_of_week?.map(d => (
                                <Badge key={d} variant="outline" className="text-xs">{dayNames[d]}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{schedule.duration_seconds}s</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{schedule.ai_reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {schedules?.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma programação. Clique em "Gerar Programação" para criar.
              </CardContent></Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
