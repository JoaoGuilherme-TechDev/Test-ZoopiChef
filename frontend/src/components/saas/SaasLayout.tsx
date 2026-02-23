import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsSaasAdmin } from '@/hooks/useSaasAdmin';
import { 
  Building2, 
  CreditCard, 
  LayoutDashboard, 
  FileText, 
  Copy, 
  LogOut,
  Shield,
  Loader2,
  Users,
  Key,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SaasLayoutProps {
  children: ReactNode;
  title: string;
}

const navItems = [
  { href: '/saas', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/saas/companies', label: 'Empresas', icon: Building2 },
  { href: '/saas/licenses', label: 'Licenças', icon: Key },
  { href: '/saas/plans', label: 'Planos', icon: CreditCard },
  { href: '/saas/subscriptions', label: 'Assinaturas', icon: CreditCard },
  { href: '/saas/templates', label: 'Templates', icon: Copy },
  { href: '/saas/users', label: 'Usuários SaaS', icon: Users },
  { href: '/saas/audit', label: 'Auditoria', icon: FileText },
  { href: '/saas/backup-restore', label: 'Backup & Restore', icon: HardDrive },
];

export function SaasLayout({ children, title }: SaasLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { data: isSaasAdmin, isLoading: checkingAdmin } = useIsSaasAdmin();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!checkingAdmin && isSaasAdmin === false) {
      navigate('/');
    }
  }, [isSaasAdmin, checkingAdmin, navigate]);

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center saas-theme">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isSaasAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen saas-theme">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-700/50 z-50">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Zoopi Admin</h1>
              <p className="text-xs text-slate-400">Painel SaaS</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="text-sm text-slate-400 mb-3 px-2">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen bg-slate-950">
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
