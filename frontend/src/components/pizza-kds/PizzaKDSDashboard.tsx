import React, { useState } from 'react';
import { usePizzaKDSSession } from '@/contexts/PizzaKDSSessionContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pizza, Eye, Wrench, LogOut, User } from 'lucide-react';
import { PIZZA_KDS_STEP_LABELS } from '@/hooks/usePizzaKDSSettings';
import { PizzaKDSNormalView } from './PizzaKDSNormalView';
import { PizzaKDSMyStepView } from './PizzaKDSMyStepView';

export function PizzaKDSDashboard() {
  const { operator, restaurantName, logout } = usePizzaKDSSession();
  const [activeTab, setActiveTab] = useState<'normal' | 'mystep'>('mystep');

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Pizza className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="font-semibold">{restaurantName}</h1>
            <p className="text-xs text-muted-foreground">KDS de Pizza</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span className="font-medium">{operator?.name}</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {PIZZA_KDS_STEP_LABELS[operator?.assigned_step || 'dough_border']}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'normal' | 'mystep')}
          className="flex-1 flex flex-col"
        >
          <div className="border-b bg-card px-4">
            <TabsList className="h-12">
              <TabsTrigger value="mystep" className="gap-2">
                <Wrench className="w-4 h-4" />
                Minha Etapa
              </TabsTrigger>
              <TabsTrigger value="normal" className="gap-2">
                <Eye className="w-4 h-4" />
                Visão Geral
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="mystep" className="flex-1 m-0">
            <PizzaKDSMyStepView />
          </TabsContent>

          <TabsContent value="normal" className="flex-1 m-0">
            <PizzaKDSNormalView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
