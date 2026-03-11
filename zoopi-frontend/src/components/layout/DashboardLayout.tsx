import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { DashboardHeader } from './DashboardHeader';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>

      {/* ── Container mestre ─────────────────────────────────────────────────
          A classe `app-bg` é definida no globals.css e contém:
            · dark: grid violeta + halos índigo/violeta + vinheta
            · light: grid azul-frio + halo branco suave + vinheta clara
          Separamos em CSS para que as media queries de tema (.dark / .light)
          funcionem corretamente com múltiplos background-size.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="app-bg flex h-screen w-full overflow-hidden text-foreground transition-colors duration-500 relative">

        {/* Vinheta de profundidade — div separada para não conflitar com background-size do grid */}
        <div className="app-bg-vignette pointer-events-none absolute inset-0 z-0" />

        {/* Dots nos cruzamentos do grid — separado pelo mesmo motivo */}
        <div className="app-bg-dots pointer-events-none absolute inset-0 z-0" />

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="relative z-10 flex-shrink-0">
          <AppSidebar />
        </div>

        {/* ── Área principal ─────────────────────────────────────────────── */}
        <SidebarInset className="relative flex flex-col min-w-0 bg-transparent z-10">

          {/* Header flutuante — não ocupa espaço no fluxo */}
          <div className="sticky top-0 z-50 w-full h-0 pt-6 px-4 md:px-8 2xl:px-16 flex justify-center pointer-events-none">
            <div className="w-full max-w-[1800px] pointer-events-auto">
              <DashboardHeader title={title} />
            </div>
          </div>

          {/* Conteúdo principal */}
          <main className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 2xl:px-16 pb-10 pt-28 scroll-smooth">
            <div className="w-full max-w-[1800px] mx-auto">
              {children}
            </div>
          </main>

        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}