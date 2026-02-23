import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useWaiterPermissions } from '@/hooks/useWaiterPermissions';
import { useCompanyModules } from '@/hooks/useCompanyModules';
import { WaiterMessagePanel } from '@/components/waiter/WaiterMessagePanel';
import { WaitlistPanel } from '@/components/waiter/WaitlistPanel';
import { LayoutGrid, Tag, LogOut, Loader2, User, AlertCircle, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterHome() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { permissions, isLoading: permissionsLoading } = useWaiterPermissions();
  const { modules, isLoading: modulesLoading } = useCompanyModules();

  const isLoading = authLoading || companyLoading || permissionsLoading || modulesLoading;

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch {
      toast.error('Erro ao sair');
    }
  };

  // Still loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-foreground">Acesso negado</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Você precisa estar logado para acessar o app do garçom.
          </p>
          <Button className="mt-4" onClick={() => navigate('/auth')}>
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  // No company associated
  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-foreground">Sem empresa</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sua conta não está associada a nenhuma empresa. Entre em contato com o administrador.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
            <Button onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{user?.email?.split('@')[0]}</h2>
            <p className="text-sm text-muted-foreground">{company?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WaitlistPanel />
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="text-center mb-10">
        <img src="/zoopi-logo.png" alt="Zoopi" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">App Garçom</h1>
        <p className="text-muted-foreground">Selecione uma opção</p>
      </div>

      {/* Main Buttons */}
      <div className="grid gap-6 max-w-md mx-auto">
        {/* Tables Button - Only show if module is active */}
        {permissions.can_open_table && modules.module_tables && (
          <Card 
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-primary"
            onClick={() => navigate('/waiter/tables')}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">MESAS</h2>
                <p className="text-muted-foreground">Gerenciar mesas e pedidos</p>
              </div>
            </div>
          </Card>
        )}

        {/* Comandas Button - Only show if module is active */}
        {permissions.can_open_comanda && modules.module_comandas && (
          <Card 
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-primary"
            onClick={() => navigate('/waiter/comandas')}
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
        )}

        {/* Messages Panel */}
        <Card className="p-6 border-2">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">MENSAGENS</h2>
              <p className="text-sm text-muted-foreground">Comunicação com caixa/cozinha</p>
            </div>
          </div>
          <WaiterMessagePanel />
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
