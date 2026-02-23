import { MultiStageKDSSettings } from '@/components/kds/multistage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function KDSSettingsPage() {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const { settings, updateSettings, isLoading } = useKDSSettings();
  
  const [warnAfterMinutes, setWarnAfterMinutes] = useState(10);
  const [dangerAfterMinutes, setDangerAfterMinutes] = useState(20);

  // Fetch company users for role assignment
  const { data: companyUsers = [] } = useQuery({
    queryKey: ['company-users-for-kds', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', company.id);
      if (error) throw error;
      return data.map(u => ({
        id: u.id,
        name: u.full_name || 'Sem nome',
        email: u.email || '',
      }));
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    if (settings) {
      setWarnAfterMinutes(settings.warn_after_minutes || 10);
      setDangerAfterMinutes(settings.danger_after_minutes || 20);
    }
  }, [settings]);

  const handleSaveTimings = () => {
    updateSettings.mutate({
      warn_after_minutes: warnAfterMinutes,
      danger_after_minutes: dangerAfterMinutes,
    }, {
      onSuccess: () => toast.success('Configurações salvas!'),
      onError: () => toast.error('Erro ao salvar'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/kds')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao KDS
          </Button>
          <h1 className="text-2xl font-bold">Configurações do KDS</h1>
        </div>

        <div className="space-y-6">
          {/* Alert Timings */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Tempo</CardTitle>
              <CardDescription>
                Configure quando os pedidos devem mostrar alertas de atraso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warn-minutes">Alerta Amarelo (minutos)</Label>
                  <Input
                    id="warn-minutes"
                    type="number"
                    min={1}
                    value={warnAfterMinutes}
                    onChange={(e) => setWarnAfterMinutes(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo até mostrar alerta de atenção
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="danger-minutes">Alerta Vermelho (minutos)</Label>
                  <Input
                    id="danger-minutes"
                    type="number"
                    min={1}
                    value={dangerAfterMinutes}
                    onChange={(e) => setDangerAfterMinutes(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo até mostrar alerta crítico
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSaveTimings}
                disabled={updateSettings.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Tempos
              </Button>
            </CardContent>
          </Card>

          {/* Multi-Stage KDS Settings */}
          <MultiStageKDSSettings companyUsers={companyUsers} />
        </div>
      </div>
    </div>
  );
}
