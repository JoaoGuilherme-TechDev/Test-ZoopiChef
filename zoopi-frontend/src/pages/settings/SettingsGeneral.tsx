import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Building2, 
  CreditCard, 
  UtensilsCrossed, 
  LayoutGrid, 
  CalendarCheck, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";


// Configurações Gerais 
const SETTINGS_OPTIONS = [
  {
    title: "Configurações da Empresa",
    description: "Dados da empresa, identidade visual e contatos",
    icon: Building2,
    path: "/configuracoes/geral/empresa",
    color: "text-blue-500",
  },
  {
    title: "Faturamento & Pagamentos",
    description: "Métodos de pagamento, taxas e fluxo de caixa",
    icon: CreditCard,
    path: "/configuracoes/geral/faturamento-pagamentos",
    color: "text-emerald-500",
  },
  {
    title: "Cardápio & Preços",
    description: "Regras de precificação, combos e disponibilidade",
    icon: UtensilsCrossed,
    path: "/configuracoes/geral/cardapio-precos",
    color: "text-orange-500",
  },
  {
    title: "Reservas",
    description: "Capacidade, política de no-show e fila de espera",
    icon: CalendarCheck,
    path: "/configuracoes/geral/reservas",
    color: "text-rose-500",
  },
];

export default function SettingsGeneralPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we are at the root settings page or a sub-route
  const isRoot = location.pathname === "/configuracoes/geral" || location.pathname === "/configuracoes/geral/";

  return (
    <DashboardLayout title="Configurações">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {isRoot ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Geral</h2>
              <p className="text-sm text-muted-foreground">
                Gerencie as preferências e configurações fundamentais do seu estabelecimento.
              </p>
            </div>

            <div className="grid gap-2">
              {SETTINGS_OPTIONS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", item.color)}>
                      <item.icon size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
             <Outlet />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}