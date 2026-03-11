import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, Users } from "lucide-react";



// Configurações Gerais 
const SETTINGS_OPTIONS = [
  {
    title: "Clientes",
    description: "Gerenciamento de Clientes ",
    icon: Users,
    path: "/principal/comunicacao-clientes/clientes",
    color: "text-blue-500",
  },

    
  
];
import { useNavigate } from "react-router-dom";

export default function PrincipalComunicacaoClientesPage() {
  const navigate = useNavigate();
  return (
    <DashboardLayout title="Comunicação & Clientes">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Comunicação & Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
