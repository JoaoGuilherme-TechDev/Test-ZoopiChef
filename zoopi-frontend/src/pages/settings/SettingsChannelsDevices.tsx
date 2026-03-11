import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Printer, 
  Truck, 
  BellRing, 
  Zap, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNEL_OPTIONS = [
  {
    title: "Impressoras & KDS",
    description: "Gerencie setores de produção, filas de KDS e tickets de impressão",
    icon: Printer,
    path: "impressoras-kds", // Relative path
    color: "text-blue-500",
  },
  {
    title: "Entregas & Taxas",
    description: "Configuração de áreas de entrega, prazos médios e valores por zona",
    icon: Truck,
    path: "entregas-taxas",
    color: "text-amber-500",
  },
  {
    title: "Notificações & Sons",
    description: "Alertas sonoros para novos pedidos e volumes de notificação",
    icon: BellRing,
    path: "notificacoes-sons",
    color: "text-pink-500",
  },
  {
    title: "Integrações",
    description: "Conecte com Marketplaces (iFood, Rappi) e APIs externas",
    icon: Zap,
    path: "integracoes",
    color: "text-yellow-500",
  },
];

export default function SettingsChannelsDevicesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Logic to hide the menu when a sub-route is active
  // This matches if the path ends exactly in /canais-dispositivos (adjust path if needed)
  const isRoot = location.pathname.endsWith("canais-dispositivos") || location.pathname.endsWith("canais-dispositivos/");

  return (
    <DashboardLayout title="Configurações - Canais & Dispositivos">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {isRoot ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Canais & Dispositivos</h2>
              <p className="text-sm text-muted-foreground">
                Configure como seu estabelecimento se comunica com hardware e serviços externos.
              </p>
            </div>

            <div className="grid gap-2">
              {CHANNEL_OPTIONS.map((item) => (
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Outlet />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}