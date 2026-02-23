/**
 * SlugEntryScreen
 * 
 * Universal first screen for ALL PWAs that requires restaurant identification.
 * Offers two options:
 * 1. Text input for restaurant slug
 * 2. QR code scanner button
 * 
 * Stores validated slug in localStorage as 'restaurantSlug'
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, QrCode, Store, AlertCircle, Camera, X, Check, Flashlight, FlashlightOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase-shim';
import jsQR from 'jsqr';

const STORAGE_KEY = 'restaurantSlug';
const CACHE_KEY = 'validatedSlugsCache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SlugCache {
  [slug: string]: {
    validatedAt: number;
    companyName: string;
  };
}

function getSlugCache(): SlugCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    return JSON.parse(cached);
  } catch {
    return {};
  }
}

function isSlugCached(slug: string): { cached: boolean; companyName?: string } {
  const cache = getSlugCache();
  const entry = cache[slug.toLowerCase()];
  if (!entry) return { cached: false };
  
  const isExpired = Date.now() - entry.validatedAt > CACHE_TTL_MS;
  if (isExpired) {
    // Remove expired entry
    delete cache[slug.toLowerCase()];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return { cached: false };
  }
  
  return { cached: true, companyName: entry.companyName };
}

function cacheValidSlug(slug: string, companyName: string): void {
  const cache = getSlugCache();
  cache[slug.toLowerCase()] = {
    validatedAt: Date.now(),
    companyName
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

interface SlugEntryScreenProps {
  onSlugValidated: (slug: string) => void;
  appName: string;
  appIcon: React.ReactNode;
  accentColor?: string;
}

export function SlugEntryScreen({ 
  onSlugValidated, 
  appName, 
  appIcon,
  accentColor = 'primary'
}: SlugEntryScreenProps) {
  const [slugInput, setSlugInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isCheckingStored, setIsCheckingStored] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Check for stored slug on mount
  useEffect(() => {
    const storedSlug = localStorage.getItem(STORAGE_KEY);
    if (storedSlug) {
      validateSlug(storedSlug, true);
    } else {
      setIsCheckingStored(false);
    }
  }, []);

  const validateSlug = async (slug: string, isStoredCheck = false) => {
    if (!slug.trim()) {
      setError('Digite o código do restaurante');
      return;
    }

    // Validate slug length (max 50 characters)
    if (slug.length > 50) {
      setError('Código muito longo (máximo 50 caracteres)');
      return;
    }

    const normalizedSlug = slug.trim().toLowerCase();
    setIsValidating(true);
    setError(null);

    try {
      // Check 24h cache first
      const cacheResult = isSlugCached(normalizedSlug);
      if (cacheResult.cached) {
        console.log(`[SlugEntry] Using cached validation for: ${normalizedSlug}`);
        setScanSuccess(true);
        localStorage.setItem(STORAGE_KEY, normalizedSlug);
        onSlugValidated(normalizedSlug);
        return;
      }

      // Not in cache, validate against database
      const { data, error: queryError } = await supabase
        .from('public_companies')
        .select('id, name, slug, is_active')
        .eq('slug', normalizedSlug)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        setError('Restaurante não encontrado. Tente novamente.');
        setScanSuccess(false);
        if (isStoredCheck) {
          localStorage.removeItem(STORAGE_KEY);
          setIsCheckingStored(false);
        }
        return;
      }

      if (!data.is_active) {
        setError('Este restaurante está temporariamente indisponível.');
        setScanSuccess(false);
        if (isStoredCheck) {
          localStorage.removeItem(STORAGE_KEY);
          setIsCheckingStored(false);
        }
        return;
      }

      // Valid slug - cache it for 24h, store, and proceed
      cacheValidSlug(normalizedSlug, data.name);
      setScanSuccess(true);
      localStorage.setItem(STORAGE_KEY, normalizedSlug);
      onSlugValidated(normalizedSlug);
    } catch (err) {
      console.error('Slug validation error:', err);
      setError('Erro ao validar. Tente novamente.');
      setScanSuccess(false);
      if (isStoredCheck) {
        setIsCheckingStored(false);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const stopScanner = useCallback(() => {
    // Stop animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop camera stream
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
        // Extract slug from QR code (plain text, max 50 chars)
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
        
        // Validate length
        if (scannedSlug.length > 50) {
          scannedSlug = scannedSlug.substring(0, 50);
        }
        
        // Remove invalid characters for slug
        scannedSlug = scannedSlug.replace(/[^a-z0-9-]/g, '');
        
        if (scannedSlug) {
          stopScanner();
          setSlugInput(scannedSlug);
          setScanSuccess(true);
          // Don't auto-validate, let user confirm
        } else {
          // Continue scanning if no valid slug found
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
      
      // Check for torch capability
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

  // Show loading while checking stored slug
  if (isCheckingStored) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // QR Scanner View (Full Screen)
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
                {/* Dark overlay with transparent center */}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative w-72 h-72 md:w-80 md:h-80">
                  {/* Clear scanning area */}
                  <div className="absolute inset-0 bg-transparent border-2 border-white/50 rounded-2xl" 
                       style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} 
                  />
                  
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse" 
                       style={{ 
                         top: '50%',
                         boxShadow: '0 0 8px hsl(var(--primary))'
                       }} 
                  />
                </div>
              </div>
              
              {/* Hidden canvas for QR processing */}
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/30 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30">
            {appIcon}
          </div>
          
          <div>
            <CardTitle className="text-2xl">{appName}</CardTitle>
            <CardDescription className="text-base mt-2">
              Identifique o restaurante para continuar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message after scan */}
          {scanSuccess && !error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">QR Code lido com sucesso! Clique em Continuar.</p>
            </div>
          )}

          {/* Slug Input */}
          <div className="space-y-2">
            <Label htmlFor="slug">Código do restaurante</Label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="slug"
                type="text"
                placeholder="ex: pizzaria-do-ze"
                value={slugInput}
                onChange={(e) => {
                  setSlugInput(e.target.value.toLowerCase().replace(/\s/g, '-'));
                  setError(null);
                  setScanSuccess(false);
                }}
                className={`pl-10 h-12 ${scanSuccess ? 'border-green-500 bg-green-500/5' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') validateSlug(slugInput);
                }}
                disabled={isValidating}
                maxLength={50}
              />
              {scanSuccess && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={() => validateSlug(slugInput)}
            disabled={isValidating || !slugInput.trim()}
            className="w-full h-12 text-lg"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* QR Scanner Button */}
          <Button 
            variant="outline"
            onClick={startScanner}
            disabled={isValidating}
            className="w-full h-12 text-lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Escanear QR Code
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>Zoopi Tecnologia © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
