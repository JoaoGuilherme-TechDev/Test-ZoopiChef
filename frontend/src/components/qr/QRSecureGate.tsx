import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MapPin, AlertTriangle, QrCode, XCircle, RefreshCw } from 'lucide-react';
import { useQRSecureSession, useGeolocation } from '@/hooks/useQRSecureSession';

interface QRSecureGateProps {
  slug: string;
  qrType: 'table' | 'comanda';
  tableId?: string;
  comandaId?: string;
  onSuccess: (session: { companyId: string; tableId?: string; comandaId?: string }) => void;
  onCancel?: () => void;
}

/**
 * Component that validates GPS location before allowing QR code access
 */
export function QRSecureGate({
  slug,
  qrType,
  tableId,
  comandaId,
  onSuccess,
  onCancel,
}: QRSecureGateProps) {
  const [step, setStep] = useState<'requesting' | 'validating' | 'error' | 'success'>('requesting');
  const { authenticateWithQR, error: sessionError, errorCode, isLoading } = useQRSecureSession();
  const { requestLocation, error: geoError, isLoading: geoLoading, permissionDenied } = useGeolocation();

  const handleValidate = async () => {
    setStep('requesting');

    // Request GPS location
    const coords = await requestLocation();

    if (!coords) {
      setStep('error');
      return;
    }

    setStep('validating');

    // Validate location with backend
    const result = await authenticateWithQR({
      slug,
      qrType,
      tableId,
      comandaId,
      userLatitude: coords.latitude,
      userLongitude: coords.longitude,
    });

    if (result.success) {
      setStep('success');
      onSuccess({
        companyId: slug, // Will be resolved to actual companyId in session
        tableId,
        comandaId,
      });
    } else {
      setStep('error');
    }
  };

  // Start validation on mount
  useEffect(() => {
    handleValidate();
  }, []);

  const renderContent = () => {
    if (step === 'requesting' || geoLoading) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium text-lg">Solicitando localização...</p>
            <p className="text-muted-foreground text-sm mt-1">
              Por favor, permita o acesso à sua localização
            </p>
          </div>
        </div>
      );
    }

    if (step === 'validating' || isLoading) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium text-lg">Validando localização...</p>
            <p className="text-muted-foreground text-sm mt-1">
              Verificando se você está no restaurante
            </p>
          </div>
        </div>
      );
    }

    if (step === 'error') {
      const error = geoError || sessionError;
      const isTooFar = errorCode === 'TOO_FAR';
      const isGpsDenied = permissionDenied || errorCode === 'GPS_REQUIRED';

      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className={`p-4 rounded-full ${isTooFar ? 'bg-orange-100' : 'bg-red-100'}`}>
            {isTooFar ? (
              <MapPin className="h-12 w-12 text-orange-600" />
            ) : isGpsDenied ? (
              <MapPin className="h-12 w-12 text-red-600" />
            ) : (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>

          <div className="text-center">
            <h3 className="font-bold text-lg mb-2">
              {isTooFar ? 'Você está muito longe' : isGpsDenied ? 'Localização Necessária' : 'Acesso Negado'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {error}
            </p>
          </div>

          {isTooFar && (
            <Alert className="mt-4 bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Aproxime-se do restaurante</AlertTitle>
              <AlertDescription className="text-orange-700">
                O acesso à mesa/comanda só é permitido quando você está dentro do estabelecimento.
              </AlertDescription>
            </Alert>
          )}

          {isGpsDenied && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <MapPin className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Como ativar a localização</AlertTitle>
              <AlertDescription className="text-blue-700">
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Abra as configurações do seu navegador</li>
                  <li>Procure por "Permissões" ou "Localização"</li>
                  <li>Permita o acesso à localização para este site</li>
                  <li>Recarregue a página e tente novamente</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={handleValidate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }

    // Success state - shouldn't show for long
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="p-4 rounded-full bg-green-100">
          <MapPin className="h-12 w-12 text-green-600" />
        </div>
        <div className="text-center">
          <p className="font-medium text-lg text-green-600">Localização verificada!</p>
          <p className="text-muted-foreground text-sm mt-1">
            Redirecionando...
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>
            {qrType === 'table' ? 'Acesso à Mesa' : 'Acesso à Comanda'}
          </CardTitle>
          <CardDescription>
            Verificando se você está no restaurante
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Wrapper component that monitors session and auto-logouts on inactivity
 */
export function QRSecureSessionGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, session, error, clearSession } = useQRSecureSession();
  const navigate = useNavigate();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, show error and redirect option
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Sessão Expirada</CardTitle>
            <CardDescription>
              {error || 'Sua sessão expirou. Escaneie o QR Code novamente para continuar.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/')}>
              <QrCode className="h-4 w-4 mr-2" />
              Escanear QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
