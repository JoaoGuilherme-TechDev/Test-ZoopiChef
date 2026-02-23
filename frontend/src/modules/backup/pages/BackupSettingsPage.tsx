import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Play, Database, History } from 'lucide-react';
import { toast } from 'sonner';
import { BackupModuleSelector } from '../components/BackupModuleSelector';
import { BackupScheduleConfig } from '../components/BackupScheduleConfig';
import { BackupDestinations } from '../components/BackupDestinations';
import { BackupLogsList } from '../components/BackupLogsList';
import { 
  useBackupConfig, 
  useUpsertBackupConfig,
  useBackupLogs,
  useTriggerManualBackup,
} from '../hooks';
import { BACKUP_MODULES } from '../types';
import type { BackupConfig, GoogleDriveTokens } from '../types';

export function BackupSettingsPage() {
  const { data: config, isLoading: loadingConfig } = useBackupConfig();
  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = useBackupLogs(20);
  const upsertConfig = useUpsertBackupConfig();
  const triggerBackup = useTriggerManualBackup();

  const [formData, setFormData] = useState<Partial<BackupConfig>>({
    is_enabled: false,
    frequency: 'daily',
    frequency_value: 1,
    scheduled_time: '03:00',
    scheduled_day_of_week: 1,
    scheduled_day_of_month: 1,
    retention_days: 30,
    include_products: true,
    include_categories: true,
    include_customers: true,
    include_orders: true,
    include_financial: true,
    include_inventory: true,
    include_settings: true,
    include_reports: true,
    include_users: true,
    save_to_google_drive: false,
    google_drive_folder_id: null,
    google_drive_tokens: null,
    save_to_local: true,
    local_path: null,
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleModuleChange = (moduleId: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [moduleId]: checked }));
  };

  const handleSave = async () => {
    await upsertConfig.mutateAsync(formData);
  };

  const handleManualBackup = async () => {
    const selectedModules = BACKUP_MODULES
      .filter(m => formData[`include_${m.id}` as keyof typeof formData] !== false)
      .map(m => m.id);
    
    if (selectedModules.length === 0) {
      toast.error('Selecione pelo menos um módulo para backup');
      return;
    }
    
    await triggerBackup.mutateAsync(selectedModules);
  };

  const handleDownload = (log: any) => {
    if (log.file_url) {
      window.open(log.file_url, '_blank');
    }
  };

  const handleGoogleDriveConnect = (tokens: GoogleDriveTokens) => {
    setFormData(prev => ({ ...prev, google_drive_tokens: tokens }));
  };

  const handleGoogleDriveDisconnect = () => {
    setFormData(prev => ({ 
      ...prev, 
      google_drive_tokens: null,
      save_to_google_drive: false,
    }));
  };

  if (loadingConfig) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Backup Automático</h1>
            <p className="text-muted-foreground">
              Configure backups automáticos dos dados da sua empresa
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleManualBackup}
              disabled={triggerBackup.isPending}
            >
              {triggerBackup.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Backup Agora
            </Button>
            <Button onClick={handleSave} disabled={upsertConfig.isPending}>
              {upsertConfig.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config" className="gap-2">
              <Database className="h-4 w-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            {/* Enable/Disable */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Backup Automático</CardTitle>
                    <CardDescription>
                      Ativar backup automático conforme agendamento
                    </CardDescription>
                  </div>
                  <Switch
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Agendamento</CardTitle>
                <CardDescription>
                  Configure quando os backups devem ser executados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupScheduleConfig
                  frequency={formData.frequency || 'daily'}
                  frequencyValue={formData.frequency_value || 1}
                  scheduledTime={formData.scheduled_time || '03:00'}
                  scheduledDayOfWeek={formData.scheduled_day_of_week || 1}
                  scheduledDayOfMonth={formData.scheduled_day_of_month || 1}
                  retentionDays={formData.retention_days || 30}
                  onFrequencyChange={(v) => setFormData(prev => ({ ...prev, frequency: v as any }))}
                  onFrequencyValueChange={(v) => setFormData(prev => ({ ...prev, frequency_value: v }))}
                  onScheduledTimeChange={(v) => setFormData(prev => ({ ...prev, scheduled_time: v }))}
                  onScheduledDayOfWeekChange={(v) => setFormData(prev => ({ ...prev, scheduled_day_of_week: v }))}
                  onScheduledDayOfMonthChange={(v) => setFormData(prev => ({ ...prev, scheduled_day_of_month: v }))}
                  onRetentionDaysChange={(v) => setFormData(prev => ({ ...prev, retention_days: v }))}
                  disabled={!formData.is_enabled}
                />
              </CardContent>
            </Card>

            {/* Modules */}
            <Card>
              <CardHeader>
                <CardTitle>Módulos</CardTitle>
                <CardDescription>
                  Selecione quais dados devem ser incluídos no backup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupModuleSelector
                  selectedModules={formData as Record<string, boolean>}
                  onModuleChange={handleModuleChange}
                />
              </CardContent>
            </Card>

            {/* Destinations */}
            <Card>
              <CardHeader>
                <CardTitle>Destinos</CardTitle>
                <CardDescription>
                  Escolha onde os backups serão salvos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupDestinations
                  saveToLocal={formData.save_to_local || false}
                  localPath={formData.local_path || null}
                  saveToGoogleDrive={formData.save_to_google_drive || false}
                  googleDriveTokens={formData.google_drive_tokens || null}
                  googleDriveFolderId={formData.google_drive_folder_id || null}
                  onSaveToLocalChange={(v) => setFormData(prev => ({ ...prev, save_to_local: v }))}
                  onLocalPathChange={(v) => setFormData(prev => ({ ...prev, local_path: v }))}
                  onSaveToGoogleDriveChange={(v) => setFormData(prev => ({ ...prev, save_to_google_drive: v }))}
                  onGoogleDriveConnect={handleGoogleDriveConnect}
                  onGoogleDriveDisconnect={handleGoogleDriveDisconnect}
                  onGoogleDriveFolderIdChange={(v) => setFormData(prev => ({ ...prev, google_drive_folder_id: v }))}
                  type="company"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Backups</CardTitle>
                <CardDescription>
                  Visualize os backups realizados e faça download
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupLogsList
                  logs={logs}
                  isLoading={loadingLogs}
                  onDownload={handleDownload}
                  onRefresh={() => refetchLogs()}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
