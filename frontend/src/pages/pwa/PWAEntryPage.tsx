/**
 * PWA Entry Page - Universal entry point for all PWAs
 * 
 * This page handles the slug-based flow:
 * 1. Check if we have persisted context (localStorage)
 * 2. If yes, redirect to the proper /:slug/:function route
 * 3. If no, show the slug input / QR scanner screen
 * 
 * Route: /pwa/:function (e.g., /pwa/garcom, /pwa/entregador, /pwa/totem)
 * 
 * IMPORTANT: This page is PUBLIC and does NOT require AuthProvider.
 * The slug must be entered/scanned BEFORE any company lookup happens.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  loadPWAContext, 
  savePWAContext, 
  buildPWAUrl, 
  PWAFunction, 
  PWAContext 
} from '@/lib/pwa/unifiedPersistence';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Store, QrCode, AlertCircle, X, Flashlight, FlashlightOff, Check, Camera } from 'lucide-react';
import jsQR from 'jsqr';

// PWA function metadata
const PWA_METADATA: Record<PWAFunction, { name: string; icon: string; color: string; requiresAuth: boolean }> = {
  garcom: { name: 'Garçom', icon: '🍽️', color: 'bg-blue-600', requiresAuth: true },
  entregador: { name: 'Entregador', icon: '🚴', color: 'bg-green-600', requiresAuth: true },
  totem: { name: 'Totem', icon: '📱', color: 'bg-orange-600', requiresAuth: false },
  tablet: { name: 'Tablet', icon: '📋', color: 'bg-purple-600', requiresAuth: false },
  pdv: { name: 'PDV Loja', icon: '💳', color: 'bg-emerald-600', requiresAuth: true },
  terminal: { name: 'Terminal', icon: '🖥️', color: 'bg-indigo-600', requiresAuth: true },
};

export default function PWAEntryPage() {
  const { function: pwaFunction } = useParams<{ function: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const fn = pwaFunction as PWAFunction;
  const metadata = fn ? PWA_METADATA[fn] : null;

  // On mount, check for persisted context
  useEffect(() => {
    if (!fn || !metadata) {
      setLoading(false);
      setError('Função PWA inválida');
      return;
    }

    const context = loadPWAContext();
    
    // If we have a valid context for THIS function, redirect immediately
    if (context && context.function === fn && context.restaurantSlug) {
      const targetUrl = buildPWAUrl(context);
      console.log(`[PWAEntry] Restoring context for ${fn} -> ${targetUrl}`);
      navigate(targetUrl, { replace: true });
      return;
    }

    // No valid context, show slug input
    setLoading(false);
  }, [fn, metadata, navigate]);

  const validateAndRedirect = async (slugToValidate?: string) => {
    const slugValue = slugToValidate || slug;
    
    if (!slugValue.trim()) {
      setError('Digite o código do restaurante');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      // Validate slug exists
      const { data: company, error: companyError } = await supabase
        .from('public_companies')
        .select('id, name, slug, is_active')
        .eq('slug', slugValue.toLowerCase().trim())
        .maybeSingle();

      if (companyError) throw companyError;

      if (!company) {
        setError('Restaurante não encontrado. Verifique o código.');
        setValidating(false);
        return;
      }

      if (!company.is_active) {
        setError('Este restaurante está temporariamente indisponível.');
        setValidating(false);
        return;
      }

      // Save context
      const context: PWAContext = {
        restaurantSlug: company.slug,
        restaurantId: company.id,
        restaurantName: company.name,
        function: fn,
        lastAccessedAt: new Date().toISOString(),
      };
      
      savePWAContext(context);

      // Redirect to the proper route
      const targetUrl = buildPWAUrl(context);
      console.log(`[PWAEntry] New context created, redirecting to ${targetUrl}`);
      navigate(targetUrl, { replace: true });

    } catch (err: any) {
      console.error('[PWAEntry] Validation error:', err);
      setError('Erro ao validar restaurante. Tente novamente.');
      setValidating(false);
    }
  };

  // QR Scanner functions
  const stopScanner = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    trackRef.current = null;
    setShowScanner(false);
    setTorchOn(false);
    setTorchAvailable(false);
    setCameraError(null);
  }, []);

  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !streamRef.current) return;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const scan = () => {
      if (!streamRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        let scannedSlug = code.data.trim().toLowerCase();
        
        // If it's a URL, try to extract slug from path
        if (scannedSlug.startsWith('http')) {
          try {
            const url = new URL(scannedSlug);
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
              scannedSlug = pathParts[0];
            }
          } catch {
            // Not a valid URL, use as-is
          }
        }
        
        // Validate length and clean
        if (scannedSlug.length > 50) {
          scannedSlug = scannedSlug.substring(0, 50);
        }
        scannedSlug = scannedSlug.replace(/[^a-z0-9-]/g, '');
        
        if (scannedSlug) {
          stopScanner();
          setSlug(scannedSlug);
          setScanSuccess(true);
          // Auto-validate after successful scan
          validateAndRedirect(scannedSlug);
        } else {
          animationRef.current = requestAnimationFrame(scan);
        }
      } else {
        animationRef.current = requestAnimationFrame(scan);
      }
    };

    animationRef.current = requestAnimationFrame(scan);
  }, [stopScanner]);

  const startScanner = async () => {
    setShowScanner(true);
    setError(null);
    setCameraError(null);
    setScanSuccess(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;
      
      const capabilities = videoTrack.getCapabilities?.() as any;
      if (capabilities?.torch) {
        setTorchAvailable(true);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          scanQRCode();
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Acesso à câmera necessário. Por favor, permita o acesso nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Nenhuma câmera encontrada no dispositivo.');
      } else {
        setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    }
  };

  const toggleTorch = async () => {
    if (!trackRef.current || !torchAvailable) return;
    
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error('Torch toggle error:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Função PWA inválida</p>
            <p className="text-sm text-muted-foreground mt-2">
              A URL acessada não corresponde a nenhum aplicativo válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // QR Scanner Full Screen View
  if (showScanner) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-black/80">
          <h2 className="text-white text-lg font-medium">Escanear QR Code</h2>
          <div className="flex items-center gap-2">
            {torchAvailable && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTorch} 
                className="text-white hover:bg-white/20"
              >
                {torchOn ? (
                  <Flashlight className="w-6 h-6 text-yellow-400" />
                ) : (
                  <FlashlightOff className="w-6 h-6" />
                )}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={stopScanner} 
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
        
        {/* Camera View */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {cameraError ? (
            <div className="text-center p-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-white text-lg mb-4">{cameraError}</p>
              <Button onClick={stopScanner} variant="secondary">
                Voltar
              </Button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative w-72 h-72 md:w-80 md:h-80">
                  <div className="absolute inset-0 bg-transparent border-2 border-white/50 rounded-2xl" 
                       style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} 
                  />
                  
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse" 
                       style={{ top: '50%', boxShadow: '0 0 8px hsl(var(--primary))' }} 
                  />
                </div>
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 text-center bg-black/80">
          <p className="text-white/80">
            Aponte a câmera para o QR Code do restaurante
          </p>
          <p className="text-white/50 text-sm mt-2">
            O código será lido automaticamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${metadata.color}`}>
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-2">{metadata.icon}</div>
          <CardTitle className="text-2xl">Zoopi {metadata.name}</CardTitle>
          <CardDescription>
            Identifique o restaurante para continuar
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message after scan */}
          {scanSuccess && !error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">QR Code lido com sucesso!</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" />
              Código do Restaurante (Slug)
            </label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/\s/g, '-'));
                setError(null);
                setScanSuccess(false);
              }}
              placeholder="ex: pizzaria-exemplo"
              className="text-lg h-12"
              onKeyDown={(e) => e.key === 'Enter' && validateAndRedirect()}
              disabled={validating}
              maxLength={50}
            />
          </div>

          <Button 
            onClick={() => validateAndRedirect()}
            className="w-full h-12 text-lg"
            disabled={validating || !slug.trim()}
          >
            {validating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12" 
            onClick={startScanner}
            disabled={validating}
          >
            <QrCode className="w-5 h-5 mr-2" />
            Ler QR Code
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-4">
            O código do restaurante é fornecido pelo administrador do estabelecimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
