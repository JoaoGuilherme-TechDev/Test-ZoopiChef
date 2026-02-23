import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Play, Database, History, Cloud, Shield } from 'lucide-react';
import { BackupLogsList } from '../components/BackupLogsList';
import { BackupDestinations } from '../components/BackupDestinations';
import { 
  useSaasBackupConfig, 
  useUpsertSaasBackupConfig,
  useSaasBackupLogs,
  useTriggerSaasBackup,
} from '../hooks';
import { FREQUENCY_OPTIONS } from '../types';
import type { SaasBackupConfig, GoogleDriveTokens } from '../types';

export function SaasBackupPage() {
  const { data: config, isLoading: loadingConfig } = useSaasBackupConfig();
  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = useSaasBackupLogs(20);
  const upsertConfig = useUpsertSaasBackupConfig();
  const triggerBackup = useTriggerSaasBackup();

  const [formData, setFormData] = useState<Partial<SaasBackupConfig>>({
    is_enabled: false,
    frequency: 'daily',
    scheduled_time: '02:00',
    retention_days: 90,
    save_to_google_drive: true,
    google_drive_folder_id: null,
    google_drive_tokens: null,
    include_all_companies: true,
    include_saas_tables: true,
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = async () => {
    await upsertConfig.mutateAsync(formData);
  };

  const handleManualBackup = async () => {
    await triggerBackup.mutateAsync();
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Backup SaaS</h1>
              <p className="text-muted-foreground">
                Backup completo de todas as empresas do sistema
              </p>
            </div>
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
                    <CardTitle>Backup Automático SaaS</CardTitle>
                    <CardDescription>
                      Ativar backup automático de todo o sistema
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v }))}
                      disabled={!formData.is_enabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.filter(o => o.value !== 'hourly').map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={formData.scheduled_time || '02:00'}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                      disabled={!formData.is_enabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Retenção</Label>
                    <Select 
                      value={String(formData.retention_days)} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, retention_days: Number(v) }))}
                      disabled={!formData.is_enabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="60">60 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                        <SelectItem value="180">180 dias</SelectItem>
                        <SelectItem value="365">1 ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What to include */}
            <Card>
              <CardHeader>
                <CardTitle>Escopo do Backup</CardTitle>
                <CardDescription>
                  O que incluir no backup SaaS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Todas as Empresas</Label>
                    <p className="text-sm text-muted-foreground">
                      Incluir dados de todas as empresas cadastradas
                    </p>
                  </div>
                  <Switch
                    checked={formData.include_all_companies}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_all_companies: checked }))}
                    disabled={!formData.is_enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tabelas SaaS</Label>
                    <p className="text-sm text-muted-foreground">
                      Incluir planos, assinaturas e configurações do sistema
                    </p>
                  </div>
                  <Switch
                    checked={formData.include_saas_tables}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_saas_tables: checked }))}
                    disabled={!formData.is_enabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Google Drive Destination */}
            <Card>
              <CardHeader>
                <CardTitle>Destino</CardTitle>
                <CardDescription>
                  Backup SaaS é salvo no Google Drive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupDestinations
                  saveToLocal={false}
                  localPath={null}
                  saveToGoogleDrive={formData.save_to_google_drive || false}
                  googleDriveTokens={formData.google_drive_tokens || null}
                  googleDriveFolderId={formData.google_drive_folder_id || null}
                  onSaveToLocalChange={() => {}}
                  onLocalPathChange={() => {}}
                  onSaveToGoogleDriveChange={(v) => setFormData(prev => ({ ...prev, save_to_google_drive: v }))}
                  onGoogleDriveConnect={handleGoogleDriveConnect}
                  onGoogleDriveDisconnect={handleGoogleDriveDisconnect}
                  onGoogleDriveFolderIdChange={(v) => setFormData(prev => ({ ...prev, google_drive_folder_id: v }))}
                  type="saas"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Backups SaaS</CardTitle>
                <CardDescription>
                  Visualize os backups do sistema realizados
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
