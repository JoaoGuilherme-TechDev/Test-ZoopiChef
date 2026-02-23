import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface KDSLayoutProps {
  children: ReactNode;
  title?: string;
}

export function KDSLayout({ children, title = 'KDS - Kitchen Display' }: KDSLayoutProps) {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="h-screen w-screen max-w-full max-h-full overflow-hidden bg-background text-foreground flex flex-col">
      {/* Header - fixed height, never overflows */}
      <header className="h-14 min-h-[3.5rem] flex-shrink-0 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-muted/50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/orders')}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h1>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/kds/settings')}
            className="text-muted-foreground hover:text-foreground"
            title="Configurações do KDS"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-muted-foreground hover:text-foreground"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content - fills remaining space with proper overflow */}
      <main className="flex-1 overflow-auto p-2 sm:p-4">
        {children}
      </main>
    </div>
  );
}
