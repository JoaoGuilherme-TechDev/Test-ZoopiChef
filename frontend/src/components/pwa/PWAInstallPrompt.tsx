import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share, MoreVertical, Plus, Smartphone, Monitor, Chrome, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

const detectDevice = (): DeviceType => {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    console.log('[PWA] Device detected: iOS');
    return 'ios';
  }
  if (/android/.test(ua)) {
    console.log('[PWA] Device detected: Android');
    return 'android';
  }
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    console.log('[PWA] Device detected: Desktop');
    return 'desktop';
  }
  console.log('[PWA] Device detected: Unknown');
  return 'unknown';
};

const isStandalone = (): boolean => {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
  console.log('[PWA] Is standalone mode:', standalone);
  return standalone;
};

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    console.log('[PWA] Component mounted');
    
    // Detect device type
    const device = detectDevice();
    setDeviceType(device);
    
    // Check if already installed
    if (isStandalone()) {
      console.log('[PWA] Already installed as standalone, not showing prompt');
      return;
    }
    
    // Check if user dismissed recently (24h cooldown)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        console.log('[PWA] Prompt dismissed recently, waiting cooldown');
        return;
      }
    }
    
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Show prompt after 2 seconds
    const timer = setTimeout(() => {
      console.log('[PWA] Timer triggered, showing prompt');
      setShowPrompt(true);
    }, 2000);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    console.log('[PWA] Install button clicked');
    
    if (deferredPrompt) {
      console.log('[PWA] Using native install prompt');
      setIsInstalling(true);
      
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User choice:', outcome);
        
        if (outcome === 'accepted') {
          console.log('[PWA] User accepted installation');
          setShowPrompt(false);
        }
      } catch (error) {
        console.error('[PWA] Error during installation:', error);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      console.log('[PWA] No native prompt available, showing manual instructions');
      setShowManualInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    console.log('[PWA] User dismissed prompt');
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  }, []);

  const renderManualInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 text-foreground">
              <Apple className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg">Instalar no iPhone/iPad</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">1</div>
                <div>
                  <p className="font-medium">Toque no botão Compartilhar</p>
                  <p className="text-sm text-muted-foreground">Procure o ícone <Share className="inline h-4 w-4" /> na barra inferior do Safari</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">2</div>
                <div>
                  <p className="font-medium">Role para baixo e toque em</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Plus className="inline h-4 w-4" /> "Adicionar à Tela de Início"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">3</div>
                <div>
                  <p className="font-medium">Confirme a instalação</p>
                  <p className="text-sm text-muted-foreground">Toque em "Adicionar" no canto superior direito</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'android':
        return (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 text-foreground">
              <Chrome className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg">Instalar no Android</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">1</div>
                <div>
                  <p className="font-medium">Toque no menu do Chrome</p>
                  <p className="text-sm text-muted-foreground">Procure o ícone <MoreVertical className="inline h-4 w-4" /> no canto superior direito</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">2</div>
                <div>
                  <p className="font-medium">Toque em "Instalar app"</p>
                  <p className="text-sm text-muted-foreground">Ou "Adicionar à tela inicial"</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">3</div>
                <div>
                  <p className="font-medium">Confirme a instalação</p>
                  <p className="text-sm text-muted-foreground">Toque em "Instalar" quando solicitado</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'desktop':
        return (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 text-foreground">
              <Monitor className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg">Instalar no Computador</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">1</div>
                <div>
                  <p className="font-medium">Procure o ícone de instalação</p>
                  <p className="text-sm text-muted-foreground">Na barra de endereços do Chrome, à direita, há um ícone <Download className="inline h-4 w-4" /></p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">2</div>
                <div>
                  <p className="font-medium">Clique em "Instalar"</p>
                  <p className="text-sm text-muted-foreground">Ou use o menu ⋮ → "Instalar Zoopi..."</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">3</div>
                <div>
                  <p className="font-medium">Confirme a instalação</p>
                  <p className="text-sm text-muted-foreground">O app será adicionado aos seus aplicativos</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 text-foreground">
              <Smartphone className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg">Instalar o App</span>
            </div>
            <p className="text-muted-foreground">
              Procure a opção "Instalar" ou "Adicionar à tela inicial" no menu do seu navegador.
            </p>
          </div>
        );
    }
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md relative overflow-hidden border-2 border-primary/50 shadow-[var(--shadow-neon-primary)] animate-in slide-in-from-bottom-4 duration-500">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-secondary/80 transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        
        <CardContent className="pt-8 pb-6 px-6 relative">
          {showManualInstructions ? (
            <>
              {renderManualInstructions()}
              <Button
                onClick={() => setShowManualInstructions(false)}
                variant="outline"
                className="w-full mt-6"
              >
                Voltar
              </Button>
            </>
          ) : (
            <div className="text-center space-y-5">
              {/* App Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-neon-mixed)] animate-pulse">
                    <Smartphone className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success flex items-center justify-center border-2 border-background">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Title & Description */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  Instale o App Zoopi!
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Acesse mais rápido, receba notificações e use offline. 
                  Tenha uma experiência completa no seu dispositivo!
                </p>
              </div>
              
              {/* Features */}
              <div className="flex justify-center gap-6 py-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Rápido</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-lg">📱</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Nativo</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="text-lg">🔔</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Alertas</span>
                </div>
              </div>
              
              {/* Install Button */}
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-[var(--shadow-neon-mixed)]"
              >
                {isInstalling ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Instalando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Instalar Agora
                  </span>
                )}
              </Button>
              
              {/* Dismiss link */}
              <button
                onClick={handleDismiss}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Agora não, lembre-me depois
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
