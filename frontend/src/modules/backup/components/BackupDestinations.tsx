import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Cloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useGoogleDriveAuth } from '../hooks/useGoogleDriveAuth';
import type { GoogleDriveTokens } from '../types';

interface BackupDestinationsProps {
  saveToLocal: boolean;
  localPath: string | null;
  saveToGoogleDrive: boolean;
  googleDriveTokens: GoogleDriveTokens | null;
  googleDriveFolderId: string | null;
  onSaveToLocalChange: (value: boolean) => void;
  onLocalPathChange: (value: string) => void;
  onSaveToGoogleDriveChange: (value: boolean) => void;
  onGoogleDriveConnect: (tokens: GoogleDriveTokens) => void;
  onGoogleDriveDisconnect: () => void;
  onGoogleDriveFolderIdChange: (value: string) => void;
  type: 'company' | 'saas';
  disabled?: boolean;
}

export function BackupDestinations({
  saveToLocal,
  localPath,
  saveToGoogleDrive,
  googleDriveTokens,
  googleDriveFolderId,
  onSaveToLocalChange,
  onLocalPathChange,
  onSaveToGoogleDriveChange,
  onGoogleDriveConnect,
  onGoogleDriveDisconnect,
  onGoogleDriveFolderIdChange,
  type,
  disabled = false,
}: BackupDestinationsProps) {
  const { initiateAuth, isAuthenticating, disconnectDrive, isConfigured } = useGoogleDriveAuth();

  const handleConnectGoogleDrive = () => {
    initiateAuth(type);
  };

  const handleDisconnect = async () => {
    await disconnectDrive();
    onGoogleDriveDisconnect();
  };

  const isGoogleConnected = !!googleDriveTokens?.access_token;

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Destinos do Backup</Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Storage via Agent Desktop */}
        <Card className={saveToLocal ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Disco Local</CardTitle>
              </div>
              <Switch
                checked={saveToLocal}
                onCheckedChange={onSaveToLocalChange}
                disabled={disabled}
              />
            </div>
            <CardDescription>
              Salvar via Agente Desktop no computador
            </CardDescription>
          </CardHeader>
          {saveToLocal && (
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                <Label>Pasta de destino (opcional)</Label>
                <Input
                  placeholder="C:\Backups\Zoopi"
                  value={localPath || ''}
                  onChange={(e) => onLocalPathChange(e.target.value)}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Se não informado, o agente usará a pasta padrão
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">Via Agente Desktop</Badge>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Google Drive */}
        <Card className={saveToGoogleDrive ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Google Drive</CardTitle>
              </div>
              <Switch
                checked={saveToGoogleDrive}
                onCheckedChange={onSaveToGoogleDriveChange}
                disabled={disabled || !isConfigured}
              />
            </div>
            <CardDescription>
              Salvar automaticamente no Google Drive
            </CardDescription>
          </CardHeader>
          {saveToGoogleDrive && (
            <CardContent className="pt-0 space-y-3">
              {!isConfigured ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>Google Client ID não configurado</span>
                </div>
              ) : isGoogleConnected ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Conectado ao Google Drive</span>
                  </div>
                  <div className="space-y-2">
                    <Label>ID da Pasta (opcional)</Label>
                    <Input
                      placeholder="ID da pasta no Google Drive"
                      value={googleDriveFolderId || ''}
                      onChange={(e) => onGoogleDriveFolderIdChange(e.target.value)}
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se não informado, será criada uma pasta "Zoopi Backups"
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disabled}
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectGoogleDrive}
                  disabled={disabled || isAuthenticating}
                  className="w-full"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Conectar Google Drive
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
