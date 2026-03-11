// ================================================================
// FILE: waiter/WaiterDashboard.tsx
// ================================================================

import { useNavigate } from "react-router-dom";
import { Users, LayoutGrid, Tag, LogOut, RefreshCw, ChefHat } from "lucide-react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { MenuCard } from "@/modules/waiter/components/dashboard/MenuCard";


const MENU_OPTIONS = [
  {
    title: "Fila de Espera",
    description: "Gerenciar lista de espera e clientes aguardando",
    icon: Users,
    accent: "#4ade80",
    accentBg: "rgba(74,222,128,0.08)",
    accentBorder: "rgba(74,222,128,0.2)",
    accentHover: "rgba(74,222,128,0.15)",
    path: "/waiter/waiting-list",
    stat: "0 aguardando",
  },
  {
    title: "Mesas",
    description: "Visualizar e gerenciar mesas do salão",
    icon: LayoutGrid,
    accent: "#60a5fa",
    accentBg: "rgba(96,165,250,0.08)",
    accentBorder: "rgba(96,165,250,0.2)",
    accentHover: "rgba(96,165,250,0.15)",
    path: "/waiter/tables",
    stat: "0 ocupadas",
  },
  {
    title: "Comandas",
    description: "Gerenciar comandas e pedidos individuais",
    icon: Tag,
    accent: "#fb923c",
    accentBg: "rgba(251,146,60,0.08)",
    accentBorder: "rgba(251,146,60,0.2)",
    accentHover: "rgba(251,146,60,0.15)",
    path: "/waiter/comandas",
    stat: "0 abertas",
  },
];

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold border border-border/60"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            U
          </div>
          <div className="hidden sm:block">
            <p className="font-semibold text-sm leading-tight">Usuário</p>
            <p className="text-xs text-muted-foreground leading-tight">{company?.slug ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="h-9 w-9 rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => console.log("Logout")} className="h-9 w-9 rounded-xl">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-10 pb-8 px-4 text-center">
        {company?.logo_url ? (
          <img src={company.logo_url} alt="Logo" className="h-12 w-auto" />
        ) : (
          <div className="h-14 w-14 rounded-2xl border border-border/60 bg-muted flex items-center justify-center">
            <ChefHat className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">App Garçom</h1>
          <p className="text-muted-foreground text-sm mt-1">Selecione uma opção para começar</p>
        </div>
      </div>

      {/* Menu */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pb-10 flex flex-col gap-3">
        {MENU_OPTIONS.map((option) => (
          <MenuCard
            key={option.title}
            {...option}
            onClick={() => navigate(option.path)}
          />
        ))}
      </main>
    </div>
  );
}