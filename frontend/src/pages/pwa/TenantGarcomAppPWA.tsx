/**
 * TenantGarcomAppPWA - Waiter app page after PIN authentication
 * 
 * Route: /:slug/garcom/app
 * 
 * This is the main waiter interface that shows after successful PIN login.
 * It uses WaiterPWALayout for session management - no need for session validation here.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, LogOut, LayoutGrid, Tag, MessageSquare, UserRoundCheck, RefreshCw, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWaiterLayoutSession } from '@/layouts/WaiterPWALayout';

export default function TenantGarcomAppPWA() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Use layout session - already validated by WaiterPWALayout
  const { sessionData, isLoading, logout, refresh } = useWaiterLayoutSession();

  const handleLogout = async () => {
    await logout();
    toast.success('Logout realizado com sucesso');
  };

  const handleNavigate = (path: string) => {
    switch (path) {
      case 'waitlist':
        navigate(`/${slug}/garcom/fila`);
        break;
      case 'tables':
        navigate(`/${slug}/garcom/mesas`);
        break;
      case 'comandas':
        navigate(`/${slug}/garcom/comandas`);
        break;
      case 'messages':
        toast.info('Mensagens: em breve');
        break;
      default:
        toast.info('Função em desenvolvimento');
    }
  };

  // Loading state (should be very brief since layout already validated)
  if (isLoading || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <UserRoundCheck className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{sessionData.waiter.name}</h2>
            <p className="text-sm text-muted-foreground">{sessionData.company.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Logo */}
      <div className="text-center mb-10">
        {sessionData.company.logo_url ? (
          <img 
            src={sessionData.company.logo_url} 
            alt={sessionData.company.name}
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
        ) : (
          <img src="/zoopi-logo.png" alt="Zoopi" className="h-16 w-auto mx-auto mb-4" />
        )}
        <h1 className="text-3xl font-bold mb-2">App Garçom</h1>
        <p className="text-muted-foreground">Selecione uma opção</p>
      </div>

      {/* Main Buttons */}
      <div className="grid gap-6 max-w-md mx-auto">
        {/* Waitlist Button - PRIORITY */}
        <Card 
          className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-green-500 bg-green-500/5"
          onClick={() => handleNavigate('waitlist')}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Users className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">FILA DE ESPERA</h2>
              <p className="text-muted-foreground">Gerenciar lista de espera</p>
            </div>
          </div>
        </Card>

        {/* Tables Button */}
        <Card 
          className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-blue-500"
          onClick={() => handleNavigate('tables')}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <LayoutGrid className="h-10 w-10 text-blue-500" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">MESAS</h2>
              <p className="text-muted-foreground">Gerenciar mesas e pedidos</p>
            </div>
          </div>
        </Card>

        {/* Comandas Button */}
        <Card 
          className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-orange-500"
          onClick={() => handleNavigate('comandas')}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Tag className="h-10 w-10 text-orange-500" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">COMANDAS</h2>
              <p className="text-muted-foreground">Comandas individuais</p>
            </div>
          </div>
        </Card>

        {/* Messages Button */}
        <Card 
          className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-purple-500"
          onClick={() => handleNavigate('messages')}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-purple-500" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">MENSAGENS</h2>
              <p className="text-muted-foreground">Comunicação com caixa/cozinha</p>
              <p className="text-xs text-muted-foreground mt-1">(Em breve)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Zoopi Tecnologia • PWA Garçom
        </p>
      </div>
    </div>
  );
}
