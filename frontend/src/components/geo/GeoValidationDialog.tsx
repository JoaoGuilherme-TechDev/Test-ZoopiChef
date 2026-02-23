import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Loader2, AlertTriangle, CheckCircle2, Shield, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeoValidationDialogProps {
  open: boolean;
  onClose: () => void;
  isValidating: boolean;
  isValidSession: boolean;
  error: string | null;
  distance: number | null;
  radiusMeters: number;
  timeRemaining: number | null;
  onValidate: () => void;
}

export function GeoValidationDialog({
  open,
  onClose,
  isValidating,
  isValidSession,
  error,
  distance,
  radiusMeters,
  timeRemaining,
  onValidate,
}: GeoValidationDialogProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isValidSession && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação de Localização
          </DialogTitle>
          <DialogDescription>
            Para usar este serviço, precisamos confirmar que você está no estabelecimento.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            {isValidating && (
              <motion.div
                key="validating"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-medium">Obtendo sua localização...</p>
                  <p className="text-sm text-muted-foreground">
                    Por favor, permita o acesso à localização
                  </p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </motion.div>
            )}

            {!isValidating && isValidSession && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-green-600">Localização confirmada!</p>
                  {distance !== null && (
                    <p className="text-sm text-muted-foreground">
                      Você está a {distance}m do estabelecimento
                    </p>
                  )}
                  {timeRemaining !== null && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Sessão expira em {formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {!isValidating && !isValidSession && !error && (
              <motion.div
                key="request"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Validação necessária</p>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão abaixo para verificar sua localização
                  </p>
                </div>
              </motion.div>
            )}

            {!isValidating && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-4"
              >
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Validação falhou</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                
                {distance !== null && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Sua distância: <strong>{distance}m</strong></p>
                    <p>Distância permitida: <strong>{radiusMeters}m</strong></p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          {!isValidSession ? (
            <Button 
              onClick={onValidate} 
              disabled={isValidating}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  {error ? 'Tentar Novamente' : 'Verificar Localização'}
                </>
              )}
            </Button>
          ) : (
            <Button onClick={onClose} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Continuar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
