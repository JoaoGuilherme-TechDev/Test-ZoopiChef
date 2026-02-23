import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, GripVertical, Save, RefreshCw, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import {
  useKDSStageDefinitions,
  useKDSUserRoles,
  type KDSStageDefinition,
} from '@/hooks/useMultiStageKDS';

interface MultiStageKDSSettingsProps {
  companyUsers?: { id: string; name: string; email: string }[];
}

export function MultiStageKDSSettings({ companyUsers = [] }: MultiStageKDSSettingsProps) {
  const { settings, updateSettings, isLoading: settingsLoading } = useKDSSettings();
  const { stages, createStage, updateStage, deleteStage, setupDefaultStages, isLoading: stagesLoading } = useKDSStageDefinitions();
  const { roles, assignRole, removeRole, isLoading: rolesLoading } = useKDSUserRoles();

  const [newStageName, setNewStageName] = useState('');
  const [newStageKey, setNewStageKey] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');

  const isMultiStageEnabled = (settings as any)?.kds_multi_stage_enabled ?? false;
  const isLoading = settingsLoading || stagesLoading || rolesLoading;

  const handleToggleMultiStage = () => {
    updateSettings.mutate({ kds_multi_stage_enabled: !isMultiStageEnabled });
  };

  const handleCreateStage = () => {
    if (!newStageName.trim() || !newStageKey.trim()) {
      toast.error('Preencha nome e chave da etapa');
      return;
    }

    const nextOrder = stages.length > 0 
      ? Math.max(...stages.map(s => s.stage_order)) + 1 
      : 1;

    createStage.mutate({
      stage_name: newStageName.trim(),
      stage_key: newStageKey.trim().toLowerCase().replace(/\s+/g, '_'),
      stage_order: nextOrder,
      color: newStageColor,
      icon: 'chef-hat',
      is_active: true,
    });

    setNewStageName('');
    setNewStageKey('');
    setNewStageColor('#6366f1');
  };

  const handleToggleStage = (stage: KDSStageDefinition) => {
    updateStage.mutate({ id: stage.id, is_active: !stage.is_active });
  };

  const handleDeleteStage = (stageId: string) => {
    if (confirm('Remover esta etapa? Isso não afetará pedidos existentes.')) {
      deleteStage.mutate(stageId);
    }
  };

  const handleSetupDefaults = () => {
    if (confirm('Isso criará as etapas padrão (Massa, Recheio, Borda, Forno, Finalização). Continuar?')) {
      setupDefaultStages.mutate();
    }
  };

  const getUserRolesForStage = (stageKey: string) => {
    return roles.filter(r => r.stage_key === stageKey && r.is_active);
  };

  const handleAssignUser = (userId: string, stageKey: string) => {
    assignRole.mutate({ userId, stageKey });
  };

  const handleRemoveUserRole = (userId: string, stageKey: string) => {
    removeRole.mutate({ userId, stageKey });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            KDS Multi-Etapas
          </CardTitle>
          <CardDescription>
            Divida o preparo dos pedidos em etapas sequenciais com controle de acesso por função.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="multi-stage-toggle" className="text-base font-medium">
                Ativar KDS Multi-Etapas
              </Label>
              <p className="text-sm text-muted-foreground">
                {isMultiStageEnabled 
                  ? 'Pedidos passarão por etapas sequenciais definidas abaixo.'
                  : 'Modo clássico: fluxo simples Novo → Preparo → Pronto.'}
              </p>
            </div>
            <Switch
              id="multi-stage-toggle"
              checked={isMultiStageEnabled}
              onCheckedChange={handleToggleMultiStage}
              disabled={updateSettings.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage Configuration - Only show when enabled */}
      {isMultiStageEnabled && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Etapas de Produção</CardTitle>
                  <CardDescription>
                    Configure as etapas que cada pedido deve passar.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetupDefaults}
                  disabled={setupDefaultStages.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Usar Padrões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Stages */}
              <div className="space-y-2">
                {stages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma etapa configurada. Adicione etapas ou use os padrões.
                  </p>
                ) : (
                  stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        stage.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                      )}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stage.stage_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {stage.stage_key}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Ordem: {stage.stage_order}
                          </Badge>
                        </div>
                        
                        {/* Users assigned to this stage */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {getUserRolesForStage(stage.stage_key).map(role => {
                            const user = companyUsers.find(u => u.id === role.user_id);
                            return (
                              <Badge
                                key={role.id}
                                variant="secondary"
                                className="text-xs gap-1 cursor-pointer hover:bg-destructive/20"
                                onClick={() => handleRemoveUserRole(role.user_id, stage.stage_key)}
                              >
                                {user?.name || role.user_id.slice(0, 8)}
                                <Trash2 className="h-3 w-3" />
                              </Badge>
                            );
                          })}
                          {getUserRolesForStage(stage.stage_key).length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              Sem usuários atribuídos (todos podem operar)
                            </span>
                          )}
                        </div>
                      </div>

                      <Switch
                        checked={stage.is_active}
                        onCheckedChange={() => handleToggleStage(stage)}
                        disabled={updateStage.isPending}
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStage(stage.id)}
                        disabled={deleteStage.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Stage */}
              <div className="flex items-end gap-2 pt-4 border-t">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="new-stage-name">Nome da Etapa</Label>
                  <Input
                    id="new-stage-name"
                    placeholder="Ex: Montagem"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label htmlFor="new-stage-key">Chave</Label>
                  <Input
                    id="new-stage-key"
                    placeholder="Ex: assembly"
                    value={newStageKey}
                    onChange={(e) => setNewStageKey(e.target.value)}
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label htmlFor="new-stage-color">Cor</Label>
                  <Input
                    id="new-stage-color"
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="p-1 h-9"
                  />
                </div>
                <Button
                  onClick={handleCreateStage}
                  disabled={createStage.isPending || !newStageName.trim() || !newStageKey.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Role Assignment */}
          {companyUsers.length > 0 && stages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Atribuição de Funções</CardTitle>
                <CardDescription>
                  Defina quais usuários podem operar cada etapa. Usuários sem atribuição podem operar todas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyUsers.map(user => (
                    <div key={user.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground mb-2">{user.email}</div>
                      <div className="flex flex-wrap gap-1">
                        {stages.filter(s => s.is_active).map(stage => {
                          const hasRole = roles.some(
                            r => r.user_id === user.id && r.stage_key === stage.stage_key && r.is_active
                          );
                          return (
                            <Badge
                              key={stage.id}
                              variant={hasRole ? 'default' : 'outline'}
                              className={cn(
                                "cursor-pointer transition-all",
                                hasRole && "hover:opacity-80"
                              )}
                              style={hasRole ? { backgroundColor: stage.color } : undefined}
                              onClick={() => {
                                if (hasRole) {
                                  handleRemoveUserRole(user.id, stage.stage_key);
                                } else {
                                  handleAssignUser(user.id, stage.stage_key);
                                }
                              }}
                            >
                              {stage.stage_name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
