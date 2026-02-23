import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Settings,
  BarChart3,
  MessageSquare,
  CreditCard,
  Truck,
  Star,
  Sparkles,
  Home,
  Search,
} from 'lucide-react';

interface ShortcutItem {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  path: string;
  group: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', shortcut: 'D', path: '/', group: 'Navegação' },
  { icon: <ShoppingCart className="w-4 h-4" />, label: 'Pedidos', shortcut: 'P', path: '/orders', group: 'Navegação' },
  { icon: <Users className="w-4 h-4" />, label: 'Clientes', shortcut: 'C', path: '/customers', group: 'Navegação' },
  { icon: <Package className="w-4 h-4" />, label: 'Produtos', path: '/products', group: 'Navegação' },
  { icon: <Truck className="w-4 h-4" />, label: 'Entregadores', path: '/deliverers', group: 'Navegação' },
  { icon: <CreditCard className="w-4 h-4" />, label: 'Caixa', path: '/cash-register', group: 'Financeiro' },
  { icon: <BarChart3 className="w-4 h-4" />, label: 'Relatórios', shortcut: 'R', path: '/reports', group: 'Análise' },
  { icon: <Star className="w-4 h-4" />, label: 'Avaliações', path: '/reviews', group: 'Análise' },
  { icon: <MessageSquare className="w-4 h-4" />, label: 'WhatsApp', shortcut: 'W', path: '/whatsapp', group: 'Comunicação' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'Marketing IA', path: '/ai-marketing-posts', group: 'IA' },
  { icon: <Settings className="w-4 h-4" />, label: 'Configurações', path: '/settings', group: 'Sistema' },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Alt + letter shortcuts for quick navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const shortcut = SHORTCUTS.find(
          (s) => s.shortcut?.toLowerCase() === e.key.toLowerCase()
        );
        if (shortcut) {
          e.preventDefault();
          navigate(shortcut.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate]
  );

  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas, ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {groups.map((group, idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                <CommandItem
                  key={shortcut.path}
                  onSelect={() => handleSelect(shortcut.path)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {shortcut.icon}
                  <span>{shortcut.label}</span>
                  {shortcut.shortcut && (
                    <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Alt+{shortcut.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
