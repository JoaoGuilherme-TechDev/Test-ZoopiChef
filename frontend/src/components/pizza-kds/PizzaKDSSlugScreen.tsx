import React, { useState, useEffect, useRef } from 'react';
import { usePizzaKDSSession } from '@/contexts/PizzaKDSSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pizza, QrCode, Loader2, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';

export function PizzaKDSSlugScreen() {
  const { validateSlug, setRestaurantContext } = usePizzaKDSSession();
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!slug.trim()) return;

    setIsLoading(true);
    setError(null);

    const result = await validateSlug(slug.trim().toLowerCase());

    if (!result.valid) {
      setError(result.error || 'Restaurante não encontrado');
      setIsLoading(false);
      return;
    }

    if (!result.pizzaKdsEnabled) {
      setError('KDS de Pizza não está habilitado neste restaurante');
      setIsLoading(false);
      return;
    }

    setRestaurantContext(result.companyId!, result.name!, result.logo || null, result.pizzaKdsEnabled!);
    setIsLoading(false);
  };

  // QR Scanner logic
  useEffect(() => {
    if (!showScanner) return;

    let animationId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanQR();
        }
      } catch {
        setError('Não foi possível acessar a câmera');
        setShowScanner(false);
      }
    };

    const scanQR = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code?.data) {
          // Extract slug from QR (could be just slug or a URL containing slug)
          let extractedSlug = code.data;
          
          // If it's a URL, try to extract slug
          if (extractedSlug.includes('/')) {
            const parts = extractedSlug.split('/').filter(Boolean);
            extractedSlug = parts[parts.length - 1] || parts[0];
          }

          setSlug(extractedSlug);
          setShowScanner(false);
          
          // Auto-submit
          setTimeout(() => {
            validateSlug(extractedSlug).then((result) => {
              if (result.valid && result.pizzaKdsEnabled) {
                setRestaurantContext(result.companyId!, result.name!, result.logo || null, result.pizzaKdsEnabled!);
              } else if (!result.pizzaKdsEnabled) {
                setError('KDS de Pizza não está habilitado neste restaurante');
              } else {
                setError(result.error || 'Restaurante não encontrado');
              }
            });
          }, 100);
          return;
        }
      }

      animationId = requestAnimationFrame(scanQR);
    };

    startCamera();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showScanner, validateSlug, setRestaurantContext]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Pizza className="w-10 h-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">KDS de Pizza</CardTitle>
          <p className="text-muted-foreground mt-2">
            Identifique o restaurante para continuar
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {showScanner ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setShowScanner(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder="Digite o slug do restaurante"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="text-center text-lg"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !slug.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Continuar
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowScanner(true)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Escanear QR Code
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
