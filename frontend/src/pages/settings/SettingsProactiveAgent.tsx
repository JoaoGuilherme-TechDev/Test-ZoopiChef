import { ProactiveAgentSettingsPanel } from "@/components/proactive-agent/ProactiveAgentSettingsPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsProactiveAgent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Agente IA Proativo</h1>
            <p className="text-muted-foreground">
              Configure os gatilhos e ações automáticas do agente inteligente
            </p>
          </div>
        </div>

        <ProactiveAgentSettingsPanel />
      </div>
    </div>
  );
}
