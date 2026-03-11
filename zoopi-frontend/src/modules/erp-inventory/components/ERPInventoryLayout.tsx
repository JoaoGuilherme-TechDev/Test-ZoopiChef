import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import {
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Warehouse,
  ArrowRightLeft,
  ClipboardList,
  Calculator,
  TrendingUp,
} from 'lucide-react';

interface ERPInventoryLayoutProps {
  children: ReactNode;
  title: string;
}

import { Users } from 'lucide-react';

const navItems = [
  { href: '/erp/items', label: 'Itens', icon: Package },
  { href: '/erp/suppliers', label: 'Fornecedores', icon: Users },
  { href: '/erp/purchases', label: 'Compras', icon: ShoppingCart },
  { href: '/erp/recipes', label: 'Fichas Técnicas', icon: FileText },
  { href: '/erp/stock', label: 'Estoque', icon: Warehouse },
  { href: '/erp/movements', label: 'Movimentações', icon: ArrowRightLeft },
  { href: '/erp/inventory-count', label: 'Inventário', icon: ClipboardList },
  { href: '/erp/cmv', label: 'CMV', icon: BarChart3 },
  { href: '/erp/pricing', label: 'Precificação', icon: Calculator },
  { href: '/erp/profit', label: 'Lucro', icon: TrendingUp },
];

export function ERPInventoryLayout({ children, title }: ERPInventoryLayoutProps) {
  const location = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Navigation */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          
          {/* Horizontal Navigation */}
          <nav className="flex flex-wrap gap-2 pb-2 border-b">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {children}
      </div>
    </DashboardLayout>
  );
}
