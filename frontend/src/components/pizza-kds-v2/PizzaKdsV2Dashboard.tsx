import React, { useState } from 'react';
import { usePizzaKdsV2Session } from '@/contexts/PizzaKdsV2SessionContext';
import { PizzaKdsV2PipelineView } from './PizzaKdsV2PipelineView';
import { PizzaKdsV2MyStationView } from './PizzaKdsV2MyStationView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pizza, 
  LogOut, 
  User, 
  Tv, 
  LayoutGrid, 
  UserCircle,
  Maximize,
  Minimize 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIZZA_KDS_V2_STAGE_LABELS } from '@/lib/pizzaKdsV2Stages';

/**
 * Pizza KDS V2 - Main Dashboard
 * 
 * Contains tabs for:
 * - Meu Posto (My Station) - focused personal view
 * - Cozinha Geral (Pipeline) - full kitchen overview
 * - Modo TV - read-only large display mode
 */

type ViewMode = 'my-station' | 'pipeline' | 'tv';

export function PizzaKdsV2Dashboard() {
  const { operator, restaurantName, restaurantLogo, logout } = usePizzaKdsV2Session();
  const [activeView, setActiveView] = useState<ViewMode>('my-station');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const operatorStageLabel = operator?.assigned_stage === 'admin'
    ? 'Administrador'
    : PIZZA_KDS_V2_STAGE_LABELS[operator?.assigned_stage as keyof typeof PIZZA_KDS_V2_STAGE_LABELS] || 'Operador';

  // TV Mode - large fonts, read-only
  if (activeView === 'tv') {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* TV Mode header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {restaurantLogo ? (
              <img 
                src={restaurantLogo} 
                alt={restaurantName || ''} 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <Pizza className="w-10 h-10 text-primary" />
            )}
            <h1 className="text-2xl font-bold">{restaurantName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveView('my-station')}>
              Sair do Modo TV
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* TV Mode content - scaled up, read-only */}
        <div className="text-lg">
          <PizzaKdsV2PipelineView isReadOnly />
        </div>

        {/* Fullscreen button fixed position */}
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-4 left-4 z-50 shadow-lg"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {restaurantLogo ? (
            <img 
              src={restaurantLogo} 
              alt={restaurantName || ''} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <Pizza className="w-8 h-8 text-primary" />
          )}
          <div>
            <h1 className="font-bold">{restaurantName}</h1>
            <p className="text-xs text-muted-foreground">Pizza KDS V2</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Operator info */}
          <div className="flex items-center gap-2 text-sm">
            <UserCircle className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{operator?.name}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{operatorStageLabel}</span>
          </div>

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main content with tabs */}
      <main className="flex-1 p-4 overflow-hidden">
        <Tabs 
          value={activeView} 
          onValueChange={(v) => setActiveView(v as ViewMode)}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
            <TabsTrigger value="my-station" className="gap-2">
              <User className="w-4 h-4" />
              Meu Posto
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Cozinha Geral
            </TabsTrigger>
            <TabsTrigger value="tv" className="gap-2">
              <Tv className="w-4 h-4" />
              Modo TV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-station" className="flex-1 mt-0">
            <PizzaKdsV2MyStationView />
          </TabsContent>

          <TabsContent value="pipeline" className="flex-1 mt-0">
            <PizzaKdsV2PipelineView />
          </TabsContent>

          <TabsContent value="tv" className="flex-1 mt-0">
            {/* This won't render since we handle TV mode separately above */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
